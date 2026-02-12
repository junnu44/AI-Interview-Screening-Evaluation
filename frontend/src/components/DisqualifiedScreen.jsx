const DisqualifiedScreen = () => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-red-900 via-pink-900 to-purple-900 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-red-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
      </div>

      <div className="w-full max-w-2xl relative z-10">
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl p-12 border border-red-400/30 text-center">
          {/* Warning Icon */}
          <div className="text-8xl mb-6 animate-pulse">🚫</div>

          {/* Title */}
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-red-400 to-pink-400 bg-clip-text text-transparent">
            Interview Disqualified
          </h1>

          {/* Message */}
          <div className="bg-gradient-to-br from-red-500/20 to-pink-500/20 backdrop-blur-sm border border-red-400/50 rounded-2xl p-8 mb-8">
            <p className="text-red-200 text-lg leading-relaxed mb-4 font-semibold">
              Multiple proctoring violations were detected during your interview session.
            </p>
            <p className="text-red-300 text-sm mb-4">
              This interview has been marked as <strong>FAILED</strong> due to:
            </p>
            <ul className="text-red-200 text-sm space-y-2 text-left max-w-md mx-auto">
              <li className="flex items-center gap-2">
                <span className="text-xl">👥</span>
                Multiple faces detected
              </li>
              <li className="flex items-center gap-2">
                <span className="text-xl">👀</span>
                Looking away from screen
              </li>
              <li className="flex items-center gap-2">
                <span className="text-xl">⚠️</span>
                Suspicious behavior
              </li>
            </ul>
          </div>

          {/* Info Box */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-8 border border-white/20">
            <p className="text-gray-200 text-sm leading-relaxed">
              All interview sessions are monitored for integrity. If you believe this was an error, 
              please contact our support team with your session details.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={() => window.location.reload()}
              className="flex-1 px-6 py-4 bg-white/10 backdrop-blur-sm text-white font-semibold rounded-xl hover:bg-white/20 transition-all duration-300 border border-white/20"
            >
              Return to Home
            </button>
            <button
              onClick={() => window.open('mailto:support@example.com', '_blank')}
              className="flex-1 px-6 py-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold rounded-xl hover:shadow-2xl hover:scale-105 transition-all duration-300"
            >
              Contact Support
            </button>
          </div>

          {/* Footer Note */}
          <p className="text-gray-400 text-xs mt-8">
            Session terminated at {new Date().toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
};

export default DisqualifiedScreen;
