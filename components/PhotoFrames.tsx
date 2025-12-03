import React, { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { CONSTANTS } from '../types';

interface PhotoFramesProps {
  progressRef: React.MutableRefObject<number>;
  userPhotos: string[];
  focusedIndex: number | null;
  setFocusedIndex: (index: number | null) => void;
  parentGroup: React.RefObject<THREE.Group | null>;
}

export const PhotoFrames: React.FC<PhotoFramesProps> = ({ 
    progressRef, 
    userPhotos,
    focusedIndex,
    setFocusedIndex,
    parentGroup
}) => {
  const count = CONSTANTS.PHOTO_COUNT;

  const frames = useMemo(() => {
    const data = [];
    const height = CONSTANTS.TREE_HEIGHT;
    // Base radius slightly outside foliage
    const baseRadius = CONSTANTS.TREE_RADIUS + 0.8; 
    const dummy = new THREE.Object3D();

    for (let i = 0; i < count; i++) {
        // --- 1. Chaos Position (Random Cloud) ---
        const chaosR = 15 + Math.random() * 10;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        
        const chaosPos = new THREE.Vector3(
            chaosR * Math.sin(phi) * Math.cos(theta),
            chaosR * Math.cos(phi),
            chaosR * Math.sin(phi) * Math.sin(theta)
        );
        // Random tumble rotation for chaos
        const chaosRot = new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);

        // --- 2. Target Position (On Tree) ---
        const t = i / count;
        
        // Add randomness to height to break the perfect linear spiral
        const heightJitter = (Math.random() - 0.5) * 1.5;
        
        // Distribution
        let h = (t * 0.7 + 0.15) * height - (height / 2) + heightJitter;
        
        // Clamp height
        h = Math.max(-height/2 + 1, Math.min(height/2 - 2, h));
        
        // Calculate cone radius at this specific height
        const rAtHeight = (1 - ((h + height/2)/height)) * baseRadius;
        
        // Add slight depth variation
        const depthJitter = (Math.random() - 0.5) * 0.4;
        const finalRadius = rAtHeight + depthJitter;

        // Golden angle distribution
        const angle = i * 137.5 * (Math.PI / 180); 
        
        const targetPos = new THREE.Vector3(Math.cos(angle) * finalRadius, h, Math.sin(angle) * finalRadius);
        
        // Face the frame outward
        dummy.position.copy(targetPos);
        dummy.lookAt(0, h, 0); 
        dummy.rotateY(Math.PI); 
        
        // Add random slight tilt for "haphazardly hung" look
        dummy.rotateZ((Math.random() - 0.5) * 0.3);
        dummy.rotateX((Math.random() - 0.5) * 0.2);
        
        const targetRot = dummy.rotation.clone();

        data.push({ chaosPos, chaosRot, targetPos, targetRot });
    }
    return data;
  }, [count]);

  return (
    <group>
      {frames.map((frame, i) => {
        // Determine which photo to use for this frame
        const photoUrl = userPhotos.length > 0 
            ? userPhotos[i % userPhotos.length] 
            : null;

        return (
            <SingleFrame 
                key={i} 
                data={frame} 
                progressRef={progressRef} 
                index={i} 
                photoUrl={photoUrl}
                isFocused={focusedIndex === i}
                onClick={(e) => {
                    e.stopPropagation();
                    setFocusedIndex(focusedIndex === i ? null : i);
                }}
                parentGroup={parentGroup}
            />
        );
      })}
    </group>
  );
};

// Sub-component to safely load texture conditionally
const PhotoContent = ({ url }: { url: string }) => {
    const texture = useTexture(url) as THREE.Texture;
    const { gl } = useThree();
    
    // Ensure texture fits nicely, crops correctly, and is sharp
    useMemo(() => {
        if (texture) {
            // 1. Color Space and Filters for max sharpness
            texture.colorSpace = THREE.SRGBColorSpace;
            texture.anisotropy = gl.capabilities.getMaxAnisotropy();
            texture.minFilter = THREE.LinearMipmapLinearFilter;
            texture.magFilter = THREE.LinearFilter;
            texture.generateMipmaps = true;
            
            // Negative bias forces renderer to use higher resolution mipmaps at distance
            (texture as any).mipMapBias = -0.6; 

            // 2. Aspect Ratio "Cover" logic (Center Crop)
            if (texture.image) {
                const img = texture.image as HTMLImageElement;
                const imageAspect = img.width / img.height;
                const planeAspect = 1; // Square frame

                texture.center.set(0.5, 0.5);
                texture.rotation = 0; 
                
                if (imageAspect > planeAspect) {
                    texture.repeat.set(planeAspect / imageAspect, 1);
                    texture.offset.set((1 - (planeAspect / imageAspect)) / 2, 0);
                } else {
                    texture.repeat.set(1, imageAspect / planeAspect);
                    texture.offset.set(0, (1 - (imageAspect / planeAspect)) / 2);
                }
            }

            texture.needsUpdate = true;
        }
    }, [texture, gl]);

    return (
        <meshStandardMaterial 
            map={texture} 
            roughness={0.1} // Glossy photo paper finish
            metalness={0.0} 
            envMapIntensity={0.8}
            emissive="#ffffff"
            emissiveIntensity={0.05} // Subtle backlight
        />
    );
}

