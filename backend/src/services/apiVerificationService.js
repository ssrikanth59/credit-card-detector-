const axios = require('axios');

// Detailed local BIN database for offline/fallback lookups
const LOCAL_BIN_DATABASE = {
  // Chase Bank (US)
  '411122': { issuer: 'JPMorgan Chase Bank', brand: 'Visa', type: 'Credit', country: 'United States (US)' },
  '400000': { issuer: 'JPMorgan Chase Bank', brand: 'Visa', type: 'Debit', country: 'United States (US)' },
  
  // Bank of America (US)
  '453265': { issuer: 'Bank of America', brand: 'Visa', type: 'Credit', country: 'United States (US)' },
  '485265': { issuer: 'Bank of America', brand: 'Visa', type: 'Debit', country: 'United States (US)' },

  // Wells Fargo (US)
  '424242': { issuer: 'Wells Fargo Bank', brand: 'Visa', type: 'Debit', country: 'United States (US)' },

  // Barclays (UK)
  '541288': { issuer: 'Barclays Bank', brand: 'Mastercard', type: 'Debit', country: 'United Kingdom (GB)' },
  '465901': { issuer: 'Barclays Bank', brand: 'Visa', type: 'Credit', country: 'United Kingdom (GB)' },

  // Citibank (US)
  '510510': { issuer: 'Citibank', brand: 'Mastercard', type: 'Credit', country: 'United States (US)' },
  '542418': { issuer: 'Citibank', brand: 'Mastercard', type: 'Debit', country: 'United States (US)' },

  // American Express (US)
  '378200': { issuer: 'American Express', brand: 'American Express', type: 'Credit', country: 'United States (US)' },
  '340000': { issuer: 'American Express', brand: 'American Express', type: 'Credit', country: 'United States (US)' },

  // SBI (India)
  '508500': { issuer: 'State Bank of India (SBI)', brand: 'RuPay', type: 'Debit', country: 'India (IN)' },
  '508551': { issuer: 'State Bank of India (SBI)', brand: 'RuPay', type: 'Debit', country: 'India (IN)' },
  
  // HDFC (India)
  '607152': { issuer: 'HDFC Bank', brand: 'RuPay', type: 'Credit', country: 'India (IN)' },
  '405623': { issuer: 'HDFC Bank', brand: 'Visa', type: 'Debit', country: 'India (IN)' },

  // ICICI (India)
  '652150': { issuer: 'ICICI Bank', brand: 'RuPay', type: 'Debit', country: 'India (IN)' },
  '524182': { issuer: 'ICICI Bank', brand: 'Mastercard', type: 'Credit', country: 'India (IN)' }
};

class ApiVerificationService {
  /**
   * Resolves card metadata from the first 6 to 8 digits of a card number
   * @param {string} cardNumber 
   * @returns {Promise<{issuer: string, brand: string, type: string, country: string}>}
   */
  static async verifyBIN(cardNumber) {
    const cleanNumber = cardNumber.replace(/\D/g, '');
    if (cleanNumber.length < 6) {
      return { issuer: 'Unknown', brand: 'Unknown', type: 'Unknown', country: 'Unknown' };
    }

    const bin6 = cleanNumber.substring(0, 6);
    const bin8 = cleanNumber.substring(0, 8);

    // 1. Check local BIN database first (for speed and offline reliability)
    let meta = LOCAL_BIN_DATABASE[bin8] || LOCAL_BIN_DATABASE[bin6];
    if (meta) {
      return { ...meta };
    }

    // 2. Perform external API call (e.g. binlist.net or other free BIN checker)
    // We wrap it in a strict timeout to ensure page loads are not delayed
    try {
      const response = await axios.get(`https://lookup.binlist.net/${bin6}`, {
        headers: { 'Accept-Version': '3' },
        timeout: 2500 // 2.5 seconds timeout
      });

      if (response.data) {
        const data = response.data;
        const brand = data.scheme ? data.scheme.charAt(0).toUpperCase() + data.scheme.slice(1) : 'Unknown';
        const type = data.type ? data.type.charAt(0).toUpperCase() + data.type.slice(1) : 'Unknown';
        const issuer = data.bank && data.bank.name ? data.bank.name : 'Unknown';
        const country = data.country && data.country.name ? `${data.country.name} (${data.country.alpha2 || ''})` : 'Unknown';
        
        return { issuer, brand, type, country };
      }
    } catch (err) {
      // In case of rate-limiting, downtime, or network timeout, fall back to basic regex detection
      console.log(`Real-Time BIN API lookup failed: ${err.message}. Falling back to pattern rules.`);
    }

    // 3. Fallback brand detection
    const cardValidator = require('../utils/cardValidator');
    const brand = cardValidator.detectBrand(cleanNumber);
    
    // Guess country based on card brand default or placeholder
    let country = 'Unknown';
    let type = 'Credit'; // default guess
    if (brand === 'RuPay') {
      country = 'India (IN)';
      type = 'Debit';
    } else if (brand === 'American Express') {
      country = 'United States (US)';
    }

    return {
      issuer: brand !== 'Unknown' ? `${brand} Co-Branded Bank` : 'Unknown Bank',
      brand,
      type,
      country
    };
  }
}

module.exports = ApiVerificationService;
