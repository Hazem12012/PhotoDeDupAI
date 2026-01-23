import React, { useState } from 'react';
import { Users, Scan, Loader, FolderOutput, User, UsersRound, ImageOff } from 'lucide-react';

console.log(ImageOff);

const PersonGroup = ({ group, onNameChange }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [customName, setCustomName] = useState(`Person_${group.person_id}`);

    const handleSaveName = () => {
        onNameChange(group.person_id, customName);
        setIsEditing(false);
    };

    return (
        <div className="bg-white/5 backdrop-blur-lg rounded-xl p-4 border border-white/10">
            <div className="flex items-center justify-between mb-3">
                {isEditing ? (
                    <div className="flex gap-2 flex-1">
                        <input
                            type="text"
                            value={customName}
                            onChange={(e) => setCustomName(e.target.value)}
                            className="flex-1 px-3 py-1 bg-white/10 border border-white/20 rounded text-white text-sm"
                            placeholder="Person name"
                        />
                        <button
                            onClick={handleSaveName}
                            className="px-3 py-1 bg-green-500 text-white rounded text-sm font-medium"
                        >
                            Save
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center gap-2">
                            <User className="text-purple-400" size={18} />
                            <span className="text-white font-semibold">{customName}</span>
                        </div>
                        <button
                            onClick={() => setIsEditing(true)}
                            className="text-xs text-gray-400 hover:text-white"
                        >
                            Rename
                        </button>
                    </>
                )}
            </div>

            <div className="text-gray-400 text-sm mb-3">
                {group.image_count} image{group.image_count > 1 ? 's' : ''}
            </div>

            <div className="grid grid-cols-3 gap-2">
                {group.images.slice(0, 6).map((img, idx) => (
                    <div key={idx} className="aspect-square bg-black/30 rounded overflow-hidden">
                        <img
                            src={`http://127.0.0.1:5000/api/thumbnail`}
                            alt={img.filename}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                                e.target.style.display = 'none';
                            }}
                        />
                    </div>
                ))}
            </div>

            {group.image_count > 6 && (
                <div className="text-center text-xs text-gray-500 mt-2">
                    +{group.image_count - 6} more
                </div>
            )}
        </div>
    );
};

