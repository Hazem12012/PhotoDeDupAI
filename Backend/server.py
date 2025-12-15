#!/usr/bin/python3
# -*- coding: utf-8 -*-

from flask import Flask, request, jsonify
from flask_cors import CORS
from skimage.metrics import structural_similarity as ssim
from collections import defaultdict
from sklearn.cluster import DBSCAN
import face_recognition
import numpy as np
import cv2
import os
import base64
import re
import shutil
from io import BytesIO
from PIL import Image
from datetime import datetime

app = Flask(__name__)
CORS(app)

# Store process status
process_status = {
    'running': False,
    'progress': [],
    'error': None,
    'images': [],
    'duplicate_groups': [],
    'face_data': {}
}

def merge_common(lists):
    """Merge lists that have common elements"""
    neigh = defaultdict(set)
    visited = set()
    for each in lists:
        for item in each:
            neigh[item].update(each)

    def comp(node, neigh=neigh, visited=visited, vis=visited.add):
        nodes = set([node])
        next_node = nodes.pop
        while nodes:
            node = next_node()
            vis(node)
            nodes |= neigh[node] - visited
            yield node
    for node in neigh:
        if node not in visited:
            yield sorted(comp(node))


def extract_number_from_filename(filename):
    """Extract the first number from filename, return 0 if no number found"""
    basename = os.path.basename(filename)
    name_without_ext = os.path.splitext(basename)[0]
    match = re.search(r'\d+', name_without_ext)
    if match:
        return int(match.group())
    return 0


def keep_widest_img(data):
    """Keep the widest (highest resolution) image"""
    widest_file = max(data, key=lambda i: i[0])
    files_to_delete = []
    for item in data:
        if item[1] != widest_file[1]:
            files_to_delete.append(item[1])
    return widest_file[1], files_to_delete


def keep_highest_name(data):
    """Keep the image with the highest number in filename"""
    try:
        num_filenames = [(extract_number_from_filename(item[1]), item[1], item[0]) 
                        for item in data]
        highest_filename = max(num_filenames, key=lambda i: i[0])
        widest_file = max(data, key=lambda i: i[0])
        img = cv2.imread(widest_file[1])
        files_to_delete = [item[1] for item in data if item[1] != highest_filename[1]]
        return highest_filename[1], files_to_delete
    except Exception as e:
        print(f"Error in keep_highest_name: {e}")
        return keep_widest_img(data)


def mse(first_img, second_img):
    """Calculate Mean Squared Error between two images"""
    err = np.sum((first_img.astype("float") - second_img.astype("float")) ** 2)
    err /= float(first_img.shape[0] * first_img.shape[1])
    return err


def dhash(image, hashSize=8):
    """Calculate difference hash of an image"""
    resized_img = cv2.resize(image, (hashSize + 1, hashSize))
    diff = resized_img[:, 1:] > resized_img[:, :-1]
    return sum([2 ** i for (i, v) in enumerate(diff.flatten()) if v])


def get_image_info(path):
    """Get image metadata without full processing"""
    try:
        img = cv2.imread(path)
        if img is None:
            return None
        
        height, width = img.shape[:2]
        file_size = os.path.getsize(path)
        
        return {
            'path': path,
            'filename': os.path.basename(path),
            'width': int(width),
            'height': int(height),
            'size_bytes': int(file_size),
            'size_mb': round(file_size / (1024 * 1024), 2)
        }
    except Exception as e:
        print(f"Error reading {path}: {e}")
        return None


def image_to_base64(image_path, max_size=400):
    """Convert image to base64 thumbnail"""
    try:
        img = Image.open(image_path)
        img.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
        buffered = BytesIO()
        img.save(buffered, format="JPEG", quality=85)
        img_str = base64.b64encode(buffered.getvalue()).decode()
        return f"data:image/jpeg;base64,{img_str}"
    except Exception as e:
        print(f"Error converting image to base64: {e}")
        return None


