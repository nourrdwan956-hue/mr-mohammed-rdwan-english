/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    // ✅ شاشات مخصصة لتحسين التجاوب على الأجهزة الصغيرة
    screens: {
      'xs': '320px',   // هواتف صغيرة جداً
      'sm': '480px',   // هواتف متوسطة
      'md': '768px',   // تابلت صغير / هاتف كبير أفقي
      'lg': '1024px',  // تابلت كبير / لابتوب صغير
      'xl': '1280px',  // لابتوب / ديسكتوب
      '2xl': '1536px', // شاشات كبيرة
    },
    extend: {
      fontFamily: {
        cairo: ['Cairo', 'sans-serif'],
      },
      // ✅ أحجام خطوط متجاوبة تلقائياً (باستخدام قيم أصغر على الموبايل)
      // يمكنك لاحقاً تحويلها إلى قيم `clamp()` لجعلها متجاوبة بشكل ديناميكي،
      // لكن هنا نعتمد على القيم المطلوبة.
      fontSize: {
        'xs':   ['0.625rem', { lineHeight: '0.875rem' }],           // 10px
        'sm':   ['0.75rem',  { lineHeight: '1rem' }],               // 12px
        'base': ['0.875rem', { lineHeight: '1.25rem' }],            // 14px
        'lg':   ['1rem',     { lineHeight: '1.5rem' }],             // 16px
        'xl':   ['1.125rem', { lineHeight: '1.625rem' }],           // 18px
        '2xl':  ['1.25rem',  { lineHeight: '1.75rem' }],            // 20px
        '3xl':  ['1.5rem',   { lineHeight: '2rem' }],               // 24px
        '4xl':  ['1.875rem', { lineHeight: '2.25rem' }],            // 30px
        '5xl':  ['2.25rem',  { lineHeight: '2.5rem' }],             // 36px
        '6xl':  ['2.75rem',  { lineHeight: '3rem' }],               // 44px
        '7xl':  ['3.25rem',  { lineHeight: '3.5rem' }],             // 52px
      },
      // ✅ يمكن إضافة تباعد responsive إذا احتجنا لاحقاً
      spacing: {
        // يمكن تخصيص قيم مثل 18px إلخ، لكن نعتمد حالياً على القيم الافتراضية
      },
    },
  },
  plugins: [],
};