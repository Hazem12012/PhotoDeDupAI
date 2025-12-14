import React, { useState, useEffect } from 'react';
import { Image as ImageIcon, FileImage } from 'lucide-react';

const ImageCard = ({ image, thumbnail, isOriginal, isSelected, onSelect, showCheckbox }) => {
    const [imgSrc, setImgSrc] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (thumbnail) {
            setImgSrc(thumbnail);
            setLoading(false);
        } else {
            // Load thumbnail from backend
            fetch('http://127.0.0.1:5000/api/thumbnail', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: image.path, size: 250 })
            })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        setImgSrc(data.thumbnail);
                    }
                    setLoading(false);
                })
                .catch(() => setLoading(false));
        }
    }, [image.path, thumbnail]);

    return (
        <div
            className={`relative group rounded-lg overflow-hidden border-2 transition-all duration-200 ${isOriginal
                    ? 'border-green-500 shadow-lg shadow-green-500/20'
                    : isSelected
                        ? 'border-red-500 shadow-lg shadow-red-500/20'
                        : 'border-white/10 hover:border-purple-400'
                }`}
        >
            {/* Checkbox */}
            {showCheckbox && (
                <div className="absolute top-2 left-2 z-10">
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => onSelect(image.path, e.target.checked)}
                        className="w-5 h-5 cursor-pointer accent-red-500"
                    />
                </div>
            )}

            {/* Original Badge */}
            {isOriginal && (
                <div className="absolute top-2 right-2 z-10 bg-green-500 text-white px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
                    ⭐ Original
                </div>
            )}

            {/* Image */}
            <div className="aspect-square bg-black/30 flex items-center justify-center">
                {loading ? (
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
                ) : imgSrc ? (
                    <img
                        src={imgSrc}
                        alt={image.filename}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <FileImage className="text-gray-500" size={48} />
                )}
            </div>

            {/* Info Overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-white text-xs font-medium truncate" title={image.filename}>
                    {image.filename}
                </p>
                <div className="flex justify-between text-xs text-gray-300 mt-1">
                    <span>{image.width} × {image.height}</span>
                    <span>{image.size_mb} MB</span>
                </div>
            </div>
        </div>
    );
};

const ImageGallery = ({ images, title, isOriginals, selectedImages, onSelectImage, showCheckboxes }) => {
    if (!images || images.length === 0) {
        return null;
    }

    return (
        <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold text-xl flex items-center gap-2">
                    <ImageIcon className={isOriginals ? 'text-green-400' : 'text-red-400'} size={24} />
                    {title}
                    <span className="text-gray-400 text-sm font-normal">({images.length})</span>
                </h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {images.map((image) => (
                    <ImageCard
                        key={image.path}
                        image={image}
                        isOriginal={isOriginals}
                        isSelected={selectedImages?.includes(image.path)}
                        onSelect={onSelectImage}
                        showCheckbox={showCheckboxes}
                    />
                ))}
            </div>
        </div>
    );
};

export default ImageGallery;
