import { useEffect, useRef, useCallback, useState } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';

const VoiceChat = ({ onTranscript, disabled, onStatusChange }) => {
    const [lastTranscript, setLastTranscript] = useState('');
    const silenceTimeoutRef = useRef(null);

    const {
        transcript,
        listening,
        resetTranscript,
        browserSupportsSpeechRecognition,
        isMicrophoneAvailable
    } = useSpeechRecognition();

    // Update status when listening state changes
    useEffect(() => {
        if (onStatusChange) {
            onStatusChange(listening ? 'listening' : 'idle');
        }
    }, [listening, onStatusChange]);

    // Silence detection - auto-submit after 2 seconds of silence
    useEffect(() => {
        if (transcript && transcript !== lastTranscript) {
            setLastTranscript(transcript);

            // Clear existing timeout
            if (silenceTimeoutRef.current) {
                clearTimeout(silenceTimeoutRef.current);
            }

            // Set new timeout for silence detection
            silenceTimeoutRef.current = setTimeout(() => {
                if (transcript.trim() && listening) {
                    handleSendAnswer();
                }
            }, 2000); // 2 seconds of silence
        }

        return () => {
            if (silenceTimeoutRef.current) {
                clearTimeout(silenceTimeoutRef.current);
            }
        };
    }, [transcript, lastTranscript, listening]);

    const startListening = useCallback(() => {
        if (disabled) return;
        resetTranscript();
        setLastTranscript('');
        SpeechRecognition.startListening({ continuous: true, language: 'en-US' });
    }, [disabled, resetTranscript]);

    const stopListening = useCallback(() => {
        SpeechRecognition.stopListening();
    }, []);

    const handleSendAnswer = useCallback(() => {
        if (transcript.trim()) {
            SpeechRecognition.stopListening();
            if (onTranscript) {
                onTranscript(transcript.trim());
            }
            resetTranscript();
            setLastTranscript('');
        }
    }, [transcript, onTranscript, resetTranscript]);

    const handleClear = useCallback(() => {
        resetTranscript();
        setLastTranscript('');
    }, [resetTranscript]);

    if (!browserSupportsSpeechRecognition) {
        return (
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                <p className="text-yellow-400 text-sm">
                    ⚠️ Your browser doesn't support speech recognition. Please use Chrome.
                </p>
            </div>
        );
    }

    if (!isMicrophoneAvailable) {
        return (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                <p className="text-red-400 text-sm">
                    🎤 Microphone access denied. Please enable microphone permissions.
                </p>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-6">
            {/* Mic Button with Pulse Effect */}
            <div className="relative group">
                {listening && (
                    <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-75"></div>
                )}
                <button
                    onClick={listening ? stopListening : startListening}
                    disabled={disabled}
                    className={`relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg ${disabled
                        ? 'bg-slate-700 cursor-not-allowed opacity-50'
                        : listening
                            ? 'bg-gradient-to-r from-red-500 to-pink-600 scale-110 shadow-red-500/50'
                            : 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:scale-105 hover:shadow-cyan-500/50'
                        }`}
                >
                    <span className="text-2xl text-white">
                        {listening ? '⏹️' : '🎙️'}
                    </span>
                </button>
            </div>

            {/* Status and Transcript Area */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                    <p className={`text-sm font-medium ${listening ? 'text-red-400 animate-pulse' : 'text-gray-400'}`}>
                        {listening ? 'Listening...' : disabled ? 'Microphone Disabled' : 'Click mic to speak'}
                    </p>
                    {transcript && (
                        <div className="flex gap-2">
                            <button
                                onClick={handleSendAnswer}
                                className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded hover:bg-green-500/30 transition-colors"
                            >
                                Send
                            </button>
                            <button
                                onClick={handleClear}
                                className="text-xs bg-slate-700 text-gray-300 px-2 py-1 rounded hover:bg-slate-600 transition-colors"
                            >
                                Clear
                            </button>
                        </div>
                    )}
                </div>

                <div className={`h-12 rounded-lg bg-black/20 border border-white/5 flex items-center px-4 overflow-hidden transition-all ${listening ? 'border-red-500/30' : ''}`}>
                    {transcript ? (
                        <p className="text-white truncate">{transcript}</p>
                    ) : (
                        <p className="text-gray-500 text-sm italic">
                            {listening ? 'Speak now...' : 'Transcript will appear here...'}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VoiceChat;
