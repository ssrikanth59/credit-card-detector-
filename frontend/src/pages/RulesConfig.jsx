import React, { useEffect, useState } from 'react';
import { getRules, updateRule, createRule } from '../utils/api';
import { Sliders, ToggleLeft, ToggleRight, Settings, Plus, Info, Check, Loader } from 'lucide-react';

const RulesConfig = ({ user }) => {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  
  // New rule form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleDesc, setNewRuleDesc] = useState('');
  const [newRuleType, setNewRuleType] = useState('amount_limit');
  const [newRuleVal, setNewRuleVal] = useState('');
  const [newRuleAction, setNewRuleAction] = useState('FLAGGED');

  const fetchRules = async () => {
    setLoading(true);
    try {
      const response = await getRules();
      if (response.data.success) {
        setRules(response.data.rules);
      }
    } catch (err) {
      console.error('Failed to load rules:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleToggleActive = async (id, currentStatus) => {
    try {
      const response = await updateRule(id, { isActive: !currentStatus });
      if (response.data.success) {
        setRules(rules.map(r => r._id === id ? { ...r, isActive: !currentStatus } : r));
      }
    } catch (err) {
      alert('Failed to update rule status.');
    }
  };

  const startEditing = (rule) => {
    setEditingId(rule._id);
    if (Array.isArray(rule.value)) {
      setEditValue(rule.value.join(', '));
    } else {
      setEditValue(rule.value.toString());
    }
  };

  const saveEditValue = async (id, type) => {
    let formattedValue = editValue;
    if (type === 'amount_limit' || type === 'velocity_limit' || type === 'device_risk_threshold') {
      formattedValue = parseFloat(editValue);
      if (isNaN(formattedValue)) {
        alert('Please enter a valid numeric threshold.');
        return;
      }
    } else if (type === 'country_blacklist') {
      formattedValue = editValue.split(',').map(s => s.trim()).filter(Boolean);
    }

    try {
      const response = await updateRule(id, { value: formattedValue });
      if (response.data.success) {
        setRules(rules.map(r => r._id === id ? { ...r, value: formattedValue } : r));
        setEditingId(null);
      }
    } catch (err) {
      alert('Failed to save rule threshold.');
    }
  };

  const handleCreateRule = async (e) => {
    e.preventDefault();
    if (!newRuleName || !newRuleVal) {
      alert('Please fill out name and threshold value.');
      return;
    }

    let parsedVal = newRuleVal;
    if (newRuleType === 'amount_limit' || newRuleType === 'velocity_limit' || newRuleType === 'device_risk_threshold') {
      parsedVal = parseFloat(newRuleVal);
      if (isNaN(parsedVal)) {
        alert('Please enter a numeric threshold.');
        return;
      }
    } else if (newRuleType === 'country_blacklist') {
      parsedVal = newRuleVal.split(',').map(s => s.trim()).filter(Boolean);
    }

    try {
      const response = await createRule({
        name: newRuleName,
        description: newRuleDesc,
        type: newRuleType,
        value: parsedVal,
        action: newRuleAction
      });

      if (response.data.success) {
        setRules([...rules, response.data.rule]);
        setShowAddForm(false);
        setNewRuleName('');
        setNewRuleDesc('');
        setNewRuleVal('');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Only administrator credentials can create rules.');
    }
  };

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Threshold Policies</h1>
          <p className="text-dark-muted text-sm mt-1">Configure automated overrides, country lists, velocity bans, and amount triggers.</p>
        </div>
        {user?.role === 'admin' && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-600/15 transition-all flex items-center space-x-1.5 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Create Custom Rule</span>
          </button>
        )}
      </div>

      {/* Add Rule Form */}
      {showAddForm && (
        <div className="glass rounded-2xl p-6 border border-dark-border max-w-2xl">
          <h3 className="text-sm font-bold text-white uppercase tracking-widest font-mono mb-4">Add Rule Policy</h3>
          <form onSubmit={handleCreateRule} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-dark-muted font-bold mb-1">Rule Name</label>
                <input
                  type="text"
                  value={newRuleName}
                  onChange={(e) => setNewRuleName(e.target.value)}
                  placeholder="e.g., Heavy Transaction Limits"
                  className="w-full bg-dark-bg/60 border border-dark-border rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-dark-muted font-bold mb-1">Trigger Type</label>
                <select
                  value={newRuleType}
                  onChange={(e) => setNewRuleType(e.target.value)}
                  className="w-full bg-dark-bg/60 border border-dark-border rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="amount_limit">Transaction Amount Limit ($)</option>
                  <option value="velocity_limit">Velocity Count (1hr)</option>
                  <option value="device_risk_threshold">Device Risk Threshold (0.0 - 1.0)</option>
                  <option value="country_blacklist">Country Blacklist (comma separated)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-dark-muted font-bold mb-1">Description</label>
              <textarea
                value={newRuleDesc}
                onChange={(e) => setNewRuleDesc(e.target.value)}
                placeholder="Explain the purpose of this security policy..."
                rows="2"
                className="w-full bg-dark-bg/60 border border-dark-border rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-dark-muted font-bold mb-1">Threshold Value</label>
                <input
                  type="text"
                  value={newRuleVal}
                  onChange={(e) => setNewRuleVal(e.target.value)}
                  placeholder="e.g. 10000 or IR, KP"
                  className="w-full bg-dark-bg/60 border border-dark-border rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-dark-muted font-bold mb-1">Policy Action (If Triggered)</label>
                <select
                  value={newRuleAction}
                  onChange={(e) => setNewRuleAction(e.target.value)}
                  className="w-full bg-dark-bg/60 border border-dark-border rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="FLAGGED">FLAGGED (Manual review queue)</option>
                  <option value="BLOCKED">BLOCKED (Auto reject/declined)</option>
                </select>
              </div>
            </div>

            <div className="pt-2 text-right">
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2 rounded-xl cursor-pointer"
              >
                Save Policy
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Rules List */}
      {loading ? (
        <div className="p-20 text-center flex flex-col items-center justify-center space-y-4">
          <Loader className="h-8 w-8 text-indigo-500 animate-spin" />
          <p className="text-xs text-dark-muted font-medium">Querying database policy entries...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {rules.map((rule) => {
            const isEditing = editingId === rule._id;
            return (
              <div 
                key={rule._id} 
                className={`glass p-5 rounded-xl border transition-all ${
                  rule.isActive ? 'border-dark-border hover:border-dark-border/80' : 'border-dark-border/40 opacity-70'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center space-x-2.5">
                    <div className="bg-indigo-950 text-indigo-400 border border-indigo-900/60 p-2 rounded-lg">
                      <Sliders className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-white">{rule.name}</h3>
                      <span className="text-[10px] text-dark-muted font-mono uppercase">{rule.type.replace(/_/g, ' ')}</span>
                    </div>
                  </div>

                  {/* Toggle Active status */}
                  <button
                    onClick={() => handleToggleActive(rule._id, rule.isActive)}
                    className="text-dark-muted hover:text-white transition-colors cursor-pointer"
                    title={rule.isActive ? 'Disable Rule' : 'Enable Rule'}
                  >
                    {rule.isActive ? (
                      <ToggleRight className="h-7 w-7 text-brand-success" />
                    ) : (
                      <ToggleLeft className="h-7 w-7 text-dark-muted" />
                    )}
                  </button>
                </div>

                <p className="text-xs text-dark-muted mt-3 font-medium">{rule.description}</p>

                {/* Edit Threshold Value Area */}
                <div className="mt-4 pt-4 border-t border-dark-border/40 flex items-center justify-between">
                  <div className="flex-1">
                    <span className="text-[10px] font-bold text-dark-muted uppercase font-mono block mb-1">
                      Threshold Value
                    </span>
                    {isEditing ? (
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="bg-dark-bg/85 border border-dark-border rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-indigo-500 w-36 font-mono"
                        />
                        <button
                          onClick={() => saveEditValue(rule._id, rule.type)}
                          className="bg-brand-success/15 border border-brand-success/20 text-brand-success p-1 rounded-lg hover:bg-brand-success/30 cursor-pointer"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs font-mono font-bold text-white bg-dark-bg/60 border border-dark-border px-2 py-0.5 rounded">
                        {Array.isArray(rule.value) ? rule.value.join(', ') : rule.value.toString()}
                      </span>
                    )}
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-bold text-dark-muted uppercase font-mono block mb-1">
                      Target Action
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      rule.action === 'BLOCKED' ? 'bg-brand-danger/10 text-brand-danger border border-brand-danger/25' : 'bg-brand-warning/10 text-brand-warning border border-brand-warning/25'
                    }`}>
                      {rule.action}
                    </span>
                  </div>

                  {!isEditing && (
                    <button
                      onClick={() => startEditing(rule)}
                      className="ml-4 bg-dark-card border border-dark-border p-1.5 rounded-lg text-dark-muted hover:text-white transition-colors cursor-pointer"
                      title="Edit Rule Value"
                    >
                      <Settings className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center space-x-1.5 text-[10px] text-dark-muted font-mono mt-3">
                  <Info className="h-3 w-3 text-indigo-400" />
                  <span>Rule evaluations bypass model constraints.</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RulesConfig;