def detect_faces_in_image(image_path):
    """Detect faces in an image and return face locations and encodings"""
    try:
        # Load image
        image = face_recognition.load_image_file(image_path)
        
        # Optimize: Resize if image is too large (speeds up detection significantly)
        height, width = image.shape[:2]
        max_dimension = 800
        scale = 1.0
        
        if width > max_dimension or height > max_dimension:
            if width > height:
                scale = max_dimension / width
                new_width = max_dimension
                new_height = int(height * scale)
            else:
                scale = max_dimension / height
                new_height = max_dimension
                new_width = int(width * scale)
                
            image = cv2.resize(image, (new_width, new_height))
            
        face_locations = face_recognition.face_locations(image, model="hog")
        face_encodings = face_recognition.face_encodings(image, face_locations)
        
        return face_locations, face_encodings
    except Exception as e:
        print(f"Error detecting faces in {image_path}: {e}")
        return [], []


def cluster_faces(face_data, tolerance=0.6):
    """Cluster face encodings using DBSCAN to group same people"""
    if not face_data:
        return []
    
    # Collect all encodings and their image paths
    encodings = []
    image_paths = []
    face_indices = []
    
    for img_path, data in face_data.items():
        for idx, encoding in enumerate(data['encodings']):
            encodings.append(encoding)
            image_paths.append(img_path)
            face_indices.append(idx)
    
    if not encodings:
        return []
    
    # Convert to numpy array
    encodings_array = np.array(encodings)
    
    # Cluster using DBSCAN
    clustering = DBSCAN(metric="euclidean", eps=tolerance, min_samples=1)
    clustering.fit(encodings_array)
    
    # Group by cluster labels
    clusters = defaultdict(list)
    for idx, label in enumerate(clustering.labels_):
        clusters[label].append({
            'image_path': image_paths[idx],
            'face_index': face_indices[idx],
            'encoding': encodings[idx]
        })
    
    return clusters


# ==================== DUPLICATE DETECTION ENDPOINTS ====================

@app.route('/api/scan', methods=['POST'])
def scan_folder():
    """Scan folder and return all images with metadata"""
    global process_status
    
    try:
        data = request.json
        directory = data.get('directory')
        
        if not directory or not os.path.exists(directory):
            return jsonify({'error': 'Invalid directory'}), 400
        
        process_status['images'] = []
        process_status['error'] = None
        
        image_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'}
        files = os.listdir(directory)
        images = []
        
        for filename in files:
            ext = os.path.splitext(filename)[1].lower()
            if ext in image_extensions:
                path = os.path.join(directory, filename)
                info = get_image_info(path)
                if info:
                    images.append(info)
        
        process_status['images'] = images
        
        return jsonify({
            'success': True,
            'count': len(images),
            'images': images
        })
        
    except Exception as e:
        error_msg = f"Error scanning folder: {str(e)}"
        process_status['error'] = error_msg
        return jsonify({'error': error_msg}), 500


