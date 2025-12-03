import React, { useEffect, useRef, useState } from 'react';
import { FilesetResolver, GestureRecognizer } from '@mediapipe/tasks-vision';
import { TreeState } from '../types';

interface GestureControllerProps {
  setTreeState: React.Dispatch<React.SetStateAction<TreeState>>;
}

export const GestureController: React.FC<GestureControllerProps> = ({ setTreeState }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<string>('INIT_MODEL'); // INIT_MODEL, WAITING_CAMERA, ACTIVE, ERROR
  const gestureRecognizerRef = useRef<GestureRecognizer | null>(null);
  const lastVideoTimeRef = useRef(-1);
  const requestRef = useRef<number>(0);
  
  // Logic for smoothing gestures and tracking
  const previousHandX = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  // Visual Feedback State
  const [handPos, setHandPos] = useState<{x: number, y: number} | null>(null);
  const [detectedGesture, setDetectedGesture] = useState<string>('');

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        setStatus('LOADING_AI');
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm"
        );
        
        if (!mounted) return;

        gestureRecognizerRef.current = await GestureRecognizer.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1,
          minHandDetectionConfidence: 0.25, 
          minHandPresenceConfidence: 0.25,
          minTrackingConfidence: 0.25
        });

        if (!mounted) return;
        setStatus('WAITING_CAMERA');

        // Setup Webcam
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    width: 320,
                    height: 240,
                    frameRate: { ideal: 30 }
                } 
            });
            
            if (!mounted) {
                stream.getTracks().forEach(track => track.stop());
                return;
            }

            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.onloadedmetadata = () => {
                   if (videoRef.current) {
                       videoRef.current.play().catch(e => console.error("Play error:", e));
                       setStatus('ACTIVE');
                       predictWebcam();
                   }
                };
            }
        } else {
            setStatus('ERROR_NO_CAM');
        }
      } catch (err) {
        console.error("Error initializing gestures:", err);
        setStatus('ERROR_MODEL');
      }
    };

    init();

    return () => {
        mounted = false;
        if(requestRef.current) cancelAnimationFrame(requestRef.current);
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }
    };
  }, []);

  const predictWebcam = () => {
    const video = videoRef.current;
    const recognizer = gestureRecognizerRef.current;

    if (video && recognizer && video.readyState >= 2) { 
        if (video.currentTime !== lastVideoTimeRef.current) {
            lastVideoTimeRef.current = video.currentTime;
            
            let results;
            try {
                results = recognizer.recognizeForVideo(video, Date.now());
            } catch(e) {
                console.warn("Recognition skipped frame", e);
            }

            if (results && results.gestures.length > 0 && results.landmarks.length > 0) {
                const gesture = results.gestures[0][0]; 
                const landmarks = results.landmarks[0];
                
                // Get Center of Palm
                const wrist = landmarks[0];
                const middleFinger = landmarks[9];
                const centerX = (wrist.x + middleFinger.x) / 2;
                const centerY = (wrist.y + middleFinger.y) / 2;

                // Update Visual Cursor
                setHandPos({ x: 1 - centerX, y: centerY });
                setDetectedGesture(gesture.categoryName);

                // --- 1. Global State Management ---
                if (gesture.categoryName === 'Open_Palm') {
                    setTreeState(TreeState.CHAOS);
                } else if (gesture.categoryName === 'Closed_Fist') {
                    setTreeState(TreeState.FORMED);
                }

                // --- 2. Magic Dust Attraction ---
                const ndcX = (1 - centerX) * 2 - 1; 
                const ndcY = -(centerY * 2 - 1); 

                window.dispatchEvent(new CustomEvent('hand-move', { 
                    detail: { x: ndcX, y: ndcY, active: true } 
                }));

                // --- 3. Swipe to Spin Physics ---
                const handX = 1 - centerX; 
                if (previousHandX.current !== null) {
                    const delta = handX - previousHandX.current;
                    
                    // Increased threshold to ignore jitters
                    // Decreased multiplier (2.5 -> 1.2) for heavy luxury weight
                    if (Math.abs(delta) > 0.008) { 
                        const velocity = delta * 1.2; 
                        window.dispatchEvent(new CustomEvent('tree-spin', { detail: { velocity } }));
                    }
                }
                previousHandX.current = handX;

            } else {
                // Hand lost
                previousHandX.current = null;
                setHandPos(null);
                setDetectedGesture('');
                window.dispatchEvent(new CustomEvent('hand-move', { 
                    detail: { active: false } 
                }));
            }
        }
    }
    requestRef.current = requestAnimationFrame(predictWebcam);
  };

  const getStatusText = () => {
      switch(status) {
          case 'LOADING_AI': return 'DOWNLOADING AI...';
          case 'WAITING_CAMERA': return 'STARTING CAM...';
          case 'ACTIVE': return 'SYSTEM ACTIVE';
          case 'ERROR_MODEL': return 'AI LOAD FAILED';
          case 'ERROR_NO_CAM': return 'NO CAMERA';
          default: return 'INITIALIZING...';
      }
  };

  const getStatusColor = () => {
      if (status === 'ACTIVE') return 'text-green-400';
      if (status.startsWith('ERROR')) return 'text-red-500';
      return 'text-yellow-500';
  };

  return (
    <>
        <div className="fixed bottom-8 left-8 z-50 pointer-events-none flex flex-col gap-3 items-start">
            {/* Video Element - Visible window */}
            <div className="relative rounded-xl overflow-hidden border-2 border-yellow-500/30 shadow-[0_0_20px_rgba(255,215,0,0.15)] bg-black/50 backdrop-blur-sm transition-all duration-300">
                <video 
                    ref={videoRef} 
                    className={`w-40 h-32 object-cover ${status === 'ACTIVE' ? 'opacity-100' : 'opacity-30'} transition-opacity duration-700`} 
                    muted 
                    playsInline 
                    style={{ transform: 'scaleX(-1)' }} 
                />
                
                {/* Overlay loading state */}
                {status !== 'ACTIVE' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 p-2 text-center">
                        <div className={`w-6 h-6 border-2 border-t-transparent rounded-full animate-spin mb-2 ${status.startsWith('ERROR') ? 'border-red-500' : 'border-yellow-500'}`} />
                        <span className={`text-[10px] font-serif tracking-widest ${getStatusColor()}`}>{getStatusText()}</span>
                    </div>
                )}
            </div>
            
            {/* Status Indicator */}
            {status === 'ACTIVE' && (
                <div className="flex items-center gap-3 bg-black/80 backdrop-blur-md border border-white/10 px-4 py-2 rounded-lg shadow-lg w-full">
                    <div className={`w-3 h-3 rounded-full ${handPos ? 'bg-green-500 shadow-[0_0_8px_#00ff00]' : 'bg-red-500 animate-pulse'}`} />
                    <div className="flex flex-col">
                        <span className="text-yellow-500/80 text-[10px] font-serif uppercase tracking-widest leading-none mb-1">
                            Gesture Detection
                        </span>
                        <span className="text-white text-xs font-bold font-mono tracking-wide leading-none">
                            {handPos ? (detectedGesture === 'Open_Palm' ? 'OPEN (SCATTER)' : detectedGesture === 'Closed_Fist' ? 'FIST (ASSEMBLE)' : 'TRACKING') : 'SEARCHING...'}
                        </span>
                    </div>
                </div>
            )}
        </div>

        {/* Visual Hand Cursor Tracking */}
        {handPos && (
            <div 
                className="fixed w-16 h-16 border-2 border-yellow-400/50 rounded-full pointer-events-none z-50 transition-transform duration-75 ease-out shadow-[0_0_30px_rgba(255,215,0,0.3)] flex items-center justify-center"
                style={{ 
                    left: `${handPos.x * 100}%`, 
                    top: `${handPos.y * 100}%`,
                    transform: 'translate(-50%, -50%)'
                }}
            >
                <div className="w-1.5 h-1.5 bg-yellow-100 rounded-full shadow-[0_0_10px_#fff]" />
                <div className="absolute w-full h-full border border-yellow-200/20 rounded-full animate-ping" />
            </div>
        )}
    </>
  );
};