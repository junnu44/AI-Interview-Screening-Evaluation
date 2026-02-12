import { useEffect, useRef } from 'react';

const ChatHistory = ({ messages }) => {
    const scrollRef = useRef(null);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    if (!messages || messages.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center p-8 h-48 opacity-50">
                <div className="text-center text-gray-400">
                    <div className="text-4xl mb-4 grayscale">💬</div>
                    <p>Conversation history will appear here</p>
                </div>
            </div>
        );
    }

    return (
        <div
            ref={scrollRef}
            className="flex-1 space-y-6"
        >
            {messages.map((msg, index) => (
                <div
                    key={index}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} ${msg.role === 'user' ? 'message-user' : 'message-ai'}`}
                >
                    <div
                        className={`max-w-[85%] rounded-2xl px-6 py-4 shadow-lg ${msg.role === 'user'
                            ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-tr-none'
                            : 'glass-panel text-gray-100 rounded-tl-none border-white/5'
                            }`}
                    >
                        {/* Header */}
                        <div className="flex items-center gap-2 mb-2 opacity-75 text-xs font-medium tracking-wide">
                            <span>{msg.role === 'user' ? '👤 YOU' : '🤖 AI INTERVIEWER'}</span>
                            <span>•</span>
                            <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>

                        {/* Content */}
                        <p className="leading-relaxed text-[15px]">{msg.content}</p>

                        {/* Evaluation Feedback */}
                        {msg.evaluation && (
                            <div className="mt-4 pt-3 border-t border-white/20">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs uppercase tracking-wider font-bold opacity-70">Answer Quality</span>
                                    <div className={`px-2 py-1 rounded text-xs font-bold ${msg.evaluation.score >= 80 ? 'bg-green-500/20 text-green-300' :
                                            msg.evaluation.score >= 50 ? 'bg-yellow-500/20 text-yellow-300' :
                                                'bg-red-500/20 text-red-300'
                                        }`}>
                                        {msg.evaluation.score}/100
                                    </div>
                                </div>
                                {msg.evaluation.feedback && (
                                    <p className="text-xs leading-normal opacity-80 italic">
                                        "{msg.evaluation.feedback}"
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default ChatHistory;
