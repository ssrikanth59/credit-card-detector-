/**
 * Card Validation Utility for Fake Credit Card Detector (Frontend)
 */

export function validateLuhn(cardNumber) {
  const cleanNumber = cardNumber.replace(/\D/g, '');
  if (!cleanNumber || cleanNumber.length < 12 || cleanNumber.length > 19) return false;

  let sum = 0;
  let shouldDouble = false;

  for (let i = cleanNumber.length - 1; i >= 0; i--) {
    let digit = parseInt(cleanNumber.charAt(i), 10);

    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
}

export function detectBrand(cardNumber) {
  const cleanNumber = cardNumber.replace(/\D/g, '');
  if (!cleanNumber) return 'Unknown';

  if (/^4/.test(cleanNumber)) {
    return 'Visa';
  }
  if (/^(5[1-5]|222[1-9]|22[3-9]\d|2[3-6]\d\d|27[0-1]\d|2720)/.test(cleanNumber)) {
    return 'Mastercard';
  }
  if (/^3[47]/.test(cleanNumber)) {
    return 'American Express';
  }
  if (/^(508|60|65|81|82)/.test(cleanNumber)) {
    return 'RuPay';
  }

  return 'Unknown';
}

export function validateCVV(cvv, brand = 'Unknown') {
  const cleanCVV = cvv.replace(/\D/g, '');
  if (brand === 'American Express') {
    return cleanCVV.length === 4;
  }
  return cleanCVV.length === 3;
}

export function validateExpiry(expiryDate) {
  if (!expiryDate) return false;
  
  const match = expiryDate.match(/^(0[1-9]|1[0-2])\/([0-9]{2})$/);
  if (!match) return false;

  const month = parseInt(match[1], 10);
  const year = parseInt('20' + match[2], 10);

  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  if (year < currentYear) {
    return false;
  }
  if (year === currentYear && month < currentMonth) {
    return false;
  }

  return true;
}

export function detectFraudPatterns(cardNumber) {
  const cleanNumber = cardNumber.replace(/\D/g, '');
  const warnings = [];

  if (!cleanNumber) return warnings;

  if (/(\d)\1{5,}/.test(cleanNumber)) {
    warnings.push('Suspicious consecutive repeating digits');
  }

  const sequentialUp = '01234567890123456789';
  const sequentialDown = '98765432109876543210';
  for (let i = 0; i <= cleanNumber.length - 8; i++) {
    const sub = cleanNumber.substring(i, i + 8);
    if (sequentialUp.includes(sub) || sequentialDown.includes(sub)) {
      warnings.push('Unrealistic numerical sequence detected');
      break;
    }
  }

  const uniqueDigits = new Set(cleanNumber.split(''));
  if (cleanNumber.length >= 15 && uniqueDigits.size < 4) {
    warnings.push('Low numerical entropy (too few unique digits)');
  }

  const brand = detectBrand(cleanNumber);
  if (brand === 'Unknown' && cleanNumber.length >= 6) {
    warnings.push('Invalid card prefix / unallocated brand range');
  }

  return warnings;
}
