'use client';

// ================================================================
// 📝 المسار: app/dashboard/assistant/notes/page.js
// صفحة الملاحظات المتكاملة – قائمة، إضافة، تعديل، حذف (نسخة المساعد)
// ================================================================
// الميزات:
// - عرض جميع ملاحظات المساعد عن طلابه (خاصة بالمساعد فقط).
// - إحصائيات سريعة (الإجمالي، هذا الأسبوع).
// - فلترة حسب الكورس، بحث في النص أو اسم الطالب.
// - إجراءات سريعة: تعديل، حذف (حسب الصلاحية).
// - مودال إضافة ملاحظة جديدة (اختيار طالب، كورس، نص).
// - مودال تعديل ملاحظة.
// - دعم الصلاحيات (معلم/مساعد).
// - تصميم فاخر متجاوب مع الثيم.
// ================================================================
import React from 'react';
import { AssistantLayout } from '@/components/AssistantLayout';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useMemo, useCallback } from 'react';
import * as Icons from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { getCachedAssistantPermissions, hasPermission } from '@/lib/permissions';
import { useTheme } from '@/lib/hooks/useTheme';

// ----- الصفحة الرئيسية -----
export default function AssistantNotesPage() {
  const router = useRouter();
  const { theme, styles } = useTheme(); // ✅ استخدام الثيم الموحد
  const [user, setUser] = useState(null);
  const [notes, setNotes] = useState([]);
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState(null);
  const [isAssistant, setIsAssistant] = useState(false);

  // فلترة وبحث
  const [search, setSearch] = useState('');
  const [filterCourse, setFilterCourse] = useState('all');

  // مودالات
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editNote, setEditNote] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  // حقول إضافة
  const [newStudent, setNewStudent] = useState('');
  const [newCourse, setNewCourse] = useState('');
  const [newNoteText, setNewNoteText] = useState('');

  // ----- جلب البيانات -----
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user: u } } = await sessionStorage.getUser();
      if (!u) { router.push('/login'); return; }
      setUser(u);

      const perms = await getCachedAssistantPermissions(u.id);
      if (perms !== null) { setIsAssistant(true); setPermissions(perms); }
      else setIsAssistant(false);

      if (isAssistant && !hasPermission(perms, 'notes', 'can_view')) {
        toast.error('غير مصرح لك بمشاهدة هذه الصفحة');
        router.push('/dashboard/assistant');
        return;
      }

      // جلب الملاحظات مع الطالب والكورس
      const { data: notesData, error } = await supabase
        .from('student_notes')
        .select('*, student:profiles!student_notes_student_id_fkey(full_name, email), course:courses(title)')
        .eq('teacher_id', u.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotes(notesData || []);

      // جلب الطلاب (لإضافة ملاحظة)
      const { data: studentsData } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('role', 'student')
        .order('full_name');
      setStudents(studentsData || []);

      // جلب الكورسات
      const { data: coursesData } = await supabase
        .from('courses')
        .select('id, title')
        .eq('teacher_id', u.id)
        .order('title');
      setCourses(coursesData || []);

    } catch (err) {
      console.error(err);
      toast.error('فشل جلب البيانات');
    } finally {
      setLoading(false);
    }
  }, [router, isAssistant, permissions]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ----- عمليات -----
  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newStudent || !newNoteText.trim()) { toast.error('الطالب والنص مطلوبان'); return; }
    setModalLoading(true);
    try {
      const { error } = await supabase.from('student_notes').insert({
        student_id: newStudent,
        teacher_id: user.id,
        course_id: newCourse || null,
        note: newNoteText.trim(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      toast.success('تمت إضافة الملاحظة');
      setShowAddModal(false);
      resetAddForm();
      fetchData();
    } catch { toast.error('فشل الإضافة'); }
    finally { setModalLoading(false); }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    if (!editNote || !editNote.note.trim()) return;
    setModalLoading(true);
    try {
      const { error } = await supabase.from('student_notes').update({
        note: editNote.note.trim(),
        course_id: editNote.course_id || null,
        updated_at: new Date().toISOString(),
      }).eq('id', editNote.id);
      if (error) throw error;
      toast.success('تم التحديث');
      setShowEditModal(false);
      fetchData();
    } catch { toast.error('فشل التحديث'); }
    finally { setModalLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('هل أنت متأكد من حذف هذه الملاحظة؟')) return;
    const { error } = await supabase.from('student_notes').delete().eq('id', id);
    if (error) { toast.error('فشل الحذف'); return; }
    setNotes(prev => prev.filter(n => n.id !== id));
    toast.success('تم الحذف');
  };

  const openEditModal = (note) => {
    setEditNote({ ...note });
    setShowEditModal(true);
  };

  const resetAddForm = () => {
    setNewStudent('');
    setNewCourse('');
    setNewNoteText('');
  };

  // ----- إحصائيات وفلترة -----
  const stats = useMemo(() => {
    const total = notes.length;
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const thisWeek = notes.filter(n => new Date(n.created_at) >= oneWeekAgo).length;
    return { total, thisWeek };
  }, [notes]);

  const filtered = useMemo(() => {
    let result = notes;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(n => n.note?.toLowerCase().includes(q) || n.student?.full_name?.toLowerCase().includes(q));
    }
    if (filterCourse !== 'all') result = result.filter(n => n.course_id === filterCourse);
    return result;
  }, [notes, search, filterCourse]);

  if (loading) return (
    <AssistantLayout><div className="min-h-screen flex items-center justify-center"><div className="w-12 h-12 border-4 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" /></div></AssistantLayout>
  );

  return (
    <AssistantLayout>
      <div className={`min-h-screen ${styles.bg} ${styles.text} p-4 md:p-6`}>
        <div className="max-w-7xl mx-auto">
          {/* الهيدر */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-extrabold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">📝 الملاحظات</h1>
              <p className={`${styles.subtext} text-sm mt-1`}>ملاحظات خاصة عن الطلاب (لا تظهر لهم)</p>
            </div>
            <div className="flex gap-3 mt-3 md:mt-0">
              {(!isAssistant || hasPermission(permissions, 'notes', 'can_create')) && (
                <button onClick={() => setShowAddModal(true)} className="px-5 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-xl hover:scale-105 transition shadow-lg flex items-center gap-2">
                  <Icons.Plus className="h-5 w-5" /> ملاحظة جديدة
                </button>
              )}
              <button onClick={fetchData} className={`p-2 rounded-xl ${styles.card} border ${styles.border}`}><Icons.RefreshCw className="h-5 w-5" /></button>
              <button onClick={() => router.push('/dashboard/assistant')} className="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-xl text-sm flex items-center gap-1">
                <Icons.LayoutDashboard className="h-4 w-4" /> لوحة التحكم
              </button>
            </div>
          </div>

          {/* إحصائيات */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {[
              { label: 'الإجمالي', value: stats.total, color: 'text-blue-400' },
              { label: 'هذا الأسبوع', value: stats.thisWeek, color: 'text-green-400' },
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
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث في الملاحظات أو اسم الطالب..." className={`w-full p-2.5 pr-10 ${styles.input} border ${styles.border} rounded-xl`} />
            </div>
            <select value={filterCourse} onChange={e => setFilterCourse(e.target.value)} className={`p-2.5 ${styles.input} border ${styles.border} rounded-xl`}>
              <option value="all">جميع الكورسات</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </div>

          {/* قائمة الملاحظات */}
          {filtered.length === 0 ? (
            <div className="text-center py-20"><Icons.StickyNote className="h-16 w-16 text-gray-500 mx-auto mb-4" /><p className="text-lg">لا توجد ملاحظات</p></div>
          ) : (
            <div className="space-y-3">
              {filtered.map(note => (
                <motion.div key={note.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -2 }}
                  className={`${styles.card} border ${styles.border} rounded-2xl p-4`}>
                  <div className="flex flex-col md:flex-row md:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-sm font-bold ${styles.text}`}>{note.student?.full_name || 'طالب'}</span>
                        {note.course?.title && <span className="text-xs text-blue-400">📘 {note.course.title}</span>}
                        <span className="text-[10px] text-gray-400">{new Date(note.created_at).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className={`text-sm ${styles.subtext} line-clamp-2`}>{note.note}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {(!isAssistant || hasPermission(permissions, 'notes', 'can_edit')) && (
                        <button onClick={() => openEditModal(note)} className="p-1.5 rounded-lg hover:bg-yellow-400/20 text-yellow-400"><Icons.Edit className="h-4 w-4" /></button>
                      )}
                      {(!isAssistant || hasPermission(permissions, 'notes', 'can_delete')) && (
                        <button onClick={() => handleDelete(note.id)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400"><Icons.Trash2 className="h-4 w-4" /></button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* مودال إضافة ملاحظة */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowAddModal(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className={`${styles.card} border ${styles.border} rounded-3xl p-6 max-w-md w-full`} onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">📝 ملاحظة جديدة</h3>
                <button onClick={() => setShowAddModal(false)} className={`p-2 rounded-xl hover:bg-white/5 ${styles.subtext}`}><Icons.X className="h-5 w-5" /></button>
              </div>
              <form onSubmit={handleAdd} className="space-y-3">
                <div>
                  <label className={`block text-sm ${styles.label} mb-1`}>الطالب</label>
                  <select value={newStudent} onChange={e => setNewStudent(e.target.value)} className={`w-full p-2.5 ${styles.input} border ${styles.border} rounded-xl`} required>
                    <option value="">اختر طالباً</option>
                    {students.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={`block text-sm ${styles.label} mb-1`}>الكورس (اختياري)</label>
                  <select value={newCourse} onChange={e => setNewCourse(e.target.value)} className={`w-full p-2.5 ${styles.input} border ${styles.border} rounded-xl`}>
                    <option value="">بدون كورس</option>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                </div>
                <div>
                  <label className={`block text-sm ${styles.label} mb-1`}>الملاحظة</label>
                  <textarea value={newNoteText} onChange={e => setNewNoteText(e.target.value)} rows={4} className={`w-full p-2.5 ${styles.input} border ${styles.border} rounded-xl resize-none`} required />
                </div>
                <button type="submit" disabled={modalLoading} className="w-full py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-xl disabled:opacity-50">
                  {modalLoading ? 'جارٍ...' : 'إضافة'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* مودال تعديل ملاحظة */}
      <AnimatePresence>
        {showEditModal && editNote && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowEditModal(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className={`${styles.card} border ${styles.border} rounded-3xl p-6 max-w-md w-full`} onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">✏️ تعديل الملاحظة</h3>
                <button onClick={() => setShowEditModal(false)} className={`p-2 rounded-xl hover:bg-white/5 ${styles.subtext}`}><Icons.X className="h-5 w-5" /></button>
              </div>
              <form onSubmit={handleEdit} className="space-y-3">
                <div>
                  <label className={`block text-sm ${styles.label} mb-1`}>الكورس</label>
                  <select value={editNote.course_id || ''} onChange={e => setEditNote(prev => ({ ...prev, course_id: e.target.value }))} className={`w-full p-2.5 ${styles.input} border ${styles.border} rounded-xl`}>
                    <option value="">بدون كورس</option>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                </div>
                <div>
                  <label className={`block text-sm ${styles.label} mb-1`}>الملاحظة</label>
                  <textarea value={editNote.note} onChange={e => setEditNote(prev => ({ ...prev, note: e.target.value }))} rows={4} className={`w-full p-2.5 ${styles.input} border ${styles.border} rounded-xl resize-none`} required />
                </div>
                <button type="submit" disabled={modalLoading} className="w-full py-2.5 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold rounded-xl disabled:opacity-50">
                  {modalLoading ? 'جارٍ...' : 'تحديث'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AssistantLayout>
  );
}