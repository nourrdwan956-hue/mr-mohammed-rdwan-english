'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';

// السياق
const AppDataContext = createContext();

export function AppDataProvider({ children, assistantId }) {
  const [data, setData] = useState({
    assistant: null,
    permissions: [],
    banks: [],
    courses: [],
    loading: true,
    error: null,
  });

  const [lastFetched, setLastFetched] = useState(null);

  // جلب جميع البيانات دفعة واحدة
  const fetchAllData = useCallback(async () => {
    if (!assistantId) return;

    try {
      const response = await fetch(`/api/assistant/app-data?assistantId=${assistantId}`);
      if (!response.ok) throw new Error('Failed to fetch data');
      const result = await response.json();

      setData({
        assistant: result.assistant,
        permissions: result.permissions || [],
        banks: result.banks || [],
        courses: result.courses || [],
        loading: false,
        error: null,
      });
      setLastFetched(Date.now());
    } catch (error) {
      console.error('Error fetching app data:', error);
      setData(prev => ({ ...prev, loading: false, error: error.message }));
    }
  }, [assistantId]);

  // جلب أولي عند تحميل المكون
  useEffect(() => {
    if (assistantId && !data.assistant) {
      fetchAllData();
    }
  }, [assistantId, data.assistant, fetchAllData]);

  // تحديث تلقائي كل 5 دقائق
  useEffect(() => {
    const interval = setInterval(() => {
      if (assistantId) fetchAllData();
    }, 300000); // 5 دقائق

    return () => clearInterval(interval);
  }, [assistantId, fetchAllData]);

  // دالة لتحديث جزء معين من البيانات (مثل بعد إضافة سؤال)
  const mutate = useCallback(async (key) => {
    if (key === 'banks' || key === 'questions') {
      await fetchAllData(); // إعادة جلب كل شيء لتحديثه
    } else {
      await fetchAllData();
    }
  }, [fetchAllData]);

  return (
    <AppDataContext.Provider value={{ ...data, mutate, refetch: fetchAllData }}>
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (!context) throw new Error('useAppData must be used within AppDataProvider');
  return context;
}