const FaceRecognitionPanel = ({ onComplete }) => {
    const [isDetecting, setIsDetecting] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isOrganizing, setIsOrganizing] = useState(false);

    const [selectedFolder, setSelectedFolder] = useState('');
    const [faceStats, setFaceStats] = useState(null);
    const [personGroups, setPersonGroups] = useState([]);
    const [multipleFaces, setMultipleFaces] = useState([]);
    const [noFaces, setNoFaces] = useState([]);

    const [tolerance, setTolerance] = useState(0.6);
    const [outputDir, setOutputDir] = useState('');
    const [organizeMode, setOrganizeMode] = useState('copy');
    const [personNames, setPersonNames] = useState({});

    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [currentStep, setCurrentStep] = useState('select'); // select, detect, analyze, organize

    const handleSelectFolder = async () => {
        try {
            const result = await window.electron.selectFolder();
            if (result && !result.canceled && result.filePaths && result.filePaths.length > 0) {
                setSelectedFolder(result.filePaths[0]);
                setError(null);
                setSuccess(null);
                setCurrentStep('detect');
                setFaceStats(null);
                setPersonGroups([]);
                setMultipleFaces([]);
                setNoFaces([]);
            }
        } catch (err) {
            setError('Failed to select folder: ' + err.message);
        }
    };

    const handleDetectFaces = async () => {
        if (!selectedFolder) {
            setError('Please select a folder first');
            return;
        }
        setIsDetecting(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await fetch('http://127.0.0.1:5000/api/faces/detect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ directory: selectedFolder })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to detect faces');
            }

            setFaceStats(data.stats);
            setCurrentStep('analyze');
            setSuccess(`Detected faces in ${data.stats.images_with_faces} images`);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsDetecting(false);
        }
    };

    const handleAnalyzeFaces = async () => {
        setIsAnalyzing(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await fetch('http://127.0.0.1:5000/api/faces/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ directory: selectedFolder, tolerance })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to analyze faces');
            }

            setPersonGroups(data.person_groups);
            setMultipleFaces(data.images_with_multiple_faces);
            setNoFaces(data.images_without_faces);
            setCurrentStep('organize');
            setSuccess(`Found ${data.total_people} unique people`);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleSelectOutputDir = async () => {
        try {
            const result = await window.electron.selectFolder();
            if (result && !result.canceled && result.filePaths && result.filePaths.length > 0) {
                setOutputDir(result.filePaths[0]);
            }
        } catch (err) {
            setError('Failed to select folder: ' + err.message);
        }
    };

    const handleOrganize = async () => {
        if (!outputDir) {
            setError('Please select an output directory');
            return;
        }

        setIsOrganizing(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await fetch('http://127.0.0.1:5000/api/faces/organize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    person_groups: personGroups,
                    images_with_multiple_faces: multipleFaces,
                    images_without_faces: noFaces,
                    output_directory: outputDir,
                    mode: organizeMode,
                    person_names: personNames
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to organize images');
            }

            setSuccess(`Organized ${data.results.organized} images into ${data.results.folders_created.length} folders`);
            if (onComplete) onComplete(data.results);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsOrganizing(false);
        }
    };

    const handlePersonNameChange = (personId, newName) => {
        setPersonNames({
            ...personNames,
            [personId]: newName
        });
    };

    const getToleranceLabel = () => {
        if (tolerance < 0.5) return 'Very Strict';
        if (tolerance < 0.6) return 'Strict';
        if (tolerance < 0.7) return 'Normal';
        return 'Loose';
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="text-center">
                <h2 className="text-3xl font-bold text-white mb-2 flex items-center justify-center gap-3">
                    <Users className="text-purple-400" size={32} />
                    Face Recognition & Organization
                </h2>
                <p className="text-gray-300">
                    Automatically organize images by person using AI face recognition
                </p>
            </div>

            {/* Step 1: Select Folder */}
            <div className={`bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 ${currentStep === 'select' ? 'ring-2 ring-blue-500' : ''}`}>
                <h3 className="text-white font-semibold text-xl mb-4 flex items-center gap-2">
                    <FolderOutput className="text-blue-400" size={24} />
                    Step 1: Select Folder
                </h3>

                <div className="flex gap-4">
                    <button
                        onClick={handleSelectFolder}
                        disabled={isDetecting || isAnalyzing || isOrganizing}
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

            {/* Step 2: Detect Faces */}
            <div className={`bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 ${currentStep === 'detect' ? 'ring-2 ring-purple-500' : ''} ${currentStep === 'select' ? 'opacity-50 pointer-events-none' : ''}`}>
                <h3 className="text-white font-semibold text-xl mb-4 flex items-center gap-2">
                    <Scan className="text-purple-400" size={24} />
                    Step 2: Detect Faces
                </h3>

                <button
                    onClick={handleDetectFaces}
                    disabled={isDetecting || !selectedFolder}
                    className="w-full px-6 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-bold hover:from-purple-600 hover:to-pink-600 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                >
                    {isDetecting ? (
                        <>
                            <Loader className="animate-spin" size={20} />
                            Detecting Faces...
                        </>
                    ) : (
                        <>
                            <Scan size={20} />
                            Detect Faces in Images
                        </>
                    )}
                </button>

                {faceStats && (
                    <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                        <div>
                            <div className="text-2xl font-bold text-blue-400">{faceStats.total_images}</div>
                            <div className="text-gray-400 text-sm">Total Images</div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-green-400">{faceStats.images_with_faces}</div>
                            <div className="text-gray-400 text-sm">With Faces</div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-yellow-400">{faceStats.total_faces}</div>
                            <div className="text-gray-400 text-sm">Total Faces</div>
                        </div>
                    </div>
                )}
            </div>

            {/* Step 3: Analyze & Cluster */}
            {currentStep !== 'select' && currentStep !== 'detect' && (
                <div className={`bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 ${currentStep === 'analyze' ? 'ring-2 ring-purple-500' : ''}`}>
                    <h3 className="text-white font-semibold text-xl mb-4 flex items-center gap-2">
                        <UsersRound className="text-purple-400" size={24} />
                        Step 3: Analyze & Group People
                    </h3>

                    {/* Tolerance Slider */}
                    <div className="mb-6">
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-white font-medium text-sm">
                                Clustering Tolerance
                            </label>
                            <span className="text-purple-400 font-mono text-sm font-bold">
                                {tolerance.toFixed(2)} - {getToleranceLabel()}
                            </span>
                        </div>
                        <input
                            type="range"
                            min="0.4"
                            max="0.8"
                            step="0.05"
                            value={tolerance}
                            onChange={(e) => setTolerance(parseFloat(e.target.value))}
                            disabled={isAnalyzing}
                            className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer slider-thumb disabled:opacity-50"
                        />
                        <div className="flex justify-between text-xs text-gray-400 mt-1">
                            <span>0.4 (Strict - Same person must be very similar)</span>
                            <span>0.8 (Loose - More variations accepted)</span>
                        </div>
                    </div>

                    <button
                        onClick={handleAnalyzeFaces}
                        disabled={isAnalyzing || !faceStats}
                        className="w-full px-6 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-bold hover:from-purple-600 hover:to-pink-600 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                    >
                        {isAnalyzing ? (
                            <>
                                <Loader className="animate-spin" size={20} />
                                Analyzing Faces...
                            </>
                        ) : (
                            <>
                                <UsersRound size={20} />
                                Analyze & Group People
                            </>
                        )}
                    </button>
                </div>
            )}

            {/* Person Groups Display */}
            {personGroups.length > 0 && (
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                    <h3 className="text-white font-semibold text-xl mb-4">
                        Found {personGroups.length} Unique People
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {personGroups.map((group) => (
                            <PersonGroup
                                key={group.person_id}
                                group={group}
                                onNameChange={handlePersonNameChange}
                            />
                        ))}
                    </div>

                    {/* Additional Categories */}
                    <div className="grid grid-cols-2 gap-4 mt-6">
                        {multipleFaces.length > 0 && (
                            <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <UsersRound className="text-orange-400" size={18} />
                                    <span className="text-white font-semibold">Multiple People</span>
                                </div>
                                <div className="text-gray-400 text-sm">{multipleFaces.length} images</div>
                            </div>
                        )}

                        {noFaces.length > 0 && (
                            <div className="bg-gray-500/10 border border-gray-500/30 rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <ImageOff className="text-gray-400" size={18} />
                                    <span className="text-white font-semibold">No Faces</span>
                                </div>
                                <div className="text-gray-400 text-sm">{noFaces.length} images</div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Step 4: Organize */}
            {currentStep === 'organize' && personGroups.length > 0 && (
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 ring-2 ring-green-500">
                    <h3 className="text-white font-semibold text-xl mb-4 flex items-center gap-2">
                        <FolderOutput className="text-green-400" size={24} />
                        Step 4: Organize into Folders
                    </h3>

                    {/* Output Directory */}
                    <div className="mb-4">
                        <label className="block text-white font-semibold mb-2">Output Directory</label>
                        <div className="flex gap-3">
                            <button
                                onClick={handleSelectOutputDir}
                                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg border border-white/20 transition-colors"
                            >
                                Choose Folder
                            </button>
                            {outputDir && (
                                <div className="flex-1 flex items-center px-4 py-2 bg-white/5 rounded-lg border border-white/10">
                                    <span className="text-white text-sm truncate">{outputDir}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Mode Selection */}
                    <div className="mb-6">
                        <label className="block text-white font-semibold mb-2">Organization Mode</label>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setOrganizeMode('copy')}
                                className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${organizeMode === 'copy'
                                    ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
                                    : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
                                    }`}
                            >
                                Copy (Keep Originals)
                            </button>
                            <button
                                onClick={() => setOrganizeMode('move')}
                                className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${organizeMode === 'move'
                                    ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white'
                                    : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
                                    }`}
                            >
                                Move (Remove Originals)
                            </button>
                        </div>
                    </div>

                    <button
                        onClick={handleOrganize}
                        disabled={isOrganizing || !outputDir}
                        className="w-full px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg font-bold hover:from-green-600 hover:to-emerald-600 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                    >
                        {isOrganizing ? (
                            <>
                                <Loader className="animate-spin" size={20} />
                                Organizing...
                            </>
                        ) : (
                            <>
                                <FolderOutput size={20} />
                                Organize Images by Person
                            </>
                        )}
                    </button>
                </div>
            )}

            {/* Messages */}
            {error && (
                <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
                    {error}
                </div>
            )}

            {success && (
                <div className="p-4 bg-green-500/20 border border-green-500/50 rounded-lg text-green-200 text-sm">
                    {success}
                </div>
            )}

            <style jsx>{`
        .slider-thumb::-webkit-slider-thumb {
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: linear-gradient(135deg, #a78bfa 0%, #ec4899 100%);
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(168, 85, 247, 0.5);
        }
        
        .slider-thumb::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: linear-gradient(135deg, #a78bfa 0%, #ec4899 100%);
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 8px rgba(168, 85, 247, 0.5);
        }
      `}</style>
        </div>
    );
};

export default FaceRecognitionPanel;
