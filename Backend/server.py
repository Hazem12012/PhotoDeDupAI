#!/usr/bin/python3
# -*- coding: utf-8 -*-

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from skimage.metrics import structural_similarity as ssim
from collections import defaultdict
import numpy as np
import cv2
import os
import base64
import re
from io import BytesIO
from PIL import Image

app = Flask(__name__)
CORS(app)

# Store process status
process_status = {
    'running': False,
    'progress': [],
    'error': None,
    'images': [],
    'duplicate_groups': []
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
    # Remove extension
    name_without_ext = os.path.splitext(basename)[0]
    # Find first number in the filename
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
        # Extract numbers from filenames
        num_filenames = [(extract_number_from_filename(item[1]), item[1], item[0]) 
                        for item in data]
        
        # Get the file with highest number
        highest_filename = max(num_filenames, key=lambda i: i[0])
        
        # Get the widest file for quality
        widest_file = max(data, key=lambda i: i[0])
        
        # Read the highest quality image
        img = cv2.imread(widest_file[1])
        
        # Files to delete (all except the one we're keeping)
        files_to_delete = [item[1] for item in data if item[1] != highest_filename[1]]
        
        return highest_filename[1], files_to_delete
    except Exception as e:
        print(f"Error in keep_highest_name: {e}")
        # Fallback to keeping widest
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
        
        # Create thumbnail
        img.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
        
        # Convert to base64
        buffered = BytesIO()
        img.save(buffered, format="JPEG", quality=85)
        img_str = base64.b64encode(buffered.getvalue()).decode()
        
        return f"data:image/jpeg;base64,{img_str}"
    except Exception as e:
        print(f"Error converting image to base64: {e}")
        return None


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
        
        # Supported image extensions
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
        
        # Get all images
        image_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'}
        files = [f for f in os.listdir(directory) 
                if os.path.splitext(f)[1].lower() in image_extensions]
        
        # Calculate hashes
        for rel_path in files:
            path = os.path.join(directory, rel_path)
            img = cv2.imread(path, 0)
            if img is None:
                continue
            
            image_data[path] = [
                img, 
                cv2.resize(img, (8, 8), interpolation=cv2.INTER_AREA), 
                img.shape[1]  # width
            ]
            image_hash = dhash(img)
            if image_hash is not None:
                if image_hash in pic_hashes:
                    pic_hashes[image_hash].append(path)
                else:
                    pic_hashes[image_hash] = [path]
        
        # Find duplicates by hash
        dupe_list = []
        for key in pic_hashes.keys():
            if len(pic_hashes[key]) > 1:
                dupe_list.append(pic_hashes[key])
        
        # Find duplicates by SSIM and MSE
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
            
            # Use custom thresholds
            dupe = [item[0] for item in mse_ssim 
                   if item[2] > ssim_threshold and item[1] < mse_threshold]
            
            if dupe:
                dupe.insert(0, data_path)
                dupe_list.append(dupe)
        
        # Merge common duplicates
        dupe_list = list(merge_common(dupe_list))
        
        # Create duplicate groups with metadata
        duplicate_groups = []
        all_duplicates = set()
        
        for group in dupe_list:
            data = [(image_data[path][2], path) for path in group]
            
            # Determine which to keep
            if custom_mode:
                keep_path, delete_paths = keep_highest_name(data)
            else:
                keep_path, delete_paths = keep_widest_img(data)
            
            # Calculate similarity scores
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
        
        # Get original (non-duplicate) images
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


@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok'})


if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=False)