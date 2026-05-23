import React, { useEffect, useState } from 'react';
import { getTransactions } from '../utils/api';
import { useTranslation } from '../utils/i18n';
import { 
  Search, 
  Loader, 
  Calendar, 
  AlertTriangle, 
  Eye, 
  EyeOff, 
  Download, 
  FileText, 
  FileSpreadsheet 
} from 'lucide-react';

const Transactions = () => {
  const { t } = useTranslation();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchName, setSearchName] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDecision, setFilterDecision] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const params = {};
      if (searchName) params.cardholderName = searchName;
      if (filterStatus) params.status = filterStatus;
      if (filterDecision) params.decision = filterDecision;
      
      const response = await getTransactions(params);
      if (response.data.success) {
        setTransactions(response.data.transactions);
      }
    } catch (err) {
      console.error('Failed to load transactions:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [filterStatus, filterDecision]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchTransactions();
  };

  const toggleExpand = (id) => {
    if (expandedId === id) setExpandedId(null);
    else setExpandedId(id);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'APPROVED':
        return <span className="px-2.5 py-1 text-[11px] font-bold bg-brand-success/10 text-brand-success border border-brand-success/20 rounded-full uppercase">Approved</span>;
      case 'PENDING_REVIEW':
        return <span className="px-2.5 py-1 text-[11px] font-bold bg-brand-warning/10 text-brand-warning border border-brand-warning/20 rounded-full uppercase">Pending Review</span>;
      case 'BLOCKED':
        return <span className="px-2.5 py-1 text-[11px] font-bold bg-brand-danger/10 text-brand-danger border border-brand-danger/20 rounded-full uppercase">Blocked</span>;
      default:
        return <span className="px-2.5 py-1 text-[11px] font-bold bg-dark-muted/10 text-dark-muted border border-dark-border rounded-full uppercase">{status}</span>;
    }
  };

  const handleExportCSV = () => {
    if (!transactions.length) return;
    const headers = [
      'Cardholder Name',
      'Card Number',
      'Brand',
      'Card Type',
      'Bank Issuer',
      'Country',
      'Merchant',
      'Category',
      'Amount ($)',
      'Risk Score (%)',
      'Decision',
      'Status',
      'Date'
    ];
    const rows = transactions.map(tx => [
      `"${tx.cardholderName.replace(/"/g, '""')}"`,
      `"${tx.cardNumber}"`,
      `"${(tx.cardBrand || 'Unknown').replace(/"/g, '""')}"`,
      `"${(tx.cardType || 'Unknown').replace(/"/g, '""')}"`,
      `"${(tx.cardIssuer || 'Unknown').replace(/"/g, '""')}"`,
      `"${(tx.cardCountry || 'Unknown').replace(/"/g, '""')}"`,
      `"${tx.merchant.replace(/"/g, '""')}"`,
      `"${(tx.merchantCategory || 'Retail').replace(/"/g, '""')}"`,
      tx.amount.toFixed(2),
      tx.riskScore,
      tx.decision,
      tx.status,
      new Date(tx.createdAt).toISOString()
    ]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `transactions_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportExcel = () => {
    if (!transactions.length) return;
    const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8"/>
        <style>
          table { border-collapse: collapse; width: 100%; font-family: sans-serif; }
          th { background-color: #4f46e5; color: white; border: 1px solid #ddd; padding: 10px; font-weight: bold; text-align: left; }
          td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          .risk-high { background-color: #fee2e2; color: #991b1b; }
          .risk-med { background-color: #fef3c7; color: #92400e; }
          .risk-low { background-color: #d1fae5; color: #065f46; }
        </style>
      </head>
      <body>
        <h2>FraudShield AI - Transactions Audit Ledger</h2>
        <p>Generated: ${new Date().toLocaleString()}</p>
        <table>
          <thead>
            <tr>
              <th>Cardholder Name</th>
              <th>Card Number</th>
              <th>Brand</th>
              <th>Card Type</th>
              <th>Bank Issuer</th>
              <th>Country</th>
              <th>Merchant</th>
              <th>Category</th>
              <th>Amount ($)</th>
              <th>Risk Score (%)</th>
              <th>Decision</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            ${transactions.map(tx => `
              <tr>
                <td>${tx.cardholderName}</td>
                <td>${tx.cardNumber}</td>
                <td>${tx.cardBrand || 'Unknown'}</td>
                <td>${tx.cardType || 'Unknown'}</td>
                <td>${tx.cardIssuer || 'Unknown'}</td>
                <td>${tx.cardCountry || 'Unknown'}</td>
                <td>${tx.merchant}</td>
                <td>${tx.merchantCategory || 'Retail'}</td>
                <td>${tx.amount.toFixed(2)}</td>
                <td class="${tx.riskScore >= 75 ? 'risk-high' : tx.riskScore >= 45 ? 'risk-med' : 'risk-low'}">${tx.riskScore}%</td>
                <td>${tx.decision}</td>
                <td>${tx.status}</td>
                <td>${new Date(tx.createdAt).toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `transactions_report_${Date.now()}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    if (!transactions.length) return;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Transactions Audit Ledger - FraudShield AI</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; padding: 40px 20px; }
            .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; }
            .title { font-size: 24px; font-weight: 800; color: #0f172a; margin: 0; }
            .subtitle { font-size: 13px; color: #64748b; margin-top: 5px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { background-color: #f8fafc; border-bottom: 2px solid #e2e8f0; text-align: left; padding: 12px 10px; font-size: 11px; text-transform: uppercase; font-weight: 700; color: #475569; }
            td { padding: 12px 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
            .cardholder { font-weight: 600; color: #0f172a; }
            .card-details { font-size: 11px; color: #64748b; font-family: monospace; }
            .badge { display: inline-block; padding: 3px 8px; font-size: 10px; font-weight: 700; border-radius: 9999px; text-transform: uppercase; }
            .badge-approved { background-color: #dcfce7; color: #15803d; }
            .badge-flagged { background-color: #fef9c3; color: #a16207; }
            .badge-blocked { background-color: #fee2e2; color: #b91c1c; }
            .risk-high { color: #b91c1c; font-weight: bold; }
            .risk-med { color: #a16207; font-weight: bold; }
            .risk-low { color: #15803d; font-weight: bold; }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title">Transactions Audit Ledger</h1>
            <div class="subtitle">FraudShield AI • Generated on ${new Date().toLocaleString()} • Total Records: ${transactions.length}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Cardholder</th>
                <th>Card Metadata</th>
                <th>Merchant</th>
                <th>Amount</th>
                <th>Risk Score</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${transactions.map(tx => `
                <tr>
                  <td>${new Date(tx.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div class="cardholder">${tx.cardholderName}</div>
                    <div class="card-details">${tx.cardNumber}</div>
                  </td>
                  <td>
                    <div>${tx.cardBrand || 'Unknown'} (${tx.cardType || 'Unknown'})</div>
                    <div class="card-details">${tx.cardIssuer || 'Unknown'} • ${tx.cardCountry || 'Unknown'}</div>
                  </td>
                  <td>
                    <div>${tx.merchant}</div>
                    <div style="font-size: 11px; color: #64748b;">${tx.merchantCategory || 'Retail'}</div>
                  </td>
                  <td style="font-weight: 600;">$${tx.amount.toFixed(2)}</td>
                  <td>
                    <span class="${tx.riskScore >= 75 ? 'risk-high' : tx.riskScore >= 45 ? 'risk-med' : 'risk-low'}">
                      ${tx.riskScore}%
                    </span>
                  </td>
                  <td>
                    <span class="badge ${tx.status === 'APPROVED' ? 'badge-approved' : tx.status === 'PENDING_REVIEW' ? 'badge-flagged' : 'badge-blocked'}">
                      ${tx.status}
                    </span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8">
      {/* Header with Export buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-dark-text tracking-tight">{t('transactions')}</h1>
          <p className="text-dark-muted text-sm mt-1">Audit all historic and live payment logs, velocity counters, and explanation weights.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-1.5 bg-dark-card border border-dark-border hover:border-indigo-500/50 hover:bg-dark-border/40 text-dark-text font-semibold text-xs px-3.5 py-2 rounded-xl transition-all cursor-pointer shadow-md"
          >
            <Download className="h-3.5 w-3.5 text-indigo-400" />
            <span>{t('exportCSV')}</span>
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center space-x-1.5 bg-dark-card border border-dark-border hover:border-emerald-500/50 hover:bg-dark-border/40 text-dark-text font-semibold text-xs px-3.5 py-2 rounded-xl transition-all cursor-pointer shadow-md"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
            <span>{t('exportExcel')}</span>
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center space-x-1.5 bg-dark-card border border-dark-border hover:border-red-500/50 hover:bg-dark-border/40 text-dark-text font-semibold text-xs px-3.5 py-2 rounded-xl transition-all cursor-pointer shadow-md"
          >
            <FileText className="h-3.5 w-3.5 text-red-400" />
            <span>{t('exportPDF')}</span>
          </button>
        </div>
      </div>

      {/* Filter Options */}
      <div className="glass p-5 rounded-2xl border border-dark-border">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-dark-muted">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              placeholder={t('searchCardholder')}
              className="w-full bg-dark-bg/60 border border-dark-border rounded-xl py-2 pl-10 pr-4 text-xs text-dark-text placeholder-dark-muted focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2">
              <span className="text-xs text-dark-muted font-bold tracking-wider uppercase">{t('status')}:</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-dark-bg/60 border border-dark-border rounded-xl px-3 py-2 text-xs text-dark-text focus:outline-none focus:border-indigo-500"
              >
                <option value="">All Statuses</option>
                <option value="APPROVED">Approved</option>
                <option value="PENDING_REVIEW">Pending Review</option>
                <option value="BLOCKED">Blocked</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-xs text-dark-muted font-bold tracking-wider uppercase">{t('decision')}:</span>
              <select
                value={filterDecision}
                onChange={(e) => setFilterDecision(e.target.value)}
                className="bg-dark-bg/60 border border-dark-border rounded-xl px-3 py-2 text-xs text-dark-text focus:outline-none focus:border-indigo-500"
              >
                <option value="">All Decisions</option>
                <option value="APPROVED">Approved</option>
                <option value="FLAGGED">Flagged</option>
                <option value="BLOCKED">Blocked</option>
              </select>
            </div>

            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer shadow-lg shadow-indigo-600/15"
            >
              Search
            </button>
          </div>
        </form>
      </div>

      {/* Ledger Table */}
      <div className="glass rounded-2xl border border-dark-border overflow-hidden">
        {loading ? (
          <div className="p-20 text-center flex flex-col items-center justify-center space-y-4">
            <Loader className="h-8 w-8 text-indigo-500 animate-spin" />
            <p className="text-xs text-dark-muted font-medium">Recompiling ledger query logs...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-24 text-center text-dark-muted text-sm">
            🔍 {t('noTransactions')}
          </div>
        ) : (
          <div className="divide-y divide-dark-border">
            {/* Header row */}
            <div className="bg-dark-card/45 px-6 py-4 grid grid-cols-12 text-xs font-bold text-dark-muted uppercase tracking-wider font-mono">
              <div className="col-span-2">{t('cardholderName')}</div>
              <div className="col-span-2">{t('brand')} & {t('cardType')}</div>
              <div className="col-span-2">{t('issuer')} & {t('country')}</div>
              <div className="col-span-2">{t('merchant')}</div>
              <div className="col-span-1">{t('amount')}</div>
              <div className="col-span-1">{t('riskScore')}</div>
              <div className="col-span-1 text-center">{t('status')}</div>
              <div className="col-span-1 text-right">{t('details')}</div>
            </div>

            {/* Transaction Data Rows */}
            {transactions.map((tx) => {
              const isExpanded = expandedId === tx._id;
              
              let scoreColor = 'text-brand-success bg-brand-success/10 border-brand-success/15';
              if (tx.riskScore >= 75) scoreColor = 'text-brand-danger bg-brand-danger/10 border-brand-danger/15';
              else if (tx.riskScore >= 45) scoreColor = 'text-brand-warning bg-brand-warning/10 border-brand-warning/15';

              return (
                <div key={tx._id} className="hover:bg-dark-card/20 transition-all border-b border-dark-border/10">
                  <div className="px-6 py-4.5 grid grid-cols-12 items-center text-sm">
                    {/* Cardholder */}
                    <div className="col-span-2 flex items-center space-x-3.5">
                      <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${tx.status === 'BLOCKED' ? 'dot-blocked' : tx.status === 'PENDING_REVIEW' ? 'dot-flagged' : 'dot-approved'}`} />
                      <div>
                        <span className="font-extrabold text-dark-text">{tx.cardholderName}</span>
                        <div className="text-[10px] text-dark-muted font-mono mt-0.5">{tx.cardNumber}</div>
                      </div>
                    </div>

                    {/* Brand & Type */}
                    <div className="col-span-2">
                      <span className="font-semibold text-dark-text">{tx.cardBrand || 'Unknown'}</span>
                      <div className="text-[10px] text-dark-muted mt-0.5">{tx.cardType || 'Unknown'}</div>
                    </div>

                    {/* Issuer & Country */}
                    <div className="col-span-2">
                      <span className="font-semibold text-dark-text">{tx.cardIssuer || 'Unknown'}</span>
                      <div className="text-[10px] text-dark-muted mt-0.5">{tx.cardCountry || 'Unknown'}</div>
                    </div>

                    {/* Merchant */}
                    <div className="col-span-2">
                      <span className="font-medium text-dark-text">{tx.merchant}</span>
                      <div className="text-[10px] text-dark-muted mt-0.5">{tx.merchantCategory || 'Retail'}</div>
                    </div>

                    {/* Amount */}
                    <div className="col-span-1">
                      <span className="font-bold text-dark-text">${tx.amount.toFixed(2)}</span>
                      <div className="text-[10px] text-dark-muted flex items-center mt-0.5">
                        <Calendar className="h-2.5 w-2.5 mr-1" />
                        {new Date(tx.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </div>
                    </div>

                    {/* Risk Score */}
                    <div className="col-span-1">
                      <span className={`px-2 py-0.5 rounded border text-xs font-mono font-bold ${scoreColor}`}>
                        {tx.riskScore}%
                      </span>
                    </div>

                    {/* Status */}
                    <div className="col-span-1 text-center">
                      {getStatusBadge(tx.status)}
                    </div>

                    {/* Expander Trigger */}
                    <div className="col-span-1 text-right">
                      <button
                        onClick={() => toggleExpand(tx._id)}
                        className="text-indigo-400 hover:text-indigo-300 font-semibold text-xs inline-flex items-center space-x-1 cursor-pointer"
                      >
                        {isExpanded ? (
                          <>
                            <span>Hide</span> <EyeOff className="h-3.5 w-3.5" />
                          </>
                        ) : (
                          <>
                            <span>Analyze</span> <Eye className="h-3.5 w-3.5" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Section (Explainable AI Risk Breakdown) */}
                  {isExpanded && (
                    <div className="bg-dark-bg/40 px-8 py-6 border-t border-b border-dark-border/40 grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Left side: parameters */}
                      <div className="space-y-4">
                        <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest font-mono">Risk Telemetry Diagnostics</h4>
                        
                        <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                          <div className="bg-dark-card border border-dark-border/60 p-3 rounded-xl">
                            <span className="text-dark-muted block uppercase text-[9px] mb-1">Velocity (Last 1hr)</span>
                            <span className="text-dark-text font-bold text-sm">{tx.velocity_1h} transactions</span>
                          </div>
                          
                          <div className="bg-dark-card border border-dark-border/60 p-3 rounded-xl">
                            <span className="text-dark-muted block uppercase text-[9px] mb-1">Geolocation Delta</span>
                            <span className="text-dark-text font-bold text-sm">{tx.distance_from_home.toFixed(1)} km from home</span>
                          </div>

                          <div className="bg-dark-card border border-dark-border/60 p-3 rounded-xl">
                            <span className="text-dark-muted block uppercase text-[9px] mb-1">Device Integrity Score</span>
                            <span className="text-dark-text font-bold text-sm">{(tx.device_risk_score * 100).toFixed(0)}% risk index</span>
                          </div>

                          <div className="bg-dark-card border border-dark-border/60 p-3 rounded-xl">
                            <span className="text-dark-muted block uppercase text-[9px] mb-1">Prior Account declines</span>
                            <span className="text-dark-text font-bold text-sm">{tx.is_declined_before ? 'Declined recently' : 'No recent declines'}</span>
                          </div>
                        </div>

                        <div className="text-[11px] text-dark-muted flex items-start space-x-2 mt-2">
                          <AlertTriangle className="h-4 w-4 text-brand-warning shrink-0" />
                          <span>
                            Device fingerprint: <span className="text-dark-text">{tx.deviceFingerprint?.browser} ({tx.deviceFingerprint?.os})</span>. Hash matching registry ID: <span className="text-dark-text font-mono text-[9px]">{tx.deviceFingerprint?.hash}</span>.
                          </span>
                        </div>
                      </div>

                      {/* Right side: Explainable AI Chart */}
                      <div className="space-y-4">
                        <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest font-mono">{t('explainableAI')}</h4>
                        
                        <div className="space-y-3">
                          {tx.explanation && tx.explanation.length > 0 ? (
                            tx.explanation.slice(0, 4).map((exp) => (
                              <div key={exp.feature} className="space-y-1">
                                <div className="flex justify-between text-xs">
                                  <span className="text-dark-text font-medium capitalize">{exp.feature.replace(/_/g, ' ')}</span>
                                  <span className="text-indigo-400 font-bold">{exp.percentage}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-dark-border rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-indigo-500 rounded-full" 
                                    style={{ width: `${exp.percentage}%` }}
                                  />
                                </div>
                              </div>
                            ))
                          ) : (
                            <span className="text-xs text-dark-muted">No explainable metrics serialized for this record.</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Transactions;
