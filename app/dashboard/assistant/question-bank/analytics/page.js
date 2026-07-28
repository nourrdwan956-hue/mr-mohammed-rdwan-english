'use client';

// ============================================================
// تحليلات بنك الأسئلة – نسخة المساعد
// ============================================================
import { AssistantLayout } from '@/components/AssistantLayout';
import { motion } from 'framer-motion';
import { useState, useEffect, useMemo, useCallback } from 'react';
import * as Icons from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useTheme } from '@/lib/hooks/useTheme';
import { hasPermission } from '@/lib/permissions';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler,
} from 'chart.js';
import { Bar, Doughnut, Line, Pie } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler
);

// ============================================================
// الترجمات (نفس ترجمات المعلم)
// ============================================================
const translations = {
  ar: {
    title: '📊 تحليلات بنك الأسئلة',
    subtitle: 'إحصائيات متقدمة عن البنوك والأسئلة',
    totalBanks: 'إجمالي البنوك',
    totalQuestions: 'إجمالي الأسئلة',
    totalTags: 'إجمالي الوسوم',
    avgQuestionsPerBank: 'متوسط الأسئلة لكل بنك',
    mostUsedTag: 'الوسم الأكثر استخداماً',
    questionsByType: 'توزيع الأسئلة حسب النوع',
    questionsByDifficulty: 'توزيع الأسئلة حسب الصعوبة',
    questionsByBank: 'توزيع الأسئلة حسب البنك',
    tagsDistribution: 'توزيع الوسوم',
    topQuestions: 'الأسئلة الأكثر استخداماً في الامتحانات',
    noData: 'لا توجد بيانات كافية',
    loading: 'جاري التحميل...',
    fetchFailed: 'فشل جلب البيانات',
    themeLight: 'فاتح',
    themeDark: 'داكن',
    language: 'اللغة',
    gold: 'ذهبي',
    blue: 'أزرق',
    green: 'أخضر',
    purple: 'بنفسجي',
    typeMCQ: 'اختيار من متعدد',
    typeTrueFalse: 'صح/خطأ',
    typeShort: 'إجابة قصيرة',
    typeEssay: 'مقالي',
    typeMatching: 'مطابقة',
    difficultyEasy: 'سهل',
    difficultyMedium: 'متوسط',
    difficultyHard: 'صعب',
    difficultyExpert: 'خبير',
    questionCount: 'سؤال',
    questionsPlural: 'أسئلة',
    banks: 'بنوك',
    mostUsed: 'الأكثر استخداماً',
    leastUsed: 'الأقل استخداماً',
    noQuestionsInExams: 'لا توجد أسئلة مستخدمة في الامتحانات حتى الآن',
    exportReport: 'تصدير التقرير',
    exportSuccess: 'تم تصدير التقرير',
    filterByBank: 'تصفية حسب البنك',
    fromDate: 'من',
    toDate: 'إلى',
    resetFilters: 'إعادة تعيين',
    timeSeries: 'النمو الزمني للأسئلة',
    gradeDistribution: 'توزيع الأسئلة حسب المرحلة الدراسية',
    usedQuestions: 'الأسئلة المستخدمة',
    usageRatio: 'نسبة الاستخدام',
    avgUsage: 'متوسط الاستخدام',
    exportFormat: 'صيغة التصدير',
    exportCSV: 'CSV',
    exportJSON: 'JSON',
    bankStatus: 'حالة البنوك',
    publishedStatus: 'منشور',
    draftStatus: 'مسودة',
    archivedStatus: 'مؤرشف',
    insights: 'توصيات ذكية',
    publishedBanks: 'البنوك المنشورة',
    noPermission: 'ليس لديك صلاحية لعرض تحليلات بنك الأسئلة',
  },
  en: {
    title: '📊 Question Bank Analytics',
    subtitle: 'Advanced statistics for banks and questions',
    totalBanks: 'Total Banks',
    totalQuestions: 'Total Questions',
    totalTags: 'Total Tags',
    avgQuestionsPerBank: 'Avg Questions per Bank',
    mostUsedTag: 'Most Used Tag',
    questionsByType: 'Questions by Type',
    questionsByDifficulty: 'Questions by Difficulty',
    questionsByBank: 'Questions by Bank',
    tagsDistribution: 'Tags Distribution',
    topQuestions: 'Most Used Questions in Exams',
    noData: 'Insufficient data',
    loading: 'Loading...',
    fetchFailed: 'Failed to fetch data',
    themeLight: 'Light',
    themeDark: 'Dark',
    language: 'Language',
    gold: 'Gold',
    blue: 'Blue',
    green: 'Green',
    purple: 'Purple',
    typeMCQ: 'Multiple Choice',
    typeTrueFalse: 'True/False',
    typeShort: 'Short Answer',
    typeEssay: 'Essay',
    typeMatching: 'Matching',
    difficultyEasy: 'Easy',
    difficultyMedium: 'Medium',
    difficultyHard: 'Hard',
    difficultyExpert: 'Expert',
    questionCount: 'Question',
    questionsPlural: 'Questions',
    banks: 'Banks',
    mostUsed: 'Most Used',
    leastUsed: 'Least Used',
    noQuestionsInExams: 'No questions used in exams yet',
    exportReport: 'Export Report',
    exportSuccess: 'Report exported',
    filterByBank: 'Filter by Bank',
    fromDate: 'From',
    toDate: 'To',
    resetFilters: 'Reset Filters',
    timeSeries: 'Questions Growth Over Time',
    gradeDistribution: 'Questions by Grade Level',
    usedQuestions: 'Used Questions',
    usageRatio: 'Usage Ratio',
    avgUsage: 'Average Usage',
    exportFormat: 'Export Format',
    exportCSV: 'CSV',
    exportJSON: 'JSON',
    bankStatus: 'Bank Status',
    publishedStatus: 'Published',
    draftStatus: 'Draft',
    archivedStatus: 'Archived',
    insights: 'Smart Insights',
    publishedBanks: 'Published Banks',
    noPermission: 'You do not have permission to view question bank analytics',
  },
};

