

// lib/device-fingerprint.js
// ================================================================
// 🖥️ نظام البصمة الرقمية (Device Fingerprint)
// يقوم بإنشاء معرف فريد للجهاز باستخدام مكونات متعددة
// ومشفرة بـ SHA-256 لضمان عدم التلاعب بها.
// ================================================================

/**
 * الحصول على بصمة رقمية فريدة للجهاز الحالي
 * @returns {Promise<string>} بصمة الجهاز بصيغة Base64
 */
export async function getDeviceFingerprint() {
  try {
    // جمع مكونات الجهاز المختلفة لإنشاء بصمة فريدة
    const components = {
      // معلومات المتصفح والنظام
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      
      // معلومات الشاشة
      screen: `${window.screen.width}x${window.screen.height}`,
      colorDepth: window.screen.colorDepth,
      pixelRatio: window.devicePixelRatio || 1,
      
      // معلومات الوقت والمنطقة
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timezoneOffset: new Date().getTimezoneOffset(),
      
      // معلومات العتاد (Hardware)
      hardwareConcurrency: navigator.hardwareConcurrency || 0,
      deviceMemory: navigator.deviceMemory || 0,
      
      // معلومات إضافية (اختيارية)
      doNotTrack: navigator.doNotTrack || null,
      cookiesEnabled: navigator.cookieEnabled,
    };

    // تحويل المكونات إلى سلسلة نصية موحدة للهاش
    const fingerprintString = Object.values(components)
      .filter(val => val !== undefined && val !== null)
      .join('|||');

    // توليد هاش SHA-256 من السلسلة
    const encoder = new TextEncoder();
    const data = encoder.encode(fingerprintString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    
    // تحويل الهاش إلى Base64 لسهولة التخزين والمقارنة
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashBase64 = btoa(String.fromCharCode(...hashArray));
    
    return hashBase64;
  } catch (error) {
    console.error('Error generating device fingerprint:', error);
    // في حالة الفشل، نستخدم طريقة احتياطية (أقل أماناً)
    return generateFallbackFingerprint();
  }
}

/**
 * طريقة احتياطية لتوليد بصمة في حالة فشل Web Crypto API
 * @returns {string} بصمة احتياطية
 */
function generateFallbackFingerprint() {
  const components = [
    navigator.userAgent,
    navigator.platform,
    window.screen.width,
    window.screen.height,
    navigator.language,
    new Date().getTimezoneOffset(),
  ];
  // استخدام طريقة بسيطة لهاش (أقل أماناً ولكنها تعمل في جميع البيئات)
  const str = components.join('|||');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // تحويل إلى 32-bit integer
  }
  return btoa(String.fromCharCode(Math.abs(hash)));
}

/**
 * الحصول على اسم الجهاز (مثل "Windows PC", "Mac", "Android Device")
 * @returns {string} اسم الجهاز
 */
export function getDeviceName() {
  const ua = navigator.userAgent;
  if (ua.includes('Windows')) return 'Windows PC';
  if (ua.includes('Mac')) return 'Mac';
  if (ua.includes('Linux')) return 'Linux';
  if (ua.includes('Android')) return 'Android Device';
  if (ua.includes('iPhone') || ua.includes('iPad')) return 'Apple Device';
  return 'Unknown Device';
}

/**
 * الحصول على معلومات إضافية عن الجهاز (للتخزين في قاعدة البيانات)
 * @returns {Object} معلومات الجهاز
 */
export function getDeviceInfo() {
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
    cookiesEnabled: navigator.cookieEnabled,
  };
}

/**
 * مقارنة بصمتين للتأكد من تطابقهما (مع مراعاة الاختلافات الطفيفة)
 * @param {string} fingerprint1 - البصمة الأولى
 * @param {string} fingerprint2 - البصمة الثانية
 * @returns {boolean} true إذا كانتا متطابقتين
 */
export function compareFingerprints(fingerprint1, fingerprint2) {
  if (!fingerprint1 || !fingerprint2) return false;
  // مقارنة مباشرة (نظراً لأننا نستخدم SHA-256 فالتطابق يجب أن يكون تاماً)
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