@app.route('/api/analyze', methods=['POST'])
def analyze_duplicates():
    """Analyze images for duplicates with custom thresholds"""
    global process_status
    
    try:
        data = request.json
        directory = data.get('directory')
        ssim_threshold = float(data.get('ssim_threshold', 0.95))
        mse_threshold = float(data.get('mse_threshold', 20))
        custom_mode = data.get('custom', True)
        
        if not directory or not os.path.exists(directory):
            return jsonify({'error': 'Invalid directory'}), 400
        
        process_status['running'] = True
        process_status['duplicate_groups'] = []
        
        image_data = {}
        pic_hashes = {}
        
        image_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'}
        files = [f for f in os.listdir(directory) 
                if os.path.splitext(f)[1].lower() in image_extensions]
        
        for rel_path in files:
            path = os.path.join(directory, rel_path)
            img = cv2.imread(path, 0)
            if img is None:
                continue
            
            image_data[path] = [
                img, 
                cv2.resize(img, (8, 8), interpolation=cv2.INTER_AREA), 
                img.shape[1]
            ]
            image_hash = dhash(img)
            if image_hash is not None:
                if image_hash in pic_hashes:
                    pic_hashes[image_hash].append(path)
                else:
                    pic_hashes[image_hash] = [path]
        
        dupe_list = []
        for key in pic_hashes.keys():
            if len(pic_hashes[key]) > 1:
                dupe_list.append(pic_hashes[key])
        
        data_keys = list(image_data.keys())
        for data_path in data_keys:
            if image_data[data_path] is None:
                continue
                
            mse_ssim = [
                (key, mse(image_data[data_path][1], image_data[key][1]), 
                 ssim(image_data[data_path][1], image_data[key][1]))
                for key in image_data 
                if data_path != key and image_data[key] is not None
            ]
            
            dupe = [item[0] for item in mse_ssim 
                   if item[2] > ssim_threshold and item[1] < mse_threshold]
            
            if dupe:
                dupe.insert(0, data_path)
                dupe_list.append(dupe)
        
        dupe_list = list(merge_common(dupe_list))
        
        duplicate_groups = []
        all_duplicates = set()
        
        for group in dupe_list:
            data = [(image_data[path][2], path) for path in group]
            
            if custom_mode:
                keep_path, delete_paths = keep_highest_name(data)
            else:
                keep_path, delete_paths = keep_widest_img(data)
            
            keep_img = image_data[keep_path][1]
            duplicates = []
            
            for dup_path in delete_paths:
                dup_img = image_data[dup_path][1]
                similarity_score = ssim(keep_img, dup_img)
                mse_score = mse(keep_img, dup_img)
                
                duplicates.append({
                    'path': dup_path,
                    'filename': os.path.basename(dup_path),
                    'ssim': round(float(similarity_score), 4),
                    'mse': round(float(mse_score), 2),
                    'info': get_image_info(dup_path)
                })
                all_duplicates.add(dup_path)
            
            duplicate_groups.append({
                'original': {
                    'path': keep_path,
                    'filename': os.path.basename(keep_path),
                    'info': get_image_info(keep_path)
                },
                'duplicates': duplicates,
                'count': len(duplicates)
            })
        
        all_images = set(image_data.keys())
        all_in_groups = set()
        for group in duplicate_groups:
            all_in_groups.add(group['original']['path'])
            for dup in group['duplicates']:
                all_in_groups.add(dup['path'])
        
        originals = list(all_images - all_duplicates - {g['original']['path'] for g in duplicate_groups})
        original_images = [get_image_info(path) for path in originals]
        
        process_status['duplicate_groups'] = duplicate_groups
        process_status['running'] = False
        
        return jsonify({
            'success': True,
            'duplicate_groups': duplicate_groups,
            'original_images': original_images,
            'total_duplicates': len(all_duplicates),
            'total_groups': len(duplicate_groups)
        })
        
    except Exception as e:
        error_msg = f"Error analyzing duplicates: {str(e)}"
        process_status['error'] = error_msg
        process_status['running'] = False
        return jsonify({'error': error_msg}), 500


