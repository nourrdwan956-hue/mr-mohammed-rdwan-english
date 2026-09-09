'use client';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const DeviceContext = createContext();

export function DeviceProvider({ children }) {
  const [actualMode, setActualMode] = useState('desktop'); // الوضع الحقيقي
  const [overrideMode, setOverrideMode] = useState(null);   // وضع يدوي (null = تلقائي)
  
  const detect = useCallback(() => {
    const w = window.innerWidth;
    if (w < 640) return 'mobile';
    if (w < 1024) return 'tablet';
    return 'desktop';
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('deviceOverride');
    if (saved && ['desktop', 'tablet', 'mobile'].includes(saved)) {
      setOverrideMode(saved);
    }
    const handleResize = () => setActualMode(detect());
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [detect]);

  const deviceMode = overrideMode || actualMode;

  const changeDeviceMode = useCallback((mode) => {
    if (mode === 'auto') {
      setOverrideMode(null);
      localStorage.removeItem('deviceOverride');
    } else if (['desktop', 'tablet', 'mobile'].includes(mode)) {
      setOverrideMode(mode);
      localStorage.setItem('deviceOverride', mode);
    }
  }, []);

  return (
    <DeviceContext.Provider value={{ deviceMode, actualMode, overrideMode, changeDeviceMode }}>
      {children}
    </DeviceContext.Provider>
  );
}

export function useDeviceMode() {
  const context = useContext(DeviceContext);
  if (!context) throw new Error('استخدم DeviceProvider');
  return context;
}