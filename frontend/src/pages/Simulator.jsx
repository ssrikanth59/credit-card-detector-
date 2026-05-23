import React, { useState } from 'react';
import { processTransaction } from '../utils/api';
import { getDeviceFingerprint } from '../utils/fingerprint';
import { useTranslation } from '../utils/i18n';
import { 
  validateLuhn, 
  detectBrand, 
  validateCVV, 
  validateExpiry, 
  detectFraudPatterns 
} from '../utils/cardValidator';
import { 
  Play, 
  Sparkles, 
  MapPin, 
  Terminal, 
  AlertTriangle, 
  ShieldCheck, 
  ShieldAlert, 
  Check, 
  X, 
  Cpu, 
  CreditCard,
  Globe,
  HelpCircle
} from 'lucide-react';

const PRESETS = [
  {
    name: 'Normal Coffee Purchase',
    cardholderName: 'John Doe',
    cardNumber: '4111222233334588',
    expiryDate: '12/28',
    cvv: '123',
    amount: '4.50',
    merchant: 'Starbucks Coffee',
    merchantCategory: 'Groceries',
    location: { city: 'New York', country: 'US', latitude: 40.7128, longitude: -74.0060 },
    ipAddress: '192.168.1.52',
    deviceHash: 'dev_win_chrome_9a2f', // matching Doe profile
    description: 'Typical low-value transaction near John\'s billing address (New York).'
  },
  {
    name: 'Suspicious High-Value Outlier',
    cardholderName: 'John Doe',
    cardNumber: '4111222233334588',
    expiryDate: '12/28',
    cvv: '123',
    amount: '8500.00',
    merchant: 'Rolex Luxury Retail',
    merchantCategory: 'Retail',
    location: { city: 'New York', country: 'US', latitude: 40.7128, longitude: -74.0060 },
    ipAddress: '192.168.1.52',
    deviceHash: 'dev_win_chrome_9a2f',
    description: 'Triggers the High-Value Monitor Rule ($5,000+) forcing FLAGGED status.'
  },
  {
    name: 'Extreme Location Anomaly (Sanctioned country)',
    cardholderName: 'Jane Smith',
    cardNumber: '5412888899990145',
    expiryDate: '09/27',
    cvv: '992',
    amount: '320.00',
    merchant: 'Travel Agent Portal',
    merchantCategory: 'Travel',
    location: { city: 'Tehran', country: 'Iran', latitude: 35.6892, longitude: 51.3890 },
    ipAddress: '185.120.10.4',
    deviceHash: 'suspicious_fprint_8x3c',
    description: 'Triggers the Country Blacklist Rule (Iran) and Geodistance calculations, forcing BLOCKED status.'
  },
  {
    name: 'Device Swapping / Account Takeover',
    cardholderName: 'Alice Johnson',
    cardNumber: '3782000011119856',
    expiryDate: '05/29',
    cvv: '3002',
    amount: '450.00',
    merchant: 'Apple Online Store',
    merchantCategory: 'Retail',
    location: { city: 'London', country: 'UK', latitude: 51.5074, longitude: -0.1278 },
    ipAddress: '82.165.12.98',
    deviceHash: 'dev_win_chrome_9a2f', // Swapped: Alice using John Doe's device!
    description: 'Identifies device sharing mismatch. The device risk score escalates, raising fraud probability.'
  }
];

const CITY_COORDINATES = {
  'new york': { latitude: '40.7128', longitude: '-74.0060', country: 'US' },
  'los angeles': { latitude: '34.0522', longitude: '-118.2437', country: 'US' },
  'london': { latitude: '51.5074', longitude: '-0.1278', country: 'UK' },
  'paris': { latitude: '48.8566', longitude: '2.3522', country: 'FR' },
  'tokyo': { latitude: '35.6762', longitude: '139.6503', country: 'JP' },
  'tehran': { latitude: '35.6892', longitude: '51.3890', country: 'Iran' }
};

