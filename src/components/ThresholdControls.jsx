import React from "react";
import { Sliders } from "lucide-react";

const ThresholdControls = ({
  ssimThreshold,
  mseThreshold,
  onSsimChange,
  onMseChange,
  disabled,
}) => {
  const presets = [
    { name: "Strict", ssim: 0.98, mse: 10, desc: "Only very similar images" },
    { name: "Normal", ssim: 0.95, mse: 20, desc: "Balanced detection" },
    { name: "Loose", ssim: 0.85, mse: 40, desc: "More duplicates" },
  ];

  const applyPreset = (preset) => {
    onSsimChange(preset.ssim);
    onMseChange(preset.mse);
  };

  return (
    <div className="bg-white/5 backdrop-blur-lg rounded-xl p-6 border border-white/10">
      <div className="flex items-center gap-2 mb-4">
        <Sliders className="text-purple-400" size={20} />
        <h3 className="text-white font-semibold text-lg">
          Similarity Thresholds
        </h3>
      </div>

      {/* Preset Buttons */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {presets.map((preset) => (
          <button
            key={preset.name}
            onClick={() => applyPreset(preset)}
            disabled={disabled}
            className="px-4 py-3 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="text-white font-semibold text-sm">
              {preset.name}
            </div>
            <div className="text-gray-400 text-xs mt-1">{preset.desc}</div>
          </button>
        ))}
      </div>

      {/* SSIM Slider */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <label className="text-white font-medium text-sm">
            SSIM Threshold
          </label>
          <span className="text-purple-400 font-mono text-sm font-bold">
            {ssimThreshold.toFixed(2)}
          </span>
        </div>
        <input
          type="range"
          min="0.70"
          max="0.99"
          step="0.01"
          value={ssimThreshold}
          onChange={(e) => onSsimChange(parseFloat(e.target.value))}
          disabled={disabled}
          className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer slider-thumb disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>0.70 (Loose)</span>
          <span>0.99 (Strict)</span>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Higher values = more strict (images must be more similar)
        </p>
      </div>

      {/* MSE Slider */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="text-white font-medium text-sm">
            MSE Threshold
          </label>
          <span className="text-pink-400 font-mono text-sm font-bold">
            {mseThreshold.toFixed(0)}
          </span>
        </div>
        <input
          type="range"
          min="5"
          max="50"
          step="1"
          value={mseThreshold}
          onChange={(e) => onMseChange(parseFloat(e.target.value))}
          disabled={disabled}
          className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer slider-thumb disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>5 (Strict)</span>
          <span>50 (Loose)</span>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Lower values = more strict (less pixel difference allowed)
        </p>
      </div>

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

export default ThresholdControls;
