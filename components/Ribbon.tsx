import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CONSTANTS, THEME, TreeState } from '../types';

interface RibbonProps {
  progressRef: React.MutableRefObject<number>;
  state: TreeState;
}

export const Ribbon: React.FC<RibbonProps> = ({ progressRef, state }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);

  const curve = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const height = CONSTANTS.TREE_HEIGHT;
    
    // Spiral parameters: 
    // Reduced turns from 7.5 to 5.5 to increase vertical spacing between lines
    const turns = 5.5; 
    const pointsCount = 400; // Increased resolution for longer curve
    
    // Base radius closer to tree (Tight hug)
    const baseRadius = CONSTANTS.TREE_RADIUS + 0.5; 

    for (let i = 0; i <= pointsCount; i++) {
        const t = i / pointsCount;
        
        // Angle goes around the tree
        const angle = t * Math.PI * 2 * turns;
        
        // Height Mapping:
        // Extend to bottom (-7.0 covers the full height of the tree foliage)
        const startY = -7.0;
        const endY = 8.5;
        const y = THREE.MathUtils.lerp(startY, endY, t);

        // Radius tapers as we go up
        const radius = (1 - t) * baseRadius + Math.sin(t * 20) * 0.1;
        
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;

        points.push(new THREE.Vector3(x, y, z));
    }
    return new THREE.CatmullRomCurve3(points);
  }, []);

  useFrame(() => {
    const progress = progressRef.current;
    
    if (meshRef.current) {
        // Scale animation: Grow out when forming
        const scale = THREE.MathUtils.lerp(0.01, 1, progress);
        meshRef.current.scale.setScalar(scale);
        
        // Strict State Visibility:
        // CHAOS -> Immediately Hidden
        // FORMED -> Immediately Visible (animated by scale)
        meshRef.current.visible = state === TreeState.FORMED;

        // Subtle floating rotation
        meshRef.current.rotation.y += 0.003;
    }
  });

  return (
    <mesh ref={meshRef}>
      {/* Radius 0.005 for extremely thin "Silk" wire */}
      <tubeGeometry args={[curve, 600, 0.005, 6, false]} />
      <meshStandardMaterial 
        ref={materialRef}
        color={THEME.goldHighlight}
        emissive={THEME.gold}
        emissiveIntensity={3.0} // High emissive to make thin wire glow
        metalness={1}
        roughness={0.0}
        toneMapped={false} // Ensure it stays bright
      />
    </mesh>
  );
};