import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CONSTANTS, THEME } from '../types';

interface FoliageProps {
  progressRef: React.MutableRefObject<number>;
}

const FoliageShaderMaterial = {
  uniforms: {
    uProgress: { value: 0 },
    uTime: { value: 0 },
    uColor: { value: new THREE.Color(THEME.emerald) },
  },
  vertexShader: `
    uniform float uProgress;
    uniform float uTime;
    attribute vec3 aChaosPos;
    attribute vec3 aTargetPos;
    attribute float aRandom;
    
    varying float vRandom;

    void main() {
      vRandom = aRandom;
      
      // Interpolate between chaos and tree shape
      vec3 pos = mix(aChaosPos, aTargetPos, uProgress);
      
      // Add a little wind/breathing effect when formed
      float windIntensity = smoothstep(0.8, 1.0, uProgress);
      if (windIntensity > 0.0) {
         float wind = sin(uTime * 2.0 + pos.y * 0.5) * 0.05 * windIntensity;
         pos.x += wind;
         pos.z += wind;
      }

      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      
      // Size attenuation
      gl_PointSize = (5.0 * aRandom + 3.0) * (20.0 / -mvPosition.z);
    }
  `,
  fragmentShader: `
    uniform vec3 uColor;
    varying float vRandom;
    
    void main() {
      vec2 coord = gl_PointCoord - vec2(0.5);
      if(length(coord) > 0.5) discard;
      
      vec3 finalColor = uColor + (vRandom * 0.2);
      float dist = length(coord);
      finalColor *= (1.2 - dist * 2.0);

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
};

export const Foliage: React.FC<FoliageProps> = ({ progressRef }) => {
  const count = CONSTANTS.FOLIAGE_COUNT;
  const shaderRef = useRef<THREE.ShaderMaterial>(null);

  const { chaosPositions, targetPositions, randoms } = useMemo(() => {
    const chaosPositions = new Float32Array(count * 3);
    const targetPositions = new Float32Array(count * 3);
    const randoms = new Float32Array(count);
    const radius = CONSTANTS.TREE_RADIUS;
    const height = CONSTANTS.TREE_HEIGHT;

    for (let i = 0; i < count; i++) {
      // Chaos
      const r = Math.cbrt(Math.random()) * 18; 
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      chaosPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      chaosPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      chaosPositions[i * 3 + 2] = r * Math.cos(phi);

      // Target (Cone)
      const h = Math.random(); 
      const coneR = (1 - h) * radius;
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.sqrt(Math.random()) * coneR;
      
      targetPositions[i * 3] = Math.cos(angle) * dist;
      targetPositions[i * 3 + 1] = h * height - (height / 2);
      targetPositions[i * 3 + 2] = Math.sin(angle) * dist;

      randoms[i] = Math.random();
    }
    return { chaosPositions, targetPositions, randoms };
  }, [count]);

  useFrame((state) => {
    if (shaderRef.current) {
      shaderRef.current.uniforms.uProgress.value = progressRef.current;
      shaderRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={chaosPositions} itemSize={3} />
        <bufferAttribute attach="attributes-aChaosPos" count={count} array={chaosPositions} itemSize={3} />
        <bufferAttribute attach="attributes-aTargetPos" count={count} array={targetPositions} itemSize={3} />
        <bufferAttribute attach="attributes-aRandom" count={count} array={randoms} itemSize={1} />
      </bufferGeometry>
      <shaderMaterial ref={shaderRef} args={[FoliageShaderMaterial]} transparent={false} />
    </points>
  );
};