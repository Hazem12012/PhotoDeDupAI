import React, { useState } from 'react';
import { FolderOutput, FileText, Calendar, Sliders, Type, Loader } from 'lucide-react';

const OrganizePanel = () => {
    const [selectedFolder, setSelectedFolder] = useState('');
    const [renamePattern, setRenamePattern] = useState('IMG_{number}');
    const [startNumber, setStartNumber] = useState(1);
    const [isProcessing, setIsProcessing] = useState(false);
    const [results, setResults] = useState(null);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [activeTab, setActiveTab] = useState('rename'); // 'rename', 'date', 'type'

    const handleSelectFolder = async () => {
        try {
            const result = await window.electron.selectFolder();
            if (result && !result.canceled && result.filePaths && result.filePaths.length > 0) {
                setSelectedFolder(result.filePaths[0]);
                setResults(null);
                setError(null);
                setSuccess(null);
            }
        } catch (err) {
            setError('Failed to select folder: ' + err.message);
        }
    };

    const handleRename = async () => {
        if (!selectedFolder) {
            setError('Please select a folder first');
            return;
        }

        setIsProcessing(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await fetch('http://127.0.0.1:5000/api/organize/rename', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    directory: selectedFolder,
                    pattern: renamePattern,
                    start_number: startNumber
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to rename images');
            }

            setSuccess(`Successfully renamed ${data.renamed} images`);
            setResults(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const getPreviewName = () => {
        let name = renamePattern.replace('{number}', String(startNumber).padStart(4, '0'));
        const date = new Date().toISOString().split('T')[0];
        name = name.replace('{date}', date);
        name = name.replace('{original}', 'original_filename');
        return name + '.jpg';
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="text-center">
                <h2 className="text-3xl font-bold text-white mb-2 flex items-center justify-center gap-3">
                    <FolderOutput className="text-green-400" size={32} />
                    Organize & Rename
                </h2>
                <p className="text-gray-300">
                    Rename files and organize into folders
                </p>
            </div>

            {/* Folder Selection */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                <div className="flex gap-4">
                    <button
                        onClick={handleSelectFolder}
                        disabled={isProcessing}
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-cyan-600 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <FolderOutput size={20} />
                        Choose Folder
                    </button>
                    {selectedFolder && (
                        <div className="flex-1 flex items-center px-4 py-3 bg-white/5 rounded-lg border border-white/10">
                            <span className="text-white truncate text-sm">{selectedFolder}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2">
                <button
                    onClick={() => setActiveTab('rename')}
                    className={`flex-1 py-3 rounded-lg font-medium transition-all ${activeTab === 'rename'
                        ? 'bg-purple-500/20 text-purple-200 border border-purple-500/50'
                        : 'bg-white/5 text-gray-400 hover:bg-white/10'
                        }`}
                >
                    <Type size={18} className="inline mr-2" />
                    Rename Files
                </button>
                {/* 
                <button
                    onClick={() => setActiveTab('date')}
                    disabled={true} 
                    className="flex-1 py-3 rounded-lg font-medium bg-white/5 text-gray-500 cursor-not-allowed opacity-50"
                >
                    <Calendar size={18} className="inline mr-2" />
                    Organize by Date (Coming Soon)
                </button>
                 */}
            </div>

            {/* Rename Content */}
            {activeTab === 'rename' && (
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                    <h3 className="text-white font-semibold text-xl mb-6">Batch Rename</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                            <label className="block text-gray-300 text-sm font-medium mb-2">
                                Naming Pattern
                            </label>
                            <input
                                type="text"
                                value={renamePattern}
                                onChange={(e) => setRenamePattern(e.target.value)}
                                className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                placeholder="IMG_{number}"
                            />
                            <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-400">
                                <span className="bg-white/5 px-2 py-1 rounded cursor-pointer hover:bg-white/10" onClick={() => setRenamePattern(renamePattern + '{number}')}>{'{number}'}</span>
                                <span className="bg-white/5 px-2 py-1 rounded cursor-pointer hover:bg-white/10" onClick={() => setRenamePattern(renamePattern + '{date}')}>{'{date}'}</span>
                                <span className="bg-white/5 px-2 py-1 rounded cursor-pointer hover:bg-white/10" onClick={() => setRenamePattern(renamePattern + '{original}')}>{'{original}'}</span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-gray-300 text-sm font-medium mb-2">
                                Start Number
                            </label>
                            <input
                                type="number"
                                value={startNumber}
                                onChange={(e) => setStartNumber(parseInt(e.target.value) || 1)}
                                className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                        </div>
                    </div>

                    <div className="bg-black/30 rounded-lg p-4 mb-6">
                        <div className="text-gray-400 text-sm mb-1">Preview:</div>
                        <div className="text-green-400 font-mono text-lg">{getPreviewName()}</div>
                    </div>

                    <button
                        onClick={handleRename}
                        disabled={isProcessing || !selectedFolder}
                        className="w-full px-6 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-bold hover:from-purple-600 hover:to-pink-600 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                    >
                        {isProcessing ? (
                            <>
                                <Loader className="animate-spin" size={20} />
                                Renaming...
                            </>
                        ) : (
                            <>
                                <Type size={20} />
                                Rename All Files
                            </>
                        )}
                    </button>

                    {success && (
                        <div className="mt-4 p-4 bg-green-500/20 border border-green-500/50 rounded-lg text-green-200">
                            {success}
                        </div>
                    )}

                    {error && (
                        <div className="mt-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200">
                            {error}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default OrganizePanel;
