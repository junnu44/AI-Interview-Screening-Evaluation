import { useState, useEffect, useRef } from 'react';
import CameraProctor from './CameraProctor';

const InterviewScreen = ({
  sessionId,
  candidateData,
  currentQuestion,
  questionIndex,
  totalQuestions,
  currentDifficulty,
  messages,
  violationCount,
  onSubmitAnswer,
  onSkipQuestion,
  onDisqualify,
  onViolation
}) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const recognitionRef = useRef(null);
  const silenceTimerRef = useRef(null);

  // Text-to-Speech for questions
  useEffect(() => {
    if (currentQuestion && currentQuestion.question) {
      speakQuestion(currentQuestion.question);
    }
  }, [currentQuestion]);

  const speakQuestion = (text) => {
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    stopListening();
    
    setIsSpeaking(true);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;
    
    utterance.onend = () => {
      setIsSpeaking(false);
      // Automatically start listening after question is spoken
      setTimeout(() => {
        startListening();
      }, 500);
    };
    
    utterance.onerror = () => {
      setIsSpeaking(false);
    };
    
    window.speechSynthesis.speak(utterance);
  };

  // Voice Recognition (Listening)
  const startListening = () => {
    if (isListening || isSpeaking) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in your browser. Please use Chrome or Edge.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    
    recognition.onstart = () => {
      setIsListening(true);
      setTranscript('');
      setInterimTranscript('');
    };
    
    recognition.onresult = (event) => {
      let interimText = '';
      let finalText = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptPiece = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalText += transcriptPiece + ' ';
        } else {
          interimText += transcriptPiece;
        }
      }
      
      if (finalText) {
        setTranscript(prev => {
          const newTranscript = prev + finalText;
          
          // Reset silence timer
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
          }
          
          // Auto-submit after 3 seconds of silence
          silenceTimerRef.current = setTimeout(() => {
            stopListening();
            // Use the latest transcript value
            if (newTranscript.trim()) {
              handleAutoSubmit(newTranscript);
            }
          }, 3000);
          
          return newTranscript;
        });
        setInterimTranscript('');
      } else {
        setInterimTranscript(interimText);
      }
    };
    
    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'no-speech') {
        // Don't restart, just stop
        stopListening();
      }
    };
    
    recognition.onend = () => {
      setIsListening(false);
    };
    
    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch (error) {
      console.error('Error starting recognition:', error);
      alert('Could not start speech recognition. Please try again.');
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.error('Error stopping recognition:', e);
      }
      recognitionRef.current = null;
    }
    
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    
    setIsListening(false);
  };

  const handleAutoSubmit = async (answer) => {
    if (!answer.trim() || isSubmitting) return;

    setIsSubmitting(true);
    
    try {
      await onSubmitAnswer(answer);
      setTranscript('');
      setInterimTranscript('');
    } catch (error) {
      console.error('Error submitting answer:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManualSubmit = async () => {
    const fullAnswer = transcript.trim();
    if (!fullAnswer || isSubmitting) return;

    stopListening();
    await handleAutoSubmit(fullAnswer);
  };

  const handleStopListening = () => {
    stopListening();
    // Don't auto-submit, let user review and manually submit
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
      stopListening();
    };
  }, []);

  const getDifficultyColor = (difficulty) => {
    if (difficulty < 40) return 'text-green-400';
    if (difficulty < 70) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getDifficultyLabel = (difficulty) => {
    if (difficulty < 40) return 'Easy';
    if (difficulty < 70) return 'Medium';
    return 'Hard';
  };

  const getStatusMessage = () => {
    if (isSpeaking) return 'AI is speaking...';
    if (isListening) return 'Listening to your answer...';
    if (isSubmitting) return 'Processing your answer...';
    return 'Tap to speak';
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Left Sidebar */}
      <div className="w-80 bg-gradient-to-b from-slate-900/95 to-purple-900/95 backdrop-blur-xl border-r border-white/10 p-6 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-3xl mb-2 animate-float">🤖</div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">AI Interview</h1>
          <p className="text-sm text-gray-300 mt-1">v2.0</p>
        </div>

        {/* Candidate Info */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 mb-6 border border-white/20 hover:border-emerald-400/50 transition-all duration-300">
          <h3 className="text-sm font-semibold text-gray-300 mb-2">Candidate</h3>
          <p className="text-white font-bold">{candidateData?.name}</p>
          <p className="text-sm text-emerald-400">{candidateData?.role}</p>
          <p className="text-xs text-gray-400 mt-1">{candidateData?.experience} years exp</p>
        </div>

        {/* Camera Feed */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-400 mb-3">Camera Proctoring</h3>
          <CameraProctor
            onDisqualify={onDisqualify}
            onViolation={onViolation}
            sessionId={sessionId}
          />
        </div>

        {/* Progress */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 mb-6 border border-white/20">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Progress</h3>
          <div className="flex items-center justify-between mb-2">
            <span className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">{questionIndex + 1}</span>
            <span className="text-gray-400">of {totalQuestions}</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-3 mb-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 h-3 rounded-full transition-all duration-700 shadow-lg"
              style={{ width: `${((questionIndex) / totalQuestions) * 100}%` }}
            />
          </div>
          <div className="text-xs text-gray-300 font-semibold">
            {Math.round(((questionIndex) / totalQuestions) * 100)}% Complete
          </div>
        </div>

        {/* Difficulty Indicator */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 mb-6 border border-white/20">
          <h3 className="text-sm font-semibold text-gray-300 mb-2">Current Difficulty</h3>
          <div className="flex items-center justify-between">
            <span className={`text-3xl font-bold ${getDifficultyColor(currentDifficulty)}`}>
              {getDifficultyLabel(currentDifficulty)}
            </span>
            <span className="text-gray-400 text-sm font-semibold">{currentDifficulty}/100</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-2 mt-3 overflow-hidden">
            <div
              className={`h-2 rounded-full transition-all duration-700 shadow-lg ${
                currentDifficulty < 40 ? 'bg-gradient-to-r from-green-400 to-emerald-500' :
                currentDifficulty < 70 ? 'bg-gradient-to-r from-yellow-400 to-orange-500' : 
                'bg-gradient-to-r from-red-400 to-pink-500'
              }`}
              style={{ width: `${currentDifficulty}%` }}
            />
          </div>
        </div>

        {/* Violations Warning */}
        {violationCount > 0 && (
          <div className="bg-gradient-to-br from-red-500/20 to-pink-500/20 backdrop-blur-sm border border-red-400/50 rounded-2xl p-4 animate-pulse">
            <p className="text-red-300 text-sm font-bold flex items-center gap-2">
              <span className="text-xl">⚠️</span>
              Violations: {violationCount}/3
            </p>
            <p className="text-red-300/80 text-xs mt-1">
              {3 - violationCount} warnings remaining
            </p>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-gradient-to-br from-slate-900 to-indigo-900">
        {/* Header */}
        <div className="p-6 border-b border-white/10 bg-slate-900/50 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full text-sm font-bold text-white shadow-lg">
                {currentQuestion?.category || 'General'}
              </span>
              <span className="text-gray-300 text-sm font-semibold">
                Question {questionIndex + 1}
              </span>
            </div>
            <div className="text-gray-300 text-sm font-mono">
              Session: #{sessionId}
            </div>
          </div>
        </div>

        {/* Current Question */}
        {currentQuestion && (
          <div className="p-6 bg-gradient-to-br from-purple-900/30 to-indigo-900/30 border-b border-white/10">
            <div className="max-w-4xl mx-auto">
              <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl hover:shadow-emerald-500/20 transition-all duration-300">
                <div className="flex items-start gap-4">
                  <div className="text-5xl animate-float">
                    {isSpeaking ? '🔊' : '❓'}
                  </div>
                  <div className="flex-1">
                    <p className="text-2xl text-white leading-relaxed font-medium">
                      {currentQuestion.question}
                    </p>
                    {currentQuestion.source && (
                      <p className="text-sm text-emerald-400 mt-3 font-semibold">
                        📌 Related to: {currentQuestion.source}
                      </p>
                    )}
                    {isSpeaking && (
                      <div className="mt-4 flex items-center gap-2 text-cyan-400 text-sm font-semibold">
                        <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                        Speaking question...
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => speakQuestion(currentQuestion.question)}
                    disabled={isSpeaking}
                    className="px-5 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:hover:scale-100 font-semibold"
                  >
                    🔊 Replay
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-900">
          <div className="max-w-4xl mx-auto space-y-4">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-2xl rounded-lg p-4 ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800 text-gray-200 border border-slate-700'
                  }`}
                >
                  {msg.type === 'question' && (
                    <div className="text-xs text-gray-400 mb-1">{msg.category}</div>
                  )}
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  {msg.evaluation && (
                    <div className="mt-3 pt-3 border-t border-blue-500/30">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Score: {msg.evaluation.score}/100</span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          msg.evaluation.quality === 'strong' ? 'bg-green-600' :
                          msg.evaluation.quality === 'partial' ? 'bg-yellow-600' : 'bg-red-600'
                        }`}>
                          {msg.evaluation.quality}
                        </span>
                      </div>
                      <p className="text-sm opacity-90">{msg.evaluation.feedback}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Answer Input - Voice Assistant Style */}
        <div className="p-6 border-t border-white/10 bg-gradient-to-br from-slate-900/95 to-purple-900/95 backdrop-blur-xl">
          <div className="max-w-4xl mx-auto">
            {/* Voice Assistant Interface */}
            <div className="text-center mb-6">
              <div className="relative inline-block">
                <button
                  onClick={isListening ? handleStopListening : startListening}
                  disabled={isSpeaking || isSubmitting}
                  className={`w-40 h-40 rounded-full flex items-center justify-center text-7xl transition-all duration-500 shadow-2xl ${
                    isListening 
                      ? 'bg-gradient-to-br from-red-500 to-pink-500 animate-pulse shadow-red-500/50 scale-110' 
                      : isSpeaking
                      ? 'bg-gradient-to-br from-blue-500 to-cyan-500 animate-pulse shadow-blue-500/50'
                      : 'bg-gradient-to-br from-emerald-500 via-cyan-500 to-blue-500 hover:scale-110 shadow-emerald-500/50 animate-gradient'
                  } disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`}
                >
                  {isSpeaking ? '🔊' : isListening ? '🎤' : '🤖'}
                </button>
                
                {isListening && (
                  <>
                    <div className="absolute -inset-6 border-4 border-red-400 rounded-full animate-ping opacity-75"></div>
                    <div className="absolute -inset-3 border-2 border-pink-400 rounded-full animate-pulse"></div>
                  </>
                )}
              </div>
              
              <div className="mt-6">
                <p className="text-2xl font-bold text-white mb-2">
                  {getStatusMessage()}
                </p>
                <p className="text-sm text-gray-300">
                  {isListening ? 'Click button to stop, or keep speaking...' : 
                   isSpeaking ? 'Please wait...' :
                   'Click the button to start speaking'}
                </p>
              </div>
            </div>

            {/* Live Transcript Display */}
            {(transcript || interimTranscript) && (
              <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 mb-6 border border-white/20 shadow-2xl">
                <div className="flex items-start gap-4">
                  <div className="text-3xl">💬</div>
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-emerald-400 mb-3">Your Answer:</h3>
                    <p className="text-white text-lg leading-relaxed">
                      {transcript}
                      {interimTranscript && (
                        <span className="text-gray-300 italic">{interimTranscript}</span>
                      )}
                      {isListening && <span className="inline-block w-1 h-6 bg-cyan-400 ml-1 animate-pulse"></span>}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4">
              {transcript && !isListening && !isSpeaking && (
                <>
                  <button
                    onClick={handleManualSubmit}
                    disabled={isSubmitting}
                    className="flex-1 py-4 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 text-white font-bold rounded-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:hover:scale-100 text-lg"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                        Submitting...
                      </span>
                    ) : (
                      '✓ Submit Answer'
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setTranscript('');
                      setInterimTranscript('');
                      startListening();
                    }}
                    className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white font-bold rounded-xl hover:bg-white/20 transition-all duration-300 border border-white/20"
                  >
                    🔄 Restart
                  </button>
                </>
              )}
              
              {!transcript && !isListening && !isSpeaking && (
                <button
                  onClick={onSkipQuestion}
                  disabled={isSubmitting}
                  className="flex-1 py-4 bg-white/10 backdrop-blur-sm text-white font-semibold rounded-xl hover:bg-white/20 transition-all duration-300 disabled:opacity-50 border border-white/20"
                >
                  Skip Question →
                </button>
              )}
            </div>

            <div className="mt-6 text-center">
              <p className="text-xs text-gray-300">
                💡 Tip: Speak clearly and naturally. Click the mic button when you're done speaking.
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Auto-submits after 3 seconds of silence
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewScreen;