@app.route('/api/delete', methods=['POST'])
def delete_duplicates():
    """Delete specified duplicate files"""
    try:
        data = request.json
        files_to_delete = data.get('files', [])
        
        if not files_to_delete:
            return jsonify({'error': 'No files specified'}), 400
        
        deleted = []
        failed = []
        
        for file_path in files_to_delete:
            try:
                if os.path.exists(file_path):
                    os.remove(file_path)
                    deleted.append(file_path)
                else:
                    failed.append({'path': file_path, 'reason': 'File not found'})
            except Exception as e:
                failed.append({'path': file_path, 'reason': str(e)})
        
        return jsonify({
            'success': True,
            'deleted': len(deleted),
            'failed': len(failed),
            'deleted_files': deleted,
            'failed_files': failed
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/thumbnail', methods=['POST'])
def get_thumbnail():
    """Get base64 thumbnail of an image"""
    try:
        data = request.json
        image_path = data.get('path')
        size = data.get('size', 250)
        
        if not image_path or not os.path.exists(image_path):
            return jsonify({'error': 'Invalid image path'}), 400
        
        thumbnail = image_to_base64(image_path, max_size=size)
        
        if thumbnail:
            return jsonify({
                'success': True,
                'thumbnail': thumbnail
            })
        else:
            return jsonify({'error': 'Failed to generate thumbnail'}), 500
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ==================== FACE RECOGNITION ENDPOINTS ====================

@app.route('/api/faces/detect', methods=['POST'])
def detect_faces():
    """Detect faces in all images in a directory"""
    global process_status
    
    try:
        data = request.json
        directory = data.get('directory')
        
        if not directory or not os.path.exists(directory):
            return jsonify({'error': 'Invalid directory'}), 400
        
        process_status['running'] = True
        process_status['face_data'] = {}
        
        image_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'}
        files = [f for f in os.listdir(directory) 
                if os.path.splitext(f)[1].lower() in image_extensions]
        
        face_data = {}
        stats = {
            'total_images': 0,
            'images_with_faces': 0,
            'images_without_faces': 0,
            'total_faces': 0
        }
        
        for idx, filename in enumerate(files):
            print(f"Processing image {idx+1}/{len(files)}: {filename}", flush=True)
            path = os.path.join(directory, filename)
            locations, encodings = detect_faces_in_image(path)
            
            face_data[path] = {
                'locations': locations,
                'encodings': encodings,
                'face_count': len(locations)
            }
            
            stats['total_images'] += 1
            stats['total_faces'] += len(locations)
            
            if len(locations) > 0:
                stats['images_with_faces'] += 1
            else:
                stats['images_without_faces'] += 1
        
        process_status['face_data'] = face_data
        process_status['running'] = False
        
        return jsonify({
            'success': True,
            'stats': stats,
            'face_data': {
                path: {'face_count': data['face_count']}
                for path, data in face_data.items()
            }
        })
        
    except Exception as e:
        error_msg = f"Error detecting faces: {str(e)}"
        process_status['error'] = error_msg
        process_status['running'] = False
        return jsonify({'error': error_msg}), 500


@app.route('/api/faces/analyze', methods=['POST'])
def analyze_faces():
    """Cluster faces to identify unique people"""
    global process_status
    
    try:
        data = request.json
        directory = data.get('directory')
        tolerance = float(data.get('tolerance', 0.6))
        
        if not directory or not os.path.exists(directory):
            return jsonify({'error': 'Invalid directory'}), 400
        
        # Use cached face data if available, otherwise detect
        if not process_status.get('face_data'):
            # Detect faces first
            image_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'}
            files = [f for f in os.listdir(directory) 
                    if os.path.splitext(f)[1].lower() in image_extensions]
            
            face_data = {}
            for filename in files:
                path = os.path.join(directory, filename)
                locations, encodings = detect_faces_in_image(path)
                face_data[path] = {
                    'locations': locations,
                    'encodings': encodings,
                    'face_count': len(locations)
                }
            process_status['face_data'] = face_data
        
        # Cluster faces
        clusters = cluster_faces(process_status['face_data'], tolerance)
        
        # Organize results by person
        person_groups = []
        images_with_multiple_faces = []
        images_without_faces = []
        
        # Track which images have been assigned
        assigned_images = set()
        
        for person_id, faces in clusters.items():
            if person_id == -1:  # Noise cluster from DBSCAN
                continue
            
            # Get unique images for this person
            person_images = {}
            for face in faces:
                img_path = face['image_path']
                if img_path not in person_images:
                    person_images[img_path] = {
                        'path': img_path,
                        'filename': os.path.basename(img_path),
                        'info': get_image_info(img_path),
                        'face_count': process_status['face_data'][img_path]['face_count']
                    }
                assigned_images.add(img_path)
            
            # Get a representative face thumbnail
            representative = faces[0]['image_path']
            
            person_groups.append({
                'person_id': int(person_id) + 1,
                'image_count': len(person_images),
                'images': list(person_images.values()),
                'representative_image': representative
            })
        
        # Find images with multiple faces and no faces
        for img_path, data in process_status['face_data'].items():
            if data['face_count'] == 0:
                images_without_faces.append({
                    'path': img_path,
                    'filename': os.path.basename(img_path),
                    'info': get_image_info(img_path)
                })
            elif data['face_count'] > 1 and img_path in assigned_images:
                # Check if this image appears in multiple person groups
                appearances = sum(1 for group in person_groups 
                                if any(img['path'] == img_path for img in group['images']))
                if appearances > 1 or data['face_count'] > len([f for f in clusters.values() 
                                                                 if any(face['image_path'] == img_path for face in f)]):
                    images_with_multiple_faces.append({
                        'path': img_path,
                        'filename': os.path.basename(img_path),
                        'info': get_image_info(img_path),
                        'face_count': data['face_count']
                    })
        
        return jsonify({
            'success': True,
            'person_groups': person_groups,
            'images_with_multiple_faces': images_with_multiple_faces,
            'images_without_faces': images_without_faces,
            'total_people': len(person_groups),
            'total_images_with_multiple': len(images_with_multiple_faces),
            'total_images_without_faces': len(images_without_faces)
        })
        
    except Exception as e:
        error_msg = f"Error analyzing faces: {str(e)}"
        process_status['error'] = error_msg
        return jsonify({'error': error_msg}), 500


@app.route('/api/faces/organize', methods=['POST'])
def organize_by_faces():
    """Organize images into folders by person"""
    try:
        data = request.json
        person_groups = data.get('person_groups', [])
        multiple_faces = data.get('images_with_multiple_faces', [])
        no_faces = data.get('images_without_faces', [])
        output_dir = data.get('output_directory')
        mode = data.get('mode', 'copy')  # 'copy' or 'move'
        person_names = data.get('person_names', {})  # {person_id: custom_name}
        
        if not output_dir:
            return jsonify({'error': 'Output directory not specified'}), 400
        
        # Create output directory
        os.makedirs(output_dir, exist_ok=True)
        
        results = {
            'organized': 0,
            'failed': 0,
            'folders_created': []
        }
        
        # Organize by person
        for group in person_groups:
            person_id = group['person_id']
            person_name = person_names.get(str(person_id), f"Person_{person_id}")
            person_folder = os.path.join(output_dir, person_name)
            os.makedirs(person_folder, exist_ok=True)
            results['folders_created'].append(person_name)
            
            for img in group['images']:
                src = img['path']
                dst = os.path.join(person_folder, img['filename'])
                
                try:
                    if mode == 'copy':
                        shutil.copy2(src, dst)
                    else:
                        shutil.move(src, dst)
                    results['organized'] += 1
                except Exception as e:
                    print(f"Error organizing {src}: {e}")
                    results['failed'] += 1
        
        # Handle multiple faces
        if multiple_faces:
            multiple_folder = os.path.join(output_dir, "Multiple_People")
            os.makedirs(multiple_folder, exist_ok=True)
            results['folders_created'].append("Multiple_People")
            
            for img in multiple_faces:
                src = img['path']
                dst = os.path.join(multiple_folder, img['filename'])
                
                try:
                    if mode == 'copy':
                        shutil.copy2(src, dst)
                    else:
                        shutil.move(src, dst)
                    results['organized'] += 1
                except Exception as e:
                    print(f"Error organizing {src}: {e}")
                    results['failed'] += 1
        
        # Handle no faces
        if no_faces:
            no_faces_folder = os.path.join(output_dir, "No_Faces")
            os.makedirs(no_faces_folder, exist_ok=True)
            results['folders_created'].append("No_Faces")
            
            for img in no_faces:
                src = img['path']
                dst = os.path.join(no_faces_folder, img['filename'])
                
                try:
                    if mode == 'copy':
                        shutil.copy2(src, dst)
                    else:
                        shutil.move(src, dst)
                    results['organized'] += 1
                except Exception as e:
                    print(f"Error organizing {src}: {e}")
                    results['failed'] += 1
        
        return jsonify({
            'success': True,
            'results': results
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ==================== IMAGE ORGANIZATION ENDPOINTS ====================

@app.route('/api/organize/rename', methods=['POST'])
def rename_images():
    """Rename images with a pattern"""
    try:
        data = request.json
        directory = data.get('directory')
        pattern = data.get('pattern', 'IMG_{number}')
        start_number = int(data.get('start_number', 1))
        
        if not directory or not os.path.exists(directory):
            return jsonify({'error': 'Invalid directory'}), 400
        
        image_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'}
        files = sorted([f for f in os.listdir(directory) 
                       if os.path.splitext(f)[1].lower() in image_extensions])
        
        renamed = []
        failed = []
        
        for idx, filename in enumerate(files):
            old_path = os.path.join(directory, filename)
            ext = os.path.splitext(filename)[1]
            
            # Generate new name based on pattern
            new_name = pattern.replace('{number}', str(start_number + idx).zfill(4))
            new_name = new_name.replace('{date}', datetime.now().strftime('%Y-%m-%d'))
            new_name = new_name.replace('{original}', os.path.splitext(filename)[0])
            new_name += ext
            
            new_path = os.path.join(directory, new_name)
            
            try:
                os.rename(old_path, new_path)
                renamed.append({'old': filename, 'new': new_name})
            except Exception as e:
                failed.append({'file': filename, 'error': str(e)})
        
        return jsonify({
            'success': True,
            'renamed': len(renamed),
            'failed': len(failed),
            'renamed_files': renamed,
            'failed_files': failed
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok'})


if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=False)