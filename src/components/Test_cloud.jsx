import React, { useState, useRef } from "react";
import { Upload, X, Image as ImageIcon, FolderOpen, Send } from "lucide-react";

const isElectronReady = window.electron && window.electron.selectFolder;

export default function Test_cloud() {
  const [images, setImages] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [folderPath, setFolderPath] = useState("");
  const [uploading, setUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const fileInputRef = useRef(null);


  const addImagesFromFiles = (files) => {
    images.forEach(
      (img) =>
        img.preview.startsWith("blob:") && URL.revokeObjectURL(img.preview)
    );

    const newImages = files.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      preview: URL.createObjectURL(file),
      name: file.name,
      size: (file.size / 1024 / 1024).toFixed(2) + " MB",
      source: "File API",
    }));

    setImages((prev) => [...prev.filter((img) => !img.filePath), ...newImages]); 
    setStatusMessage(`Added ${newImages.length} new images via file browser.`);
  };

  const addLoadedImagePaths = (paths) => {
    const newImages = paths.map((path, index) => {
      const parts = path.split(/[/\\]/);
      const name = parts[parts.length - 1];

      const mockSizeMB = (Math.random() * 5 + 1).toFixed(2);


      const placeholderImage = `https://placehold.co/400x400/1e293b/a5f3fc?text=Image+Preview+Mock+${(index % 3) + 1}`;

      return {
        id: Math.random().toString(36).substr(2, 9),

        preview: placeholderImage,
        name: name,
        size: `${mockSizeMB} MB (Local File)`, 
        filePath: path, 
        source: "Electron Folder",
      };
    });

    setImages((prev) => [...prev.filter((img) => !img.filePath), ...newImages]);
    setStatusMessage(
      `Added ${newImages.length} image paths from selected folder.`
    );
  };

  const handleFolderSelectionAndLoad = async () => {
    if (!isElectronReady) {
      setStatusMessage("🚨 This feature requires the Electron API.");
      return;
    }

    setStatusMessage("Opening native folder dialog...");
    setUploading(true);

    const dialogResult = await window.electron.selectFolder();

    if (
      dialogResult &&
      dialogResult.canceled === false &&
      dialogResult.filePaths.length > 0
    ) {
      const path = dialogResult.filePaths[0];
      setFolderPath(path);
      setStatusMessage(`Selected folder: ${path}. Loading files...`);

      const loadResult = await window.electron.loadImages(path);

      if (loadResult.success && loadResult.imagePaths.length > 0) {
        addLoadedImagePaths(loadResult.imagePaths);

        setStatusMessage(
          `✅ Successfully found and loaded ${loadResult.imagePaths.length} image paths (mock preview enabled).`
        );
      } else if (loadResult.success) {
        setStatusMessage(
          "⚠️ Folder selected but no supported images were found."
        );
      } else {
        setStatusMessage(`❌ Error loading files: ${loadResult.error}`);
      }
    } else {
      setStatusMessage("Folder selection cancelled.");
    }

    setUploading(false);
  };

  const removeImage = (id) => {
    setImages((prev) => {
      const img = prev.find((i) => i.id === id);
      if (img && img.preview.startsWith("blob:"))
        URL.revokeObjectURL(img.preview);
      return prev.filter((i) => i.id !== id);
    });
    setStatusMessage("Image removed.");
  };


  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
    setStatusMessage("Ready to drop files...");
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
    setStatusMessage("");
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files).filter((file) =>
      file.type.startsWith("image/")
    );

    addImagesFromFiles(files);
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    addImagesFromFiles(files);
  };


  const sendToBackend = async () => {
    if (images.length === 0) return;

    setStatusMessage("Simulating upload to backend...");
    setUploading(true);

    await new Promise((resolve) => setTimeout(resolve, 1500));

    images.forEach(
      (img) =>
        img.preview.startsWith("blob:") && URL.revokeObjectURL(img.preview)
    );
    setImages([]);

    setStatusMessage(
      "🚀 All images successfully processed by the mock backend!"
    );
    setUploading(false);
  };

  return (
    <div className='min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8'>
      <div className='max-w-6xl mx-auto'>
        <div className='text-center mb-8'>
          <h1 className='text-4xl font-bold text-white mb-2'>
            Desktop Image Manager
          </h1>
          <p className='text-purple-200'>
            Upload images via drag & drop or use native folder selection
          </p>
        </div>

        {statusMessage && (
          <div
            className={`text-center p-3 rounded-lg mb-6 font-medium ${
              statusMessage.startsWith("✅")
                ? "bg-green-600/30 text-green-300"
                : statusMessage.startsWith("❌")
                  ? "bg-red-600/30 text-red-300"
                  : "bg-purple-600/30 text-purple-300"
            }`}>
            {statusMessage}
          </div>
        )}

        {/* Folder Path Input (Now uses Button to trigger native dialog) */}
        <div className='bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-6 border border-white/20'>
          <label className='block text-white font-medium mb-3'>
            Load from Folder Path (Desktop Access)
          </label>
          <div className='flex flex-col md:flex-row gap-3'>
            <input
              type='text'
              value={
                folderPath ||
                (isElectronReady
                  ? "Click the button to select a folder..."
                  : "Feature disabled: Not running in Electron.")
              }
              readOnly
              className='flex-1 px-4 py-3 bg-white/10 border border-white/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-400 cursor-default truncate'
              title={folderPath}
            />
            <button
              onClick={handleFolderSelectionAndLoad}
              disabled={uploading || !isElectronReady}
              className={`px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-colors ${
                isElectronReady && !uploading
                  ? "bg-purple-600 hover:bg-purple-700 text-white"
                  : "bg-gray-700 text-gray-400 cursor-not-allowed"
              }`}>
              <FolderOpen size={20} />
              {uploading ? "Selecting..." : "Browse Folder"}
            </button>
          </div>
        </div>

        {/* Drag & Drop Area */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative bg-white/10 backdrop-blur-lg rounded-2xl p-12 mb-6 border-2 border-dashed transition-all ${
            isDragging
              ? "border-purple-400 bg-purple-500/20 scale-[1.02]"
              : "border-white/30 hover:border-purple-400/50"
          }`}>
          <input
            ref={fileInputRef}
            type='file'
            multiple
            accept='image/*'
            onChange={handleFileSelect}
            className='hidden'
          />

          <div className='text-center'>
            <Upload className='w-16 h-16 mx-auto mb-4 text-purple-300' />
            <h3 className='text-xl font-semibold text-white mb-2'>
              Drop images here or click to browse
            </h3>
            <p className='text-purple-200 mb-6'>Supports JPG, PNG, GIF, WebP</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className='px-6 py-3 bg-white/20 hover:bg-white/30 text-white rounded-lg font-medium transition-colors'>
              Browse Files
            </button>
          </div>
        </div>

        {/* Image Preview Grid */}
        {images.length > 0 && (
          <div className='bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-6 border border-white/20'>
            <div className='flex items-center justify-between mb-4'>
              <h3 className='text-xl font-semibold text-white'>
                Selected Images ({images.length})
              </h3>
              <button
                onClick={() => {
                  // Revoke all Blob URLs before clearing
                  images.forEach(
                    (img) =>
                      img.preview.startsWith("blob:") &&
                      URL.revokeObjectURL(img.preview)
                  );
                  setImages([]);
                  setFolderPath(""); // Clear folder path when clearing all images
                  setStatusMessage("All images cleared.");
                }}
                className='text-red-400 hover:text-red-300 text-sm font-medium'>
                Clear All
              </button>
            </div>

            <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'>
              {images.map((img) => (
                <div key={img.id} className='relative group'>
                  <div className='aspect-square rounded-lg overflow-hidden bg-white/5'>
                    <img
                      src={img.preview}
                      alt={img.name}
                      className='w-full h-full object-cover'
                      // Fallback for security/local file issues (Placeholder images don't need this, but Blob URLs do)
                      onError={(e) =>
                        // If the mock image fails to load, use a simple text placeholder
                        (e.target.src =
                          "https://placehold.co/400x400/333/fff?text=FILE+ERROR")
                      }
                    />
                  </div>
                  <button
                    onClick={() => removeImage(img.id)}
                    className='absolute -top-2 -right-2 p-1 bg-red-500 hover:bg-red-600 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity'>
                    <X size={16} />
                  </button>
                  <div className='mt-2'>
                    <p className='text-white text-sm truncate' title={img.name}>
                      {img.name}
                    </p>
                    <p className='text-purple-300 text-xs flex justify-between'>
                      <span>{img.size}</span>
                      <span className='italic text-purple-400/80'>
                        {img.source}
                      </span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {images.length > 0 && (
          <button
            onClick={sendToBackend}
            disabled={uploading}
            className={`w-full py-4 rounded-xl font-semibold text-lg flex items-center justify-center gap-3 transition-all ${
              uploading
                ? "bg-gray-600 cursor-not-allowed text-white/70"
                : "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg shadow-purple-500/50"
            }`}>
            {uploading ? (
              <>
                <div className='w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin' />
                Uploading...
              </>
            ) : (
              <>
                <Send size={24} />
                Start Filtering
              </>
            )}
          </button>
        )}

        {/* Empty State */}
        {images.length === 0 && (
          <div className='text-center py-12'>
            <ImageIcon className='w-20 h-20 mx-auto mb-4 text-purple-300/50' />
            <p className='text-purple-200/70 text-lg'>
              No images selected yet. Drag & drop or browse to get started!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
