'use client';

import React from 'react';
import { useTheme } from '@/lib/hooks/useTheme';
import { Shield } from 'lucide-react';

export default function AnnouncementsPage() {
  const { styles } = useTheme();

  return (
    <div className={`min-h-screen ${styles.bg} ${styles.text} p-6`}>
      <div className={`rounded-2xl p-8 text-center ${styles.card} border ${styles.border}`}>
        <Shield className="w-16 h-16 mx-auto mb-4 text-yellow-400" />
        <h2 className="text-2xl font-bold mb-2">صفحة الإعلانات</h2>
        <p className={`${styles.subtext}`}>قيد التطوير ... قريباً</p>
      </div>
    </div>
  );
}