// Fallback material for when no photo is uploaded
const DefaultBlackMirror = () => (
    <meshStandardMaterial 
        color="#050505" 
        roughness={0.05} 
        metalness={0.9} 
        envMapIntensity={3.0}
    />
);

const SingleFrame = ({ 
    data, 
    progressRef, 
    index, 
    photoUrl,
    isFocused,
    onClick,
    parentGroup
}: { 
    data: any, 
    progressRef: any, 
    index: number,
    photoUrl: string | null,
    isFocused: boolean,
    onClick: (e: any) => void,
    parentGroup: React.RefObject<THREE.Group | null>
}) => {
    const groupRef = useRef<THREE.Group>(null);
    const qChaos = useRef(new THREE.Quaternion());
    const qTarget = useRef(new THREE.Quaternion());
    const vec3Dummy = useMemo(() => new THREE.Vector3(), []);
    const quatDummy = useMemo(() => new THREE.Quaternion(), []);
    
    useMemo(() => {
        qChaos.current.setFromEuler(data.chaosRot);
        qTarget.current.setFromEuler(data.targetRot);
    }, [data]);
    
    useFrame((state) => {
        if (!groupRef.current) return;
        const progress = progressRef.current;
        const time = state.clock.elapsedTime;

        // 1. Calculate Standard Tree/Chaos Position & Rotation
        vec3Dummy.lerpVectors(data.chaosPos, data.targetPos, progress);
        quatDummy.slerpQuaternions(qChaos.current, qTarget.current, progress);

        // 2. Add breeze sway (if not focused)
        if (!isFocused && progress > 0.8) {
            const sway = Math.sin(time * 1.5 + index * 10) * 0.05 * progress;
            // Apply sway on Z axis locally
            const swayQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1), sway);
            quatDummy.multiply(swayQ);
        }

        // 3. Handle Focused State (Override everything)
        if (isFocused && parentGroup.current) {
            // Target World Position: Directly in front of camera (Camera is at 0, 2, 22)
            // Let's bring it to 0, 2, 18 (4 units from camera)
            const targetWorldPos = new THREE.Vector3(0, 2.0, 18);
            
            // Convert World Position -> Local Position inside the rotating Tree Group
            // Local = World * ParentInverse
            const parentInverse = parentGroup.current.matrixWorld.clone().invert();
            const targetLocalPos = targetWorldPos.applyMatrix4(parentInverse);
            
            // Target Rotation: We want the frame to face the camera.
            // In world space, that's roughly looking at (0,2,22) from (0,2,18), i.e. Rotation (0, 0, 0)
            // But we need to convert that world rotation to local rotation.
            // An easier trick: Look at camera position transformed into local space.
            const cameraLocalPos = state.camera.position.clone().applyMatrix4(parentInverse);
            
            // Lerp towards focused position (Make it snappy but smooth: 0.1)
            groupRef.current.position.lerp(targetLocalPos, 0.1);
            
            // For rotation, we construct a "lookAt" quaternion manually
            const dummyObj = new THREE.Object3D();
            dummyObj.position.copy(groupRef.current.position);
            dummyObj.lookAt(cameraLocalPos); 
            // Our frame geometry is flat on Z, so looking at camera is correct.
            
            groupRef.current.quaternion.slerp(dummyObj.quaternion, 0.1);
            
            // Scale up (2.5x original size)
            groupRef.current.scale.lerp(new THREE.Vector3(2.5, 2.5, 2.5), 0.1);
            
        } else {
            // Standard Behavior
            groupRef.current.position.lerp(vec3Dummy, 0.1);
            groupRef.current.quaternion.slerp(quatDummy, 0.1);
            groupRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
        }
    });

    return (
        <group 
            ref={groupRef} 
            onClick={onClick}
            onPointerOver={() => { document.body.style.cursor = 'pointer' }}
            onPointerOut={() => { document.body.style.cursor = 'auto' }}
        >
            {/* White Polaroid Frame Body */}
            <mesh>
                <boxGeometry args={[1.0, 1.2, 0.04]} />
                <meshStandardMaterial color="#f0f0f0" roughness={0.6} />
            </mesh>
            
            {/* Photo Area */}
            <mesh position={[0, 0.1, 0.026]}>
                <planeGeometry args={[0.85, 0.85]} />
                {photoUrl ? <PhotoContent url={photoUrl} /> : <DefaultBlackMirror />}
            </mesh>
            
            {/* Gold Clip/Pin visual at top */}
            <mesh position={[0, 0.55, 0.03]} rotation={[0, 0, Math.PI/2]}>
                 <cylinderGeometry args={[0.02, 0.02, 0.2, 8]} />
                 <meshStandardMaterial color="#FFD700" metalness={1} roughness={0.2} />
            </mesh>

            {/* Backplate to hide wireframe/objects behind when zoomed */}
            <mesh position={[0, 0, -0.01]}>
                 <planeGeometry args={[1.0, 1.2]} />
                 <meshStandardMaterial color="#111" />
            </mesh>
        </group>
    )
}