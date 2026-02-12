const CompletionScreen = ({ finalScore, candidateData }) => {
  const getScoreColor = (score) => {
    if (score >= 80) return 'from-green-400 to-emerald-500';
    if (score >= 60) return 'from-yellow-400 to-orange-500';
    return 'from-red-400 to-pink-500';
  };

  const getScoreLabel = (score) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Improvement';
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="w-full max-w-2xl relative z-10">
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl p-12 border border-white/20 text-center">
          {/* Success Icon */}
          <div className="text-8xl mb-6 animate-bounce">🎉</div>

          {/* Title */}
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
            Interview Complete!
          </h1>
          <p className="text-gray-200 text-xl mb-8">
            Thank you, {candidateData?.name}
          </p>

          {/* Score Display */}
          <div className={`bg-gradient-to-r ${getScoreColor(finalScore)} rounded-3xl p-10 mb-8 shadow-2xl`}>
            <p className="text-white/90 text-sm font-semibold mb-3">Your Overall Score</p>
            <p className="text-8xl font-bold text-white mb-3">
              {finalScore?.toFixed(1) || 0}
            </p>
            <p className="text-white/90 text-xl mb-4">out of 100</p>
            <div className="w-full bg-white/20 rounded-full h-3 mb-4 overflow-hidden">
              <div
                className="bg-white h-3 rounded-full transition-all duration-1000 shadow-lg"
                style={{ width: `${finalScore}%` }}
              />
            </div>
            <p className="text-white font-bold text-2xl">
              {getScoreLabel(finalScore)}
            </p>
          </div>

          {/* Details */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-8 border border-white/20">
            <div className="grid grid-cols-2 gap-6 text-left">
              <div>
                <p className="text-gray-300 text-sm mb-1 font-semibold">Role</p>
                <p className="text-white font-bold text-lg">{candidateData?.role}</p>
              </div>
              <div>
                <p className="text-gray-300 text-sm mb-1 font-semibold">Experience</p>
                <p className="text-white font-bold text-lg">{candidateData?.experience} years</p>
              </div>
            </div>
          </div>

          {/* Message */}
          <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur-sm border border-blue-400/50 rounded-2xl p-6 mb-8">
            <p className="text-blue-200 text-sm leading-relaxed">
              Your responses have been recorded and will be reviewed by our team. 
              You will receive feedback via email at <strong className="text-cyan-300">{candidateData?.email}</strong> within 2-3 business days.
            </p>
          </div>

          {/* Action Button */}
          <button
            onClick={() => window.location.reload()}
            className="px-10 py-4 bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-500 text-white font-bold rounded-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 text-lg"
          >
            Start New Interview
          </button>

          {/* Footer Note */}
          <p className="text-gray-400 text-xs mt-8">
            Session completed at {new Date().toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
};

export default CompletionScreen;
