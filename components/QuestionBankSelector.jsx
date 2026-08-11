'use client';

// ============================================================
// مودال اختيار الأسئلة من بنك الأسئلة
// النسخة العملاقة V2 – متوافقة مع المعلم والمساعد
// ============================================================
import React from 'react'
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import * as Icons from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';

// ============================================================
// 1. الترجمات (مدمجة داخل المكون لتكون مستقلة)
// ============================================================
const translations = {
  ar: {
    title: '📚 اختيار أسئلة من بنك الأسئلة',
    subtitle: 'اختر الأسئلة التي تريد إضافتها إلى الامتحان',
    searchPlaceholder: 'ابحث في نص السؤال أو الوسوم...',
    allTypes: 'كل الأنواع',
    allDifficulties: 'كل الصعوبات',
    allTags: 'كل الوسوم',
    allCourses: 'كل الكورسات',
    typeMCQ: 'اختيار من متعدد',
    typeTrueFalse: 'صح/خطأ',
    typeShort: 'إجابة قصيرة',
    typeEssay: 'مقالي',
    typeMatching: 'مطابقة',
    difficultyEasy: 'سهل',
    difficultyMedium: 'متوسط',
    difficultyHard: 'صعب',
    difficultyExpert: 'خبير',
    selectedCount: 'المحدد',
    selectAll: 'تحديد الكل',
    deselectAll: 'إلغاء التحديد',
    confirm: 'تأكيد الاختيار',
    cancel: 'إلغاء',
    close: 'إغلاق',
    loading: 'جاري التحميل...',
    noQuestions: 'لا توجد أسئلة تطابق البحث',
    fetchFailed: 'فشل جلب الأسئلة',
    questionText: 'نص السؤال',
    correctAnswer: 'الإجابة الصحيحة',
    explanation: 'الشرح',
    options: 'الخيارات',
    tags: 'الوسوم',
    points: 'نقاط',
    randomSelect: 'اختيار عشوائي',
    randomCount: 'عدد الأسئلة العشوائية',
    generateRandom: 'توليد عشوائي',
    clearSelection: 'مسح التحديد',
    showPreview: 'معاينة السؤال',
    hidePreview: 'إخفاء المعاينة',
    selectBank: 'اختر بنكاً',
    allBanks: 'كل البنوك',
    noBanks: 'لا توجد بنوك',
    themeLight: 'فاتح',
    themeDark: 'داكن',
    language: 'اللغة',
    gold: 'ذهبي',
    blue: 'أزرق',
    green: 'أخضر',
    purple: 'بنفسجي',
  },
  en: {
    title: '📚 Select Questions from Question Bank',
    subtitle: 'Choose questions to add to your exam',
    searchPlaceholder: 'Search question text or tags...',
    allTypes: 'All Types',
    allDifficulties: 'All Difficulties',
    allTags: 'All Tags',
    allCourses: 'All Courses',
    typeMCQ: 'Multiple Choice',
    typeTrueFalse: 'True/False',
    typeShort: 'Short Answer',
    typeEssay: 'Essay',
    typeMatching: 'Matching',
    difficultyEasy: 'Easy',
    difficultyMedium: 'Medium',
    difficultyHard: 'Hard',
    difficultyExpert: 'Expert',
    selectedCount: 'Selected',
    selectAll: 'Select All',
    deselectAll: 'Deselect All',
    confirm: 'Confirm Selection',
    cancel: 'Cancel',
    close: 'Close',
    loading: 'Loading...',
    noQuestions: 'No questions match your search',
    fetchFailed: 'Failed to fetch questions',
    questionText: 'Question Text',
    correctAnswer: 'Correct Answer',
    explanation: 'Explanation',
    options: 'Options',
    tags: 'Tags',
    points: 'Points',
    randomSelect: 'Random Selection',
    randomCount: 'Number of random questions',
    generateRandom: 'Generate Random',
    clearSelection: 'Clear Selection',
    showPreview: 'Preview Question',
    hidePreview: 'Hide Preview',
    selectBank: 'Select Bank',
    allBanks: 'All Banks',
    noBanks: 'No banks available',
    themeLight: 'Light',
    themeDark: 'Dark',
    language: 'Language',
    gold: 'Gold',
    blue: 'Blue',
    green: 'Green',
    purple: 'Purple',
  },
};

