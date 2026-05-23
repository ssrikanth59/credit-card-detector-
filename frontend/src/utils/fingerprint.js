// Simple hash generator for device parameters
const cyrb53 = (str, seed = 0) => {
  let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
  for (let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334903);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0');
};

export const getDeviceFingerprint = () => {
  const userAgent = navigator.userAgent;
  const language = navigator.language || navigator.userLanguage || 'en-US';
  const screenResolution = `${window.screen.width}x${window.screen.height}`;
  
  // Parse simple Browser & OS
  let browser = 'Unknown Browser';
  let os = 'Unknown OS';
  
  if (userAgent.indexOf('Firefox') > -1) browser = 'Firefox';
  else if (userAgent.indexOf('Chrome') > -1) browser = 'Chrome';
  else if (userAgent.indexOf('Safari') > -1) browser = 'Safari';
  else if (userAgent.indexOf('MSIE') > -1 || !!document.documentMode) browser = 'IE';

  if (userAgent.indexOf('Windows') > -1) os = 'Windows';
  else if (userAgent.indexOf('Macintosh') > -1) os = 'macOS';
  else if (userAgent.indexOf('Linux') > -1) os = 'Linux';
  else if (userAgent.indexOf('Android') > -1) os = 'Android';
  else if (userAgent.indexOf('iPhone') > -1 || userAgent.indexOf('iPad') > -1) os = 'iOS';

  // Gather fingerprint traits
  const traits = [
    userAgent,
    language,
    screenResolution,
    new Date().getTimezoneOffset().toString(),
    navigator.hardwareConcurrency || 'unknown',
    navigator.deviceMemory || 'unknown'
  ].join('|');

  const hash = 'dev_' + cyrb53(traits).substring(0, 16);

  return {
    browser,
    os,
    screenResolution,
    language,
    hash
  };
};
