import { useEffect, useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import * as faceapi from 'face-api.js';

const CameraProctor = ({ onDisqualify, onViolation, sessionId }) => {
    const webcamRef = useRef(null);
    const canvasRef = useRef(null);
    const [isLoading, setIsLoading] = useState(true);
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [faceCount, setFaceCount] = useState(0);
    const [violationCount, setViolationCount] = useState(0);
    const [showWarning, setShowWarning] = useState(false);
    const [cameraError, setCameraError] = useState(null);
    const [phoneDetected, setPhoneDetected] = useState(false);
    const detectionIntervalRef = useRef(null);
    const violationFramesRef = useRef(0);
    const cocoModelRef = useRef(null);
    const phoneCheckCounter = useRef(0);

    // Load face-api.js models
    useEffect(() => {
        const loadModels = async () => {
            try {
                const MODEL_URL = '/models';
                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL)
                ]);
                setModelsLoaded(true);
                setIsLoading(false);

                // Load COCO-SSD lazily after 8 seconds to avoid lag
                setTimeout(() => {
                    loadCocoSsd();
                }, 8000);
            } catch (error) {
                console.error('Error loading face detection models:', error);
                setIsLoading(false);
            }
        };

        const loadCocoSsd = async () => {
            try {
                // Load TF.js first
                const tfScript = document.createElement('script');
                tfScript.src = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js';
                tfScript.async = true;
                document.head.appendChild(tfScript);

                tfScript.onload = () => {
                    const cocoScript = document.createElement('script');
                    cocoScript.src = 'https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js';
                    cocoScript.async = true;
                    document.head.appendChild(cocoScript);

                    cocoScript.onload = async () => {
                        try {
                            if (window.cocoSsd) {
                                cocoModelRef.current = await window.cocoSsd.load({ base: 'lite_mobilenet_v2' });
                                console.log('COCO-SSD loaded for phone detection');
                            }
                        } catch (e) {
                            console.warn('COCO-SSD load failed:', e);
                        }
                    };
                };
            } catch (e) {
                console.warn('Failed to load phone detection:', e);
            }
        };

        loadModels();

        return () => {
            if (detectionIntervalRef.current) {
                clearInterval(detectionIntervalRef.current);
            }
        };
    }, []);

    // Detection loop
    const detectFaces = useCallback(async () => {
        if (!webcamRef.current?.video || !modelsLoaded) return;
        const video = webcamRef.current.video;
        if (video.readyState !== 4) return;

        try {
            const detections = await faceapi.detectAllFaces(
                video,
                new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 })
            ).withFaceLandmarks(true);

            const faces = detections.length;
            setFaceCount(faces);

            let currentWarning = null;
            let violationType = null;

            // Phone detection (only every 5th tick = ~7.5 seconds at 1.5s interval)
            phoneCheckCounter.current += 1;
            if (cocoModelRef.current && phoneCheckCounter.current % 5 === 0) {
                try {
                    const predictions = await cocoModelRef.current.detect(video);
                    const phone = predictions.find(p => p.class === 'cell phone' && p.score > 0.45);
                    if (phone) {
                        currentWarning = "📱 Mobile Phone Detected!";
                        violationType = "mobile_phone";
                        setPhoneDetected(true);
                    } else {
                        setPhoneDetected(false);
                    }
                } catch (e) {
                    // silently ignore
                }
            }

            // Face violations
            if (!currentWarning) {
                if (faces > 1) {
                    currentWarning = "Multiple Faces Detected";
                    violationType = "multiple_faces";
                } else if (faces === 1) {
                    const landmarks = detections[0].landmarks;
                    const nose = landmarks.getNose();
                    const leftEye = landmarks.getLeftEye();
                    const rightEye = landmarks.getRightEye();
                    const noseTop = nose[0];

                    const leftEyeCenter = {
                        x: leftEye.reduce((a, c) => a + c.x, 0) / leftEye.length,
                        y: leftEye.reduce((a, c) => a + c.y, 0) / leftEye.length
                    };
                    const rightEyeCenter = {
                        x: rightEye.reduce((a, c) => a + c.x, 0) / rightEye.length,
                        y: rightEye.reduce((a, c) => a + c.y, 0) / rightEye.length
                    };

                    const distLeft = Math.abs(leftEyeCenter.x - noseTop.x);
                    const distRight = Math.abs(rightEyeCenter.x - noseTop.x);
                    let ratio = distRight > 0 ? distLeft / distRight : 1.0;

                    if (ratio < 0.4 || ratio > 2.5) {
                        currentWarning = "Please look at the screen";
                        violationType = "looking_away";
                    }
                }
            }

            if (currentWarning) {
                violationFramesRef.current += 1;
                setShowWarning(currentWarning);
                setTimeout(() => setShowWarning(false), 2000);

                // ~4.5 seconds continuous violation (3 frames × 1.5s)
                if (violationFramesRef.current >= 3) {
                    const newCount = violationCount + 1;
                    setViolationCount(newCount);
                    violationFramesRef.current = 0;

                    if (onViolation) onViolation(newCount);

                    try {
                        await fetch('http://localhost:8000/report_violation', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                session_id: sessionId,
                                violation_count: newCount,
                                violation_type: violationType
                            })
                        });
                    } catch (err) {
                        console.error('Failed to report violation:', err);
                    }

                    // Voice warning
                    if ('speechSynthesis' in window) {
                        const msg = violationType === 'mobile_phone'
                            ? 'Warning! Mobile phone detected. Put your phone away.'
                            : violationType === 'multiple_faces'
                                ? 'Warning! Multiple faces detected.'
                                : 'Warning! Please look at the screen.';
                        window.speechSynthesis.speak(new SpeechSynthesisUtterance(msg));
                    }

                    if (newCount >= 3 && onDisqualify) {
                        onDisqualify();
                    }
                }
            } else {
                violationFramesRef.current = 0;
            }

            // Draw on canvas
            if (canvasRef.current) {
                const displaySize = { width: video.videoWidth, height: video.videoHeight };
                faceapi.matchDimensions(canvasRef.current, displaySize);
                const resized = faceapi.resizeResults(detections, displaySize);
                const ctx = canvasRef.current.getContext('2d');
                ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                resized.forEach(d => {
                    const box = d.detection.box;
                    ctx.strokeStyle = currentWarning ? '#ef4444' : '#10b981';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(box.x, box.y, box.width, box.height);
                });
            }
        } catch (error) {
            console.error('Detection error:', error);
        }
    }, [modelsLoaded, violationCount, onViolation, onDisqualify, sessionId]);

    // Start detection loop — 1.5s interval for performance
    useEffect(() => {
        if (modelsLoaded && !detectionIntervalRef.current) {
            detectionIntervalRef.current = setInterval(detectFaces, 1500);
        }
        return () => {
            if (detectionIntervalRef.current) {
                clearInterval(detectionIntervalRef.current);
                detectionIntervalRef.current = null;
            }
        };
    }, [modelsLoaded, detectFaces]);

    const handleUserMediaError = useCallback((error) => {
        console.error('Webcam error:', error);
        setCameraError('Camera access denied');
    }, []);

    if (cameraError) {
        return (
            <div className="aspect-video bg-slate-800 rounded-xl flex items-center justify-center p-4 h-full">
                <div className="text-center">
                    <p className="text-red-400 text-xs">{cameraError}</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`relative rounded-xl overflow-hidden bg-black aspect-[4/3] ${showWarning ? 'ring-2 ring-red-500' : ''}`}>
            {isLoading && (
                <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center z-10">
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
            )}

            <Webcam
                ref={webcamRef}
                audio={false}
                screenshotFormat="image/jpeg"
                className="w-full h-full object-cover"
                videoConstraints={{ facingMode: 'user', width: 320, height: 240 }}
                onUserMediaError={handleUserMediaError}
            />

            <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full pointer-events-none" />

            <div className="absolute top-2 right-2 flex gap-2">
                {faceCount > 0 && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold text-white shadow-sm ${faceCount === 1 ? 'bg-emerald-500' : 'bg-red-500'}`}>
                        {faceCount} Face{faceCount !== 1 ? 's' : ''}
                    </span>
                )}
                {phoneDetected && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold text-white shadow-sm bg-orange-500 animate-pulse">
                        📱 Phone
                    </span>
                )}
            </div>

            {showWarning && (
                <div className="absolute inset-0 bg-red-500/30 flex flex-col items-center justify-center animate-pulse z-20 p-4 text-center">
                    <span className="text-4xl mb-2">⚠️</span>
                    <span className="text-white font-bold text-lg drop-shadow-md bg-black/50 px-3 py-1 rounded">
                        {typeof showWarning === 'string' ? showWarning : 'Warning'}
                    </span>
                </div>
            )}
        </div>
    );
};

export default CameraProctor;