// ============================================================
// 2. المكون الرئيسي
// ============================================================
export default function QuestionBankSelector({
  isOpen,
  onClose,
  onConfirm,
  initialSelected = [],
  bankId: initialBankId = null,
  teacherId, // ✅ prop جديد: معرف المعلم (يُمرر من الخارج)
  language = 'ar',
  theme = 'dark',
  color = 'gold',
}) {
  const t = translations[language];

  // ===== حالات البيانات =====
  const [banks, setBanks] = useState([]);
  const [selectedBankId, setSelectedBankId] = useState(initialBankId || '');
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState(initialSelected.map(q => q.id || q));

  // ===== حالات الفلترة =====
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterDifficulty, setFilterDifficulty] = useState('all');
  const [filterTag, setFilterTag] = useState('all');
  const [filterCourse, setFilterCourse] = useState('all');

  // ===== حالات إضافية =====
  const [showPreview, setShowPreview] = useState(null);
  const [randomCount, setRandomCount] = useState(5);
  const [courses, setCourses] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const pageSize = 20;

  // ===== تطبيق السمات =====
  useEffect(() => {
    if (!isOpen) return;
    const root = document.documentElement;
    const isDark = theme === 'dark';
    const primaryColors = { gold: '#fbbf24', blue: '#3b82f6', green: '#22c55e', purple: '#a855f7' };
    const primary = primaryColors[color] || '#fbbf24';
    root.style.setProperty('--qb-bg-primary', isDark ? '#0b0e1a' : '#f0f2f5');
    root.style.setProperty('--qb-bg-card', isDark ? 'rgba(30,36,51,0.95)' : 'rgba(255,255,255,0.95)');
    root.style.setProperty('--qb-text-primary', isDark ? '#f1f5f9' : '#0f172a');
    root.style.setProperty('--qb-text-muted', isDark ? '#94a3b8' : '#64748b');
    root.style.setProperty('--qb-border-color', isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)');
    root.style.setProperty('--qb-primary-color', primary);
  }, [isOpen, theme, color]);

  // ===== جلب البنوك والبيانات الأولية =====
  const fetchInitialData = useCallback(async () => {
    // ✅ التحقق من وجود teacherId
    if (!teacherId) {
      console.error('❌ teacherId مطلوب لعرض بنوك الأسئلة');
      toast.error('يرجى تسجيل الدخول');
      setLoading(false);
      return;
    }

    if (!isOpen) return;
    try {
      // جلب البنوك باستخدام teacherId مباشرة
      const { data: banksData, error: banksError } = await supabase
        .from('question_banks')
        .select('id, title')
        .eq('teacher_id', teacherId)
        .order('title', { ascending: true });

      if (banksError) throw banksError;
      setBanks(banksData || []);
      if (!selectedBankId && banksData && banksData.length > 0) {
        setSelectedBankId(banksData[0].id);
      }

      // جلب الكورسات
      const { data: coursesData } = await supabase
        .from('courses')
        .select('id, title')
        .eq('teacher_id', teacherId);
      setCourses(coursesData || []);

      // جلب جميع الوسوم من البنوك الحالية
      if (banksData && banksData.length > 0) {
        const bankIds = banksData.map(b => b.id);
        const { data: tagsData } = await supabase
          .from('question_bank_tags')
          .select('tag')
          .in('bank_id', bankIds);
        const uniqueTags = [...new Set(tagsData?.map(t => t.tag) || [])];
        setAllTags(uniqueTags);
      }
    } catch (err) {
      console.error(err);
      toast.error(t.fetchFailed);
    }
  }, [isOpen, teacherId, selectedBankId, t]);

  useEffect(() => {
    if (isOpen && teacherId) {
      fetchInitialData();
    }
  }, [isOpen, teacherId, fetchInitialData]);

  // ===== جلب الأسئلة مع فلترة وترقيم =====
  const fetchQuestions = useCallback(async (reset = true) => {
    if (!selectedBankId) {
      setQuestions([]);
      setLoading(false);
      return;
    }
    if (reset) setLoading(true);
    try {
      const start = reset ? 0 : (page - 1) * pageSize;
      let query = supabase
        .from('questions')
        .select('*', { count: 'exact' })
        .eq('bank_id', selectedBankId)
        .order('created_at', { ascending: false });

      if (search.trim()) {
        const q = search.trim();
        query = query.or(`question_text.ilike.%${q}%, tags.cs.{${q}}`);
      }
      if (filterType !== 'all') query = query.eq('type', filterType);
      if (filterDifficulty !== 'all') query = query.eq('difficulty', filterDifficulty);
      if (filterTag !== 'all') query = query.contains('tags', [filterTag]);

      const { data, error, count } = await query
        .range(start, start + pageSize - 1);

      if (error) throw error;

      setQuestions(prev => reset ? (data || []) : [...prev, ...(data || [])]);
      setHasMore((data?.length || 0) === pageSize);
      setLoading(false);
    } catch (err) {
      console.error(err);
      toast.error(t.fetchFailed);
      setLoading(false);
    }
  }, [selectedBankId, search, filterType, filterDifficulty, filterTag, page, pageSize, t]);

  useEffect(() => {
    if (isOpen && selectedBankId && teacherId) {
      setPage(1);
      fetchQuestions(true);
    }
  }, [isOpen, selectedBankId, search, filterType, filterDifficulty, filterTag, teacherId]);

  // ===== تحميل المزيد =====
  const loadMore = useCallback(() => {
    if (hasMore && !loading) {
      setPage(prev => prev + 1);
      fetchQuestions(false);
    }
  }, [hasMore, loading, fetchQuestions]);

  // ===== دوال التحديد =====
  const toggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    const allIds = questions.map(q => q.id);
    if (selectedIds.length === allIds.length) {
      setSelectedIds(prev => prev.filter(id => !allIds.includes(id)));
    } else {
      setSelectedIds(prev => [...new Set([...prev, ...allIds])]);
    }
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  // ===== اختيار عشوائي =====
  const generateRandom = () => {
    if (questions.length === 0) return toast.warning('لا توجد أسئلة للاختيار العشوائي');
    const count = Math.min(randomCount, questions.length);
    const shuffled = [...questions].sort(() => Math.random() - 0.5);
    const randomIds = shuffled.slice(0, count).map(q => q.id);
    setSelectedIds(prev => [...new Set([...prev, ...randomIds])]);
    toast.success(`تم اختيار ${count} سؤال عشوائي`);
  };

  // ===== التأكيد =====
  const handleConfirm = () => {
    if (selectedIds.length === 0) {
      toast.warning('الرجاء اختيار سؤال واحد على الأقل');
      return;
    }
    const selectedQuestions = questions.filter(q => selectedIds.includes(q.id));
    onConfirm(selectedQuestions);
    onClose();
  };

  // ===== العرض =====
  if (!isOpen) return null;

  const typeMap = {
    mcq: t.typeMCQ,
    truefalse: t.typeTrueFalse,
    short: t.typeShort,
    essay: t.typeEssay,
    matching: t.typeMatching,
  };
  const difficultyMap = {
    easy: t.difficultyEasy,
    medium: t.difficultyMedium,
    hard: t.difficultyHard,
    expert: t.difficultyExpert,
  };

  const allSelected = questions.length > 0 && selectedIds.length === questions.length;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'var(--qb-bg-card)',
          border: '1px solid var(--qb-border-color)',
          borderRadius: '24px',
          maxWidth: '1100px',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 80px rgba(0,0,0,0.5)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* الرأس */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--qb-border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div>
            <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--qb-text-primary)', margin: 0 }}>
              {t.title}
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--qb-text-muted)', margin: '4px 0 0 0' }}>
              {t.subtitle}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--qb-text-muted)' }}>
              {t.selectedCount}: {selectedIds.length}
            </span>
            <button
              onClick={onClose}
              style={{
                padding: '6px',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: 'transparent',
                color: 'var(--qb-text-muted)',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
              }}
            >
              <Icons.X style={{ height: 24, width: 24 }} />
            </button>
          </div>
        </div>

        {/* شريط الإعدادات والفلترة */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid var(--qb-border-color)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '12px',
            backgroundColor: 'rgba(255,255,255,0.02)',
          }}
        >
          <select
            value={selectedBankId}
            onChange={(e) => setSelectedBankId(e.target.value)}
            style={{
              padding: '8px 14px',
              backgroundColor: 'transparent',
              border: '1px solid var(--qb-border-color)',
              borderRadius: '10px',
              color: 'var(--qb-text-primary)',
              outline: 'none',
              fontSize: '14px',
              minWidth: '160px',
            }}
          >
            <option value="">{t.selectBank}</option>
            {banks.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
          </select>

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.searchPlaceholder}
            style={{
              flex: 1,
              minWidth: '160px',
              padding: '8px 14px',
              backgroundColor: 'transparent',
              border: '1px solid var(--qb-border-color)',
              borderRadius: '10px',
              color: 'var(--qb-text-primary)',
              outline: 'none',
              fontSize: '14px',
            }}
          />

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{
              padding: '8px 14px',
              backgroundColor: 'transparent',
              border: '1px solid var(--qb-border-color)',
              borderRadius: '10px',
              color: 'var(--qb-text-primary)',
              outline: 'none',
              fontSize: '14px',
            }}
          >
            <option value="all">{t.allTypes}</option>
            <option value="mcq">{t.typeMCQ}</option>
            <option value="truefalse">{t.typeTrueFalse}</option>
            <option value="short">{t.typeShort}</option>
            <option value="essay">{t.typeEssay}</option>
            <option value="matching">{t.typeMatching}</option>
          </select>

          <select
            value={filterDifficulty}
            onChange={(e) => setFilterDifficulty(e.target.value)}
            style={{
              padding: '8px 14px',
              backgroundColor: 'transparent',
              border: '1px solid var(--qb-border-color)',
              borderRadius: '10px',
              color: 'var(--qb-text-primary)',
              outline: 'none',
              fontSize: '14px',
            }}
          >
            <option value="all">{t.allDifficulties}</option>
            <option value="easy">{t.difficultyEasy}</option>
            <option value="medium">{t.difficultyMedium}</option>
            <option value="hard">{t.difficultyHard}</option>
            <option value="expert">{t.difficultyExpert}</option>
          </select>

          {allTags.length > 0 && (
            <select
              value={filterTag}
              onChange={(e) => setFilterTag(e.target.value)}
              style={{
                padding: '8px 14px',
                backgroundColor: 'transparent',
                border: '1px solid var(--qb-border-color)',
                borderRadius: '10px',
                color: 'var(--qb-text-primary)',
                outline: 'none',
                fontSize: '14px',
              }}
            >
              <option value="all">{t.allTags}</option>
              {allTags.map(tag => <option key={tag} value={tag}>{tag}</option>)}
            </select>
          )}
        </div>

        {/* جسم المودال: قائمة الأسئلة */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          {/* أزرار التحكم العلوية */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              marginBottom: '8px',
            }}
          >
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={selectAll}
                style={{
                  padding: '6px 16px',
                  fontSize: '13px',
                  fontWeight: 600,
                  backgroundColor: 'rgba(251,191,36,0.12)',
                  color: 'var(--qb-primary-color)',
                  borderRadius: '8px',
                  border: '1px solid rgba(251,191,36,0.2)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {allSelected ? t.deselectAll : t.selectAll}
              </button>
              <button
                onClick={clearSelection}
                style={{
                  padding: '6px 16px',
                  fontSize: '13px',
                  fontWeight: 600,
                  backgroundColor: 'rgba(239,68,68,0.08)',
                  color: '#ef4444',
                  borderRadius: '8px',
                  border: '1px solid rgba(239,68,68,0.2)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {t.clearSelection}
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="number"
                value={randomCount}
                onChange={(e) => setRandomCount(Math.max(1, parseInt(e.target.value) || 1))}
                min={1}
                max={questions.length || 10}
                style={{
                  width: '60px',
                  padding: '6px 10px',
                  backgroundColor: 'transparent',
                  border: '1px solid var(--qb-border-color)',
                  borderRadius: '8px',
                  color: 'var(--qb-text-primary)',
                  outline: 'none',
                  fontSize: '13px',
                }}
              />
              <button
                onClick={generateRandom}
                style={{
                  padding: '6px 16px',
                  fontSize: '13px',
                  fontWeight: 600,
                  backgroundColor: 'rgba(168,85,247,0.12)',
                  color: '#a855f7',
                  borderRadius: '8px',
                  border: '1px solid rgba(168,85,247,0.2)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <Icons.Shuffle style={{ height: 14, width: 14, display: 'inline', marginRight: '4px' }} />
                {t.generateRandom}
              </button>
            </div>
          </div>

          {/* قائمة الأسئلة */}
          {loading && page === 1 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--qb-text-muted)' }}>
              <Icons.Loader2 style={{ height: 32, width: 32, animation: 'spin 1s linear infinite', margin: '0 auto' }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              <p style={{ marginTop: '12px' }}>{t.loading}</p>
            </div>
          ) : questions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--qb-text-muted)' }}>
              <Icons.Inbox style={{ height: 48, width: 48, margin: '0 auto', opacity: 0.3 }} />
              <p style={{ marginTop: '12px', fontSize: '16px' }}>{t.noQuestions}</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {questions.map((q) => {
                const isSelected = selectedIds.includes(q.id);
                const typeColor = {
                  mcq: '#fbbf24',
                  truefalse: '#3b82f6',
                  short: '#22c55e',
                  essay: '#a855f7',
                  matching: '#ec4899',
                }[q.type] || '#fbbf24';
                const difficultyColor = {
                  easy: '#22c55e',
                  medium: '#fbbf24',
                  hard: '#f97316',
                  expert: '#ef4444',
                }[q.difficulty] || '#fbbf24';

                return (
                  <motion.div
                    key={q.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ scale: 1.005 }}
                    style={{
                      backgroundColor: isSelected ? 'rgba(251,191,36,0.08)' : 'rgba(255,255,255,0.02)',
                      border: isSelected ? '2px solid var(--qb-primary-color)' : '1px solid var(--qb-border-color)',
                      borderRadius: '14px',
                      padding: '14px 18px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '14px',
                      transition: 'all 0.2s',
                      cursor: 'pointer',
                    }}
                    onClick={() => toggleSelect(q.id)}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(q.id)}
                      style={{
                        marginTop: '4px',
                        accentColor: 'var(--qb-primary-color)',
                        width: 18,
                        height: 18,
                        flexShrink: 0,
                        cursor: 'pointer',
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '15px', fontWeight: 500, color: 'var(--qb-text-primary)', margin: 0, lineHeight: 1.5 }}>
                        {q.question_text}
                      </p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
                        <span style={{ padding: '2px 12px', backgroundColor: `${typeColor}22`, color: typeColor, borderRadius: '9999px', fontSize: '12px', fontWeight: 600, border: `1px solid ${typeColor}33` }}>
                          {typeMap[q.type] || q.type}
                        </span>
                        <span style={{ padding: '2px 12px', backgroundColor: `${difficultyColor}22`, color: difficultyColor, borderRadius: '9999px', fontSize: '12px', fontWeight: 600, border: `1px solid ${difficultyColor}33` }}>
                          {difficultyMap[q.difficulty] || q.difficulty}
                        </span>
                        {q.tags && q.tags.length > 0 && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--qb-text-muted)' }}>
                            <Icons.Tag style={{ height: 14, width: 14 }} />
                            {q.tags.join(', ')}
                          </span>
                        )}
                        <span style={{ fontSize: '12px', color: 'var(--qb-text-muted)' }}>
                          {q.marks || 1} {t.points}
                        </span>
                      </div>
                      {showPreview === q.id && (
                        <div style={{ marginTop: '10px', padding: '12px', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: '10px', fontSize: '14px', color: 'var(--qb-text-muted)' }}>
                          {q.options && q.options.length > 0 && (
                            <div><strong>{t.options}:</strong> {q.options.join(', ')}</div>
                          )}
                          {q.correct_answer && <div><strong>{t.correctAnswer}:</strong> <span style={{ color: '#22c55e' }}>{q.correct_answer}</span></div>}
                          {q.explanation && <div><strong>{t.explanation}:</strong> {q.explanation}</div>}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowPreview(showPreview === q.id ? null : q.id);
                      }}
                      style={{
                        padding: '4px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: 'transparent',
                        color: 'var(--qb-text-muted)',
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                    >
                      <Icons.Eye style={{ height: 18, width: 18 }} />
                    </button>
                  </motion.div>
                );
              })}
              {hasMore && (
                <button
                  onClick={loadMore}
                  disabled={loading}
                  style={{
                    padding: '12px',
                    backgroundColor: 'rgba(255,255,255,0.04)',
                    border: '1px dashed var(--qb-border-color)',
                    borderRadius: '12px',
                    color: 'var(--qb-text-muted)',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    transition: 'all 0.2s',
                  }}
                >
                  {loading ? t.loading : 'تحميل المزيد...'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* أسفل المودال: أزرار التأكيد والإلغاء */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--qb-border-color)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
            backgroundColor: 'rgba(255,255,255,0.02)',
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '10px 24px',
              backgroundColor: 'rgba(255,255,255,0.04)',
              border: '1px solid var(--qb-border-color)',
              borderRadius: '12px',
              color: 'var(--qb-text-primary)',
              cursor: 'pointer',
              fontSize: '15px',
              fontWeight: 600,
              transition: 'all 0.2s',
            }}
          >
            {t.cancel}
          </button>
          <button
            onClick={handleConfirm}
            style={{
              padding: '10px 28px',
              backgroundColor: 'var(--qb-primary-color)',
              color: '#000',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              fontSize: '15px',
              fontWeight: 700,
              transition: 'all 0.2s',
              boxShadow: '0 4px 16px rgba(251,191,36,0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Icons.Check style={{ height: 20, width: 20 }} />
            {t.confirm} ({selectedIds.length})
          </button>
        </div>
      </div>
    </div>
  );
}