// ============================================================
// مكون بطاقة إحصائية
// ============================================================
const StatCard = ({ label, value, icon: Icon, color, subtitle }) => {
  const colorMap = {
    blue: { bg: 'rgba(59,130,246,0.15)', text: '#3b82f6' },
    green: { bg: 'rgba(34,197,94,0.15)', text: '#22c55e' },
    yellow: { bg: 'rgba(251,191,36,0.15)', text: '#fbbf24' },
    purple: { bg: 'rgba(168,85,247,0.15)', text: '#a855f7' },
    orange: { bg: 'rgba(251,146,60,0.15)', text: '#f97316' },
    pink: { bg: 'rgba(236,72,153,0.15)', text: '#ec4899' },
    teal: { bg: 'rgba(20,184,166,0.15)', text: '#14b8a6' },
    indigo: { bg: 'rgba(99,102,241,0.15)', text: '#6366f1' },
  };
  const colors = colorMap[color] || colorMap.blue;
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, scale: 1.02 }}
      style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        padding: '20px 18px',
        transition: 'all 0.25s ease',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{ padding: '10px', borderRadius: '12px', backgroundColor: colors.bg, color: colors.text }}>
          <Icon style={{ height: 24, width: 24 }} />
        </div>
        <div>
          <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-muted)', margin: 0 }}>{label}</p>
          <p style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{value}</p>
          {subtitle && <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>{subtitle}</p>}
        </div>
      </div>
    </motion.div>
  );
};

