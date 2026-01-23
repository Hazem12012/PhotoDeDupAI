import React, { useState } from "react";
import { Copy, Users, FolderOutput } from "lucide-react";
import DuplicateRemover from "./DuplicateRemover";
import FaceRecognitionPanel from "./FaceRecognitionPanel";
import OrganizePanel from "./OrganizePanel";

const App = () => {
  const [activeTab, setActiveTab] = useState("duplicates"); // 'duplicates', 'faces', 'organize'

  return (
    <div className='min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900'>
      {/* Header */}
      <div className='bg-white/5 backdrop-blur-lg border-b border-white/10'>
        <div className='max-w-7xl mx-auto px-8 py-6'>
          <h1 className='text-4xl font-bold text-white mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600'>
            Image DeDup AI
          </h1>
          <p className='text-gray-300 mb-6'>
            Image management with AI-powered duplicate detection and face
            recognition
          </p>

          {/* Tabs */}
          <div className='flex gap-4'>
            <button
              onClick={() => setActiveTab("duplicates")}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                activeTab === "duplicates"
                  ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg"
                  : "bg-white/5 text-gray-300 hover:bg-white/10"
              }`}>
              <Copy size={20} />
              Duplicate Removal
            </button>
            <button
              onClick={() => setActiveTab("organize")}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                activeTab === "organize"
                  ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg"
                  : "bg-white/5 text-gray-300 hover:bg-white/10"
              }`}>
              <FolderOutput size={20} />
              Rename & Organize
            </button>
            <button
              onClick={() => setActiveTab("faces")}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                activeTab === "faces"
                  ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg"
                  : "bg-white/5 text-gray-300 hover:bg-white/10"
              }`}>
              <Users size={20} />
              Face Recognition
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className='p-8'>
        {activeTab === "duplicates" && <DuplicateRemover />}
        {activeTab === "faces" && (
          <div className='max-w-7xl mx-auto'>
            <FaceRecognitionPanel
              onComplete={(results) => {
                console.log("Organization complete:", results);
              }}
            />
          </div>
        )}
        {activeTab === "organize" && <OrganizePanel />}
      </div>
    </div>
  );
};

export default App;
