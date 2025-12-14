import React, { useState, useEffect } from 'react';
import { FolderOpen, Search, Trash2, CheckCircle, AlertCircle, Loader, RefreshCw } from 'lucide-react';
import ThresholdControls from './ThresholdControls';
import ImageGallery from './ImageGallery';
import DuplicateGroup from './DuplicateGroup';

const DuplicateRemover = () => {
    const [selectedFolder, setSelectedFolder] = useState('');
    const [serverStatus, setServerStatus] = useState('checking');

    // Image states
    const [allImages, setAllImages] = useState([]);
    const [originalImages, setOriginalImages] = useState([]);
    const [duplicateGroups, setDuplicateGroups] = useState([]);

    // Processing states
    const [isScanning, setIsScanning] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Threshold states
    const [ssimThreshold, setSsimThreshold] = useState(0.95);
    const [mseThreshold, setMseThreshold] = useState(20);
    const [customMode, setCustomMode] = useState(true);

    // Selection states
    const [selectedDuplicates, setSelectedDuplicates] = useState([]);

    // UI states
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [currentStep, setCurrentStep] = useState('select'); // select, scanned, analyzed

    // Check server health on mount
    useEffect(() => {
        checkServerHealth();
    }, []);

    const checkServerHealth = async () => {
        try {
            const response = await fetch('http://127.0.0.1:5000/api/health');
            if (response.ok) {
                setServerStatus('online');
            } else {
                setServerStatus('offline');
            }
        } catch (err) {
            setServerStatus('offline');
        }
    };

    const handleSelectFolder = async () => {
        try {
            const result = await window.electron.selectFolder();
            if (result && !result.canceled && result.filePaths && result.filePaths.length > 0) {
                setSelectedFolder(result.filePaths[0]);
                setError(null);
                setSuccess(null);
                setCurrentStep('select');
                setAllImages([]);
                setOriginalImages([]);
                setDuplicateGroups([]);
                setSelectedDuplicates([]);
            }
        } catch (err) {
            setError('Failed to select folder: ' + err.message);
        }
    };

    const handleScanFolder = async () => {
        if (!selectedFolder) {
            setError('Please select a folder first');
            return;
        }

        if (serverStatus !== 'online') {
            setError('Backend server is not running. Please start the server first.');
            return;
        }

        setIsScanning(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await fetch('http://127.0.0.1:5000/api/scan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ directory: selectedFolder })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to scan folder');
            }

            setAllImages(data.images);
            setCurrentStep('scanned');
            setSuccess(`Found ${data.count} images in folder`);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsScanning(false);
        }
    };

    const handleAnalyzeDuplicates = async () => {
        if (allImages.length === 0) {
            setError('Please scan a folder first');
            return;
        }

        setIsAnalyzing(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await fetch('http://127.0.0.1:5000/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    directory: selectedFolder,
                    ssim_threshold: ssimThreshold,
                    mse_threshold: mseThreshold,
                    custom: customMode
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to analyze duplicates');
            }

            setDuplicateGroups(data.duplicate_groups);
            setOriginalImages(data.original_images);
            setCurrentStep('analyzed');

            // Auto-select all duplicates
            const allDups = data.duplicate_groups.flatMap(g => g.duplicates.map(d => d.path));
            setSelectedDuplicates(allDups);

            setSuccess(`Found ${data.total_duplicates} duplicates in ${data.total_groups} groups`);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleDeleteDuplicates = async () => {
        if (selectedDuplicates.length === 0) {
            setError('No duplicates selected for deletion');
            return;
        }

        const confirmed = window.confirm(
            `Are you sure you want to delete ${selectedDuplicates.length} duplicate image(s)?\n\n` +
            `This action cannot be undone!`
        );

        if (!confirmed) return;

        setIsDeleting(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await fetch('http://127.0.0.1:5000/api/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ files: selectedDuplicates })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to delete duplicates');
            }

            setSuccess(`Successfully deleted ${data.deleted} file(s)`);

            if (data.failed > 0) {
                setError(`Failed to delete ${data.failed} file(s)`);
            }

            // Reset to scan again
            setCurrentStep('select');
            setAllImages([]);
            setOriginalImages([]);
            setDuplicateGroups([]);
            setSelectedDuplicates([]);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleSelectDuplicate = (path, selected) => {
        if (selected) {
            setSelectedDuplicates([...selectedDuplicates, path]);
        } else {
            setSelectedDuplicates(selectedDuplicates.filter(p => p !== path));
        }
    };

    const handleSelectAllDuplicates = () => {
        const allDups = duplicateGroups.flatMap(g => g.duplicates.map(d => d.path));
        setSelectedDuplicates(allDups);
    };

    const handleDeselectAll = () => {
        setSelectedDuplicates([]);
    };

    const getTotalSpaceToFree = () => {
        let total = 0;
        duplicateGroups.forEach(group => {
            group.duplicates.forEach(dup => {
                if (selectedDuplicates.includes(dup.path)) {
                    total += dup.info?.size_mb || 0;
                }
            });
        });
        return total.toFixed(2);
    };

    const getStatusColor = () => {
        switch (serverStatus) {
            case 'online': return 'text-green-500';
            case 'offline': return 'text-red-500';
            default: return 'text-yellow-500';
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-5xl font-bold text-white mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
                        Advanced Duplicate Image Remover
                    </h1>
                    <p className="text-gray-300 text-lg">
                        Preview, classify, and control duplicate detection with precision
                    </p>

                    {/* Server Status */}
                    <div className="mt-4 flex items-center justify-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${serverStatus === 'online' ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></div>
                        <span className={`text-sm font-medium ${getStatusColor()}`}>
                            Server: {serverStatus}
                        </span>
                    </div>
                </div>

                {/* Main Controls */}
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 p-8 mb-8">
                    {/* Folder Selection */}
                    <div className="mb-6">
                        <label className="block text-white font-semibold mb-3 text-lg">
                            Select Image Folder
                        </label>
                        <div className="flex gap-4">
                            <button
                                onClick={handleSelectFolder}
                                disabled={isScanning || isAnalyzing || isDeleting}
                                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <FolderOpen size={20} />
                                Choose Folder
                            </button>
                            {selectedFolder && (
                                <div className="flex-1 flex items-center px-4 py-3 bg-white/5 rounded-lg border border-white/10">
                                    <span className="text-white truncate text-sm">{selectedFolder}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Mode Selection */}
                    <div className="mb-6">
                        <label className="block text-white font-semibold mb-3 text-lg">
                            Keep Mode
                        </label>
                        <div className="flex gap-4">
                            <button
                                onClick={() => setCustomMode(true)}
                                disabled={isScanning || isAnalyzing || isDeleting}
                                className={`flex-1 px-6 py-4 rounded-lg font-semibold transition-all duration-200 ${customMode
                                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                                    : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
                                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                                <div className="text-left">
                                    <div className="font-bold mb-1">Custom Mode</div>
                                    <div className="text-xs opacity-80">Keep highest numbered filename</div>
                                </div>
                            </button>
                            <button
                                onClick={() => setCustomMode(false)}
                                disabled={isScanning || isAnalyzing || isDeleting}
                                className={`flex-1 px-6 py-4 rounded-lg font-semibold transition-all duration-200 ${!customMode
                                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                                    : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
                                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                                <div className="text-left">
                                    <div className="font-bold mb-1">Standard Mode</div>
                                    <div className="text-xs opacity-80">Keep widest/largest image</div>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <button
                            onClick={handleScanFolder}
                            disabled={!selectedFolder || isScanning || isAnalyzing || isDeleting || serverStatus !== 'online'}
                            className="px-6 py-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-bold hover:from-blue-600 hover:to-cyan-600 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                        >
                            {isScanning ? (
                                <>
                                    <Loader className="animate-spin" size={20} />
                                    Scanning...
                                </>
                            ) : (
                                <>
                                    <Search size={20} />
                                    1. Scan Folder
                                </>
                            )}
                        </button>

                        <button
                            onClick={handleAnalyzeDuplicates}
                            disabled={allImages.length === 0 || isScanning || isAnalyzing || isDeleting}
                            className="px-6 py-4 bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-lg font-bold hover:from-orange-600 hover:to-yellow-600 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                        >
                            {isAnalyzing ? (
                                <>
                                    <Loader className="animate-spin" size={20} />
                                    Analyzing...
                                </>
                            ) : (
                                <>
                                    <RefreshCw size={20} />
                                    2. Analyze Duplicates
                                </>
                            )}
                        </button>

                        <button
                            onClick={handleDeleteDuplicates}
                            disabled={selectedDuplicates.length === 0 || isScanning || isAnalyzing || isDeleting}
                            className="px-6 py-4 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-lg font-bold hover:from-red-600 hover:to-pink-600 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                        >
                            {isDeleting ? (
                                <>
                                    <Loader className="animate-spin" size={20} />
                                    Deleting...
                                </>
                            ) : (
                                <>
                                    <Trash2 size={20} />
                                    3. Delete Selected ({selectedDuplicates.length})
                                </>
                            )}
                        </button>
                    </div>

                    {/* Messages */}
                    {error && (
                        <div className="mt-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg flex items-start gap-3">
                            <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={20} />
                            <div className="text-red-200 text-sm">{error}</div>
                        </div>
                    )}

                    {success && (
                        <div className="mt-6 p-4 bg-green-500/20 border border-green-500/50 rounded-lg flex items-start gap-3">
                            <CheckCircle className="text-green-400 flex-shrink-0 mt-0.5" size={20} />
                            <div className="text-green-200 text-sm">{success}</div>
                        </div>
                    )}
                </div>

                {/* Threshold Controls */}
                {currentStep !== 'select' && (
                    <ThresholdControls
                        ssimThreshold={ssimThreshold}
                        mseThreshold={mseThreshold}
                        onSsimChange={setSsimThreshold}
                        onMseChange={setMseThreshold}
                        disabled={isScanning || isAnalyzing || isDeleting}
                    />
                )}

                {/* Results */}
                {currentStep === 'scanned' && allImages.length > 0 && (
                    <div className="mt-8">
                        <ImageGallery
                            images={allImages}
                            title="All Images in Folder"
                            isOriginals={false}
                            showCheckboxes={false}
                        />
                    </div>
                )}

                {currentStep === 'analyzed' && (
                    <div className="mt-8 space-y-8">
                        {/* Summary */}
                        {duplicateGroups.length > 0 && (
                            <div className="bg-white/5 backdrop-blur-lg rounded-xl p-6 border border-white/10">
                                <h3 className="text-white font-semibold text-xl mb-4">Summary</h3>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
                                    <div>
                                        <div className="text-3xl font-bold text-purple-400">{duplicateGroups.length}</div>
                                        <div className="text-gray-400 text-sm">Duplicate Groups</div>
                                    </div>
                                    <div>
                                        <div className="text-3xl font-bold text-red-400">
                                            {duplicateGroups.reduce((sum, g) => sum + g.count, 0)}
                                        </div>
                                        <div className="text-gray-400 text-sm">Total Duplicates</div>
                                    </div>
                                    <div>
                                        <div className="text-3xl font-bold text-green-400">{selectedDuplicates.length}</div>
                                        <div className="text-gray-400 text-sm">Selected for Deletion</div>
                                    </div>
                                    <div>
                                        <div className="text-3xl font-bold text-yellow-400">{getTotalSpaceToFree()} MB</div>
                                        <div className="text-gray-400 text-sm">Space to Free</div>
                                    </div>
                                </div>
                                <div className="flex gap-3 mt-4">
                                    <button
                                        onClick={handleSelectAllDuplicates}
                                        className="flex-1 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg font-medium transition-colors"
                                    >
                                        Select All Duplicates
                                    </button>
                                    <button
                                        onClick={handleDeselectAll}
                                        className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg font-medium transition-colors"
                                    >
                                        Deselect All
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Original Images */}
                        {originalImages.length > 0 && (
                            <ImageGallery
                                images={originalImages}
                                title="Original Images (No Duplicates)"
                                isOriginals={true}
                                showCheckboxes={false}
                            />
                        )}

                        {/* Duplicate Groups */}
                        {duplicateGroups.length > 0 && (
                            <div>
                                <h3 className="text-white font-semibold text-2xl mb-4">Duplicate Groups</h3>
                                {duplicateGroups.map((group, index) => (
                                    <DuplicateGroup
                                        key={index}
                                        group={group}
                                        groupIndex={index}
                                        selectedDuplicates={selectedDuplicates}
                                        onSelectDuplicate={handleSelectDuplicate}
                                    />
                                ))}
                            </div>
                        )}

                        {duplicateGroups.length === 0 && (
                            <div className="text-center py-12">
                                <CheckCircle className="mx-auto text-green-400 mb-4" size={64} />
                                <h3 className="text-white font-semibold text-2xl mb-2">No Duplicates Found!</h3>
                                <p className="text-gray-400">All images in this folder are unique.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default DuplicateRemover;
