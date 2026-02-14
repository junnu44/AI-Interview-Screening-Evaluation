
import { useState, useEffect } from 'react';
import axios from 'axios';

const CandidateDetailModal = ({ candidateId, interviewId, onClose }) => {
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('overview'); // overview, transcript, proctoring

    useEffect(() => {
        fetchReport();
    }, [interviewId]);

    const fetchReport = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('adminToken');
            const response = await axios.get(`http://localhost:8000/admin/interview/${interviewId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.data.success) {
                setReport(response.data.report);
            }
        } catch (err) {
            setError('Failed to load interview report');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const downloadReport = async () => {
        try {
            const token = localStorage.getItem('adminToken');
            const response = await axios.get(`http://localhost:8000/admin/download_report/${interviewId}`, {
                headers: { 'Authorization': `Bearer ${token}` },
                responseType: 'blob', // Important
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `interview_report_${interviewId}.json`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
        } catch (err) {
            console.error("Download failed", err);
            alert("Failed to download report");
        }
    };


    if (loading) return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    if (!report) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 w-full max-w-5xl h-[90vh] rounded-2xl border border-slate-700 shadow-2xl flex flex-col overflow-hidden">

                {/* Header */}
                <div className="p-6 border-b border-slate-700 bg-slate-800 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-white">{report.candidate.name}</h2>
                        <p className="text-gray-400">{report.candidate.role} • {report.candidate.experience} years exp</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <div className="text-3xl font-bold text-white">{report.metadata.overall_score || 0}</div>
                            <div className="text-xs text-gray-400">Overall Score</div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-full text-gray-400 hover:text-white transition-colors">
                            ✕
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-700 bg-slate-800/50">
                    {['overview', 'transcript', 'proctoring'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 py-4 text-sm font-semibold uppercase tracking-wider transition-colors border-b-2 ${activeTab === tab
                                    ? 'border-blue-500 text-blue-400 bg-blue-500/10'
                                    : 'border-transparent text-gray-400 hover:text-white hover:bg-slate-800'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 bg-slate-900">

                    {/* OVERVIEW TAB */}
                    {activeTab === 'overview' && (
                        <div className="space-y-8 animate-fadeIn">
                            {/* Status Cards */}
                            <div className="grid grid-cols-3 gap-6">
                                <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                                    <h3 className="text-sm font-semibold text-gray-400 mb-2">Interview Status</h3>
                                    <div className={`text-xl font-bold ${report.metadata.status === 'completed' ? 'text-green-400' :
                                            report.metadata.status === 'failed' ? 'text-red-400' : 'text-yellow-400'
                                        }`}>
                                        {report.metadata.status?.toUpperCase().replace('_', ' ')}
                                    </div>
                                </div>
                                <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                                    <h3 className="text-sm font-semibold text-gray-400 mb-2">Proctoring Status</h3>
                                    <div className={`text-xl font-bold ${report.metadata.proctoring_status === 'pass' ? 'text-green-400' :
                                            report.metadata.proctoring_status === 'fail' ? 'text-red-400' : 'text-yellow-400'
                                        }`}>
                                        {report.metadata.proctoring_status?.toUpperCase() || 'N/A'}
                                    </div>
                                </div>
                                <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                                    <h3 className="text-sm font-semibold text-gray-400 mb-2">Duration</h3>
                                    <div className="text-xl font-bold text-white">
                                        {report.metadata.started_at ? new Date(report.metadata.started_at).toLocaleDateString() : 'N/A'}
                                    </div>
                                </div>
                            </div>

                            {/* Competencies */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                                    <h3 className="text-lg font-bold text-white mb-6">Competency Breakdown</h3>
                                    <div className="space-y-4">
                                        {report.competency_scores.map((comp, idx) => (
                                            <div key={idx}>
                                                <div className="flex justify-between mb-1">
                                                    <span className="text-sm font-medium text-gray-300">{comp.name}</span>
                                                    <span className="text-sm font-bold text-white">{Math.round(comp.score)}%</span>
                                                </div>
                                                <div className="w-full bg-slate-700 rounded-full h-2.5">
                                                    <div
                                                        className="bg-purple-500 h-2.5 rounded-full"
                                                        style={{ width: `${comp.score}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                                    <h3 className="text-lg font-bold text-white mb-6">Skill Proficiency</h3>
                                    <div className="space-y-4">
                                        {report.skill_scores.map((skill, idx) => (
                                            <div key={idx}>
                                                <div className="flex justify-between mb-1">
                                                    <span className="text-sm font-medium text-gray-300">{skill.name} <span className="text-xs text-gray-500 ml-2">({skill.type})</span></span>
                                                    <span className="text-sm font-bold text-white">{Math.round(skill.score)}%</span>
                                                </div>
                                                <div className="w-full bg-slate-700 rounded-full h-2.5">
                                                    <div
                                                        className={`h-2.5 rounded-full ${skill.type === 'technical' ? 'bg-cyan-500' : 'bg-emerald-500'}`}
                                                        style={{ width: `${skill.score}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TRANSCRIPT TAB */}
                    {activeTab === 'transcript' && (
                        <div className="space-y-6 animate-fadeIn">
                            {report.responses.map((resp, idx) => (
                                <div key={idx} className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <span className="inline-block px-2 py-1 bg-slate-700 rounded text-xs text-gray-300 mb-2">Question {resp.question_index}</span>
                                            <h3 className="text-lg font-medium text-white">{resp.question}</h3>
                                        </div>
                                        <div className={`px-3 py-1 rounded text-sm font-bold ${resp.quality === 'strong' ? 'bg-green-900 text-green-300' :
                                                resp.quality === 'partial' ? 'bg-yellow-900 text-yellow-300' :
                                                    'bg-red-900 text-red-300'
                                            }`}>
                                            {resp.score}/100
                                        </div>
                                    </div>

                                    <div className="bg-slate-900/50 p-4 rounded-lg mb-4 border border-slate-700/50">
                                        <p className="text-gray-300 font-mono text-sm whitespace-pre-wrap">{resp.answer || "(No Answer / Skipped)"}</p>
                                    </div>

                                    <div className="flex items-start gap-4">
                                        <span className="text-2xl">🤖</span>
                                        <div>
                                            <p className="text-sm text-blue-300 font-semibold mb-1">AI Feedback:</p>
                                            <p className="text-gray-400 text-sm">{resp.feedback}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* PROCTORING TAB */}
                    {activeTab === 'proctoring' && (
                        <div className="space-y-6 animate-fadeIn">
                            <div className="flex items-center gap-4 bg-slate-800 p-6 rounded-xl border border-slate-700 mb-6">
                                <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl ${report.metadata.proctoring_status === 'pass' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                                    }`}>
                                    {report.metadata.proctoring_status === 'pass' ? '✅' : '⚠️'}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white">
                                        {report.metadata.proctoring_status === 'pass' ? 'Proctoring Passed' : 'Proctoring Failed'}
                                    </h3>
                                    <p className="text-gray-400">{report.violations.length} total violations detected</p>
                                </div>
                            </div>

                            {report.violations.length === 0 ? (
                                <div className="text-center py-12 text-gray-500">
                                    <p>No violations detected during this session.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {report.violations.map((v, idx) => (
                                        <div key={idx} className="bg-slate-800/50 p-4 rounded-lg border border-red-500/20 flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <span className="text-xl">🚨</span>
                                                <div>
                                                    <p className="text-white font-bold capitalize">{v.type.replace('_', ' ')}</p>
                                                    <p className="text-sm text-gray-400">{new Date(v.timestamp).toLocaleTimeString()}</p>
                                                </div>
                                            </div>
                                            <span className={`px-3 py-1 rounded text-xs font-bold uppercase ${v.severity === 'fail' ? 'bg-red-600 text-white' : 'bg-yellow-600 text-white'
                                                }`}>
                                                {v.severity}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-700 bg-slate-800 flex justify-end gap-4">
                    <button onClick={onClose} className="px-6 py-2 text-gray-300 hover:text-white transition-colors">
                        Close
                    </button>
                    <button onClick={downloadReport} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold flex items-center gap-2">
                        <span>⬇️</span> Download Report JSON
                    </button>
                </div>

            </div>
        </div>
    );
};

export default CandidateDetailModal;
