import React, { useRef } from 'react';
import { TreeState } from '../types';

interface UIOverlayProps {
  state: TreeState;
  onToggle: () => void;
  onUpload: (files: FileList | null) => void;
}

export const UIOverlay: React.FC<UIOverlayProps> = ({ state, onToggle, onUpload }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-8 z-10">
      {/* Header */}
      <div className="text-center mt-4">
        <h1 className="text-4xl md:text-6xl text-yellow-500 font-bold tracking-widest drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] serif-font">
          NYT love LDM
        </h1>
        <h2 className="text-xl text-white tracking-widest font-light mt-2 opacity-80">
          Interactive Christmas Experience
        </h2>
      </div>

      {/* Controls */}
      <div className="mb-12 flex flex-col items-center pointer-events-auto gap-4">
         <div className="bg-black/30 p-6 rounded-xl backdrop-blur-sm border border-white/5 text-center">
            <div className="text-yellow-200 text-xs md:text-sm mb-6 opacity-90 font-light leading-relaxed">
                <p className="mb-2"><span className="text-yellow-500 font-bold">GESTURES:</span> Open Palm for Chaos • Fist to Form</p>
                <p><span className="text-yellow-500 font-bold">INTERACT:</span> Wave hand to Spin • Move hand to control Magic Dust</p>
            </div>
            
            <div className="flex flex-col md:flex-row gap-4 justify-center">
                {/* Toggle Button */}
                <button
                    onClick={onToggle}
                    className={`
                        relative overflow-hidden group px-8 py-3 bg-transparent border-2 border-yellow-600 
                        text-yellow-500 font-serif text-lg uppercase tracking-widest transition-all duration-500
                        hover:bg-yellow-600/20 hover:text-yellow-200 hover:border-yellow-400 hover:shadow-[0_0_30px_rgba(255,215,0,0.4)]
                        backdrop-blur-sm
                    `}
                >
                    <span className="relative z-10">
                        {state === TreeState.CHAOS ? "Assemble Tree" : "Release to Chaos"}
                    </span>
                </button>

                {/* Upload Button */}
                <button
                    onClick={handleUploadClick}
                    className={`
                        relative overflow-hidden group px-8 py-3 bg-emerald-900/40 border-2 border-emerald-600 
                        text-emerald-400 font-serif text-lg uppercase tracking-widest transition-all duration-500
                        hover:bg-emerald-800/60 hover:text-emerald-200 hover:border-emerald-400 hover:shadow-[0_0_30px_rgba(0,255,100,0.2)]
                        backdrop-blur-sm
                    `}
                >
                    <span className="relative z-10">
                        Upload Memories
                    </span>
                </button>
                
                {/* Hidden Input */}
                <input 
                    ref={fileInputRef}
                    type="file" 
                    multiple 
                    accept="image/*" 
                    className="hidden"
                    onChange={(e) => onUpload(e.target.files)}
                />
            </div>
         </div>
      </div>

      {/* Decorative corners */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none border-[20px] border-transparent">
        <div className="absolute top-4 left-4 w-16 h-16 border-t-2 border-l-2 border-yellow-600/50"></div>
        <div className="absolute top-4 right-4 w-16 h-16 border-t-2 border-r-2 border-yellow-600/50"></div>
        <div className="absolute bottom-4 left-4 w-16 h-16 border-b-2 border-l-2 border-yellow-600/50"></div>
        <div className="absolute bottom-4 right-4 w-16 h-16 border-b-2 border-r-2 border-yellow-600/50"></div>
      </div>
    </div>
  );
};