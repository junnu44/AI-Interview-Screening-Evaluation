import { useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import VoiceChat from './components/VoiceChat';
import CameraProctor from './components/CameraProctor';
import ChatHistory from './components/ChatHistory';

const API_URL = 'http://localhost:8000';

function App() {
  // Interview state
  const [step, setStep] = useState('registration'); // 'registration' | 'interview' | 'complete' | 'disqualified'
  const [sessionId, setSessionId] = useState(null);
  const [candidateInfo, setCandidateInfo] = useState({
    name: '',
    email: '',
    role: '',
    experience: ''
  });

  // Interview progress
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [messages, setMessages] = useState([]);
  const [finalScore, setFinalScore] = useState(null);

  // UI state
  const [micStatus, setMicStatus] = useState('idle'); // 'idle' | 'listening' | 'processing'
  const [isLoading, setIsLoading] = useState(false);
  const [textAnswer, setTextAnswer] = useState('');
  const [violationCount, setViolationCount] = useState(0);

  // Text-to-speech for question reading
  const speakQuestion = useCallback((text) => {
    if ('speechSynthesis' in window && text) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  // Start interview
  const handleStartInterview = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await axios.post(`${API_URL}/start_interview`, {
        name: candidateInfo.name,
        email: candidateInfo.email,
        role: candidateInfo.role,
        experience: candidateInfo.experience,
        hobbies: ''
      });

      if (response.data.success) {
        setSessionId(response.data.session_id);
        setTotalQuestions(response.data.total_questions);

        if (response.data.first_question) {
          setCurrentQuestion(response.data.first_question);
          setQuestionIndex(0);

          // Add question to chat
          setMessages([{
            role: 'assistant',
            type: 'question',
            content: response.data.first_question.question,
            category: response.data.first_question.category,
            timestamp: new Date().toISOString()
          }]);

          // Speak the question
          setTimeout(() => speakQuestion(response.data.first_question.question), 500);
        }

        setStep('interview');
      }
    } catch (error) {
      console.error('Failed to start interview:', error);
      alert('Failed to start interview. Please make sure the backend is running.');
    } finally {
      setIsLoading(false);
    }
  };

  // Submit answer
  const handleSubmitAnswer = async (answerText) => {
    if (!answerText.trim() || !sessionId) return;

    setMicStatus('processing');
    setIsLoading(true);

    // Add user answer to chat
    setMessages(prev => [...prev, {
      role: 'user',
      type: 'answer',
      content: answerText,
      timestamp: new Date().toISOString()
    }]);

    try {
      const response = await axios.post(`${API_URL}/submit_answer`, {
        session_id: sessionId,
        answer_text: answerText
      });

      if (response.data.success) {
        // Add evaluation feedback to last user message
        setMessages(prev => prev.map((msg, idx) =>
          idx === prev.length - 1
            ? { ...msg, evaluation: response.data.evaluation }
            : msg
        ));

        if (response.data.is_complete) {
          // Interview complete
          setFinalScore(response.data.final_score);
          setStep('complete');
        } else if (response.data.next_question) {
          // Move to next question
          setCurrentQuestion(response.data.next_question);
          setQuestionIndex(response.data.questions_answered);
          setTotalQuestions(response.data.total_questions);

          // Add next question to chat
          setMessages(prev => [...prev, {
            role: 'assistant',
            type: 'question',
            content: response.data.next_question.question,
            category: response.data.next_question.category,
            timestamp: new Date().toISOString()
          }]);

          // Speak the next question
          setTimeout(() => speakQuestion(response.data.next_question.question), 500);
        }
      }
    } catch (error) {
      console.error('Failed to submit answer:', error);
    } finally {
      setIsLoading(false);
      setMicStatus('idle');
      setTextAnswer('');
    }
  };

  // Skip question
  const handleSkipQuestion = async () => {
    if (!sessionId) return;

    setIsLoading(true);

    try {
      const response = await axios.post(`${API_URL}/skip_question`, {
        user_text: '',
        session_id: sessionId
      });

      if (response.data.is_complete) {
        setFinalScore(response.data.final_score);
        setStep('complete');
      } else {
        // Fetch next question
        const qResponse = await axios.get(`${API_URL}/questions/${sessionId}`);
        if (qResponse.data.success && !qResponse.data.is_complete) {
          setCurrentQuestion(qResponse.data.question);
          setQuestionIndex(qResponse.data.current_index);

          // Add to chat
          setMessages(prev => [...prev, {
            role: 'user',
            type: 'answer',
            content: '(Skipped)',
            timestamp: new Date().toISOString()
          }, {
            role: 'assistant',
            type: 'question',
            content: qResponse.data.question.question,
            category: qResponse.data.question.category,
            timestamp: new Date().toISOString()
          }]);

          speakQuestion(qResponse.data.question.question);
        }
      }
    } catch (error) {
      console.error('Failed to skip question:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle disqualification
  const handleDisqualify = useCallback(() => {
    window.speechSynthesis.cancel();
    setStep('disqualified');
  }, []);

  // Handle violation
  const handleViolation = useCallback((count) => {
    setViolationCount(count);
  }, []);

  // Repeat question
  const handleRepeatQuestion = () => {
    if (currentQuestion) {
      speakQuestion(currentQuestion.question);
    }
  };

  // Handle text answer submit
  const handleTextSubmit = (e) => {
    e.preventDefault();
    if (textAnswer.trim()) {
      handleSubmitAnswer(textAnswer);
    }
  };

  // Registration form
  if (step === 'registration') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background Decor */}
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-600/30 rounded-full blur-[100px] animate-blob"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/30 rounded-full blur-[100px] animate-blob animation-delay-2000"></div>

        <div className="glass-card w-full max-w-lg p-10 rounded-2xl relative z-10 animate-enter">
          <div className="text-center mb-10">
            <div className="text-6xl mb-4 animate-float">🤖</div>
            <h1 className="text-4xl font-bold gradient-text mb-2">AI Interview</h1>
            <p className="text-gray-400 font-light">Advanced Screening & Evaluation System</p>
          </div>

          <form onSubmit={handleStartInterview} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-blue-300 ml-1">Full Name</label>
              <input
                type="text"
                required
                value={candidateInfo.name}
                onChange={(e) => setCandidateInfo({ ...candidateInfo, name: e.target.value })}
                className="w-full px-5 py-4 glass-input rounded-xl focus:ring-2 focus:ring-purple-500/50"
                placeholder="John Doe"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-blue-300 ml-1">Email Address</label>
              <input
                type="email"
                required
                value={candidateInfo.email}
                onChange={(e) => setCandidateInfo({ ...candidateInfo, email: e.target.value })}
                className="w-full px-5 py-4 glass-input rounded-xl focus:ring-2 focus:ring-purple-500/50"
                placeholder="john@example.com"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-blue-300 ml-1">Role</label>
                <input
                  type="text"
                  required
                  value={candidateInfo.role}
                  onChange={(e) => setCandidateInfo({ ...candidateInfo, role: e.target.value })}
                  className="w-full px-5 py-4 glass-input rounded-xl focus:ring-2 focus:ring-purple-500/50"
                  placeholder="e.g. Developer"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-blue-300 ml-1">Experience (Yrs)</label>
                <input
                  type="text"
                  required
                  value={candidateInfo.experience}
                  onChange={(e) => setCandidateInfo({ ...candidateInfo, experience: e.target.value })}
                  className="w-full px-5 py-4 glass-input rounded-xl focus:ring-2 focus:ring-purple-500/50"
                  placeholder="e.g. 3"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 mt-4 btn-primary text-white font-bold rounded-xl shadow-lg hover:shadow-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed transform transition-all active:scale-95"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Initializing...
                </span>
              ) : (
                '🚀 Start Interview Session'
              )}
            </button>
          </form>

          <p className="text-center text-gray-500 text-xs mt-8">
            By starting, you agree to camera and microphone proctoring.
          </p>
        </div>
      </div>
    );
  }

  // Disqualified screen
  if (step === 'disqualified') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass-card w-full max-w-md p-10 text-center border-red-500/50 shadow-red-900/20">
          <div className="text-7xl mb-6">🚫</div>
          <h1 className="text-3xl font-bold text-red-500 mb-4">Disqualified</h1>
          <p className="text-gray-300 mb-8 leading-relaxed">
            Multiple proctoring violations were detected during your session.
            Standard procedure requires us to terminate the interview.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-all border border-slate-600"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  // Complete screen
  if (step === 'complete') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass-card w-full max-w-lg p-10 text-center animate-enter">
          <div className="text-7xl mb-6 animate-bounce">🎉</div>
          <h1 className="text-4xl font-bold gradient-text mb-6">Interview Complete!</h1>

          <div className="bg-slate-900/50 border border-slate-700 rounded-2xl p-8 mb-8 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10"></div>
            <p className="text-sm text-blue-300 mb-2 uppercase tracking-wider relative z-10">Overall Score</p>
            <div className="relative z-10 flex items-baseline justify-center gap-2">
              <span className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                {finalScore?.toFixed(1) || 0}
              </span>
              <span className="text-xl text-gray-500">/ 100</span>
            </div>
          </div>

          <p className="text-gray-400 mb-8">
            Thank you for your time. Your responses have been recorded and sent for review.
          </p>

          <button
            onClick={() => window.location.reload()}
            className="px-8 py-4 btn-primary text-white rounded-xl shadow-lg hover:shadow-purple-500/20 font-semibold"
          >
            Start New Interview
          </button>
        </div>
      </div>
    );
  }

  // Interview screen
  return (
    <div className="min-h-screen flex bg-grid-white relative overflow-hidden">
      {/* Ambient backgrounds */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-blue-900/20 to-transparent pointer-events-none"></div>

      {/* Left Sidebar */}
      <div className="w-96 glass-panel border-r-0 border-r-white/10 p-6 flex flex-col gap-6 z-10 m-4 rounded-2xl h-[calc(100vh-2rem)] sticky top-4">
        {/* Logo */}
        <div className="text-center pb-6 border-b border-white/10">
          <h1 className="text-2xl font-bold gradient-text">AI Interview</h1>
          <p className="text-xs text-gray-500 mt-1">Live Assessment</p>
        </div>

        {/* Camera Feed */}
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
          <div className="relative bg-black rounded-xl overflow-hidden border border-white/10">
            <h3 className="absolute top-3 left-3 text-xs font-semibold bg-black/60 px-2 py-1 rounded text-white z-20 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              Proctoring Active
            </h3>
            <CameraProctor
              onDisqualify={handleDisqualify}
              onViolation={handleViolation}
              sessionId={sessionId}
            />
          </div>
        </div>

        {/* Progress */}
        <div className="glass-card p-5 rounded-xl">
          <div className="flex justify-between items-end mb-3">
            <div>
              <h3 className="text-sm font-medium text-gray-300">Progress</h3>
              <p className="text-xs text-gray-500 mt-1">Question {questionIndex + 1} of {totalQuestions}</p>
            </div>
            <span className="text-2xl font-bold text-white">{Math.round(((questionIndex) / totalQuestions) * 100)}%</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-full rounded-full transition-all duration-700 ease-out"
              style={{ width: `${((questionIndex) / totalQuestions) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Mic Status */}
        <div className={`glass-card p-5 rounded-xl transition-all duration-300 ${micStatus === 'listening' ? 'border-red-500/50 bg-red-500/5' : ''}`}>
          <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${micStatus === 'listening' ? 'bg-red-500 shadow-lg shadow-red-500/30' :
                micStatus === 'processing' ? 'bg-yellow-500 animate-spin' : 'bg-slate-700'
              }`}>
              <span className="text-lg">
                {micStatus === 'listening' ? '🎤' : micStatus === 'processing' ? '⏳' : '🔇'}
              </span>
            </div>
            <div>
              <p className={`font-medium ${micStatus === 'listening' ? 'text-red-400' : 'text-gray-300'}`}>
                {micStatus === 'listening' ? 'Listening...' :
                  micStatus === 'processing' ? 'Processing...' : 'Microphone Idle'}
              </p>
              <p className="text-xs text-gray-500">
                {micStatus === 'listening' ? 'Speak clearly now' : 'Auto-detects silence'}
              </p>
            </div>
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1"></div>

        {/* Violations */}
        {violationCount > 0 && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl animate-pulse">
            <div className="flex items-center gap-3 mb-1">
              <span className="text-xl">⚠️</span>
              <p className="text-red-400 font-bold">Warning Issued</p>
            </div>
            <p className="text-red-300/80 text-sm">
              Violation detected. {3 - violationCount} warnings remaining before disqualification.
            </p>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col p-4 h-screen overflow-hidden">
        {/* Header Bar */}
        <div className="flex items-center justify-between mb-6 px-4">
          <div className="flex gap-3">
            <div className="glass px-4 py-2 rounded-full text-sm font-medium text-blue-200 border border-blue-500/20">
              👤 {candidateInfo.role || 'Candidate'}
            </div>
            <div className="glass px-4 py-2 rounded-full text-sm font-medium text-emerald-200 border border-emerald-500/20">
              💼 {candidateInfo.experience || '0'} Years Exp
            </div>
          </div>
          <div className="text-xs text-gray-500 font-mono">
            SESSION: {sessionId}
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-4 pb-32">
          {/* Current Question */}
          {currentQuestion && (
            <div className="mb-8 animate-enter">
              <div className="flex justify-between items-center mb-3 px-2">
                <span className="text-xs font-bold tracking-wider text-purple-400 uppercase">Current Question</span>
                <span className="text-xs px-2 py-1 bg-slate-800 rounded border border-slate-700 text-gray-400">{currentQuestion.category}</span>
              </div>
              <div className="glass-card p-8 rounded-2xl border-l-4 border-l-purple-500 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <span className="text-8xl">?</span>
                </div>
                <p className="text-2xl font-light leading-relaxed text-white relative z-10">
                  {currentQuestion.question}
                </p>
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={handleRepeatQuestion}
                    className="text-sm flex items-center gap-2 text-purple-300 hover:text-purple-200 transition-colors"
                  >
                    <span>🔊 Repeat Question</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Chat History */}
          <div className="mb-4">
            <ChatHistory messages={messages} />
          </div>
        </div>

        {/* Bottom Input Area (Fixed) */}
        <div className="absolute bottom-4 left-[26rem] right-4 glass-panel p-4 rounded-2xl border border-white/10 shadow-2xl">
          <VoiceChat
            onTranscript={handleSubmitAnswer}
            disabled={isLoading || step === 'disqualified'}
            onStatusChange={setMicStatus}
          />

          <div className="mt-4 flex gap-3">
            <input
              type="text"
              value={textAnswer}
              onChange={(e) => setTextAnswer(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleTextSubmit(e)}
              placeholder="Type your answer manually..."
              disabled={isLoading}
              className="flex-1 glass-input px-4 py-3 rounded-xl focus:ring-2 focus:ring-purple-500/50"
            />
            <button
              onClick={handleTextSubmit}
              disabled={isLoading || !textAnswer.trim()}
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
            >
              Send
            </button>
            <button
              onClick={handleSkipQuestion}
              disabled={isLoading}
              className="px-6 py-3 border border-slate-600 hover:bg-slate-800 text-gray-300 rounded-xl font-medium transition-colors"
            >
              Skip
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
