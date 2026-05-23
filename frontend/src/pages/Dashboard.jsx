import React, { useEffect, useState } from 'react';
import { DollarSign, ShieldAlert, Activity, CheckCircle, ShieldCheck, XCircle, ArrowUpRight, Loader } from 'lucide-react';
import { getDashboardAnalytics, updateTransactionStatus, getTransactions } from '../utils/api';
import MetricCard from '../components/MetricCard';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [recentAlerts, setRecentAlerts] = useState([]);

  const fetchDashboardData = async () => {
    try {
      const response = await getDashboardAnalytics();
      if (response.data.success) {
        setData(response.data);
        
        // Fetch recent alerts (mock filtering or reload transactions with high risk)
        // For simplicity, we can extract flagged/blocked transactions from seeded trends/distribution 
        // or filter transactions from recent items. Let's load transactions in a separate call 
        // or mock some pending alerts for immediate display. Let's make a mock pending list 
        // or load them from the actual API. 
        // Let's call the transaction API for alerts directly!
        const txResponse = await getTransactions({ minRiskScore: 50 });
        setRecentAlerts(txResponse.data.transactions.slice(0, 5));
      }
    } catch (err) {
      setError('Could not fetch dashboard metrics. Please verify that the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleResolveAlert = async (id, newStatus) => {
    try {
      await updateTransactionStatus(id, newStatus);
      // Reload page data
      fetchDashboardData();
    } catch (err) {
      alert('Failed to update alert state.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-4">
        <Loader className="h-10 w-10 text-indigo-500 animate-spin" />
        <p className="text-dark-muted font-medium text-sm">Aggregating real-time ledger metrics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center bg-brand-danger/10 border border-brand-danger/25 text-brand-danger rounded-xl max-w-xl mx-auto my-12">
        <p className="font-semibold text-lg">Metrics Service Down</p>
        <p className="text-sm opacity-90 mt-1">{error}</p>
        <button 
          onClick={() => { setLoading(true); fetchDashboardData(); }}
          className="mt-4 px-4 py-2 bg-brand-danger text-white rounded-lg text-xs font-bold hover:bg-brand-danger/90 transition-colors"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const { metrics, charts } = data;

  // Pie chart cell colors
  const COLORS = ['#6366f1', '#a855f7', '#ec4899', '#10b981', '#f59e0b', '#3b82f6'];

  return (
    <div className="p-8 space-y-8 max-w-[1600px] mx-auto">
      {/* Welcome Banner */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Fraud Analytics Core</h1>
          <p className="text-dark-muted text-sm mt-1">Real-time model performance, risk ratios, and alert mitigation logs.</p>
        </div>
        <div className="bg-dark-card border border-dark-border px-4 py-2 rounded-xl flex items-center space-x-2">
          <span className="h-2 w-2 rounded-full dot-approved animate-pulse-glow" />
          <span className="text-xs font-semibold text-white tracking-wide uppercase font-mono">
            SYS STATUS: ONLINE
          </span>
        </div>
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <MetricCard
          title="Total Volume Approved"
          value={`$${metrics.totalVolumeProcessed.toLocaleString()}`}
          icon={DollarSign}
          colorClass="text-brand-success"
          changeValue="12.3%"
          changeLabel="from last week"
          isPositive={true}
        />
        <MetricCard
          title="Prevented Loss"
          value={`$${metrics.totalVolumePrevented.toLocaleString()}`}
          icon={ShieldCheck}
          colorClass="text-indigo-500"
          changeValue="8.4%"
          changeLabel="under model defense"
          isPositive={true}
        />
        <MetricCard
          title="Pending Alerts"
          value={metrics.pendingAlertsCount}
          icon={ShieldAlert}
          colorClass="text-brand-warning"
          changeValue={metrics.pendingAlertsCount > 0 ? "Requires review" : "Ledger clear"}
          changeLabel="in operator queue"
          isPositive={metrics.pendingAlertsCount === 0}
        />
        <MetricCard
          title="Detected Fraud Rate"
          value={`${metrics.fraudRate}%`}
          icon={Activity}
          colorClass="text-brand-danger"
          changeValue="0.22%"
          changeLabel="vs industry average (0.8%)"
          isPositive={true}
        />
      </div>

      {/* Charts Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Trend Area Chart */}
        <div className="xl:col-span-2 glass rounded-2xl p-6 border border-dark-border">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-md font-bold text-white uppercase tracking-wider font-mono">Transaction Volume Trends</h3>
            <span className="text-xs font-semibold text-dark-muted">LEGIT vs PREVENTED FRAUD ($)</span>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts.dailyTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorLegit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorFraud" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" vertical={false} />
                <XAxis dataKey="date" stroke="#9ca3af" fontSize={11} tickLine={false} />
                <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#121824', borderColor: '#1f293d', color: '#fff', borderRadius: '12px' }}
                  labelClassName="font-bold text-white text-xs"
                />
                <Area type="monotone" name="Approved Vol ($)" dataKey="legitVolume" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorLegit)" />
                <Area type="monotone" name="Prevented Vol ($)" dataKey="fraudVolume" stroke="#ef4444" strokeWidth={2.5} fillOpacity={1} fill="url(#colorFraud)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Category Chart */}
        <div className="glass rounded-2xl p-6 border border-dark-border flex flex-col justify-between">
          <h3 className="text-md font-bold text-white uppercase tracking-wider font-mono mb-4">Volume by Merchant Type</h3>
          
          <div className="h-[200px] w-full relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={charts.categoryDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {charts.categoryDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#121824', borderColor: '#1f293d', color: '#fff', borderRadius: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] text-dark-muted font-bold tracking-widest uppercase">Avg Risk</span>
              <span className="text-2xl font-black text-white">{metrics.averageRiskScore}%</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4 text-[11px] font-semibold">
            {charts.categoryDistribution.map((entry, index) => (
              <div key={entry.name} className="flex items-center space-x-2">
                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                <span className="text-dark-muted truncate">{entry.name}:</span>
                <span className="text-white">${entry.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Risk Distribution Histogram */}
        <div className="glass rounded-2xl p-6 border border-dark-border">
          <h3 className="text-md font-bold text-white uppercase tracking-wider font-mono mb-6">Score Threat Profile</h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.riskDistribution} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" vertical={false} />
                <XAxis dataKey="name" stroke="#9ca3af" fontSize={10} tickLine={false} />
                <YAxis stroke="#9ca3af" fontSize={10} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#121824', borderColor: '#1f293d', color: '#fff', borderRadius: '12px' }}
                />
                <Bar dataKey="value" name="Transactions Count">
                  {charts.riskDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Live Alerts Stream Queue */}
        <div className="xl:col-span-2 glass rounded-2xl p-6 border border-dark-border flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-md font-bold text-white uppercase tracking-wider font-mono">Live Threat Stream</h3>
              <span className="text-xs bg-indigo-950/40 text-indigo-400 border border-indigo-900 px-2 py-0.5 rounded-lg font-mono">
                Operator Action Required
              </span>
            </div>

            <div className="space-y-3.5">
              {recentAlerts.length === 0 ? (
                <div className="p-12 text-center text-dark-muted text-sm border border-dashed border-dark-border rounded-xl">
                  🟢 Ledger safe. No unresolved threats or alerts active.
                </div>
              ) : (
                recentAlerts.map((alert) => (
                  <div key={alert._id} className="bg-dark-bg/60 border border-dark-border rounded-xl p-4 flex items-center justify-between hover:border-dark-border/80 transition-all">
                    <div className="flex items-center space-x-3.5">
                      <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${alert.status === 'BLOCKED' ? 'dot-blocked' : 'dot-flagged'}`} />
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-bold text-white">{alert.cardholderName}</span>
                          <span className="text-[10px] text-dark-muted font-mono">{alert.cardNumber}</span>
                        </div>
                        <p className="text-xs text-dark-muted mt-0.5">
                          Charged <span className="text-white font-bold">${alert.amount}</span> at <span className="text-white">{alert.merchant}</span> • {alert.location?.city}, {alert.location?.country}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <span className={`text-xs font-extrabold ${alert.riskScore >= 75 ? 'text-brand-danger' : 'text-brand-warning'}`}>
                          Risk Score: {alert.riskScore}%
                        </span>
                        <p className="text-[10px] text-dark-muted font-mono lowercase mt-0.5">
                          {alert.status === 'PENDING_REVIEW' ? 'pending approval' : 'auto blocked'}
                        </p>
                      </div>
                      
                      {alert.status === 'PENDING_REVIEW' && (
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleResolveAlert(alert._id, 'APPROVED')}
                            className="bg-brand-success/10 hover:bg-brand-success/20 text-brand-success p-1.5 rounded-lg border border-brand-success/20 transition-colors cursor-pointer"
                            title="Approve Charge"
                          >
                            <CheckCircle className="h-4.5 w-4.5" />
                          </button>
                          <button
                            onClick={() => handleResolveAlert(alert._id, 'BLOCKED')}
                            className="bg-brand-danger/10 hover:bg-brand-danger/20 text-brand-danger p-1.5 rounded-lg border border-brand-danger/20 transition-colors cursor-pointer"
                            title="Block Card"
                          >
                            <XCircle className="h-4.5 w-4.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-5 text-right">
            <span className="text-xs text-dark-muted font-semibold flex items-center justify-end hover:text-white transition-colors cursor-pointer">
              View all incident history <ArrowUpRight className="h-4 w-4 ml-1 text-indigo-500" />
            </span>
          </div>
        </div>

      </div>

    </div>
  );
};

export default Dashboard;
