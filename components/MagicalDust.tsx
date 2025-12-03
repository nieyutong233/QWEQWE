import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { THEME, CONSTANTS } from '../types';

export const MagicalDust: React.FC = () => {
  const { viewport, pointer } = useThree();
  const count = CONSTANTS.DUST_COUNT;
  const meshRef = useRef<THREE.Points>(null);
  
  // Track hand position from camera
  const handTarget = useRef<{x: number, y: number, active: boolean}>({ x: 0, y: 0, active: false });

  useEffect(() => {
    const onHandMove = (e: CustomEvent) => {
        if (e.detail.active) {
            handTarget.current = { x: e.detail.x, y: e.detail.y, active: true };
        } else {
            handTarget.current.active = false;
        }
    };
    window.addEventListener('hand-move', onHandMove as any);
    return () => window.removeEventListener('hand-move', onHandMove as any);
  }, []);
  
  // Initialize particles
  const particles = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 25;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 25;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 25;

      // Almost zero initial velocity for absolute stillness
      vel[i * 3] = 0;
      vel[i * 3 + 1] = 0;
      vel[i * 3 + 2] = 0;
    }
    return { pos, vel };
  }, [count]);

  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const context = canvas.getContext('2d');
    if (context) {
        const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 16);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.2, 'rgba(255, 215, 0, 1)');
        gradient.addColorStop(0.5, 'rgba(255, 215, 0, 0.2)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        context.fillStyle = gradient;
        context.fillRect(0, 0, 32, 32);
    }
    const tex = new THREE.CanvasTexture(canvas);
    return tex;
  }, []);

  useFrame((state) => {
    if (!meshRef.current) return;

    const positions = meshRef.current.geometry.attributes.position.array as Float32Array;
    const velocities = particles.vel;

    // Determine target attraction point
    let targetX, targetY;
    let isActive = false;
    
    if (handTarget.current.active) {
        targetX = (handTarget.current.x * viewport.width) / 2;
        targetY = (handTarget.current.y * viewport.height) / 2;
        isActive = true;
    } else if (pointer.x !== 0 || pointer.y !== 0) { // Only if pointer moved
        targetX = (pointer.x * viewport.width) / 2;
        targetY = (pointer.y * viewport.height) / 2;
        isActive = true;
    } else {
        targetX = 0;
        targetY = 0;
    }

    const targetZ = 8; 

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      let px = positions[idx];
      let py = positions[idx + 1];
      let pz = positions[idx + 2];

      if (!isActive) {
          // Rapidly slow down to a halt when inactive
          velocities[idx] *= 0.95;
          velocities[idx + 1] *= 0.95;
          velocities[idx + 2] *= 0.95;
      } else {
          const dx = targetX - px;
          const dy = targetY - py;
          const dz = targetZ - pz;
          const distSq = dx*dx + dy*dy + dz*dz;

          velocities[idx + 1] -= 0.0001; // Tiny gravity

          if (distSq < 200) {
            // Significantly reduced force (0.015 -> 0.005) for gentle drift
            const force = handTarget.current.active ? 0.005 : 0.008;
            velocities[idx] += dx * force * 0.02 + (dy * 0.002);
            velocities[idx + 1] += dy * force * 0.02 - (dx * 0.002);
            velocities[idx + 2] += dz * force * 0.02;
          }
          
          // Slight turbulence
          velocities[idx] += (Math.random() - 0.5) * 0.001;
          velocities[idx + 1] += (Math.random() - 0.5) * 0.001;
          velocities[idx + 2] += (Math.random() - 0.5) * 0.001;
          
          // Higher Drag for "thick air" luxury feel
          velocities[idx] *= 0.97;
          velocities[idx + 1] *= 0.97;
          velocities[idx + 2] *= 0.97;
      }

      positions[idx] += velocities[idx];
      positions[idx + 1] += velocities[idx + 1];
      positions[idx + 2] += velocities[idx + 2];

      // Respawn logic
      if (py < -15) {
        positions[idx + 1] = 15;
        positions[idx] = (Math.random() - 0.5) * 20;
        positions[idx + 2] = (Math.random() - 0.5) * 20;
        velocities[idx] = 0;
        velocities[idx+1] = 0;
        velocities[idx+2] = 0;
      }
    }

    meshRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={particles.pos}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.25}
        map={texture}
        transparent
        alphaTest={0.01}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        color={THEME.goldHighlight}
      />
    </points>
  );
};