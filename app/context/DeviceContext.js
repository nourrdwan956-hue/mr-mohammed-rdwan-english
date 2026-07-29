// app/context/DeviceContext.js
'use client';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const DeviceContext = createContext();

export function DeviceProvider({ children }) {
  const [deviceMode, setDeviceMode] = useState('desktop'); // 'desktop' | 'tablet' | 'mobile'

  // تحميل التفضيل عند بدء التشغيل
  useEffect(() => {
    const saved = localStorage.getItem('preferredDeviceMode');
    if (saved && ['desktop', 'tablet', 'mobile'].includes(saved)) {
      setDeviceMode(saved);
    }
  }, []);

  // حفظ التفضيل عند التغيير
  const changeDeviceMode = useCallback((mode) => {
    if (['desktop', 'tablet', 'mobile'].includes(mode)) {
      setDeviceMode(mode);
      localStorage.setItem('preferredDeviceMode', mode);
    }
  }, []);

  return (
    <DeviceContext.Provider value={{ deviceMode, changeDeviceMode }}>
      {children}
    </DeviceContext.Provider>
  );
}

export function useDeviceMode() {
  const context = useContext(DeviceContext);
  if (!context) {
    throw new Error('useDeviceMode must be used within a DeviceProvider');
  }
  return context;
}