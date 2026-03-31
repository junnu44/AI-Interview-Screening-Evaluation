import { useState } from 'react';
import axios from 'axios';

const API_URL = 'https://ai-interview-screening-evaluation.onrender.com';

const AdminLogin = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    console.log('Attempting admin login with:', { username, password: '***' });

    try {
      const response = await axios.post(`${API_URL}/admin/login`, {
        username,
        password
      });

      console.log('Login response:', response.data);

      if (response.data.success) {
        localStorage.setItem('adminToken', response.data.token);
        localStorage.setItem('adminUsername', response.data.username);
        onLoginSuccess(response.data);
      } else {
        setError('Login failed - invalid response');
      }
    } catch (err) {
      console.error('Login error:', err);
      console.error('Error response:', err.response);
      setError(err.response?.data?.detail || 'Invalid credentials. Please check username and password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="w-full max-w-md">
        <div className="bg-slate-800 rounded-2xl shadow-2xl p-8 border border-slate-700">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🔐</div>
            <h1 className="text-3xl font-bold text-white mb-2">Admin Panel</h1>
            <p className="text-gray-400">AI Interview System v2.0</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-900/30 border border-red-600 rounded-lg">
              <p className="text-red-400 text-sm font-semibold mb-1">Login Failed</p>
              <p className="text-red-300 text-xs">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Username
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="Enter admin username"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="Enter admin password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Logging in...
                </span>
              ) : (
                'Login to Admin Panel'
              )}
            </button>
          </form>

          <div className="mt-6 p-4 bg-slate-700/50 rounded-lg">
            <p className="text-xs text-gray-400 text-center mb-2 font-semibold">
              Default Admin Credentials:
            </p>
            <div className="space-y-1">
              <p className="text-xs text-gray-300 text-center font-mono">
                Username: <span className="text-emerald-400 font-bold">admin</span>
              </p>
              <p className="text-xs text-gray-300 text-center font-mono">
                Password: <span className="text-emerald-400 font-bold">admin123</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
