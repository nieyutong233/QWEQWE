import React, { useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Foliage } from './Foliage';
import { Ornaments } from './Ornaments';
import { Ribbon } from './Ribbon';
import { PhotoFrames } from './PhotoFrames';
import { TreeState } from '../types';

interface ChristmasTreeProps {
  state: TreeState;
  userPhotos: string[];
}

export const ChristmasTree: React.FC<ChristmasTreeProps> = ({ state, userPhotos }) => {
  const groupRef = useRef<THREE.Group>(null);
  
  // Physics Refs
  const velocityY = useRef(0);
  const velocityX = useRef(0); // Added vertical rotation velocity
  const isDragging = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0 });
  
  // Shared progress ref to coordinate all sub-components
  const progressRef = useRef(0); 

  // Track which photo is currently zoomed in
  const [focusedPhotoIndex, setFocusedPhotoIndex] = useState<number | null>(null);

  // Handlers for "Swipe to Spin" (Mouse/Touch)
  const handlePointerDown = (e: any) => {
    // If we clicked a photo, let the photo component handle it first
    // We check this by seeing if the event default was prevented in the child
    if (e.defaultPrevented) return;

    e.stopPropagation();
    isDragging.current = true;
    lastPointer.current = {
        x: e.clientX || (e.touches && e.touches[0].clientX),
        y: e.clientY || (e.touches && e.touches[0].clientY)
    };
    velocityY.current = 0;
    velocityX.current = 0;
  };

  const handlePointerMove = (e: any) => {
    if (!isDragging.current) return;
    
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    
    const deltaX = clientX - lastPointer.current.x;
    const deltaY = clientY - lastPointer.current.y;
    
    lastPointer.current = { x: clientX, y: clientY };
    
    // Smooth out the input force slightly
    const sensitivity = 0.0025; 
    
    // Always allow Horizontal spin (Y-axis)
    velocityY.current = deltaX * sensitivity;

    // Only allow Vertical tumbling (X-axis) if in CHAOS mode
    // This prevents the tree from looking "tipped over" when formed
    if (state === TreeState.CHAOS) {
        velocityX.current = deltaY * sensitivity;
    }
    
    if (groupRef.current) {
        groupRef.current.rotation.y += velocityY.current;
        groupRef.current.rotation.x += velocityX.current;
    }
  };

  const handlePointerUp = () => {
    isDragging.current = false;
  };

  // Listen for Gesture Control Events
  useEffect(() => {
    const onSpin = (e: CustomEvent) => {
        if (!isDragging.current) {
            velocityY.current += e.detail.velocity;
        }
    };
    
    window.addEventListener('tree-spin', onSpin as any);
    return () => window.removeEventListener('tree-spin', onSpin as any);
  }, []);

  useFrame((_, delta) => {
    // 1. Logic for Progress Transition
    const target = state === TreeState.FORMED ? 1 : 0;
    progressRef.current = THREE.MathUtils.damp(progressRef.current, target, 2.0, delta);

    // 2. Physics Rotation
    if (groupRef.current && !isDragging.current) {
        groupRef.current.rotation.y += velocityY.current;
        groupRef.current.rotation.x += velocityX.current;
        
        // Refined Friction
        const friction = 0.98;
        velocityY.current *= friction;
        velocityX.current *= friction;
        
        // Stop tiny movements
        if (Math.abs(velocityY.current) < 0.0001) velocityY.current = 0;
        if (Math.abs(velocityX.current) < 0.0001) velocityX.current = 0;
        
        // Idle spin
        if (Math.abs(velocityY.current) < 0.001 && Math.abs(velocityX.current) < 0.001) {
             // Gentle idle rotation
             if (state === TreeState.FORMED) {
                 groupRef.current.rotation.y += 0.001;
                 // Re-center X rotation when formed
                 groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, 0, 0.05);
             } else {
                 // Chaos drift
                 groupRef.current.rotation.y += 0.0005; 
                 groupRef.current.rotation.x += 0.0003; 
             }
        }
    }
  });

  useEffect(() => {
    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('touchend', handlePointerUp);
    return () => {
        window.removeEventListener('mouseup', handlePointerUp);
        window.removeEventListener('touchend', handlePointerUp);
    }
  }, []);

  // Handler to deselect photo if clicking background
  const onBackgroundClick = (e: any) => {
      // Only deselect if we aren't dragging and we didn't just click a photo
      if (!isDragging.current && focusedPhotoIndex !== null) {
         setFocusedPhotoIndex(null);
      }
  }

  return (
    <group 
        ref={groupRef} 
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onPointerMissed={onBackgroundClick} // Handle clicking empty space
    >
      <TreeComponents 
        progressRef={progressRef} 
        state={state} 
        userPhotos={userPhotos} 
        focusedIndex={focusedPhotoIndex}
        setFocusedIndex={setFocusedPhotoIndex}
        parentGroup={groupRef} // Pass ref down so children can calculate world positions
      />
    </group>
  );
};

// Internal component
const TreeComponents = ({ 
    progressRef, 
    state,
    userPhotos,
    focusedIndex,
    setFocusedIndex,
    parentGroup
}: { 
    progressRef: React.MutableRefObject<number>, 
    state: TreeState,
    userPhotos: string[],
    focusedIndex: number | null,
    setFocusedIndex: (i: number | null) => void,
    parentGroup: React.RefObject<THREE.Group | null>
}) => {
    return (
        <>
            <Foliage progressRef={progressRef} />
            <Ornaments progressRef={progressRef} />
            <Ribbon progressRef={progressRef} state={state} />
            <PhotoFrames 
                progressRef={progressRef} 
                userPhotos={userPhotos} 
                focusedIndex={focusedIndex}
                setFocusedIndex={setFocusedIndex}
                parentGroup={parentGroup}
            />
            <Star progressRef={progressRef} />
        </>
    )
}

const Star = ({ progressRef }: { progressRef: React.MutableRefObject<number> }) => {
    const ref = useRef<THREE.Mesh>(null);
    useFrame(() => {
        if(ref.current) {
            const p = progressRef.current;
            ref.current.position.y = THREE.MathUtils.lerp(15, 7.5, p);
            ref.current.scale.setScalar(p); 
            ref.current.rotation.y += 0.01;
        }
    })
    return (
        <mesh ref={ref}>
            <octahedronGeometry args={[0.8, 0]} />
            <meshStandardMaterial color="#FFD700" emissive="#FFD700" emissiveIntensity={2} toneMapped={false} />
        </mesh>
    )
}