'use client';

// ================================================================
// 📢 المسار: app/dashboard/teacher/announcements/page.js
// تم التحديث: إضافة عرض الإعجابات مع عددها وقائمة المعجبين
// ================================================================
import { TeacherLayout } from '@/components/TeacherLayout';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import * as Icons from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { getCachedAssistantPermissions, hasPermission } from '@/lib/permissions';

// ----- useTheme محلي (مطابق للنسخة السابقة) -----
const useTheme = () => {
  const [theme, setTheme] = useState(() => { try { return localStorage.getItem('announcementsTheme') || 'dark'; } catch { return 'dark'; } });
  useEffect(() => { localStorage.setItem('announcementsTheme', theme); document.documentElement.className = theme; }, [theme]);
  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');
  const styles = {
    dark: { bg: 'bg-[#0b0e1a]', text: 'text-white', subtext: 'text-gray-300', card: 'bg-white/5 backdrop-blur-sm border-white/10', input: 'bg-white/10 border-white/20 text-white placeholder-gray-300', hover: 'hover:border-yellow-400/50', border: 'border-white/10', label: 'text-gray-200' },
    light: { bg: 'bg-gray-50', text: 'text-gray-900', subtext: 'text-gray-700', card: 'bg-white/90 backdrop-blur-sm border-gray-200', input: 'bg-gray-100 border-gray-300 text-gray-900 placeholder-gray-400', hover: 'hover:border-yellow-400/70', border: 'border-gray-200', label: 'text-gray-700' },
  };
  return { theme, toggleTheme, styles: styles[theme], isDark: theme === 'dark' };
};

