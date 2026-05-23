import React from 'react';
import { Shield, LayoutDashboard, History, Sliders, Play, LogOut, Terminal, Sun, Moon, Globe } from 'lucide-react';
import { useTranslation } from '../utils/i18n';

const Navbar = ({ activeTab, setActiveTab, user, onLogout }) => {
  const { t, currentLanguage, changeLanguage } = useTranslation();
  
  const [theme, setTheme] = React.useState(localStorage.getItem('theme') || 'dark');
  
  React.useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const navItems = [
    { id: 'dashboard', label: t('dashboard'), icon: LayoutDashboard },
    { id: 'transactions', label: t('transactions'), icon: History },
    { id: 'rules', label: t('rules'), icon: Sliders },
    { id: 'simulator', label: t('simulator'), icon: Play }
  ];

  return (
    <nav className="glass border-b border-dark-border py-4 px-6 sticky top-0 z-50 flex items-center justify-between">
      {/* Brand Header */}
      <div className="flex items-center space-x-3">
        <div className="bg-indigo-600/20 p-2 rounded-lg border border-indigo-500/30 animate-pulse-slow">
          <Shield className="h-6 w-6 text-indigo-500" />
        </div>
        <div>
          <span className="font-extrabold text-lg bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-500 bg-clip-text text-transparent tracking-wide">
            {t('appName')}
          </span>
          <div className="flex items-center text-[10px] text-dark-muted font-mono uppercase tracking-widest mt-0.5">
            <Terminal className="h-2.5 w-2.5 mr-1 text-emerald-500" /> Real-time ML Radar
          </div>
        </div>
      </div>

      {/* Nav Actions */}
      <div className="flex items-center space-x-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 border border-indigo-500/30'
                  : 'text-dark-muted hover:text-dark-text hover:bg-dark-border/40 border border-transparent'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* User & Settings Actions */}
      <div className="flex items-center space-x-4 border-l border-dark-border pl-6">
        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="text-dark-muted hover:text-dark-text bg-dark-card hover:bg-dark-border/40 border border-dark-border p-2 rounded-lg transition-colors cursor-pointer"
          title={theme === 'dark' ? t('lightMode') : t('darkMode')}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4 text-indigo-400" />}
        </button>

        {/* Language Selector Dropdown */}
        <div className="relative flex items-center bg-dark-card border border-dark-border px-2 py-1 rounded-lg text-xs text-dark-muted">
          <Globe className="h-3.5 w-3.5 mr-1 text-indigo-400" />
          <select
            value={currentLanguage}
            onChange={(e) => changeLanguage(e.target.value)}
            className="bg-transparent text-dark-text border-none focus:outline-none cursor-pointer font-medium"
          >
            <option value="en" className="bg-dark-card text-dark-text">EN</option>
            <option value="es" className="bg-dark-card text-dark-text">ES</option>
            <option value="hi" className="bg-dark-card text-dark-text">HI</option>
            <option value="fr" className="bg-dark-card text-dark-text">FR</option>
          </select>
        </div>

        {/* User Details */}
        <div className="text-right border-l border-dark-border pl-4">
          <p className="text-xs font-semibold text-dark-text">{user?.username || 'Operator'}</p>
          <span className="text-[10px] bg-indigo-950/50 text-indigo-400 border border-indigo-900/50 px-1.5 py-0.2 rounded font-mono uppercase">
            {user?.role || 'Staff'}
          </span>
        </div>

        {/* Log Out */}
        <button
          onClick={onLogout}
          className="text-dark-muted hover:text-brand-danger bg-dark-card hover:bg-brand-danger/10 border border-dark-border p-2 rounded-lg transition-colors cursor-pointer"
          title="Sign Out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
