import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:8000';

const AdminDashboard = ({ adminData, onLogout }) => {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); // all, passed, failed, in-progress

  useEffect(() => {
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get(`${API_URL}/admin/candidates`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.success) {
        setCandidates(response.data.candidates);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch candidates');
      if (err.response?.status === 401) {
        handleLogout();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUsername');
    onLogout();
  };

  const getStatusBadge = (status) => {
    const styles = {
      'completed': 'bg-green-600',
      'in_progress': 'bg-yellow-600',
      'disqualified': 'bg-red-600',
      'failed': 'bg-red-600'
    };
    return styles[status] || 'bg-gray-600';
  };

  const getStatusText = (status) => {
    const texts = {
      'completed': 'Completed',
      'in_progress': 'In Progress',
      'disqualified': 'Disqualified',
      'failed': 'Failed'
    };
    return texts[status] || status;
  };

  const filteredCandidates = candidates.filter(c => {
    if (filter === 'all') return true;
    if (filter === 'passed') return c.status === 'completed' && c.overall_score >= 60;
    if (filter === 'failed') return c.status === 'disqualified' || c.status === 'failed' || (c.status === 'completed' && c.overall_score < 60);
    if (filter === 'in-progress') return c.status === 'in_progress';
    return true;
  });

  const stats = {
    total: candidates.length,
    completed: candidates.filter(c => c.status === 'completed').length,
    inProgress: candidates.filter(c => c.status === 'in_progress').length,
    disqualified: candidates.filter(c => c.status === 'disqualified' || c.status === 'failed').length
  };

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-3xl">🔐</div>
            <div>
              <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
              <p className="text-sm text-gray-400">AI Interview System v2.0</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-gray-400">Logged in as</p>
              <p className="text-white font-medium">{adminData.username}</p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <div className="text-3xl mb-2">👥</div>
            <div className="text-3xl font-bold text-white mb-1">{stats.total}</div>
            <div className="text-sm text-gray-400">Total Candidates</div>
          </div>
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <div className="text-3xl mb-2">✅</div>
            <div className="text-3xl font-bold text-green-400 mb-1">{stats.completed}</div>
            <div className="text-sm text-gray-400">Completed</div>
          </div>
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <div className="text-3xl mb-2">⏳</div>
            <div className="text-3xl font-bold text-yellow-400 mb-1">{stats.inProgress}</div>
            <div className="text-sm text-gray-400">In Progress</div>
          </div>
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <div className="text-3xl mb-2">❌</div>
            <div className="text-3xl font-bold text-red-400 mb-1">{stats.disqualified}</div>
            <div className="text-sm text-gray-400">Disqualified</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-slate-800 rounded-lg p-4 mb-6 border border-slate-700">
          <div className="flex items-center gap-4">
            <span className="text-gray-400 text-sm font-medium">Filter:</span>
            <div className="flex gap-2">
              {['all', 'passed', 'failed', 'in-progress'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filter === f
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1).replace('-', ' ')}
                </button>
              ))}
            </div>
            <button
              onClick={fetchCandidates}
              className="ml-auto px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
            >
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* Candidates Table */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-400">Loading candidates...</p>
            </div>
          ) : error ? (
            <div className="p-12 text-center">
              <div className="text-5xl mb-4">⚠️</div>
              <p className="text-red-400">{error}</p>
            </div>
          ) : filteredCandidates.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-5xl mb-4">📭</div>
              <p className="text-gray-400">No candidates found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Candidate
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Experience
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Score
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Proctoring
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Started At
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {filteredCandidates.map((candidate) => (
                    <tr key={candidate.id} className="hover:bg-slate-700/50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-white font-medium">{candidate.name}</div>
                          <div className="text-sm text-gray-400">{candidate.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-300">
                        {candidate.role}
                      </td>
                      <td className="px-6 py-4 text-gray-300">
                        {candidate.experience} years
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium text-white ${getStatusBadge(candidate.status)}`}>
                          {getStatusText(candidate.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {candidate.overall_score !== null ? (
                          <div className="flex items-center gap-2">
                            <span className={`text-lg font-bold ${
                              candidate.overall_score >= 80 ? 'text-green-400' :
                              candidate.overall_score >= 60 ? 'text-yellow-400' :
                              'text-red-400'
                            }`}>
                              {candidate.overall_score}
                            </span>
                            <span className="text-gray-500 text-sm">/100</span>
                          </div>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {candidate.proctoring_status ? (
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            candidate.proctoring_status === 'pass' ? 'bg-green-900 text-green-300' :
                            candidate.proctoring_status === 'fail' ? 'bg-red-900 text-red-300' :
                            'bg-yellow-900 text-yellow-300'
                          }`}>
                            {candidate.proctoring_status.toUpperCase()}
                          </span>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-400 text-sm">
                        {candidate.started_at ? new Date(candidate.started_at).toLocaleString() : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Results Summary */}
        {filteredCandidates.length > 0 && (
          <div className="mt-4 text-center text-sm text-gray-400">
            Showing {filteredCandidates.length} of {candidates.length} candidates
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
