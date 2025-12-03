import React, { useState, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Experience } from './components/Experience';
import { UIOverlay } from './components/UIOverlay';
import { GestureController } from './components/GestureController';
import { TreeState } from './types';

function App() {
  const [treeState, setTreeState] = useState<TreeState>(TreeState.CHAOS);
  const [userPhotos, setUserPhotos] = useState<string[]>([]);

  const toggleState = () => {
    setTreeState((prev) => 
      prev === TreeState.CHAOS ? TreeState.FORMED : TreeState.CHAOS
    );
  };

  const handlePhotoUpload = (files: FileList | null) => {
    if (!files) return;
    
    const newPhotos: string[] = [];
    Array.from(files).forEach(file => {
        if (file.type.startsWith('image/')) {
            const url = URL.createObjectURL(file);
            newPhotos.push(url);
        }
    });

    if (newPhotos.length > 0) {
        setUserPhotos(newPhotos);
        // Automatically switch to FORMED state so user can see their photos
        setTreeState(TreeState.FORMED);
    }
  };

  return (
    <div className="relative w-full h-screen bg-black">
      <UIOverlay 
        state={treeState} 
        onToggle={toggleState} 
        onUpload={handlePhotoUpload}
      />
      <GestureController setTreeState={setTreeState} />
      
      <Canvas
        dpr={[1, 2]} // Optimization for high DPI screens
        gl={{ 
            antialias: false, 
            toneMapping: 3, // ACESFilmic
            toneMappingExposure: 1.2 
        }}
      >
        <Suspense fallback={null}>
          <Experience treeState={treeState} userPhotos={userPhotos} />
        </Suspense>
      </Canvas>
      
      {/* Loading overlay handled via Suspense fallback essentially, but simplified here */}
      <div className="absolute bottom-2 right-2 text-white/10 text-xs">
        v1.2.0 | Grand Luxury Tree
      </div>
    </div>
  );
}

export default App;