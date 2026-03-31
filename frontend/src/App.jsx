import { useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import LandingPage from './components/LandingPage';
import RegistrationFlow from './components/RegistrationFlow';
import InterviewScreen from './components/InterviewScreen';
import CompletionScreen from './components/CompletionScreen';
import DisqualifiedScreen from './components/DisqualifiedScreen';

const API_URL = 'https://ai-interview-screening-evaluation.onrender.com';

function App() {
  const [step, setStep] = useState('landing'); // 'landing' | 'registration' | 'interview' | 'complete' | 'disqualified'
  const [sessionId, setSessionId] = useState(null);
  const [candidateData, setCandidateData] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [messages, setMessages] = useState([]);
  const [finalScore, setFinalScore] = useState(null);
  const [violationCount, setViolationCount] = useState(0);
  const [currentDifficulty, setCurrentDifficulty] = useState(50);

  // Transition from Landing to Registration
  const handleStartApp = () => {
    setStep('registration');
  };

  // Start interview after registration
  const handleStartInterview = async (registrationData) => {
    console.log('Starting interview with data:', registrationData);

    try {
      const response = await axios.post(`${API_URL}/start_interview`, registrationData);

      console.log('Interview started successfully:', response.data);

      if (response.data.success) {
        setSessionId(response.data.session_id);
        setTotalQuestions(response.data.total_questions);
        setCurrentDifficulty(response.data.initial_difficulty);
        setCandidateData(registrationData);

        if (response.data.first_question) {
          setCurrentQuestion(response.data.first_question);
          setQuestionIndex(0);
          setMessages([{
            role: 'assistant',
            type: 'question',
            content: response.data.first_question.question,
            category: response.data.first_question.category,
            timestamp: new Date().toISOString()
          }]);
        }

        setStep('interview');
      }
    } catch (error) {
      console.error('Failed to start interview:', error);
      console.error('Error response:', error.response?.data);
      const errorMessage = error.response?.data?.detail || error.message || 'Unknown error';
      alert('Failed to start interview: ' + errorMessage);
    }
  };

  // Submit answer
  const handleSubmitAnswer = async (answerText) => {
    if (!answerText.trim() || !sessionId) return;

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
        // Add evaluation feedback
        setMessages(prev => prev.map((msg, idx) =>
          idx === prev.length - 1
            ? { ...msg, evaluation: response.data.evaluation }
            : msg
        ));

        if (response.data.is_complete) {
          setFinalScore(response.data.final_score);
          setStep('complete');
        } else if (response.data.next_question) {
          setCurrentQuestion(response.data.next_question);
          setQuestionIndex(response.data.questions_answered);
          setTotalQuestions(response.data.total_questions);
          setCurrentDifficulty(response.data.current_difficulty || currentDifficulty);

          setMessages(prev => [...prev, {
            role: 'assistant',
            type: 'question',
            content: response.data.next_question.question,
            category: response.data.next_question.category,
            timestamp: new Date().toISOString()
          }]);
        }
      }
    } catch (error) {
      console.error('Failed to submit answer:', error);
      alert('Failed to submit answer: ' + (error.response?.data?.detail || error.message));
    }
  };

  // Skip question
  const handleSkipQuestion = async () => {
    if (!sessionId) return;

    try {
      const response = await axios.post(`${API_URL}/skip_question`, {
        user_text: '',
        session_id: sessionId
      });

      if (response.data.is_complete) {
        setFinalScore(response.data.final_score);
        setStep('complete');
      } else {
        const qResponse = await axios.get(`${API_URL}/questions/${sessionId}`);
        if (qResponse.data.success && !qResponse.data.is_complete) {
          setCurrentQuestion(qResponse.data.question);
          setQuestionIndex(qResponse.data.current_index);

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
        }
      }
    } catch (error) {
      console.error('Failed to skip question:', error);
    }
  };

  // Handle disqualification
  const handleDisqualify = useCallback(() => {
    setStep('disqualified');
  }, []);

  // Handle violation
  const handleViolation = useCallback((count) => {
    setViolationCount(count);
  }, []);

  return (
    <div className="min-h-screen">
      {step === 'landing' && (
        <LandingPage onStart={handleStartApp} />
      )}

      {step === 'registration' && (
        <RegistrationFlow onComplete={handleStartInterview} />
      )}

      {step === 'interview' && (
        <InterviewScreen
          sessionId={sessionId}
          candidateData={candidateData}
          currentQuestion={currentQuestion}
          questionIndex={questionIndex}
          totalQuestions={totalQuestions}
          currentDifficulty={currentDifficulty}
          messages={messages}
          violationCount={violationCount}
          onSubmitAnswer={handleSubmitAnswer}
          onSkipQuestion={handleSkipQuestion}
          onDisqualify={handleDisqualify}
          onViolation={handleViolation}
        />
      )}

      {step === 'complete' && (
        <CompletionScreen
          finalScore={finalScore}
          candidateData={candidateData}
        />
      )}

      {step === 'disqualified' && (
        <DisqualifiedScreen />
      )}
    </div>
  );
}

export default App;

