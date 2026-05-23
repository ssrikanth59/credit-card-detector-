import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import RulesConfig from './pages/RulesConfig';
import Simulator from './pages/Simulator';
import { getMe } from './utils/api';

function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setInitializing(false);
        return;
      }

      try {
        const response = await getMe();
        if (response.data.success) {
          setUser(response.data.user);
        } else {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      } catch (err) {
        console.error('Failed to validate session token.');
        // If server is offline, load from localstorage cache just for UI resilience
        const cachedUser = localStorage.getItem('user');
        if (cachedUser) {
          try {
            setUser(JSON.parse(cachedUser));
          } catch (e) {}
        }
      } finally {
        setInitializing(false);
      }
    };

    checkAuth();
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  if (initializing) {
    return (
      <div className="min-h-screen bg-dark-bg flex flex-col items-center justify-center space-y-4">
        <div className="h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-dark-muted font-medium text-xs">Initializing dashboard security gateway...</p>
      </div>
    );
  }

  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-dark-bg text-dark-text relative pb-16">
      {/* Background gradients */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-900/10 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-900/5 rounded-full blur-[100px] pointer-events-none z-0" />

      <Navbar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        user={user} 
        onLogout={handleLogout} 
      />

      <main className="relative z-10">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'transactions' && <Transactions />}
        {activeTab === 'rules' && <RulesConfig user={user} />}
        {activeTab === 'simulator' && <Simulator />}
      </main>
    </div>
  );
}

export default App;