const Simulator = () => {
  const { t } = useTranslation();

  const [formData, setFormData] = useState({
    cardholderName: 'John Doe',
    cardNumber: '4111 2222 3333 4588',
    expiryDate: '12/28',
    cvv: '123',
    amount: '55.00',
    merchant: 'Target Stores',
    merchantCategory: 'Retail',
    city: 'New York',
    country: 'US',
    latitude: '40.7128',
    longitude: '-74.0060',
    ipAddress: '192.168.1.15',
    customDeviceHash: '',
    modelType: 'Random Forest'
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  // Live validator bindings
  const cleanCardNumber = formData.cardNumber.replace(/\s+/g, '');
  const detectedBrand = detectBrand(cleanCardNumber);
  const isLuhnValid = validateLuhn(cleanCardNumber);
  const isExpiryValid = validateExpiry(formData.expiryDate);
  const isCvvValid = validateCVV(formData.cvv, detectedBrand);
  const activeFraudWarnings = detectFraudPatterns(cleanCardNumber);

  const applyPreset = (preset) => {
    setFormData({
      cardholderName: preset.cardholderName,
      cardNumber: preset.cardNumber,
      expiryDate: preset.expiryDate || '12/28',
      cvv: preset.cvv || '123',
      amount: preset.amount,
      merchant: preset.merchant,
      merchantCategory: preset.merchantCategory,
      city: preset.location.city,
      country: preset.location.country,
      latitude: preset.location.latitude.toString(),
      longitude: preset.location.longitude.toString(),
      ipAddress: preset.ipAddress,
      customDeviceHash: preset.deviceHash,
      modelType: formData.modelType
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let updatedFields = { [name]: value };

    if (name === 'city') {
      const lowerCity = value.trim().toLowerCase();
      if (CITY_COORDINATES[lowerCity]) {
        updatedFields.latitude = CITY_COORDINATES[lowerCity].latitude;
        updatedFields.longitude = CITY_COORDINATES[lowerCity].longitude;
        updatedFields.country = CITY_COORDINATES[lowerCity].country;
      }
    }

    setFormData(prev => ({ ...prev, ...updatedFields }));
  };

  const handleSimulateSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    // Harvest device fingerprint
    const fp = getDeviceFingerprint();
    if (formData.customDeviceHash) {
      fp.hash = formData.customDeviceHash;
    }

    const payload = {
      cardholderName: formData.cardholderName,
      cardNumber: cleanCardNumber,
      cvv: formData.cvv,
      expiryDate: formData.expiryDate,
      amount: parseFloat(formData.amount || 0),
      merchant: formData.merchant,
      merchantCategory: formData.merchantCategory,
      location: {
        city: formData.city,
        country: formData.country,
        latitude: parseFloat(formData.latitude || 0),
        longitude: parseFloat(formData.longitude || 0)
      },
      deviceFingerprint: fp,
      ipAddress: formData.ipAddress,
      modelType: formData.modelType
    };

    try {
      const response = await processTransaction(payload);
      setResult(response.data);
    } catch (err) {
      alert('Failed to simulate transaction. Make sure the backend app is running.');
    } finally {
      setLoading(false);
    }
  };

  // Card themes depending on brand
  const getCardThemeClass = (brand) => {
    switch (brand) {
      case 'Visa':
        return 'bg-gradient-to-br from-indigo-900 via-indigo-950 to-blue-950 text-white border-indigo-500/30';
      case 'Mastercard':
        return 'bg-gradient-to-br from-red-950 via-orange-950 to-amber-950 text-white border-orange-500/30';
      case 'American Express':
        return 'bg-gradient-to-br from-teal-900 via-emerald-950 to-cyan-950 text-white border-teal-500/30';
      case 'RuPay':
        return 'bg-gradient-to-br from-slate-900 via-blue-950 to-slate-950 text-white border-blue-400/30';
      default:
        return 'bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 text-white border-dark-border';
    }
  };

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-dark-text tracking-tight">{t('simulator')}</h1>
        <p className="text-dark-muted text-sm mt-1">Inject mock transactions to test velocity thresholds, geodistance checks, and machine learning scoring.</p>
      </div>

      {/* Preset Section */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-widest font-mono">Select Testing Presets</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => applyPreset(preset)}
              className="glass p-4 rounded-xl border border-dark-border text-left hover:border-indigo-500/50 hover:bg-indigo-950/10 transition-all cursor-pointer"
            >
              <span className="text-xs font-bold text-dark-text block mb-1.5 flex items-center">
                <Sparkles className="h-3.5 w-3.5 mr-1.5 text-indigo-400" />
                {preset.name}
              </span>
              <p className="text-[11px] text-dark-muted line-clamp-2">{preset.description}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
        
        {/* Input Form */}
        <div className="xl:col-span-2 glass rounded-2xl p-6 border border-dark-border space-y-6">
          <h3 className="text-md font-bold text-dark-text uppercase tracking-wider font-mono flex items-center border-b border-dark-border/40 pb-3">
            <Terminal className="h-4.5 w-4.5 mr-2 text-indigo-500" />
            Transaction Payload Editor
          </h3>

          <form onSubmit={handleSimulateSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
              
              <div>
                <label className="block text-dark-muted font-bold tracking-wider uppercase mb-1.5">{t('cardholderName')}</label>
                <input
                  type="text"
                  name="cardholderName"
                  value={formData.cardholderName}
                  onChange={handleInputChange}
                  required
                  className="w-full bg-dark-bg/60 border border-dark-border rounded-xl p-2.5 text-dark-text placeholder-dark-muted focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-dark-muted font-bold tracking-wider uppercase mb-1.5">{t('cardNumber')}</label>
                <input
                  type="text"
                  name="cardNumber"
                  value={formData.cardNumber}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g. 4111 2222 3333 4588"
                  className="w-full bg-dark-bg/60 border border-dark-border rounded-xl p-2.5 text-dark-text placeholder-dark-muted focus:outline-none focus:border-indigo-500 font-mono tracking-widest text-[13px]"
                />
              </div>

              <div>
                <label className="block text-dark-muted font-bold tracking-wider uppercase mb-1.5">{t('expiryDate')}</label>
                <input
                  type="text"
                  name="expiryDate"
                  value={formData.expiryDate}
                  onChange={handleInputChange}
                  required
                  placeholder="MM/YY"
                  maxLength="5"
                  className="w-full bg-dark-bg/60 border border-dark-border rounded-xl p-2.5 text-dark-text placeholder-dark-muted focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-dark-muted font-bold tracking-wider uppercase mb-1.5">{t('cvv')}</label>
                <input
                  type="text"
                  name="cvv"
                  value={formData.cvv}
                  onChange={handleInputChange}
                  required
                  placeholder="123"
                  maxLength="4"
                  className="w-full bg-dark-bg/60 border border-dark-border rounded-xl p-2.5 text-dark-text placeholder-dark-muted focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-dark-muted font-bold tracking-wider uppercase mb-1.5">{t('amount')}</label>
                <input
                  type="number"
                  step="0.01"
                  name="amount"
                  value={formData.amount}
                  onChange={handleInputChange}
                  required
                  className="w-full bg-dark-bg/60 border border-dark-border rounded-xl p-2.5 text-dark-text placeholder-dark-muted focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-dark-muted font-bold tracking-wider uppercase mb-1.5">{t('merchant')}</label>
                <input
                  type="text"
                  name="merchant"
                  value={formData.merchant}
                  onChange={handleInputChange}
                  required
                  className="w-full bg-dark-bg/60 border border-dark-border rounded-xl p-2.5 text-dark-text placeholder-dark-muted focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-dark-muted font-bold tracking-wider uppercase mb-1.5">{t('merchantCategory')}</label>
                <select
                  name="merchantCategory"
                  value={formData.merchantCategory}
                  onChange={handleInputChange}
                  className="w-full bg-dark-bg/60 border border-dark-border rounded-xl p-2.5 text-dark-text focus:outline-none focus:border-indigo-500"
                >
                  <option value="Retail">Retail</option>
                  <option value="Groceries">Groceries</option>
                  <option value="Travel">Travel</option>
                  <option value="Entertainment">Entertainment</option>
                  <option value="Automotive">Automotive</option>
                </select>
              </div>

              <div>
                <label className="block text-dark-muted font-bold tracking-wider uppercase mb-1.5">IP Address</label>
                <input
                  type="text"
                  name="ipAddress"
                  value={formData.ipAddress}
                  onChange={handleInputChange}
                  className="w-full bg-dark-bg/60 border border-dark-border rounded-xl p-2.5 text-dark-text focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-dark-muted font-bold tracking-wider uppercase mb-1.5">{t('mlModel')}</label>
                <select
                  name="modelType"
                  value={formData.modelType}
                  onChange={handleInputChange}
                  className="w-full bg-indigo-950/20 border border-indigo-500/30 rounded-xl p-2.5 text-indigo-400 font-bold focus:outline-none focus:border-indigo-500"
                >
                  <option value="Random Forest">Random Forest (Ensemble)</option>
                  <option value="XGBoost">XGBoost (Boosted Trees)</option>
                  <option value="Logistic Regression">Logistic Regression (Linear)</option>
                  <option value="Decision Tree">Decision Tree (Deterministic)</option>
                </select>
              </div>

            </div>

            {/* Geolocation Fields */}
            <div className="border-t border-dark-border/40 pt-5 space-y-4">
              <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-widest font-mono flex items-center">
                <MapPin className="h-3.5 w-3.5 mr-1" />
                Merchant Geolocation
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-dark-muted uppercase text-[10px] mb-1">City</label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    className="w-full bg-dark-bg/60 border border-dark-border rounded-xl p-2 text-dark-text focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-dark-muted uppercase text-[10px] mb-1">Country</label>
                  <input
                    type="text"
                    name="country"
                    value={formData.country}
                    onChange={handleInputChange}
                    className="w-full bg-dark-bg/60 border border-dark-border rounded-xl p-2 text-dark-text focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Device Profile Fields */}
            <div className="border-t border-dark-border/40 pt-5 space-y-3">
              <label className="block text-dark-muted font-bold tracking-wider uppercase text-[10px]">
                Custom Device Fingerprint Hash (Optional)
              </label>
              <input
                type="text"
                name="customDeviceHash"
                value={formData.customDeviceHash}
                onChange={handleInputChange}
                placeholder="Leave blank to harvest actual browser fingerprint"
                className="w-full bg-dark-bg/60 border border-dark-border rounded-xl p-2.5 text-xs text-dark-text placeholder-dark-muted focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            <div className="pt-2 text-right">
              <button
                type="submit"
                disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs py-3 px-6 rounded-xl shadow-lg shadow-indigo-600/20 cursor-pointer flex items-center space-x-2 ml-auto"
              >
                <Play className="h-4 w-4" />
                <span>{loading ? 'Processing Ledger...' : t('submit')}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Live Card & Results Column */}
        <div className="space-y-6">
          
          {/* Visual Credit Card Widget */}
          <div className="glass rounded-2xl p-5 border border-dark-border space-y-4">
            <span className="text-[10px] font-bold text-dark-muted tracking-widest uppercase block">{t('cardPreview')}</span>
            
            {/* Visual Card Card */}
            <div className={`h-48 w-full rounded-2xl p-6 border relative flex flex-col justify-between overflow-hidden shadow-2xl transition-all duration-300 ${getCardThemeClass(detectedBrand)}`}>
              
              {/* Card Ring Overlays */}
              <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-white/5 blur-xl -mr-12 -mt-12 pointer-events-none" />
              <div className="absolute left-0 bottom-0 h-32 w-32 rounded-full bg-indigo-500/5 blur-xl -ml-8 -mb-8 pointer-events-none" />

              {/* Card Top */}
              <div className="flex justify-between items-start z-10">
                <div className="flex flex-col">
                  <LandmarkLogo brand={detectedBrand} />
                </div>
                <div className="font-extrabold text-sm tracking-widest italic opacity-85">
                  {detectedBrand !== 'Unknown' ? detectedBrand : 'CARD'}
                </div>
              </div>

              {/* Card Middle (Chip + Wireless) */}
              <div className="flex items-center space-x-3 z-10">
                <div className="bg-yellow-500/80 h-9 w-12 rounded-md border border-yellow-600/40 relative flex items-center justify-center shadow-inner">
                  <Cpu className="h-6 w-8 text-yellow-950/80 stroke-1" />
                </div>
                <div className="flex flex-col space-y-0.5 text-white/50">
                  <div className="h-1.5 w-4 bg-white/25 rounded-full" />
                  <div className="h-1.5 w-6 bg-white/25 rounded-full" />
                  <div className="h-1.5 w-5 bg-white/25 rounded-full" />
                </div>
              </div>

              {/* Card Number */}
              <div className="text-[17px] font-mono tracking-[0.2em] font-semibold text-center z-10 py-1 text-white text-shadow">
                {formData.cardNumber ? formData.cardNumber : '•••• •••• •••• ••••'}
              </div>

              {/* Card Bottom */}
              <div className="flex justify-between items-end z-10">
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase tracking-wider text-white/50 mb-0.5">{t('cardholderName')}</span>
                  <span className="text-[12px] font-medium tracking-wide uppercase font-sans truncate max-w-[170px]">
                    {formData.cardholderName || 'John Doe'}
                  </span>
                </div>
                <div className="flex space-x-4">
                  <div className="flex flex-col text-right">
                    <span className="text-[9px] uppercase tracking-wider text-white/50 mb-0.5">Expires</span>
                    <span className="text-[11px] font-mono font-medium">{formData.expiryDate || '••/••'}</span>
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="text-[9px] uppercase tracking-wider text-white/50 mb-0.5">CVV</span>
                    <span className="text-[11px] font-mono font-medium">{formData.cvv || '•••'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Visual Indicators */}
            <div className="bg-dark-bg/40 border border-dark-border p-3.5 rounded-xl space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-dark-muted">Luhn Algorithm Validation</span>
                {cleanCardNumber.length < 12 ? (
                  <span className="text-dark-muted font-mono text-[10px] flex items-center"><HelpCircle className="h-3.5 w-3.5 mr-1 text-slate-500" /> Pending</span>
                ) : isLuhnValid ? (
                  <span className="text-brand-success font-semibold font-mono text-[10px] flex items-center"><Check className="h-3.5 w-3.5 mr-1" /> Valid Checksum</span>
                ) : (
                  <span className="text-brand-danger font-semibold font-mono text-[10px] flex items-center"><X className="h-3.5 w-3.5 mr-1" /> Invalid Checksum</span>
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-dark-muted">CVV Format Validation</span>
                {!formData.cvv ? (
                  <span className="text-dark-muted font-mono text-[10px] flex items-center"><HelpCircle className="h-3.5 w-3.5 mr-1 text-slate-500" /> Pending</span>
                ) : isCvvValid ? (
                  <span className="text-brand-success font-semibold font-mono text-[10px] flex items-center"><Check className="h-3.5 w-3.5 mr-1" /> Valid Length</span>
                ) : (
                  <span className="text-brand-danger font-semibold font-mono text-[10px] flex items-center"><X className="h-3.5 w-3.5 mr-1" /> Invalid Length</span>
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-dark-muted">Expiry Date Check</span>
                {!formData.expiryDate ? (
                  <span className="text-dark-muted font-mono text-[10px] flex items-center"><HelpCircle className="h-3.5 w-3.5 mr-1 text-slate-500" /> Pending</span>
                ) : isExpiryValid ? (
                  <span className="text-brand-success font-semibold font-mono text-[10px] flex items-center"><Check className="h-3.5 w-3.5 mr-1" /> Active</span>
                ) : (
                  <span className="text-brand-danger font-semibold font-mono text-[10px] flex items-center"><X className="h-3.5 w-3.5 mr-1" /> Expired / Invalid</span>
                )}
              </div>

              {/* Fraud Pattern Live Diagnostics */}
              {cleanCardNumber.length >= 6 && activeFraudWarnings.length > 0 && (
                <div className="mt-3 pt-3 border-t border-dark-border/40 space-y-1.5">
                  <span className="text-[10px] font-bold text-brand-warning uppercase tracking-wider flex items-center">
                    <AlertTriangle className="h-3.5 w-3.5 mr-1 text-brand-warning" />
                    Suspicious Live Patterns
                  </span>
                  {activeFraudWarnings.map((warning, idx) => (
                    <p key={idx} className="text-[10px] text-brand-warning/90 font-mono">
                      • {warning}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Results Pane */}
          <div className="glass rounded-2xl p-6 border border-dark-border min-h-[350px] flex flex-col justify-between">
            <h3 className="text-md font-bold text-dark-text uppercase tracking-wider font-mono mb-4">{t('explainableAI')}</h3>

            {!result ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border border-dashed border-dark-border rounded-xl text-dark-muted text-xs">
                <Play className="h-8 w-8 text-dark-muted/40 mb-3 animate-pulse" />
                <span>Configure a payload and click "Dispatch Charge" to run real-time ML modeling diagnostics.</span>
              </div>
            ) : (
              <div className="space-y-6 flex-1 flex flex-col justify-between">
                
                {/* Decision and Score */}
                <div className="text-center p-5 rounded-xl bg-dark-bg/60 border border-dark-border space-y-2">
                  <span className="text-[10px] font-bold text-dark-muted tracking-widest uppercase block">Radar Verdict</span>
                  
                  {result.decision === 'APPROVED' ? (
                    <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-brand-success/15 border border-brand-success/20 text-brand-success rounded-full text-xs font-bold uppercase animate-pulse-glow">
                      <ShieldCheck className="h-4 w-4" />
                      <span>APPROVED</span>
                    </div>
                  ) : result.decision === 'FLAGGED' ? (
                    <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-brand-warning/15 border border-brand-warning/20 text-brand-warning rounded-full text-xs font-bold uppercase animate-pulse-glow">
                      <AlertTriangle className="h-4 w-4" />
                      <span>FLAGGED (REVIEW)</span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-brand-danger/15 border border-brand-danger/20 text-brand-danger rounded-full text-xs font-bold uppercase animate-pulse-glow">
                      <X className="h-4 w-4" />
                      <span>AUTO BLOCKED</span>
                    </div>
                  )}

                  <h3 className={`text-4xl font-black ${result.riskScore >= 75 ? 'text-brand-danger' : result.riskScore >= 45 ? 'text-brand-warning' : 'text-brand-success'}`}>
                    {result.riskScore}%
                  </h3>
                  <span className="text-[10px] text-dark-muted block">FRAUD PROBABILITY</span>
                </div>

                {/* Rules triggered */}
                {result.ruleTriggered && (
                  <div className="bg-brand-danger/10 border border-brand-danger/20 text-brand-danger p-3 rounded-xl text-xs space-y-1">
                    <span className="font-bold flex items-center">
                      <AlertTriangle className="h-4 w-4 mr-1.5" />
                      Hard Rule Triggered
                    </span>
                    <p className="text-[10.5px] opacity-90">
                      Rule Name: <span className="font-bold">"{result.ruleTriggered.name}"</span> forced action override: <span className="font-bold">{result.ruleTriggered.action}</span>
                    </p>
                  </div>
                )}

                {/* Explainable AI */}
                <div className="space-y-3">
                  <span className="text-[10px] font-bold text-dark-muted tracking-widest uppercase block">{t('featureImportance')}</span>
                  <div className="space-y-2.5">
                    {result.explanation && result.explanation.slice(0, 3).map((exp) => (
                      <div key={exp.feature} className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-dark-text capitalize truncate pr-2">{exp.feature.replace(/_/g, ' ')}</span>
                          <span className="text-indigo-400 font-bold shrink-0">{exp.percentage}%</span>
                        </div>
                        <div className="h-1 bg-dark-border rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-indigo-500 rounded-full" 
                            style={{ width: `${exp.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Card metadata validation details */}
                {result.validation && (
                  <div className="bg-dark-bg/60 border border-dark-border p-3 rounded-xl text-[10.5px] text-dark-muted font-mono leading-relaxed space-y-1">
                    <p>🏦 ISSUER: {result.validation.issuer}</p>
                    <p>🌍 COUNTRY: {result.validation.country}</p>
                    <p>💳 TYPE: {result.validation.type || 'Credit'}</p>
                  </div>
                )}

                {/* Bot status */}
                <div className="bg-dark-card border border-dark-border p-3 rounded-xl text-[10.5px] text-dark-muted font-mono leading-relaxed mt-2.5">
                  <p>⚙️ MODEL: {result.model_info?.type || formData.modelType}</p>
                  {result.decision !== 'APPROVED' && (
                    <p className="text-indigo-400 mt-1">📬 Telegram Operator alert fired successfully.</p>
                  )}
                </div>

              </div>
            )}

          </div>

        </div>

      </div>

    </div>
  );
};

// Helper component to render beautiful bank logo text
const LandmarkLogo = ({ brand }) => {
  return (
    <div className="flex items-center space-x-1.5 text-white/90">
      <span className="font-extrabold text-xs tracking-wider font-mono">
        {brand === 'Visa' ? '👑 CHASE PREMIER' : 
         brand === 'Mastercard' ? '🔥 BARCLAYS ELITE' : 
         brand === 'American Express' ? '🏅 PLATINUM MEMBER' : 
         brand === 'RuPay' ? '🌟 SBI PRESTIGE' : 'GLOBAL PLATINUM'}
      </span>
    </div>
  );
};

export default Simulator;