// ============================================================
// الصفحة الرئيسية
// ============================================================
export default function AssistantAnalyticsPage() {
  const { theme, toggleTheme, language, toggleLanguage, styles } = useTheme();
  const t = translations[language];

  const [assistantId, setAssistantId] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [hasViewPermission, setHasViewPermission] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [topQuestions, setTopQuestions] = useState([]);
  const [banksList, setBanksList] = useState([]);

  // فلترة
  const [selectedBankId, setSelectedBankId] = useState('all');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });

  // مودال التصدير
  const [exportFormat, setExportFormat] = useState('csv');
  const [showExportModal, setShowExportModal] = useState(false);

  // جلب بيانات المساعد والصلاحيات
  useEffect(() => {
    const fetchAssistantData = () => {
      try {
        const sessionData = sessionStorage.getItem('assistantData');
        if (!sessionData) {
          router.replace('/assistant-login');
          return;
        }
        const parsed = JSON.parse(sessionData);
        setAssistantId(parsed.id);
        const perms = JSON.parse(sessionStorage.getItem('assistantPermissions') || '[]');
        setPermissions(perms);
        const canView = hasPermission(perms, 'question_bank', 'can_view');
        setHasViewPermission(canView);
        if (!canView) {
          toast.error(t.noPermission);
          setTimeout(() => router.push('/dashboard/assistant'), 2000);
        }
        setLoadingAuth(false);
      } catch (err) {
        console.error('Error fetching assistant data:', err);
        router.replace('/assistant-login');
      }
    };
    fetchAssistantData();
  }, [router, t]);

  // جلب البيانات من API
  const fetchData = useCallback(async () => {
    if (!assistantId || !hasViewPermission) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedBankId !== 'all') params.append('bankId', selectedBankId);
      if (dateRange.from) params.append('from', dateRange.from);
      if (dateRange.to) params.append('to', dateRange.to);

      const response = await fetch(`/api/assistant/question-bank/analytics?${params.toString()}`, {
        headers: { 'x-assistant-id': assistantId },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || t.fetchFailed);

      setStats(data.stats);
      setChartData(data.chartData);
      setTopQuestions(data.topQuestions || []);
      setBanksList(data.banksList || []);
    } catch (err) {
      console.error(err);
      toast.error(err.message || t.fetchFailed);
    } finally {
      setLoading(false);
    }
  }, [assistantId, hasViewPermission, selectedBankId, dateRange, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // توليد التوصيات الذكية (في الصفحة)
  const insights = useMemo(() => {
    if (!stats) return [];
    const insightsList = [];
    if (stats.totalQuestions > 0) {
      const typeEntries = Object.entries(stats.typeCount || {});
      if (typeEntries.length > 0) {
        const mostUsedType = typeEntries.sort((a, b) => b[1] - a[1])[0]?.[0];
        const leastUsedType = typeEntries.sort((a, b) => a[1] - b[1])[0]?.[0];
        if (mostUsedType) insightsList.push(`النوع الأكثر استخداماً هو "${mostUsedType}"`);
        if (leastUsedType && stats.typeCount[leastUsedType] < 5) insightsList.push(`يوجد عدد قليل من الأسئلة من نوع "${leastUsedType}"، يمكنك إضافة المزيد`);
      }
      if (stats.usageRatio < 30) insightsList.push('نسبة استخدام الأسئلة في الامتحانات منخفضة، حاول إنشاء امتحانات أكثر لزيادة الاستفادة');
      if (stats.totalBanks > 1 && stats.avgQuestions < 10) insightsList.push('بعض البنوك تحتوي على عدد قليل من الأسئلة، حاول تنويع المحتوى');
    }
    return insightsList;
  }, [stats]);

  // تجهيز بيانات الرسوم البيانية بصيغة Chart.js
  const charts = useMemo(() => {
    if (!chartData) return {};
    const typeLabels = chartData.type.labels.map(key => {
      const map = { mcq: t.typeMCQ, truefalse: t.typeTrueFalse, short: t.typeShort, essay: t.typeEssay, matching: t.typeMatching };
      return map[key] || key;
    });
    const diffLabels = chartData.difficulty.labels.map(key => {
      const map = { easy: t.difficultyEasy, medium: t.difficultyMedium, hard: t.difficultyHard, expert: t.difficultyExpert };
      return map[key] || key;
    });
    const gradeLabels = chartData.grade.labels.map(key => {
      const map = { prep1: 'أولى إعدادي', prep2: 'ثانية إعدادي', prep3: 'ثالثة إعدادي', sec1: 'أولى ثانوي', sec2: 'ثانية ثانوي', sec3: 'ثالثة ثانوي' };
      return map[key] || key;
    });

    return {
      type: {
        labels: typeLabels,
        datasets: [{ data: chartData.type.data, backgroundColor: ['#fbbf24', '#3b82f6', '#22c55e', '#a855f7', '#ec4899'], borderWidth: 2 }],
      },
      difficulty: {
        labels: diffLabels,
        datasets: [{ data: chartData.difficulty.data, backgroundColor: ['#22c55e', '#fbbf24', '#f97316', '#ef4444'], borderWidth: 2 }],
      },
      bank: {
        labels: chartData.bank.labels,
        datasets: [{ data: chartData.bank.data, backgroundColor: 'rgba(251,191,36,0.6)', borderColor: '#fbbf24', borderWidth: 2 }],
      },
      tags: {
        labels: chartData.tags.labels,
        datasets: [{ data: chartData.tags.data, backgroundColor: 'rgba(168,85,247,0.6)', borderColor: '#a855f7', borderWidth: 2 }],
      },
      grade: {
        labels: gradeLabels,
        datasets: [{ data: chartData.grade.data, backgroundColor: ['#fbbf24', '#3b82f6', '#22c55e', '#a855f7', '#ec4899', '#f97316'], borderWidth: 2 }],
      },
      timeSeries: {
        labels: chartData.timeSeries.labels,
        datasets: [{
          label: 'الأسئلة المضافة',
          data: chartData.timeSeries.data,
          borderColor: 'var(--primary-color)',
          backgroundColor: 'rgba(251,191,36,0.1)',
          fill: true,
          tension: 0.4,
        }],
      },
    };
  }, [chartData, t]);

  // تصدير التقرير
  const exportReport = (format) => {
    const data = {
      stats,
      topQuestions,
      chartData,
      exportedAt: new Date().toISOString(),
    };
    let content, filename;
    if (format === 'csv') {
      const rows = [['المؤشر', 'القيمة']];
      if (stats) {
        Object.entries(stats).forEach(([key, val]) => {
          if (typeof val !== 'object') rows.push([key, val]);
        });
      }
      content = rows.map(row => row.join(',')).join('\n');
      filename = `analytics_${new Date().toISOString().slice(0,10)}.csv`;
    } else {
      content = JSON.stringify(data, null, 2);
      filename = `analytics_${new Date().toISOString().slice(0,10)}.json`;
    }
    const blob = new Blob([content], { type: format === 'csv' ? 'text/csv' : 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t.exportSuccess);
  };

  // خيارات الرسوم البيانية
  const chartOptions = {
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { boxWidth: 12, padding: 12, font: { size: 11, weight: 'bold' }, color: 'var(--text-muted)' },
      },
    },
    scales: {
      y: { beginAtZero: true, ticks: { font: { size: 10 }, color: 'var(--text-muted)' } },
      x: { ticks: { font: { size: 10 }, color: 'var(--text-muted)' } },
    },
  };

  // حالات التحميل وصلاحية العرض
  if (loadingAuth) {
    return (
      <AssistantLayout>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: 'var(--bg-primary)' }}>
          <div style={{ color: 'var(--text-primary)' }}>جاري التحقق من الصلاحيات...</div>
        </div>
      </AssistantLayout>
    );
  }

  if (!hasViewPermission) {
    return (
      <AssistantLayout>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: 'var(--bg-primary)' }}>
          <div style={{ color: 'var(--text-primary)' }}>{t.noPermission}</div>
        </div>
      </AssistantLayout>
    );
  }

  if (loading) {
    return (
      <AssistantLayout>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', backgroundColor: 'var(--bg-primary)' }}>
          <div style={{ width: 44, height: 44, border: '4px solid rgba(251,191,36,0.2)', borderTopColor: 'var(--primary-color)', borderRadius: '50%', animation: 'spin 0.9s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </AssistantLayout>
    );
  }

  // ===== العرض الرئيسي =====
  return (
    <AssistantLayout>
      <div style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', minHeight: '100vh', transition: 'background-color 0.3s, color 0.3s', paddingBottom: '40px' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '20px' }}>
          {/* الرأس */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '24px' }}>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{t.title}</h1>
              <p style={{ fontSize: '15px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>{t.subtitle}</p>
            </div>
            <button
              onClick={() => setShowExportModal(true)}
              style={{ padding: '10px 20px', backgroundColor: 'rgba(34,197,94,0.12)', color: '#22c55e', borderRadius: '12px', border: '1px solid rgba(34,197,94,0.2)', cursor: 'pointer', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Icons.Download style={{ height: 18, width: 18 }} /> {t.exportReport}
            </button>
          </div>

          {/* فلترة */}
          <div style={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            alignItems: 'center', 
            gap: '16px', 
            padding: '12px 16px', 
            backgroundColor: 'var(--bg-card)', 
            border: '1px solid var(--border-color)', 
            borderRadius: '14px', 
            marginBottom: '24px' 
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Icons.Filter style={{ height: 18, width: 18, color: 'var(--text-muted)' }} />
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{t.filterByBank}:</span>
              <select 
                value={selectedBankId} 
                onChange={(e) => setSelectedBankId(e.target.value)} 
                style={{ padding: '6px 12px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', outline: 'none', fontSize: '13px' }}
              >
                <option value="all">كل البنوك</option>
                {banksList.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{t.fromDate}:</span>
              <input type="date" value={dateRange.from} onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))} style={{ padding: '6px 10px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', outline: 'none', fontSize: '13px' }} />
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{t.toDate}:</span>
              <input type="date" value={dateRange.to} onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))} style={{ padding: '6px 10px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', outline: 'none', fontSize: '13px' }} />
            </div>
            <button 
              onClick={() => { setSelectedBankId('all'); setDateRange({ from: '', to: '' }); }} 
              style={{ padding: '6px 14px', backgroundColor: 'rgba(239,68,68,0.08)', color: '#ef4444', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
            >
              {t.resetFilters}
            </button>
          </div>

          {/* بطاقات الإحصائيات */}
          {stats && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              <StatCard label={t.totalBanks} value={stats.totalBanks} icon={Icons.Folder} color="blue" />
              <StatCard label={t.totalQuestions} value={stats.totalQuestions} icon={Icons.Clipboard} color="green" />
              <StatCard label={t.totalTags} value={stats.totalTags} icon={Icons.Tag} color="orange" />
              <StatCard label={t.avgQuestionsPerBank} value={stats.avgQuestions} icon={Icons.BarChart} color="purple" />
              <StatCard label={t.mostUsedTag} value={stats.mostUsedTag} icon={Icons.Award} color="yellow" />
              <StatCard label={t.publishedBanks} value={stats.publishedBanks} icon={Icons.CheckCircle} color="teal" subtitle={`من ${stats.totalBanks} بنك`} />
              <StatCard label={t.usedQuestions} value={stats.usedQuestions || 0} icon={Icons.CheckCircle2} color="green" />
              <StatCard label={t.usageRatio} value={stats.usageRatio || 0} icon={Icons.Percent} color="purple" subtitle="%" />
              <StatCard label={t.avgUsage} value={stats.avgUsage || 0} icon={Icons.BarChart} color="orange" subtitle="مرة لكل سؤال" />
            </div>
          )}

          {/* حالة البنوك */}
          {stats?.bankStatus && (
            <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '20px', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px', textAlign: 'center' }}>{t.bankStatus}</h3>
              <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: '16px' }}>
                <div><span style={{ color: '#22c55e' }}>●</span> {t.publishedStatus}: <strong>{stats.bankStatus.published || 0}</strong></div>
                <div><span style={{ color: '#fbbf24' }}>●</span> {t.draftStatus}: <strong>{stats.bankStatus.draft || 0}</strong></div>
                <div><span style={{ color: '#9ca3af' }}>●</span> {t.archivedStatus}: <strong>{stats.bankStatus.archived || 0}</strong></div>
              </div>
            </div>
          )}

          {/* الرسوم البيانية */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '24px' }}>
            {charts.type && (
              <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '20px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px', textAlign: 'center' }}>{t.questionsByType}</h3>
                <div style={{ height: 220 }}><Doughnut data={charts.type} options={chartOptions} /></div>
              </div>
            )}
            {charts.difficulty && (
              <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '20px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px', textAlign: 'center' }}>{t.questionsByDifficulty}</h3>
                <div style={{ height: 220 }}><Doughnut data={charts.difficulty} options={chartOptions} /></div>
              </div>
            )}
            {charts.bank && charts.bank.labels.length > 0 && (
              <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '20px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px', textAlign: 'center' }}>{t.questionsByBank}</h3>
                <div style={{ height: 220 }}><Bar data={charts.bank} options={{ ...chartOptions, plugins: { ...chartOptions.plugins, legend: { display: false } } }} /></div>
              </div>
            )}
            {charts.tags && charts.tags.labels.length > 0 && (
              <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '20px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px', textAlign: 'center' }}>{t.tagsDistribution}</h3>
                <div style={{ height: 220 }}><Bar data={charts.tags} options={{ ...chartOptions, plugins: { ...chartOptions.plugins, legend: { display: false } } }} /></div>
              </div>
            )}
            {charts.grade && charts.grade.labels.length > 0 && (
              <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '20px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px', textAlign: 'center' }}>{t.gradeDistribution}</h3>
                <div style={{ height: 220 }}><Pie data={charts.grade} options={chartOptions} /></div>
              </div>
            )}
            {charts.timeSeries && (
              <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '20px', gridColumn: '1 / -1' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px', textAlign: 'center' }}>{t.timeSeries}</h3>
                <div style={{ height: 220 }}>
                  <Line 
                    data={charts.timeSeries} 
                    options={{
                      ...chartOptions,
                      scales: {
                        y: { beginAtZero: true, ticks: { font: { size: 10 }, color: 'var(--text-muted)' } },
                        x: { ticks: { font: { size: 10 }, color: 'var(--text-muted)' } }
                      },
                      plugins: { legend: { display: false } }
                    }} 
                  />
                </div>
              </div>
            )}
          </div>

          {/* الأسئلة الأكثر استخداماً */}
          {topQuestions.length > 0 && (
            <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '20px', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Icons.TrendingUp style={{ height: 22, width: 22, color: 'var(--primary-color)' }} /> {t.topQuestions}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {topQuestions.map((q, idx) => (
                  <div key={q.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                    <span style={{ fontWeight: 700, fontSize: '16px', color: 'var(--primary-color)' }}>#{idx + 1}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>{q.question_text}</p>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '4px', fontSize: '12px', color: 'var(--text-muted)' }}>
                        <span>{t.typeMCQ}</span>
                        <span>•</span>
                        <span>{t.difficultyEasy}</span>
                        <span>•</span>
                        <span>استخدم {q.usage_count} مرة</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* توصيات ذكية */}
          {insights.length > 0 && (
            <div style={{ backgroundColor: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: '14px', padding: '20px', marginTop: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--primary-color)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icons.Lightbulb style={{ height: 20, width: 20 }} /> {t.insights}
              </h3>
              <ul style={{ padding: 0, margin: 0, listStyle: 'none' }}>
                {insights.map((insight, i) => (
                  <li key={i} style={{ padding: '6px 0', fontSize: '14px', color: 'var(--text-muted)', borderBottom: i < insights.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                    <Icons.CheckCircle style={{ height: 16, width: 16, display: 'inline', marginRight: '8px', color: '#22c55e' }} />
                    {insight}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* مودال التصدير */}
      {showExportModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }} onClick={() => setShowExportModal(false)}>
          <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '28px', maxWidth: '480px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>{t.exportReport}</h3>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '6px' }}>{t.exportFormat}</label>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => setExportFormat('csv')} style={{ padding: '8px 20px', borderRadius: '8px', border: exportFormat === 'csv' ? '2px solid var(--primary-color)' : '1px solid var(--border-color)', backgroundColor: exportFormat === 'csv' ? 'rgba(251,191,36,0.1)' : 'transparent', color: 'var(--text-primary)', cursor: 'pointer' }}>{t.exportCSV}</button>
                <button onClick={() => setExportFormat('json')} style={{ padding: '8px 20px', borderRadius: '8px', border: exportFormat === 'json' ? '2px solid var(--primary-color)' : '1px solid var(--border-color)', backgroundColor: exportFormat === 'json' ? 'rgba(251,191,36,0.1)' : 'transparent', color: 'var(--text-primary)', cursor: 'pointer' }}>{t.exportJSON}</button>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => { exportReport(exportFormat); setShowExportModal(false); }} style={{ flex: 1, backgroundColor: 'var(--primary-color)', color: '#000', fontWeight: 700, padding: '12px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontSize: '15px' }}>تصدير</button>
              <button onClick={() => setShowExportModal(false)} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '12px', borderRadius: '12px', cursor: 'pointer', fontSize: '15px' }}>إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </AssistantLayout>
  );
}