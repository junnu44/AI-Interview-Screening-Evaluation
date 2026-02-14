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
    const detectionIntervalRef = useRef(null);
    const violationFramesRef = useRef(0);

    // Load face-api.js models
    useEffect(() => {
        const loadModels = async () => {
            try {
                // Models are loaded from public folder
                const MODEL_URL = '/models';

                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL)
                ]);

                setModelsLoaded(true);
                setIsLoading(false);
            } catch (error) {
                console.error('Error loading face detection models:', error);
                setIsLoading(false);
                // Continue without face detection if models fail to load
            }
        };

        loadModels();

        return () => {
            if (detectionIntervalRef.current) {
                clearInterval(detectionIntervalRef.current);
            }
        };
    }, []);

    // Face detection loop
    const detectFaces = useCallback(async () => {
        if (!webcamRef.current?.video || !modelsLoaded) return;

        const video = webcamRef.current.video;

        if (video.readyState !== 4) return;

        try {
            // Detect faces with landmarks for gaze tracking
            const detections = await faceapi.detectAllFaces(
                video,
                new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 })
            ).withFaceLandmarks(true); // Enable landmarks

            const faces = detections.length;
            setFaceCount(faces);

            let currentWarning = null;
            let violationType = null;

            // Check for multiple faces
            if (faces > 1) {
                currentWarning = "Multiple Faces Detected";
                violationType = "multiple_faces";
            } else if (faces === 0) {
                // currentWarning = "No Face Detected"; // Optional: Warning for no face
                // violationType = "no_face";
            } else {
                // Single face - check gaze direction
                const landmarks = detections[0].landmarks;
                const nose = landmarks.getNose();
                const leftEye = landmarks.getLeftEye();
                const rightEye = landmarks.getRightEye();

                // Calculate horizontal gaze ratio directly from landmarks
                // Note: face-api.js returns x, y coordinates
                // Left Eye is actually on the right side of the image (mirror effect) usually, but points are labeled logically
                // Let's use the distance from nose bridge to eyes

                // Nose bridge top
                const noseTop = nose[0];

                // Average eye positions
                const leftEyeCenter = {
                    x: leftEye.reduce((acc, curr) => acc + curr.x, 0) / leftEye.length,
                    y: leftEye.reduce((acc, curr) => acc + curr.y, 0) / leftEye.length
                };
                const rightEyeCenter = {
                    x: rightEye.reduce((acc, curr) => acc + curr.x, 0) / rightEye.length,
                    y: rightEye.reduce((acc, curr) => acc + curr.y, 0) / rightEye.length
                };

                // Distances
                const distLeft = Math.abs(leftEyeCenter.x - noseTop.x);
                const distRight = Math.abs(rightEyeCenter.x - noseTop.x);

                // Ratio: If looking straight, ratio should be around 1.0
                // If looking left (user's left), right eye is closer to nose in 2D projection
                // Only if face turns significantly

                let ratio = 1.0;
                if (distRight > 0) {
                    ratio = distLeft / distRight;
                }

                // Thresholds determined experimentally
                // < 0.4 or > 2.5 usually indicates significant head turn
                if (ratio < 0.4 || ratio > 2.5) {
                    currentWarning = "Please look at the screen";
                    violationType = "looking_away";
                }
            }

            if (currentWarning) {
                violationFramesRef.current += 1;

                // Trigger warning immediately
                setShowWarning(currentWarning);
                setTimeout(() => setShowWarning(false), 2000);

                // After 3 seconds (approx 6 frames at 500ms interval) of continuous violation
                if (violationFramesRef.current >= 6) {
                    const newViolationCount = violationCount + 1;
                    setViolationCount(newViolationCount);
                    violationFramesRef.current = 0;

                    // Report violation to backend
                    if (onViolation) {
                        onViolation(newViolationCount);
                    }

                    // Report to backend API
                    try {
                        await fetch('http://localhost:8000/report_violation', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                session_id: sessionId,
                                violation_count: newViolationCount,
                                violation_type: violationType
                            })
                        });
                    } catch (err) {
                        console.error('Failed to report violation:', err);
                    }

                    // Disqualify after 3 violations
                    if (newViolationCount >= 3) {
                        if (onDisqualify) {
                            onDisqualify();
                        }
                    }
                }
            } else {
                // Reset violation frame counter
                violationFramesRef.current = 0;
            }

            // Draw detections on canvas
            if (canvasRef.current) {
                const displaySize = { width: video.videoWidth, height: video.videoHeight };
                faceapi.matchDimensions(canvasRef.current, displaySize);
                const resizedDetections = faceapi.resizeResults(detections, displaySize);

                const ctx = canvasRef.current.getContext('2d');
                ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

                // Draw boxes with color based on status
                resizedDetections.forEach(detection => {
                    const box = detection.detection.box; // Note: structure changes with landmarks
                    ctx.strokeStyle = currentWarning ? '#ef4444' : '#10b981';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(box.x, box.y, box.width, box.height);

                    // Optional: Draw landmarks for debugging
                    // faceapi.draw.drawFaceLandmarks(canvasRef.current, resizedDetections);
                });
            }
        } catch (error) {
            console.error('Face detection error:', error);
        }
    }, [modelsLoaded, violationCount, onViolation, onDisqualify, sessionId]);

    // Start face detection when models are loaded
    useEffect(() => {
        if (modelsLoaded && !detectionIntervalRef.current) {
            detectionIntervalRef.current = setInterval(detectFaces, 500);
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
            {/* Loading overlay */}
            {isLoading && (
                <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center z-10">
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
            )}

            {/* Webcam feed */}
            <Webcam
                ref={webcamRef}
                audio={false}
                screenshotFormat="image/jpeg"
                className="w-full h-full object-cover"
                videoConstraints={{
                    facingMode: 'user',
                    width: 320,
                    height: 240
                }}
                onUserMediaError={handleUserMediaError}
            />

            {/* Detection overlay canvas */}
            <canvas
                ref={canvasRef}
                className="absolute top-0 left-0 w-full h-full pointer-events-none"
            />

            {/* Face count indicator */}
            <div className="absolute top-2 right-2 flex gap-2">
                {faceCount > 0 && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold text-white shadow-sm ${faceCount === 1 ? 'bg-emerald-500' : 'bg-red-500'
                        }`}>
                        {faceCount} Face{faceCount !== 1 ? 's' : ''}
                    </span>
                )}
            </div>

            {/* Warning overlay */}
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