// ----- مكون عرض الإعجابات (Popup) -----
const LikesPopup = ({ announcementId, totalLikes, styles, isDark }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [likers, setLikers] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchLikers = async () => {
    if (likers.length > 0) return; // لا نعيد الجلب إذا كانت موجودة
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('announcement_likes')
        .select('student_id, profiles(full_name, email)')
        .eq('announcement_id', announcementId)
        .limit(50);

      if (error) throw error;
      setLikers(data.map(item => item.profiles).filter(Boolean));
    } catch (err) {
      console.error(err);
      toast.error('فشل جلب المعجبين');
    } finally {
      setLoading(false);
    }
  };

  const togglePopup = () => {
    if (!isOpen) fetchLikers();
    setIsOpen(!isOpen);
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={togglePopup}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-300 ${
          totalLikes > 0
            ? 'bg-red-500/10 text-red-500 dark:text-red-400 border border-red-500/20 hover:bg-red-500/20'
            : 'text-gray-400 border border-transparent hover:bg-white/5'
        }`}
      >
        <Icons.Heart className={`h-4 w-4 ${totalLikes > 0 ? 'fill-current' : ''}`} />
        <span>{totalLikes}</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              transition={{ duration: 0.2 }}
              className={`absolute z-50 left-0 mt-2 w-64 max-h-48 overflow-y-auto rounded-2xl border ${styles.border} ${styles.card} shadow-2xl p-3`}
              style={{ minWidth: '200px' }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-sm font-bold ${styles.text}`}>المعجبون</span>
                <span className={`text-xs ${styles.subtext}`}>{totalLikes} معجب</span>
              </div>
              {loading ? (
                <div className="flex justify-center py-4"><Icons.Loader2 className="h-5 w-5 animate-spin text-yellow-500" /></div>
              ) : likers.length === 0 ? (
                <p className={`text-sm ${styles.subtext} text-center py-4`}>لا يوجد معجبون بعد</p>
              ) : (
                <ul className="space-y-2">
                  {likers.map((liker, idx) => (
                    <li key={idx} className={`flex items-center gap-3 p-2 rounded-xl ${styles.card} border ${styles.border}`}>
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400/30 to-yellow-600/30 flex items-center justify-center text-yellow-500 font-bold text-xs">
                        {liker?.full_name?.charAt(0) || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${styles.text} truncate`}>{liker?.full_name || 'طالب'}</p>
                        <p className={`text-[10px] ${styles.subtext} truncate`}>{liker?.email || ''}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

// ----- الصفحة الرئيسية (معدلة) -----
export default function AnnouncementsIntegratedPage() {
  const router = useRouter();
  const { theme, toggleTheme, styles, isDark } = useTheme();
  const [user, setUser] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState(null);
  const [isAssistant, setIsAssistant] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // حالة المودال (للإعلان الجديد)
  const [showModal, setShowModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [targetType, setTargetType] = useState('all');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [gradeStage, setGradeStage] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [publishNow, setPublishNow] = useState(false);

  const gradeOptions = ['ابتدائي', 'اعدادي', 'ثانوي'];
  const gradeLevels = useMemo(() => {
    if (gradeStage === 'ابتدائي') return [1, 2, 3, 4, 5, 6];
    if (gradeStage === 'اعدادي') return [1, 2, 3];
    if (gradeStage === 'ثانوي') return [1, 2, 3];
    return [];
  }, [gradeStage]);

  // ----- جلب البيانات (تم تحديثه لجلب الإعجابات) -----
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) { router.push('/login'); return; }
      setUser(u);

      const perms = await getCachedAssistantPermissions(u.id);
      if (perms !== null) { setIsAssistant(true); setPermissions(perms); }
      else setIsAssistant(false);

      if (isAssistant && !hasPermission(perms, 'announcements', 'can_view')) {
        toast.error('غير مصرح لك بمشاهدة هذه الصفحة');
        router.push('/dashboard/assistant');
        return;
      }

      // 1. جلب الإعلانات مع بيانات الكورس
      const { data: annData, error: annError } = await supabase
        .from('announcements')
        .select('*, course:courses(title)')
        .eq('teacher_id', u.id)
        .order('created_at', { ascending: false });

      if (annError) throw annError;

      // 2. جلب عدد الإعجابات لكل إعلان (دفعة واحدة)
      if (annData && annData.length > 0) {
        const announcementIds = annData.map(a => a.id);
        const { data: likesData, error: likesError } = await supabase
          .from('announcement_likes')
          .select('announcement_id')
          .in('announcement_id', announcementIds);

        if (likesError) throw likesError;

        // حساب عدد الإعجابات لكل إعلان
        const likesCountMap = {};
        likesData?.forEach(like => {
          likesCountMap[like.announcement_id] = (likesCountMap[like.announcement_id] || 0) + 1;
        });

        // دمج العدد مع الإعلانات
        const enrichedAnnouncements = annData.map(ann => ({
          ...ann,
          total_likes: likesCountMap[ann.id] || 0,
        }));
        setAnnouncements(enrichedAnnouncements);
      } else {
        setAnnouncements(annData || []);
      }

      // 3. جلب الكورسات
      const { data: courseData } = await supabase.from('courses').select('id, title').eq('teacher_id', u.id);
      setCourses(courseData || []);

    } catch (err) {
      console.error(err);
      toast.error('فشل جلب البيانات');
    } finally {
      setLoading(false);
    }
  }, [router, isAssistant, permissions]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ----- عمليات الإعلانات (نشر، حذف، تعديل) -----
  const handleTogglePublish = async (id, current) => {
    const { error } = await supabase.from('announcements').update({ is_published: !current, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) { toast.error('فشل تغيير الحالة'); return; }
    setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, is_published: !current } : a));
    toast.success(!current ? 'تم النشر' : 'تم الإخفاء');
  };

  const handleDelete = async (id) => {
    if (!confirm('هل أنت متأكد من حذف هذا الإعلان؟')) return;
    const { error } = await supabase.from('announcements').delete().eq('id', id);
    if (error) { toast.error('فشل الحذف'); return; }
    setAnnouncements(prev => prev.filter(a => a.id !== id));
    toast.success('تم الحذف');
  };

  // ----- إنشاء إعلان جديد -----
  const resetForm = () => {
    setTitle(''); setBody(''); setTargetType('all'); setSelectedCourse(''); setGradeStage(''); setGradeLevel(''); setPublishNow(false);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) { toast.error('العنوان والمحتوى مطلوبان'); return; }
    setModalLoading(true);
    try {
      const payload = {
        teacher_id: user.id,
        title: title.trim(),
        body: body.trim(),
        is_published: publishNow,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      if (targetType === 'course') payload.course_id = selectedCourse;
      else if (targetType === 'grade') {
        payload.grade_stage = gradeStage;
        payload.grade_level = parseInt(gradeLevel);
      }

      const { error } = await supabase.from('announcements').insert(payload).select().single();
      if (error) throw error;
      toast.success(publishNow ? 'تم النشر' : 'تم الحفظ كمسودة');
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (err) {
      toast.error('فشل إنشاء الإعلان');
    } finally {
      setModalLoading(false);
    }
  };

  // ----- إحصائيات وفلترة -----
  const stats = useMemo(() => {
    const published = announcements.filter(a => a.is_published).length;
    const drafts = announcements.length - published;
    return { total: announcements.length, published, drafts };
  }, [announcements]);

  const filtered = useMemo(() => {
    let result = announcements;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(a => a.title?.toLowerCase().includes(q) || a.body?.toLowerCase().includes(q));
    }
    if (filterStatus === 'published') result = result.filter(a => a.is_published);
    else if (filterStatus === 'draft') result = result.filter(a => !a.is_published);
    return result;
  }, [announcements, search, filterStatus]);

  // معاينة الهدف
  const targetPreview = useMemo(() => {
    if (targetType === 'all') return { type: 'all' };
    if (targetType === 'course') {
      const course = courses.find(c => c.id === selectedCourse);
      return { type: 'course', courseTitle: course?.title || '' };
    }
    return { type: 'grade', gradeStage, gradeLevel };
  }, [targetType, selectedCourse, courses, gradeStage, gradeLevel]);

  if (loading) return (
    <TeacherLayout><div className="min-h-screen flex items-center justify-center"><div className="w-12 h-12 border-4 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" /></div></TeacherLayout>
  );

  return (
    <TeacherLayout>
      <div className={`min-h-screen ${styles.bg} ${styles.text} p-4 md:p-6`}>
        <div className="max-w-7xl mx-auto">
          {/* الهيدر */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-extrabold bg-gradient-to-r from-yellow-300 to-yellow-500 bg-clip-text text-transparent">📢 الإعلانات</h1>
              <p className={`${styles.subtext} text-sm mt-1`}>إدارة وإرسال الإعلانات للطلاب مع متابعة التفاعل</p>
            </div>
            <div className="flex gap-3 mt-3 md:mt-0">
              {(!isAssistant || hasPermission(permissions, 'announcements', 'can_create')) && (
                <button onClick={() => setShowModal(true)} className="px-5 py-2 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold rounded-xl hover:scale-105 transition shadow-lg flex items-center gap-2">
                  <Icons.Plus className="h-5 w-5" /> إعلان جديد
                </button>
              )}
              <button onClick={toggleTheme} className={`p-2 rounded-xl ${styles.card} border ${styles.border}`}>{theme === 'dark' ? <Icons.Sun className="h-5 w-5 text-yellow-400" /> : <Icons.Moon className="h-5 w-5 text-gray-600" />}</button>
              <button onClick={fetchData} className={`p-2 rounded-xl ${styles.card} border ${styles.border}`}><Icons.RefreshCw className="h-5 w-5" /></button>
            </div>
          </div>

          {/* إحصائيات */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { label: 'الكل', value: stats.total, color: 'text-blue-400' },
              { label: 'منشور', value: stats.published, color: 'text-green-400' },
              { label: 'مسودات', value: stats.drafts, color: 'text-gray-400' },
            ].map((s, idx) => (
              <div key={idx} className={`${styles.card} border ${styles.border} rounded-xl p-3 text-center`}>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-gray-400">{s.label}</p>
              </div>
            ))}
          </div>

          {/* فلترة وبحث */}
          <div className="flex flex-col md:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Icons.Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث عن إعلان..." className={`w-full p-2.5 pr-10 ${styles.input} border ${styles.border} rounded-xl`} />
            </div>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={`p-2.5 ${styles.input} border ${styles.border} rounded-xl`}>
              <option value="all">جميع الحالات</option>
              <option value="published">منشور</option>
              <option value="draft">مسودة</option>
            </select>
          </div>

          {/* قائمة الإعلانات (مع عرض الإعجابات) */}
          {filtered.length === 0 ? (
            <div className="text-center py-20"><Icons.Megaphone className="h-16 w-16 text-gray-500 mx-auto mb-4" /><p className="text-lg">لا توجد إعلانات</p></div>
          ) : (
            <div className="space-y-3">
              {filtered.map(ann => (
                <motion.div key={ann.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -2 }}
                  className={`${styles.card} border ${styles.border} rounded-2xl p-4`}>
                  <div className="flex flex-col md:flex-row md:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${ann.is_published ? 'bg-green-500/10 text-green-400 border-green-400/20' : 'bg-gray-500/10 text-gray-400 border-gray-400/20'}`}>
                          {ann.is_published ? '📢 منشور' : '📝 مسودة'}
                        </span>
                        {ann.course?.title && <span className="text-[10px] text-blue-400">{ann.course.title}</span>}
                        {ann.grade_stage && <span className="text-[10px] text-gray-400">{ann.grade_stage} - {ann.grade_level}</span>}
                        
                        {/* عرض الإعجابات (المكون الجديد) */}
                        <LikesPopup
                          announcementId={ann.id}
                          totalLikes={ann.total_likes || 0}
                          styles={styles}
                          isDark={isDark}
                        />
                      </div>
                      <p className="font-bold truncate">{ann.title}</p>
                      <p className={`text-xs ${styles.subtext} line-clamp-1`}>{ann.body}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {(!isAssistant || hasPermission(permissions, 'announcements', 'can_publish')) && (
                        <button onClick={() => handleTogglePublish(ann.id, ann.is_published)}
                          className={`text-xs px-3 py-1.5 rounded-lg ${ann.is_published ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'}`}>
                          {ann.is_published ? 'إخفاء' : 'نشر'}
                        </button>
                      )}
                      {(!isAssistant || hasPermission(permissions, 'announcements', 'can_edit')) && (
                        <Link href={`/dashboard/teacher/announcements/${ann.id}/edit`} className="p-1.5 rounded-lg hover:bg-yellow-400/20 text-yellow-400"><Icons.Edit className="h-4 w-4" /></Link>
                      )}
                      {(!isAssistant || hasPermission(permissions, 'announcements', 'can_delete')) && (
                        <button onClick={() => handleDelete(ann.id)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400"><Icons.Trash2 className="h-4 w-4" /></button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* مودال إنشاء إعلان (يبقى كما هو دون تغيير) */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowModal(false)}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className={`${styles.card} border ${styles.border} rounded-3xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto`}
              onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">📢 إعلان جديد</h2>
                <button onClick={() => setShowModal(false)} className={`p-2 rounded-xl hover:bg-white/5 ${styles.subtext}`}><Icons.X className="h-6 w-6" /></button>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <form onSubmit={handleCreate} className="lg:col-span-2 space-y-4">
                  <div>
                    <label className={`block text-sm font-medium ${styles.label} mb-1.5`}>العنوان <span className="text-red-400">*</span></label>
                    <input value={title} onChange={e => setTitle(e.target.value)} placeholder="عنوان الإعلان" className={`w-full p-3 ${styles.input} border ${styles.border} rounded-xl`} required />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium ${styles.label} mb-1.5`}>المحتوى <span className="text-red-400">*</span></label>
                    <textarea value={body} onChange={e => setBody(e.target.value)} rows={4} placeholder="نص الإعلان" className={`w-full p-3 ${styles.input} border ${styles.border} rounded-xl resize-none`} required />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium ${styles.label} mb-2`}>الجمهور المستهدف</label>
                    <div className="flex gap-4 mb-3">
                      {['all', 'course', 'grade'].map(type => (
                        <label key={type} className="flex items-center gap-1 cursor-pointer">
                          <input type="radio" name="target" checked={targetType === type} onChange={() => setTargetType(type)} className="accent-yellow-400" />
                          <span className={`text-sm ${styles.text}`}>{type === 'all' ? 'الكل' : type === 'course' ? 'كورس' : 'مرحلة'}</span>
                        </label>
                      ))}
                    </div>
                    {targetType === 'course' && (
                      <select value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)} className={`w-full p-2.5 ${styles.input} border ${styles.border} rounded-xl`}>
                        <option value="">اختر كورساً</option>
                        {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                      </select>
                    )}
                    {targetType === 'grade' && (
                      <div className="grid grid-cols-2 gap-3">
                        <select value={gradeStage} onChange={e => { setGradeStage(e.target.value); setGradeLevel(''); }} className={`p-2.5 ${styles.input} border ${styles.border} rounded-xl`}>
                          <option value="">المرحلة</option>
                          {gradeOptions.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                        {gradeStage && (
                          <select value={gradeLevel} onChange={e => setGradeLevel(e.target.value)} className={`p-2.5 ${styles.input} border ${styles.border} rounded-xl`}>
                            <option value="">الصف</option>
                            {gradeLevels.map(l => <option key={l} value={l}>{l}</option>)}
                          </select>
                        )}
                      </div>
                    )}
                  </div>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={publishNow} onChange={e => setPublishNow(e.target.checked)} className="accent-yellow-400 w-4 h-4" />
                    <span className={`text-sm ${styles.text}`}>نشر فوري</span>
                  </label>
                  <div className="flex gap-3 pt-2">
                    <button type="submit" disabled={modalLoading} className="flex-1 py-3 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold rounded-xl hover:scale-[1.02] transition disabled:opacity-70">
                      {modalLoading ? 'جارٍ...' : 'إنشاء الإعلان'}
                    </button>
                    <button type="button" onClick={() => setShowModal(false)} className={`px-6 py-3 ${styles.card} border ${styles.border} rounded-xl`}>إلغاء</button>
                  </div>
                </form>
                <div className="lg:col-span-1">
                  {/* مكون المعاينة (اختصار) */}
                  <div className={`${styles.card} border ${styles.border} rounded-2xl overflow-hidden`}>
                    <div className={`p-4 border-b ${styles.border}`}>
                      <h3 className={`text-lg font-bold ${styles.text}`}>{title || 'عنوان الإعلان'}</h3>
                      <p className={`text-xs ${styles.subtext} mt-1`}><Icons.Users className="h-3 w-3 inline ml-1" />{targetPreview.type === 'all' ? 'جميع الطلاب' : targetPreview.type === 'course' ? `كورس: ${targetPreview.courseTitle}` : `${targetPreview.gradeStage || 'مرحلة'} - الصف ${targetPreview.gradeLevel || ''}`}</p>
                    </div>
                    <div className="p-4"><p className={`text-sm ${styles.subtext}`}>{body || 'محتوى الإعلان سيظهر هنا...'}</p></div>
                    <div className={`p-3 text-center border-t ${styles.border}`}><span className={`text-[10px] ${styles.subtext} opacity-60`}>معاينة الإعلان</span></div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </TeacherLayout>
  );
}