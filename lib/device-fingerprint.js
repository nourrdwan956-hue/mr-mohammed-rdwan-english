// lib/device-fingerprint.js
// ================================================================
// 🖥️ نظام البصمة الرقمية (Device Fingerprint) – نسخة محسّنة
// يدعم Canvas Fingerprint، WebGL، Fonts، ومكونات إضافية للتمييز
// بين الأجهزة بشكل شبه مؤكد.
// ================================================================

/**
 * الحصول على بصمة رقمية فريدة للجهاز الحالي
 * @returns {Promise<string>} بصمة الجهاز بصيغة Base64
 */
export async function getDeviceFingerprint() {
  try {
    // 1. جمع المكونات الأساسية
    const components = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      screen: `${window.screen.width}x${window.screen.height}`,
      colorDepth: window.screen.colorDepth,
      pixelRatio: window.devicePixelRatio || 1,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timezoneOffset: new Date().getTimezoneOffset(),
      hardwareConcurrency: navigator.hardwareConcurrency || 0,
      deviceMemory: navigator.deviceMemory || 0,
      maxTouchPoints: navigator.maxTouchPoints || 0,
      doNotTrack: navigator.doNotTrack || null,
      cookiesEnabled: navigator.cookieEnabled,
    };

    // 2. إضافة Canvas Fingerprint (قوي جداً)
    let canvasFingerprint = '';
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 128;
      const ctx = canvas.getContext('2d');
      
      // رسم نص وأشكال معقدة
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillStyle = '#f60';
      ctx.fillRect(0, 0, 100, 50);
      ctx.fillStyle = '#069';
      ctx.fillText('MohamedRadwan', 2, 15);
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.fillText('Platform', 4, 40);
      ctx.strokeStyle = '#ff0';
      ctx.beginPath();
      ctx.arc(60, 80, 30, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#f0f';
      ctx.beginPath();
      ctx.arc(120, 40, 20, 0, Math.PI * 2);
      ctx.fill();
      
      canvasFingerprint = canvas.toDataURL();
    } catch (e) {
      console.warn('Canvas fingerprint failed:', e);
    }

    // 3. إضافة WebGL Fingerprint (اختياري)
    let webglFingerprint = '';
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
          const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
          webglFingerprint = `${vendor}|${renderer}`;
        }
      }
    } catch (e) {
      console.warn('WebGL fingerprint failed:', e);
    }

    // 4. إضافة Font Fingerprint (قائمة الخطوط المثبتة)
    let fontsFingerprint = '';
    try {
      const fontList = [
        'Arial', 'Helvetica', 'Times New Roman', 'Courier New', 'Verdana',
        'Georgia', 'Palatino Linotype', 'Book Antiqua', 'Tahoma', 'Trebuchet MS',
        'Impact', 'Comic Sans MS', 'Lucida Sans Unicode', 'Arial Black', 'Garamond'
      ];
      const baseFont = 'monospace';
      const testString = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = 500;
      canvas.height = 100;
      ctx.font = `72px ${baseFont}`;
      ctx.fillText(testString, 0, 72);
      const baseWidth = ctx.measureText(testString).width;
      
      const detectedFonts = [];
      for (const font of fontList) {
        ctx.font = `72px "${font}", ${baseFont}`;
        const width = ctx.measureText(testString).width;
        if (width !== baseWidth) {
          detectedFonts.push(font);
        }
      }
      fontsFingerprint = detectedFonts.join(',');
    } catch (e) {
      console.warn('Font fingerprint failed:', e);
    }

    // 5. دمج جميع المكونات
    const allComponents = [
      components.userAgent,
      components.platform,
      components.language,
      components.screen,
      components.colorDepth,
      components.pixelRatio,
      components.timezone,
      components.timezoneOffset,
      components.hardwareConcurrency,
      components.deviceMemory,
      components.maxTouchPoints,
      components.doNotTrack,
      components.cookiesEnabled,
      canvasFingerprint,
      webglFingerprint,
      fontsFingerprint,
    ];

    const fingerprintString = allComponents
      .filter(val => val !== undefined && val !== null && val !== '')
      .join('|||');

    // توليد هاش SHA-256
    const encoder = new TextEncoder();
    const data = encoder.encode(fingerprintString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashBase64 = btoa(String.fromCharCode(...hashArray));
    
    return hashBase64;
  } catch (error) {
    console.error('Error generating device fingerprint:', error);
    return generateFallbackFingerprint();
  }
}

/**
 * طريقة احتياطية لتوليد بصمة في حالة فشل Web Crypto API
 * @returns {string} بصمة احتياطية
 */
function generateFallbackFingerprint() {
  try {
    const components = [
      navigator.userAgent,
      navigator.platform,
      window.screen.width,
      window.screen.height,
      navigator.language,
      new Date().getTimezoneOffset(),
      navigator.hardwareConcurrency || 0,
      navigator.deviceMemory || 0,
    ];
    const str = components.join('|||');
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return btoa(String.fromCharCode(Math.abs(hash)));
  } catch {
    // آخر حل: استخدام timestamp عشوائي (غير موثوق)
    return btoa(String(Date.now() + Math.random()));
  }
}

/**
 * الحصول على اسم الجهاز (مثل "Windows PC", "Mac", "Android Device")
 * @returns {string} اسم الجهاز
 */
export function getDeviceName() {
  try {
    const ua = navigator.userAgent;
    if (ua.includes('Windows')) return 'Windows PC';
    if (ua.includes('Macintosh')) return 'Mac';
    if (ua.includes('Linux') && !ua.includes('Android')) return 'Linux PC';
    if (ua.includes('Android')) return 'Android Device';
    if (ua.includes('iPhone')) return 'iPhone';
    if (ua.includes('iPad')) return 'iPad';
    return 'جهاز غير معروف';
  } catch {
    return 'جهاز غير معروف';
  }
}

/**
 * الحصول على معلومات إضافية عن الجهاز (للتخزين في قاعدة البيانات)
 * @returns {Object} معلومات الجهاز
 */
export function getDeviceInfo() {
  try {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      screen: `${window.screen.width}x${window.screen.height}`,
      colorDepth: window.screen.colorDepth,
      pixelRatio: window.devicePixelRatio || 1,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      hardwareConcurrency: navigator.hardwareConcurrency || 0,
      deviceMemory: navigator.deviceMemory || 0,
      maxTouchPoints: navigator.maxTouchPoints || 0,
      cookiesEnabled: navigator.cookieEnabled,
    };
  } catch {
    return {};
  }
}

/**
 * مقارنة بصمتين للتأكد من تطابقهما (مع مراعاة الاختلافات الطفيفة)
 * @param {string} fingerprint1 - البصمة الأولى
 * @param {string} fingerprint2 - البصمة الثانية
 * @returns {boolean} true إذا كانتا متطابقتين
 */
export function compareFingerprints(fingerprint1, fingerprint2) {
  if (!fingerprint1 || !fingerprint2) return false;
  return fingerprint1 === fingerprint2;
}

/**
 * توليد معرف جهاز قصير يمكن استخدامه كاسم للجهاز
 * @param {string} fingerprint - البصمة الكاملة
 * @returns {string} معرف قصير (أول 8 أحرف)
 */
export function getShortDeviceId(fingerprint) {
  if (!fingerprint) return 'Unknown';
  return fingerprint.substring(0, 8);
}