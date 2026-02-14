
import React from 'react';

const LandingPage = ({ onStart }) => {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">

            {/* Hero Section */}
            <div className="max-w-4xl w-full text-center z-10 space-y-8 animate-enter">
                <div className="mb-4 inline-block">
                    <span className="px-4 py-2 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-300 text-sm font-medium backdrop-blur-md">
                        🚀 The Future of Technical Hiring
                    </span>
                </div>

                <h1 className="text-6xl md:text-7xl font-bold tracking-tight">
                    <span className="block text-white mb-2">Automated AI</span>
                    <span className="gradient-text">Interview Screening</span>
                </h1>

                <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
                    Experience a professional, adaptive technical interview powered by advanced AI.
                    Receive instant feedback, comprehensive scoring, and a fair evaluation of your skills.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
                    <button
                        onClick={onStart}
                        className="btn-primary px-8 py-4 rounded-xl text-white font-bold text-lg shadow-lg shadow-indigo-500/20 w-full sm:w-auto min-w-[200px]"
                    >
                        Start Interview
                    </button>
                    <a
                        href="/admin-main.jsx" // In a real app this would be a route
                        onClick={(e) => {
                            e.preventDefault();
                            // This is a bit of a hack for the demo to switch modes if needed, 
                            // but ideally routing handles this. For now just a placeholder.
                            alert("Please use the specific Admin URL or login via the dashboard.");
                        }}
                        className="px-8 py-4 rounded-xl text-gray-300 font-medium hover:text-white hover:bg-white/5 transition-colors w-full sm:w-auto"
                    >
                        For Recruiters
                    </a>
                </div>
            </div>

            {/* Features Grid */}
            <div className="max-w-6xl w-full grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 z-10">
                {[
                    {
                        icon: "🎯",
                        title: "Adaptive Questioning",
                        desc: "Questions evolve based on your responses to accurately gauge your expertise level."
                    },
                    {
                        icon: "👁️",
                        title: "Smart Proctoring",
                        desc: "Non-intrusive AI proctoring ensures integrity by monitoring gaze and presence."
                    },
                    {
                        icon: "📊",
                        title: "Detailed Analytics",
                        desc: "Get a comprehensive breakdown of your technical and functional competencies."
                    }
                ].map((feature, idx) => (
                    <div key={idx} className="glass-card p-6 rounded-2xl">
                        <div className="text-4xl mb-4">{feature.icon}</div>
                        <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                        <p className="text-gray-400 leading-relaxed">{feature.desc}</p>
                    </div>
                ))}
            </div>

            {/* Footer */}
            <div className="absolute bottom-4 text-center w-full text-gray-500 text-sm">
                <p>© 2026 AI Interview Systems. All rights reserved.</p>
            </div>

        </div>
    );
};

export default LandingPage;
