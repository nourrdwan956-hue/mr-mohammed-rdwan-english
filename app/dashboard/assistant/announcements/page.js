'use client';

import { AssistantLayout } from '@/components/AssistantLayout';
import { useTheme } from '@/lib/hooks/useTheme';
import * as Icons from 'lucide-react';

export default function AssistantAnnouncementsPage() {
  const { styles } = useTheme();

  return (
    <AssistantLayout>
      <div className={`${styles.bg} ${styles.text} p-6`}>
        <div className="max-w-4xl mx-auto text-center py-20">
          <Icons.Megaphone className={`h-20 w-20 mx-auto mb-4 ${styles.subtext}`} />
          <h1 className={`text-3xl font-bold ${styles.text}`}>📢 الإعلانات</h1>
          <p className={`${styles.subtext} text-lg mt-2`}>هذه الصفحة قيد التطوير</p>
          <p className={`${styles.subtext} text-sm mt-4`}>سيتمكن المساعد من إدارة الإعلانات هنا قريباً</p>
        </div>
      </div>
    </AssistantLayout>
  );
}