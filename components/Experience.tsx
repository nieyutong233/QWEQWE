import React from 'react';
import { Environment, PerspectiveCamera, Stars } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
import { ChristmasTree } from './ChristmasTree';
import { MagicalDust } from './MagicalDust';
import { TreeState } from '../types';

interface ExperienceProps {
  treeState: TreeState;
  userPhotos: string[];
}

export const Experience: React.FC<ExperienceProps> = ({ treeState, userPhotos }) => {
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 2, 22]} fov={50} />
      
      {/* Cinematic Lighting */}
      <ambientLight intensity={0.2} color="#001100" />
      <spotLight 
        position={[10, 20, 10]} 
        angle={0.3} 
        penumbra={1} 
        intensity={2} 
        castShadow 
        color="#fff5b6"
      />
      <pointLight position={[-10, 5, -10]} intensity={1} color="#ff0000" distance={20} />
      <pointLight position={[10, -5, 10]} intensity={1} color="#00ff00" distance={20} />

      <Environment preset="lobby" background={false} />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

      {/* Raised y position to 2.8 for better framing */}
      <group position={[0, 2.8, 0]}>
        <ChristmasTree state={treeState} userPhotos={userPhotos} />
      </group>

      <MagicalDust />

      <EffectComposer enableNormalPass={false}>
        <Bloom 
            luminanceThreshold={0.85} 
            luminanceSmoothing={0.1} 
            height={300} 
            intensity={1.5} 
        />
        <Noise opacity={0.05} />
        <Vignette eskil={false} offset={0.1} darkness={1.1} />
      </EffectComposer>
    </>
  );
};