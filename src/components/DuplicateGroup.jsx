import React, { useState, useEffect } from 'react';
import { Copy, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

const DuplicateGroup = ({ group, groupIndex, selectedDuplicates, onSelectDuplicate }) => {
    const [expanded, setExpanded] = useState(true);
    const [thumbnails, setThumbnails] = useState({});

    useEffect(() => {
        // Load thumbnails for original and duplicates
        const loadThumbnails = async () => {
            const paths = [group.original.path, ...group.duplicates.map(d => d.path)];
            const thumbs = {};

            for (const path of paths) {
                try {
                    const response = await fetch('http://127.0.0.1:5000/api/thumbnail', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ path, size: 300 })
                    });
                    const data = await response.json();
                    if (data.success) {
                        thumbs[path] = data.thumbnail;
                    }
                } catch (error) {
                    console.error(`Error loading thumbnail for ${path}:`, error);
                }
            }

            setThumbnails(thumbs);
        };

        if (expanded) {
            loadThumbnails();
        }
    }, [expanded, group]);

    const allSelected = group.duplicates.every(d => selectedDuplicates.includes(d.path));
    const someSelected = group.duplicates.some(d => selectedDuplicates.includes(d.path));

    const toggleAll = () => {
        group.duplicates.forEach(dup => {
            onSelectDuplicate(dup.path, !allSelected);
        });
    };

    const getSimilarityColor = (ssim) => {
        if (ssim >= 0.98) return 'text-red-400';
        if (ssim >= 0.95) return 'text-orange-400';
        if (ssim >= 0.90) return 'text-yellow-400';
        return 'text-green-400';
    };

    return (
        <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 overflow-hidden mb-4">
            {/* Header */}
            <div
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center gap-3">
                    <Copy className="text-purple-400" size={20} />
                    <div>
                        <h4 className="text-white font-semibold">
                            Duplicate Group #{groupIndex + 1}
                        </h4>
                        <p className="text-gray-400 text-sm">
                            {group.count} duplicate{group.count > 1 ? 's' : ''} found
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleAll();
                        }}
                        className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded text-sm font-medium transition-colors"
                    >
                        {allSelected ? 'Deselect All' : 'Select All'}
                    </button>
                    {expanded ? (
                        <ChevronUp className="text-gray-400" size={20} />
                    ) : (
                        <ChevronDown className="text-gray-400" size={20} />
                    )}
                </div>
            </div>

            {/* Content */}
            {expanded && (
                <div className="p-4 pt-0 space-y-4">
                    {/* Original Image */}
                    <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/30">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="bg-green-500 text-white px-2 py-1 rounded text-xs font-bold">
                                ⭐ ORIGINAL - KEEP
                            </div>
                            <span className="text-gray-300 text-sm">{group.original.filename}</span>
                        </div>
                        <div className="flex gap-4">
                            <div className="w-48 h-48 bg-black/30 rounded-lg overflow-hidden flex-shrink-0">
                                {thumbnails[group.original.path] ? (
                                    <img
                                        src={thumbnails[group.original.path]}
                                        alt={group.original.filename}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400"></div>
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 text-sm text-gray-300 space-y-1">
                                <p><span className="text-gray-400">Size:</span> {group.original.info?.width} × {group.original.info?.height}</p>
                                <p><span className="text-gray-400">File Size:</span> {group.original.info?.size_mb} MB</p>
                                <p><span className="text-gray-400">Path:</span> <span className="text-xs font-mono">{group.original.path}</span></p>
                            </div>
                        </div>
                    </div>

                    {/* Duplicates */}
                    <div className="space-y-3">
                        {group.duplicates.map((duplicate, idx) => {
                            const isSelected = selectedDuplicates.includes(duplicate.path);
                            return (
                                <div
                                    key={duplicate.path}
                                    className={`bg-red-500/10 rounded-lg p-4 border transition-all ${isSelected ? 'border-red-500' : 'border-red-500/30'
                                        }`}
                                >
                                    <div className="flex items-center gap-2 mb-3">
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={(e) => onSelectDuplicate(duplicate.path, e.target.checked)}
                                            className="w-5 h-5 cursor-pointer accent-red-500"
                                        />
                                        <div className="bg-red-500 text-white px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
                                            <Trash2 size={12} />
                                            DUPLICATE #{idx + 1}
                                        </div>
                                        <span className="text-gray-300 text-sm">{duplicate.filename}</span>
                                        <div className="ml-auto flex gap-2">
                                            <span className={`text-xs font-mono ${getSimilarityColor(duplicate.ssim)}`}>
                                                SSIM: {duplicate.ssim}
                                            </span>
                                            <span className="text-xs font-mono text-gray-400">
                                                MSE: {duplicate.mse}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="w-48 h-48 bg-black/30 rounded-lg overflow-hidden flex-shrink-0">
                                            {thumbnails[duplicate.path] ? (
                                                <img
                                                    src={thumbnails[duplicate.path]}
                                                    alt={duplicate.filename}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-400"></div>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 text-sm text-gray-300 space-y-1">
                                            <p><span className="text-gray-400">Size:</span> {duplicate.info?.width} × {duplicate.info?.height}</p>
                                            <p><span className="text-gray-400">File Size:</span> {duplicate.info?.size_mb} MB</p>
                                            <p><span className="text-gray-400">Path:</span> <span className="text-xs font-mono">{duplicate.path}</span></p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DuplicateGroup;
