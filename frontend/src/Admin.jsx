import { useState, useEffect } from 'react';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';

function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminData, setAdminData] = useState(null);

  useEffect(() => {
    // Check if already logged in
    const token = localStorage.getItem('adminToken');
    const username = localStorage.getItem('adminUsername');
    
    if (token && username) {
      setIsAuthenticated(true);
      setAdminData({ username, token });
    }
  }, []);

  const handleLoginSuccess = (data) => {
    setIsAuthenticated(true);
    setAdminData(data);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setAdminData(null);
  };

  return (
    <div className="min-h-screen bg-slate-900">
      {isAuthenticated ? (
        <AdminDashboard adminData={adminData} onLogout={handleLogout} />
      ) : (
        <AdminLogin onLoginSuccess={handleLoginSuccess} />
      )}
    </div>
  );
}

export default Admin;
