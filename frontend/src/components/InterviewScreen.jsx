import { useState, useEffect, useRef, useCallback } from 'react';
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [captionText, setCaptionText] = useState('');

  const silenceTimerRef = useRef(null);
  const lastSpokenQuestionRef = useRef('');
  const isSubmittingRef = useRef(false);
  const recognitionRef = useRef(null);
  const captionTextRef = useRef('');

  // ──── NATIVE WEB SPEECH API SETUP ────
  useEffect(() => {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      console.error('Speech Recognition not supported in this browser');
      return;
    }

    const recognition = new SpeechRec();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let finalText = '';
      let interimText = '';

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript + ' ';
        } else {
          interimText += result[0].transcript;
        }
      }

      const fullText = (finalText + interimText).trim();
      captionTextRef.current = fullText;
      setCaptionText(fullText);

      // Reset silence timer on every new result
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

      silenceTimerRef.current = setTimeout(() => {
        // Auto-submit after 3.5 seconds of silence
        if (captionTextRef.current.trim() && !isSubmittingRef.current) {
          stopListening();
          doSubmit(captionTextRef.current);
        }
      }, 3500);
    };

    recognition.onend = () => {
      // If we're supposed to still be listening (e.g. browser auto-stopped), restart
      if (!isSubmittingRef.current && captionTextRef.current === '') {
        // Only auto-restart if no answer captured yet
      }
      setIsListening(false);
    };

    recognition.onerror = (event) => {
      console.warn('Speech recognition error:', event.error);
      if (event.error !== 'aborted') {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      try { recognition.abort(); } catch (e) { }
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };
  }, []);

  // ──── START / STOP LISTENING ────
  const startListening = useCallback(() => {
    if (!recognitionRef.current || isSpeaking || isSubmittingRef.current) return;
    try {
      captionTextRef.current = '';
      setCaptionText('');
      recognitionRef.current.start();
      setIsListening(true);
    } catch (e) {
      console.warn('Could not start recognition:', e);
    }
  }, [isSpeaking]);

  const stopListening = useCallback(() => {
    try {
      recognitionRef.current?.stop();
    } catch (e) { }
    setIsListening(false);
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
  }, []);

  // ──── TEXT-TO-SPEECH (with dedup guard) ────
  useEffect(() => {
    if (
      currentQuestion?.question &&
      currentQuestion.question !== lastSpokenQuestionRef.current
    ) {
      lastSpokenQuestionRef.current = currentQuestion.question;
      speakQuestion(currentQuestion.question);
    }
  }, [currentQuestion]);

  const speakQuestion = useCallback((text) => {
    if (!('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();
    stopListening();

    setIsSpeaking(true);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v =>
      v.lang.startsWith('en') &&
      (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Zira') || v.name.includes('Samantha'))
    );
    if (preferred) utterance.voice = preferred;

    utterance.onend = () => {
      setIsSpeaking(false);
      // Auto-start listening after AI reads the question
      setTimeout(() => startListening(), 300);
    };

    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, [stopListening, startListening]);

  // ──── SUBMIT LOGIC ────
  const doSubmit = useCallback(async (answerText) => {
    const finalAnswer = answerText?.trim();
    if (!finalAnswer || isSubmittingRef.current) return;

    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      stopListening();
      await onSubmitAnswer(finalAnswer);
      captionTextRef.current = '';
      setCaptionText('');
    } catch (error) {
      console.error('Error submitting answer:', error);
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }, [onSubmitAnswer, stopListening]);

  // ──── CLEANUP ────
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
      stopListening();
    };
  }, [stopListening]);

  // ──── UI HELPERS ────
  const getDifficultyColor = (d) => d < 40 ? 'text-green-400' : d < 70 ? 'text-yellow-400' : 'text-red-400';
  const getDifficultyLabel = (d) => d < 40 ? 'Easy' : d < 70 ? 'Medium' : 'Hard';

  const getStatusMessage = () => {
    if (isSpeaking) return '🔊 AI is reading the question...';
    if (isSubmitting) return '⏳ Processing your answer...';
    if (isListening) return '🎤 Listening... (auto-submits on pause)';
    return '🤖 Click mic to start speaking';
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* ── Left Sidebar ── */}
      <div className="w-80 bg-gradient-to-b from-slate-900/95 to-purple-900/95 backdrop-blur-xl border-r border-white/10 p-6 flex flex-col shadow-2xl">
        <div className="text-center mb-6">
          <div className="text-3xl mb-2 animate-float">🤖</div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">AI Interview</h1>
          <p className="text-sm text-gray-300 mt-1">v2.0</p>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 mb-6 border border-white/20 hover:border-emerald-400/50 transition-all duration-300">
          <h3 className="text-sm font-semibold text-gray-300 mb-2">Candidate</h3>
          <p className="text-white font-bold">{candidateData?.name}</p>
          <p className="text-sm text-emerald-400">{candidateData?.role}</p>
          <p className="text-xs text-gray-400 mt-1">{candidateData?.experience} years exp</p>
        </div>

        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-400 mb-3">Camera Proctoring</h3>
          <CameraProctor onDisqualify={onDisqualify} onViolation={onViolation} sessionId={sessionId} />
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 mb-6 border border-white/20">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Progress</h3>
          <div className="flex items-center justify-between mb-2">
            <span className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">{questionIndex + 1}</span>
            <span className="text-gray-400">of {totalQuestions}</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-3 mb-3 overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 h-3 rounded-full transition-all duration-700 shadow-lg" style={{ width: `${((questionIndex) / totalQuestions) * 100}%` }} />
          </div>
          <div className="text-xs text-gray-300 font-semibold">{Math.round(((questionIndex) / totalQuestions) * 100)}% Complete</div>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 mb-6 border border-white/20">
          <h3 className="text-sm font-semibold text-gray-300 mb-2">Current Difficulty</h3>
          <div className="flex items-center justify-between">
            <span className={`text-3xl font-bold ${getDifficultyColor(currentDifficulty)}`}>{getDifficultyLabel(currentDifficulty)}</span>
            <span className="text-gray-400 text-sm font-semibold">{currentDifficulty}/100</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-2 mt-3 overflow-hidden">
            <div className={`h-2 rounded-full transition-all duration-700 shadow-lg ${currentDifficulty < 40 ? 'bg-gradient-to-r from-green-400 to-emerald-500' : currentDifficulty < 70 ? 'bg-gradient-to-r from-yellow-400 to-orange-500' : 'bg-gradient-to-r from-red-400 to-pink-500'}`} style={{ width: `${currentDifficulty}%` }} />
          </div>
        </div>

        {violationCount > 0 && (
          <div className="bg-gradient-to-br from-red-500/20 to-pink-500/20 backdrop-blur-sm border border-red-400/50 rounded-2xl p-4 animate-pulse">
            <p className="text-red-300 text-sm font-bold flex items-center gap-2">
              <span className="text-xl">⚠️</span> Violations: {violationCount}/3
            </p>
            <p className="text-red-300/80 text-xs mt-1">{3 - violationCount} warnings remaining</p>
          </div>
        )}
      </div>

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col bg-gradient-to-br from-slate-900 to-indigo-900">
        {/* Header */}
        <div className="p-6 border-b border-white/10 bg-slate-900/50 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full text-sm font-bold text-white shadow-lg">{currentQuestion?.category || 'General'}</span>
              <span className="text-gray-300 text-sm font-semibold">Question {questionIndex + 1}</span>
            </div>
            <div className="text-gray-300 text-sm font-mono">Session: #{sessionId}</div>
          </div>
        </div>

        {/* Question Display */}
        {currentQuestion && (
          <div className="p-6 bg-gradient-to-br from-purple-900/30 to-indigo-900/30 border-b border-white/10">
            <div className="max-w-4xl mx-auto">
              <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl">
                <div className="flex items-start gap-4">
                  <div className="text-5xl animate-float">{isSpeaking ? '🔊' : '❓'}</div>
                  <div className="flex-1">
                    <p className="text-2xl text-white leading-relaxed font-medium">{currentQuestion.question}</p>
                    {currentQuestion.source && (
                      <p className="text-sm text-emerald-400 mt-3 font-semibold">📌 Related to: {currentQuestion.source}</p>
                    )}
                    {isSpeaking && (
                      <div className="mt-4 flex items-center gap-2 text-cyan-400 text-sm font-semibold">
                        <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                        Speaking question...
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => { lastSpokenQuestionRef.current = ''; speakQuestion(currentQuestion.question); }}
                    disabled={isSpeaking}
                    className="px-5 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-300 disabled:opacity-50 font-semibold"
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
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-2xl rounded-lg p-4 ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-gray-200 border border-slate-700'}`}>
                  {msg.type === 'question' && <div className="text-xs text-gray-400 mb-1">{msg.category}</div>}
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  {msg.evaluation && (
                    <div className="mt-3 pt-3 border-t border-blue-500/30">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Score: {msg.evaluation.score}/100</span>
                        <span className={`text-xs px-2 py-1 rounded ${msg.evaluation.quality === 'strong' ? 'bg-green-600' : msg.evaluation.quality === 'partial' ? 'bg-yellow-600' : 'bg-red-600'}`}>
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

        {/* ── Answer Area ── */}
        <div className="p-6 border-t border-white/10 bg-gradient-to-br from-slate-900/95 to-purple-900/95 backdrop-blur-xl">
          <div className="max-w-4xl mx-auto">
            {/* Mic Button */}
            <div className="text-center mb-5">
              <div className="relative inline-block">
                <button
                  onClick={() => isListening ? stopListening() : startListening()}
                  disabled={isSpeaking || isSubmitting}
                  className={`w-28 h-28 rounded-full flex items-center justify-center text-5xl transition-all duration-500 shadow-2xl ${isListening
                    ? 'bg-gradient-to-br from-red-500 to-pink-500 animate-pulse shadow-red-500/50 scale-110'
                    : isSpeaking
                      ? 'bg-gradient-to-br from-blue-500 to-cyan-500 shadow-blue-500/50'
                      : 'bg-gradient-to-br from-emerald-500 via-cyan-500 to-blue-500 hover:scale-110 shadow-emerald-500/50'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isSpeaking ? '🔊' : isListening ? '🎤' : '🤖'}
                </button>
                {isListening && (
                  <>
                    <div className="absolute -inset-4 border-4 border-red-400 rounded-full animate-ping opacity-75"></div>
                    <div className="absolute -inset-2 border-2 border-pink-400 rounded-full animate-pulse"></div>
                  </>
                )}
              </div>
              <p className="mt-3 text-lg font-bold text-white">{getStatusMessage()}</p>
            </div>

            {/* READ-ONLY Caption Box */}
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-5 mb-4 border border-white/20 shadow-2xl">
              <div className="flex items-start gap-3">
                <div className="text-2xl">💬</div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-emerald-400 mb-2 flex items-center gap-2">
                    Live Captions
                    {isListening && <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>}
                  </h3>
                  <div className="w-full bg-black/30 text-white text-lg leading-relaxed p-4 rounded-xl border border-white/10 min-h-[80px] max-h-[150px] overflow-y-auto">
                    {captionText || (
                      <span className="text-gray-500 italic">
                        {isSpeaking ? 'Waiting for AI to finish speaking...'
                          : isListening ? 'Listening... speak now, your words will appear here'
                            : 'Click the mic button above to start speaking'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Buttons — Skip + Restart only */}
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => { stopListening(); captionTextRef.current = ''; setCaptionText(''); startListening(); }}
                disabled={isSubmitting || isSpeaking}
                className="px-6 py-3 bg-white/10 backdrop-blur-sm text-white font-bold rounded-xl hover:bg-white/20 transition-all duration-300 border border-white/20 disabled:opacity-50"
              >
                🔄 Restart Answer
              </button>
              <button
                onClick={() => { stopListening(); captionTextRef.current = ''; setCaptionText(''); onSkipQuestion(); }}
                disabled={isSubmitting}
                className="px-6 py-3 bg-red-500/20 backdrop-blur-sm text-white font-bold rounded-xl hover:bg-red-500/40 transition-all duration-300 border border-red-500/30 disabled:opacity-50"
              >
                ⏭️ Skip Question
              </button>
            </div>

            <p className="mt-3 text-center text-xs text-gray-400">💡 Your answer auto-submits after ~4 seconds of silence. Just speak naturally!</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewScreen;
