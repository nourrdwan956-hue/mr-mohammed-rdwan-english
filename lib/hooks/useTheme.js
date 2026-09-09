'use client';

import { createContext, useContext, useState, useLayoutEffect, useCallback, useMemo, useEffect } from 'react';

// ================================================================
// 🎨 تعريف الألوان (وضعان فقط – فاتح وداكن)
// ================================================================
const COLOR_SCHEMES = {
  light: {
    name: 'فاتح', nameEn: 'Light', icon: '☀️',
    bg: '#f0f2f5',
    bgCard: 'rgba(255,255,255,0.92)',
    bgInput: 'rgba(0,0,0,0.04)',
    bgHover: 'rgba(0,0,0,0.04)',
    bgSecondary: '#ffffff',
    text: '#0f172a',
    textSecondary: '#334155',
    textMuted: '#94a3b8',
    border: 'rgba(0,0,0,0.08)',
    gold: '#fbbf24',
    goldDark: '#f59e0b',
    shadow: 'rgba(251,191,36,0.25)',
    shadowSm: '0 1px 2px rgba(0,0,0,0.05)',
    shadowLg: '0 10px 15px rgba(0,0,0,0.1)',
    fontPrimary: "'Cairo', 'Inter', 'Segoe UI', sans-serif",
  },
  dark: {
    name: 'داكن', nameEn: 'Dark', icon: '🌙',
    bg: '#0b0e1a',
    bgCard: 'rgba(30,36,51,0.92)',
    bgInput: 'rgba(255,255,255,0.08)',
    bgHover: 'rgba(255,255,255,0.06)',
    bgSecondary: '#1a1f2e',
    text: '#f1f5f9',
    textSecondary: '#e2e8f0',
    textMuted: '#94a3b8',
    border: 'rgba(255,255,255,0.12)',
    gold: '#fbbf24',
    goldDark: '#f59e0b',
    shadow: 'rgba(251,191,36,0.12)',
    shadowSm: '0 1px 2px rgba(0,0,0,0.3)',
    shadowLg: '0 10px 15px rgba(0,0,0,0.5)',
    fontPrimary: "'Cairo', 'Inter', 'Segoe UI', sans-serif",
  },
};

export const THEME_OPTIONS = [
  { id: 'light', label: 'فاتح', labelEn: 'Light', icon: '☀️' },
  { id: 'dark', label: 'داكن', labelEn: 'Dark', icon: '🌙' },
];

// ================================================================
// 🧩 السياق
// ================================================================
const ThemeContext = createContext(null);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// ================================================================
// 🏗️ المزوّد الرئيسي (ThemeProvider)
// ================================================================
export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('platformTheme') || 'light';
    } catch {
      return 'light';
    }
  });

  const [language, setLanguage] = useState(() => {
    try {
      return localStorage.getItem('platformLanguage') || 'ar';
    } catch {
      return 'ar';
    }
  });

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // ----- تطبيق الثيم على CSS Variables -----
  useLayoutEffect(() => {
    const scheme = COLOR_SCHEMES[theme] || COLOR_SCHEMES.light;
    const root = document.documentElement;

    // ✅ إصلاح المشكلة: استخدام classList بدلاً من className
    // إزالة الكلاسات القديمة أولاً
    root.classList.remove('light', 'dark');
    // إضافة الكلاس الجديد
    root.classList.add(theme);

    // تعيين CSS variables
    document.body.style.transition = 'none';
    root.style.transition = 'none';

    root.style.setProperty('--bg-primary', scheme.bg);
    root.style.setProperty('--bg-secondary', scheme.bgSecondary);
    root.style.setProperty('--bg-card', scheme.bgCard);
    root.style.setProperty('--bg-input', scheme.bgInput);
    root.style.setProperty('--bg-hover', scheme.bgHover);
    root.style.setProperty('--text-primary', scheme.text);
    root.style.setProperty('--text-secondary', scheme.textSecondary);
    root.style.setProperty('--text-muted', scheme.textMuted);
    root.style.setProperty('--border-color', scheme.border);
    root.style.setProperty('--gold-primary', scheme.gold);
    root.style.setProperty('--gold-secondary', scheme.goldDark);
    root.style.setProperty('--shadow-color', scheme.shadow);
    root.style.setProperty('--shadow-sm', scheme.shadowSm);
    root.style.setProperty('--shadow-lg', scheme.shadowLg);
    root.style.setProperty('--font-primary', scheme.fontPrimary);

    document.body.style.backgroundColor = scheme.bg;
    document.body.style.color = scheme.text;

    requestAnimationFrame(() => {
      document.body.style.transition = '';
      root.style.transition = '';
    });

    try {
      localStorage.setItem('platformTheme', theme);
    } catch (e) {}
  }, [theme]);

  // ----- تطبيق اللغة (الاتجاه) -----
  useLayoutEffect(() => {
    try {
      localStorage.setItem('platformLanguage', language);
      document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.lang = language;
    } catch (e) {}
  }, [language]);

  // ----- دوال التبديل -----
  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguage(prev => prev === 'ar' ? 'en' : 'ar');
  }, []);

  // ----- كائن styles الجاهز للاستخدام المباشر مع Tailwind -----
  const styles = useMemo(() => ({
    bg: 'bg-[var(--bg-primary)]',
    bgSecondary: 'bg-[var(--bg-secondary)]',
    text: 'text-[var(--text-primary)]',
    subtext: 'text-[var(--text-secondary)]',
    muted: 'text-[var(--text-muted)]',
    card: 'bg-[var(--bg-card)] backdrop-blur-sm border border-[var(--border-color)]',
    input: 'bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-muted)]',
    label: 'text-[var(--text-secondary)]',
    hover: 'hover:border-[var(--gold-primary)]/50',
    shadow: 'shadow-[var(--shadow-color)]',
    shadowSm: 'shadow-[var(--shadow-sm)]',
    shadowLg: 'shadow-[var(--shadow-lg)]',
    border: 'border-[var(--border-color)]',
    gold: 'text-[var(--gold-primary)]',
    goldBg: 'bg-[var(--gold-primary)]',
    goldBgHover: 'hover:bg-[var(--gold-secondary)]',
    button: 'bg-[var(--gold-primary)] hover:bg-[var(--gold-secondary)] text-black font-bold transition',
    buttonOutline: 'border border-[var(--border-color)] hover:border-[var(--gold-primary)]/50 transition',
    cardHover: 'hover:border-[var(--gold-primary)]/30 transition-all duration-300',
    font: 'font-[var(--font-primary)]',
  }), []);

  const value = useMemo(() => ({
    theme,
    setTheme,
    toggleTheme,
    language,
    setLanguage,
    toggleLanguage,
    currentTheme: THEME_OPTIONS.find(t => t.id === theme) || THEME_OPTIONS[0],
    themeOptions: THEME_OPTIONS,
    styles,
    isDark: theme === 'dark',
    isLight: theme === 'light',
    isRTL: language === 'ar',
    cssVars: COLOR_SCHEMES[theme] || COLOR_SCHEMES.light,
    mounted,
  }), [theme, language, toggleTheme, toggleLanguage, styles, mounted]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export default useTheme;