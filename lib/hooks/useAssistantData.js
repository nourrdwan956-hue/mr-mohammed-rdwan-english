// lib/hooks/useAssistantData.js
import { useEffect, useState } from 'react';

export function useAssistantData() {
  const [assistant, setAssistant] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const sessionData = sessionStorage.getItem('assistantData');
        if (!sessionData) {
          throw new Error('لا توجد جلسة');
        }
        const parsed = JSON.parse(sessionData);
        setAssistant(parsed);

        const res = await fetch('/api/assistant-data', {
          headers: { 'x-assistant-id': parsed.id },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setPermissions(data.permissions || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return { assistant, permissions, loading, error };
}