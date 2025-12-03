import React, { useMemo, useRef, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CONSTANTS, THEME } from '../types';

interface OrnamentsProps {
  progressRef: React.MutableRefObject<number>;
}

// Helper to generate transformation data for different ornament types
const generateTransformData = (count: number, type: 'sphere' | 'box') => {
    const chaosData: any[] = [];
    const targetData: any[] = [];
    const colors: THREE.Color[] = [];
    
    const height = CONSTANTS.TREE_HEIGHT;
    // Boxes sit slightly further out to look like they are resting on branches
    const radius = CONSTANTS.TREE_RADIUS + (type === 'box' ? 0.8 : 0.5); 
    
    const palette = [
        new THREE.Color(THEME.gold),
        new THREE.Color(THEME.goldHighlight),
        new THREE.Color(THEME.red),
        new THREE.Color('#efefef'), // Silver
    ];
    // Add Emerald Green specifically for gift boxes for variety
    if (type === 'box') {
         palette.push(new THREE.Color(THEME.emerald));
    }

    for (let i = 0; i < count; i++) {
        // CHAOS POSITION (Random cloud)
        const chaosR = 12 + Math.random() * 8;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        
        chaosData.push({
            pos: new THREE.Vector3(
                chaosR * Math.sin(phi) * Math.cos(theta),
                chaosR * Math.cos(phi),
                chaosR * Math.sin(phi) * Math.sin(theta)
            ),
            // Reduced chaos rotation range for a calmer look
            rot: new THREE.Euler(Math.random()*Math.PI * 0.5, Math.random()*Math.PI * 0.5, Math.random()*Math.PI * 0.5),
            scale: type === 'box' ? (0.5 + Math.random() * 0.4) : (0.3 + Math.random() * 0.4)
        });

        // TARGET POSITION (Tree Cone)
        const t = i / count; 
        // For boxes, bias them slightly towards the bottom where branches are stronger
        let hNormalized = t;
        if (type === 'box') {
             hNormalized = Math.pow(t, 1.1); // Slight bias to bottom
        }
        
        const h = hNormalized * height - (height / 2);
        
        // Radius at this height
        const rAtHeight = (1 - ((h + height/2)/height)) * radius;
        
        // Golden angle distribution for natural look
        const angle = i * 137.5 + (Math.random() * 0.5); 
        
        targetData.push({
            pos: new THREE.Vector3(Math.cos(angle) * rAtHeight, h, Math.sin(angle) * rAtHeight),
            rot: new THREE.Euler(
                type === 'box' ? 0 : 0, 
                angle, 
                type === 'box' ? 0 : 0
            ),
            scale: type === 'box' ? (0.6 + Math.random() * 0.3) : (0.4 + Math.random() * 0.3)
        });

        colors.push(palette[Math.floor(Math.random() * palette.length)]);
    }

    return { chaosData, targetData, colors };
};

export const Ornaments: React.FC<OrnamentsProps> = ({ progressRef }) => {
  const sphereMeshRef = useRef<THREE.InstancedMesh>(null);
  const boxMeshRef = useRef<THREE.InstancedMesh>(null);

  // Split the total ornament count: 75% Baubles, 25% Gift Boxes
  const sphereCount = Math.floor(CONSTANTS.ORNAMENT_COUNT * 0.75);
  const boxCount = CONSTANTS.ORNAMENT_COUNT - sphereCount;

  // Generate data for both types
  const spheres = useMemo(() => generateTransformData(sphereCount, 'sphere'), [sphereCount]);
  const boxes = useMemo(() => generateTransformData(boxCount, 'box'), [boxCount]);
  
  const tempObj = useMemo(() => new THREE.Object3D(), []);
  
  // Apply colors once on mount/update
  useLayoutEffect(() => {
    if (sphereMeshRef.current) {
        spheres.colors.forEach((col, i) => sphereMeshRef.current?.setColorAt(i, col));
        sphereMeshRef.current.instanceColor!.needsUpdate = true;
    }
    if (boxMeshRef.current) {
        boxes.colors.forEach((col, i) => boxMeshRef.current?.setColorAt(i, col));
        boxMeshRef.current.instanceColor!.needsUpdate = true;
    }
  }, [spheres, boxes]);

  useFrame((state) => {
    const progress = progressRef.current;
    const time = state.clock.elapsedTime;
    
    // --- Update Spheres ---
    if (sphereMeshRef.current) {
        for (let i = 0; i < sphereCount; i++) {
            const chaos = spheres.chaosData[i];
            const target = spheres.targetData[i];

            tempObj.position.lerpVectors(chaos.pos, target.pos, progress);
            
            // Reduced Wobble effect: Lower frequency (0.001 -> time * 0.5) and lower amplitude
            const wobble = (1 - progress) * 0.3 * Math.sin(time * 0.5 + i);
            
            tempObj.rotation.set(
                THREE.MathUtils.lerp(chaos.rot.x + wobble, target.rot.x, progress),
                THREE.MathUtils.lerp(chaos.rot.y + wobble, target.rot.y, progress),
                THREE.MathUtils.lerp(chaos.rot.z + wobble, target.rot.z, progress)
            );

            const sc = THREE.MathUtils.lerp(chaos.scale, target.scale, progress);
            tempObj.scale.set(sc, sc, sc);
            tempObj.updateMatrix();
            sphereMeshRef.current.setMatrixAt(i, tempObj.matrix);
        }
        sphereMeshRef.current.instanceMatrix.needsUpdate = true;
    }

    // --- Update Boxes ---
    if (boxMeshRef.current) {
         for (let i = 0; i < boxCount; i++) {
            const chaos = boxes.chaosData[i];
            const target = boxes.targetData[i];

            tempObj.position.lerpVectors(chaos.pos, target.pos, progress);
            
            // Boxes tumble much slower now: 5 -> 1.5 multiplier
            const tumble = (1 - progress) * 1.5; 
            
            tempObj.rotation.set(
                THREE.MathUtils.lerp(chaos.rot.x + tumble * Math.sin(i + time * 0.2), target.rot.x, progress),
                THREE.MathUtils.lerp(chaos.rot.y + tumble * Math.cos(i + time * 0.2), target.rot.y, progress),
                THREE.MathUtils.lerp(chaos.rot.z + tumble * Math.sin(i*0.5 + time * 0.2), target.rot.z, progress)
            );

            const sc = THREE.MathUtils.lerp(chaos.scale, target.scale, progress);
            tempObj.scale.set(sc, sc, sc);
            tempObj.updateMatrix();
            boxMeshRef.current.setMatrixAt(i, tempObj.matrix);
        }
        boxMeshRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group>
        {/* Render Round Baubles */}
        <instancedMesh ref={sphereMeshRef} args={[undefined, undefined, sphereCount]}>
            <sphereGeometry args={[0.6, 16, 16]} />
            <meshStandardMaterial 
                metalness={1} 
                roughness={0.15} 
                envMapIntensity={2.0}
            />
        </instancedMesh>

        {/* Render Gift Boxes */}
        <instancedMesh ref={boxMeshRef} args={[undefined, undefined, boxCount]}>
            <boxGeometry args={[0.8, 0.8, 0.8]} /> 
            <meshStandardMaterial 
                metalness={0.6} 
                roughness={0.3} 
                envMapIntensity={1.5}
            />
        </instancedMesh>
    </group>
  );
};