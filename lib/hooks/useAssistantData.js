// lib/hooks/useAssistantData.js
import { useEffect, useState, useCallback } from 'react';

export function useAssistantData() {
  const [assistant, setAssistant] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ===== دالة جلب البيانات (تُستخدم في useEffect وأيضاً للتحديث اليدوي) =====
  const fetchData = useCallback(async () => {
    try {
      // 1. جلب بيانات المساعد من sessionStorage (تبقى كما هي)
      const sessionData = sessionStorage.getItem('assistantData');
      if (!sessionData) {
        throw new Error('لا توجد جلسة');
      }
      const parsed = JSON.parse(sessionData);
      setAssistant(parsed);

      // 2. جلب الصلاحيات من الخادم (دائماً جديدة)
      const res = await fetch('/api/assistant-data', {
        headers: { 'x-assistant-id': parsed.id },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل جلب الصلاحيات');

      const newPermissions = data.permissions || [];
      setPermissions(newPermissions);

      // 3. ✅ تحديث sessionStorage بالصلاحيات الجديدة
      sessionStorage.setItem('assistantPermissions', JSON.stringify(newPermissions));

      setError(null);
      return newPermissions;
    } catch (err) {
      setError(err.message);
      // في حالة الخطأ، نحاول جلب الصلاحيات من sessionStorage كاحتياط
      const cached = sessionStorage.getItem('assistantPermissions');
      if (cached) {
        try {
          const cachedPermissions = JSON.parse(cached);
          setPermissions(cachedPermissions);
        } catch (e) {
          setPermissions([]);
        }
      } else {
        setPermissions([]);
      }
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // ===== تنفيذ الجلب عند تحميل الهوك =====
  useEffect(() => {
    fetchData().catch(() => {});
  }, [fetchData]);

  // ===== دالة لتحديث الصلاحيات يدوياً (يمكن استدعاؤها من أي صفحة) =====
  const refreshPermissions = useCallback(async () => {
    setLoading(true);
    try {
      const newPermissions = await fetchData();
      return newPermissions;
    } catch (err) {
      console.error('❌ فشل تحديث الصلاحيات:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchData]);

  return { 
    assistant, 
    permissions, 
    loading, 
    error,
    refreshPermissions,  // ✅ دالة جديدة لتحديث الصلاحيات يدوياً
  };
}