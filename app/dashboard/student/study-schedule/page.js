'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';
import { useTheme } from '@/lib/hooks/useTheme';
import { toast } from 'react-hot-toast';

// ================================================================
// ألوان البطاقات المتغيرة
// ================================================================
const CARD_COLORS = [
  { name: 'blue', text: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10 dark:bg-blue-400/10', border: 'border-blue-400/30 dark:border-blue-400/20' },
  { name: 'green', text: 'text-green-600 dark:text-green-400', bg: 'bg-green-500/10 dark:bg-green-400/10', border: 'border-green-400/30 dark:border-green-400/20' },
  { name: 'orange', text: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-500/10 dark:bg-orange-400/10', border: 'border-orange-400/30 dark:border-orange-400/20' },
  { name: 'red', text: 'text-red-600 dark:text-red-400', bg: 'bg-red-500/10 dark:bg-red-400/10', border: 'border-red-400/30 dark:border-red-400/20' },
  { name: 'purple', text: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-500/10 dark:bg-purple-400/10', border: 'border-purple-400/30 dark:border-purple-400/20' },
  { name: 'teal', text: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-500/10 dark:bg-teal-400/10', border: 'border-teal-400/30 dark:border-teal-400/20' },
];

const getRandomColor = (exclude = []) => {
  const available = CARD_COLORS.filter(c => !exclude.includes(c.name));
  if (available.length === 0) return CARD_COLORS[0];
  return available[Math.floor(Math.random() * available.length)];
};

// ================================================================
// مكون الحدود الموجية (Wave Border)
// ================================================================
const WaveBorderCard = ({ children, className = '', initialColor = 'blue', onColorChange }) => {
  const [color, setColor] = useState(CARD_COLORS.find(c => c.name === initialColor) || CARD_COLORS[0]);
  const [rotation, setRotation] = useState(0);
  const colorRef = useRef(color);
  const isMounted = useRef(true);

  useEffect(() => {
    colorRef.current = color;
  }, [color]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!isMounted.current) return;
      setRotation(prev => {
        const newRot = prev + 2;
        if (newRot >= 360) {
          const newColor = getRandomColor([colorRef.current.name]);
          setColor(newColor);
          if (onColorChange) onColorChange(newColor);
          return 0;
        }
        return newRot;
      });
    }, 50);
    return () => {
      isMounted.current = false;
      clearInterval(interval);
    };
  }, [onColorChange]);

  const waveColors = [
    `rgba(59, 130, 246, 0.6)`,
    `rgba(37, 99, 235, 0.3)`,
    `rgba(96, 165, 250, 0.5)`,
    `rgba(59, 130, 246, 0.7)`,
    `rgba(37, 99, 235, 0.2)`,
  ];

  const gradientStyle = {
    background: `conic-gradient(from ${rotation}deg, ${waveColors.join(', ')})`,
    borderRadius: '1.5rem',
    padding: '3px',
    WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
    WebkitMaskComposite: 'xor',
    maskComposite: 'exclude',
  };

  return (
    <div className={`relative rounded-3xl overflow-hidden group ${className}`}>
      <div className="absolute inset-0 rounded-3xl" style={gradientStyle} />
      <div className="relative z-10 h-full w-full rounded-3xl backdrop-blur-sm bg-[var(--bg-card)] border border-[var(--border-color)]">
        {children}
      </div>
    </div>
  );
};

// ================================================================
// 🗄️ قاعدة بيانات IndexedDB محلية للجداول
// ================================================================
const DB_NAME = 'StudentSchedulesDB_V5';
const DB_VERSION = 5;
const STORE_NAME = 'schedules';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('created_at', 'created_at', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

const scheduleDB = {
  async getAll() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
      req.onerror = () => reject(req.error);
    });
  },
  async add(schedule) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.add(schedule);
      req.onsuccess = () => resolve(schedule);
      req.onerror = () => reject(req.error);
    });
  },
  async update(id, updates) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const existing = getReq.result;
        if (!existing) return reject(new Error('Not found'));
        const updated = { ...existing, ...updates, updated_at: new Date().toISOString() };
        store.put(updated);
        resolve(updated);
      };
      getReq.onerror = () => reject(getReq.error);
    });
  },
  async delete(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },
};

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// ================================================================
// 📅 دوال التاريخ (توقيت مصر UTC+2)
// ================================================================
function getEgyptNow() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const egyptOffset = 120;
  return new Date(now.getTime() + (offset + egyptOffset) * 60000);
}

function getEgyptDateString(date = getEgyptNow()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getTodayEgypt() {
  return getEgyptDateString(getEgyptNow());
}

function getWeekRange(date) {
  const day = date.getDay();
  const satOffset = day === 6 ? 0 : -(day + 1);
  const sat = new Date(date);
  sat.setDate(date.getDate() + satOffset);
  const week = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(sat);
    d.setDate(sat.getDate() + i);
    week.push(getEgyptDateString(d));
  }
  return week;
}

const DAYS_OF_WEEK = [
  { key: 'sat', ar: 'السبت', en: 'Saturday' },
  { key: 'sun', ar: 'الأحد', en: 'Sunday' },
  { key: 'mon', ar: 'الإثنين', en: 'Monday' },
  { key: 'tue', ar: 'الثلاثاء', en: 'Tuesday' },
  { key: 'wed', ar: 'الأربعاء', en: 'Wednesday' },
  { key: 'thu', ar: 'الخميس', en: 'Thursday' },
  { key: 'fri', ar: 'الجمعة', en: 'Friday' },
];

// ================================================================
// 🧩 مودال إنشاء/تعديل جدول – نسخة فاخرة
// ================================================================
const ScheduleModal = ({ isOpen, onClose, onSave, schedule, language, styles, isDark }) => {
  const [name, setName] = useState(schedule?.name || '');
  const [saving, setSaving] = useState(false);
  const [color, setColor] = useState(CARD_COLORS[0]);

  useEffect(() => { setName(schedule?.name || ''); }, [schedule]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { toast.error(language === 'ar' ? 'الاسم مطلوب' : 'Name required'); return; }
    setSaving(true);
    try {
      if (schedule) await onSave(schedule.id, { name: name.trim() });
      else await onSave(null, { name: name.trim() });
      onClose();
      toast.success(language === 'ar' ? 'تم الحفظ' : 'Saved');
    } catch { toast.error(language === 'ar' ? 'فشل' : 'Failed'); }
    finally { setSaving(false); }
  };

  if (!isOpen) return null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 px-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 30 }} className={`rounded-3xl p-8 max-w-lg w-full ${styles.card} border ${styles.border} shadow-2xl`} onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-2xl bg-gradient-to-br from-${color.name}-400 to-${color.name}-600 shadow-lg`}>
              <Icons.Calendar className={`h-6 w-6 ${color.text}`} />
            </div>
            <h3 className={`text-2xl font-bold ${styles.text}`}>
              {schedule ? (language === 'ar' ? 'تعديل الجدول' : 'Edit Schedule') : (language === 'ar' ? 'إنشاء جدول جديد' : 'Create New Schedule')}
            </h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-red-500/20 rounded-xl transition"><Icons.X className="h-6 w-6 text-red-400" /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <label className={`block text-sm font-semibold mb-2 ${styles.subtext}`}>{language === 'ar' ? 'اسم الجدول' : 'Schedule Name'}</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder={language === 'ar' ? 'مثال: جدول الامتحانات' : 'e.g., Exam Schedule'} className={`w-full p-4 rounded-xl text-lg font-semibold ${styles.input} border ${styles.border} focus:ring-4 focus:ring-${color.name}-400/30 outline-none transition mb-6`} autoFocus />
          <div className="flex gap-4">
            <button type="submit" disabled={saving} className={`flex-1 py-4 bg-gradient-to-r from-${color.name}-400 to-${color.name}-600 text-white font-bold rounded-xl hover:scale-[1.02] transition shadow-xl shadow-${color.name}-400/20 flex items-center justify-center gap-2 text-lg`}>
              {saving ? <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" /> : <Icons.Save className="h-5 w-5" />}{language === 'ar' ? 'حفظ' : 'Save'}
            </button>
            <button type="button" onClick={onClose} className={`flex-1 py-4 rounded-xl border ${styles.border} ${styles.card} hover:bg-white/5 transition text-lg font-bold ${styles.text}`}>{language === 'ar' ? 'إلغاء' : 'Cancel'}</button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

// ================================================================
// 📋 بطاقة مهمة – نسخة فاخرة مع Wave Border
// ================================================================
const TaskCard = ({ task, onUpdate, onDelete, onToggle, disabled, styles, language, isDark }) => {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(task?.text || '');
  const inputRef = useRef(null);
  const [cardColor, setCardColor] = useState(CARD_COLORS[Math.floor(Math.random() * CARD_COLORS.length)]);

  useEffect(() => { setText(task?.text || ''); }, [task?.text]);
  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleSave = () => {
    setEditing(false);
    if (text.trim() !== (task?.text || '')) {
      onUpdate({ text: text.trim() });
    }
  };

  const handleColorChange = (newColor) => setCardColor(newColor);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
      whileHover={{ scale: 1.01 }}
    >
      <WaveBorderCard initialColor={cardColor.name} onColorChange={handleColorChange}>
        <div className={`flex items-start gap-3 p-3 rounded-2xl transition-all duration-200 ${
          task?.done ? 'opacity-60' : ''
        }`}>
          {/* زر الإنجاز */}
          <motion.button
            whileTap={{ scale: 0.8 }}
            onClick={() => !disabled && onToggle()}
            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition ${
              task?.done ? `bg-${cardColor.name}-400 border-${cardColor.name}-400 shadow-lg shadow-${cardColor.name}-400/20` : styles.border
            } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:scale-110'}`}
            disabled={disabled}
          >
            {task?.done && <Icons.Check className="h-3.5 w-3.5 text-black" />}
          </motion.button>

          {/* النص */}
          <div className="flex-1 min-w-0">
            {editing && !disabled ? (
              <input
                ref={inputRef}
                value={text}
                onChange={e => setText(e.target.value)}
                onBlur={handleSave}
                onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') { setEditing(false); setText(task?.text || ''); } }}
                className={`w-full p-2 text-base rounded-lg border-2 focus:ring-2 focus:ring-${cardColor.name}-400/30 outline-none ${
                  isDark ? `bg-gray-800 border-${cardColor.name}-400/50 text-white` : 'bg-white border-gray-300 text-gray-900'
                }`}
                placeholder={language === 'ar' ? 'اكتب المهمة...' : 'Write task...'}
              />
            ) : (
              <div
                onClick={() => !disabled && setEditing(true)}
                className={`w-full p-2 text-base rounded-lg cursor-pointer transition break-words whitespace-normal ${
                  task?.text
                    ? task?.done
                      ? `line-through decoration-2 decoration-${cardColor.name}-400/50 text-gray-400 dark:text-gray-500`
                      : styles.text + ' font-medium'
                    : `${isDark ? 'text-gray-500' : 'text-gray-400'} italic`
                } ${disabled ? 'cursor-not-allowed' : `hover:bg-${cardColor.name}-400/10`}`}
              >
                {task?.text || (language === 'ar' ? 'انقر لإضافة مهمة...' : 'Click to add task...')}
              </div>
            )}
          </div>

          {/* الوقت */}
          <div className={`flex items-center gap-1.5 bg-${cardColor.name}-400/10 rounded-lg px-3 py-1.5 flex-shrink-0 mt-0.5`}>
            <Icons.Clock className={`h-4 w-4 ${cardColor.text}`} />
            <input
              type="time"
              value={task?.time || ''}
              onChange={(e) => onUpdate({ time: e.target.value })}
              className="bg-transparent text-sm font-mono outline-none w-16"
              disabled={disabled}
            />
          </div>

          {/* حذف */}
          <motion.button
            whileTap={{ scale: 0.8 }}
            onClick={() => onDelete()}
            className="text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-red-500/10 rounded-lg flex-shrink-0 mt-0.5"
            title={language === 'ar' ? 'حذف' : 'Delete'}
          >
            <Icons.Trash2 className="h-4 w-4" />
          </motion.button>
        </div>
      </WaveBorderCard>
    </motion.div>
  );
};

// ================================================================
// 🏠 الصفحة الرئيسية – نسخة فاخرة مع إصلاح Hooks
// ================================================================
export default function StudentStudySchedulePage() {
  const { theme, language, styles } = useTheme();
  const isDark = theme === 'dark';
  const [schedules, setSchedules] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [viewMode, setViewMode] = useState('weekly');
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState(getTodayEgypt());
  const [entries, setEntries] = useState({});

  // ألوان متغيرة للبطاقات الرئيسية
  const [headerColor, setHeaderColor] = useState(CARD_COLORS[0]);
  const [dailyCardColor, setDailyCardColor] = useState(CARD_COLORS[2]);

  const today = getTodayEgypt();

  // ===== حساب أيام الأسبوع =====
  const weekDays = useMemo(() => {
    const now = getEgyptNow();
    now.setDate(now.getDate() + weekOffset * 7);
    return getWeekRange(now);
  }, [weekOffset]);

  // ===== حالة ألوان الأيام (مصفوفة) – تم إصلاح مشكلة Hooks =====
  const [dayColors, setDayColors] = useState(() => {
    return weekDays.map((_, idx) => CARD_COLORS[idx % CARD_COLORS.length]);
  });

  // عند تغير weekDays (بتغير weekOffset) نعيد تعيين الألوان
  useEffect(() => {
    setDayColors(weekDays.map((_, idx) => CARD_COLORS[idx % CARD_COLORS.length]));
  }, [weekDays]);

  const handleDayColorChange = (idx, newColor) => {
    setDayColors(prev => {
      const newArr = [...prev];
      newArr[idx] = newColor;
      return newArr;
    });
  };

  // ===== دوال البيانات =====
  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    try {
      const data = await scheduleDB.getAll();
      setSchedules(data);
      if (data.length > 0 && !activeId) setActiveId(data[0].id);
    } catch { toast.error(language === 'ar' ? 'فشل تحميل الجداول' : 'Failed to load'); }
    finally { setLoading(false); }
  }, [language, activeId]);

  useEffect(() => { fetchSchedules(); }, [fetchSchedules]);

  const activeSchedule = schedules.find(s => s.id === activeId);
  useEffect(() => { setEntries(activeSchedule?.entries || {}); }, [activeSchedule]);

  const saveEntries = async (newEntries) => {
    if (!activeSchedule) return;
    await scheduleDB.update(activeSchedule.id, { entries: newEntries });
    setEntries(newEntries);
  };

  const updateTask = async (dateStr, taskId, updates) => {
    const newEntries = { ...entries };
    if (!newEntries[dateStr]) newEntries[dateStr] = { tasks: [] };
    const idx = newEntries[dateStr].tasks.findIndex(t => t.id === taskId);
    if (idx >= 0) newEntries[dateStr].tasks[idx] = { ...newEntries[dateStr].tasks[idx], ...updates };
    else newEntries[dateStr].tasks.push({ id: taskId, ...updates });
    await saveEntries(newEntries);
  };

  const addTask = async (dateStr) => {
    const newId = generateId();
    await updateTask(dateStr, newId, { text: '', time: '', done: false });
  };

  const deleteTask = async (dateStr, taskId) => {
    const newEntries = { ...entries };
    if (newEntries[dateStr]) {
      newEntries[dateStr].tasks = newEntries[dateStr].tasks.filter(t => t.id !== taskId);
      if (newEntries[dateStr].tasks.length === 0) delete newEntries[dateStr];
    }
    await saveEntries(newEntries);
  };

  const toggleDone = async (dateStr, taskId) => {
    const task = entries[dateStr]?.tasks.find(t => t.id === taskId);
    if (task) await updateTask(dateStr, taskId, { done: !task.done });
  };

  const handleCreate = async (_, data) => {
    const s = { id: generateId(), name: data.name, entries: {}, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    await scheduleDB.add(s);
    setSchedules(prev => [s, ...prev]);
    setActiveId(s.id);
    toast.success(language === 'ar' ? 'تم إنشاء الجدول!' : 'Schedule created!');
  };

  const handleUpdate = async (id, data) => {
    await scheduleDB.update(id, data);
    setSchedules(prev => prev.map(s => s.id === id ? { ...s, ...data } : s));
  };

  const handleDelete = async (id) => {
    if (!window.confirm(language === 'ar' ? 'حذف هذا الجدول نهائياً؟' : 'Permanently delete this schedule?')) return;
    await scheduleDB.delete(id);
    setSchedules(prev => prev.filter(s => s.id !== id));
    if (activeId === id) setActiveId(schedules.length > 1 ? schedules.find(s => s.id !== id)?.id : null);
    toast.success(language === 'ar' ? 'تم الحذف' : 'Deleted');
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
        <p className={`text-sm font-semibold ${styles.subtext}`}>{language === 'ar' ? 'جاري التحميل...' : 'Loading...'}</p>
      </div>
    </div>
  );

  const selectedDateTasks = entries[selectedDay]?.tasks || [];

  return (
    <>
      <style jsx global>{`
        @media print {
          nav, button:not(.print-keep), .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
          .print-only { display: block !important; }
        }
      `}</style>

      <div className={`min-h-screen ${styles.bg} transition-colors duration-300 ${language === 'ar' ? 'font-cairo' : 'font-sans'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
          {/* ===== رأس الصفحة مع Wave Border ===== */}
          <WaveBorderCard initialColor={headerColor.name} onColorChange={setHeaderColor}>
            <div className="p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
                <div className="flex items-center gap-4">
                  <motion.div
                    animate={{ scale: [1, 1.08, 1], boxShadow: ['0 0 0px rgba(59,130,246,0.3)', '0 0 25px rgba(59,130,246,0.5)', '0 0 0px rgba(59,130,246,0.3)'] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                    className="p-3 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-xl"
                  >
                    <Icons.Calendar className="h-8 w-8 text-white" />
                  </motion.div>
                  <div>
                    <h1 className={`text-3xl md:text-4xl font-black tracking-tight ${styles.text}`}>
                      {language === 'ar' ? 'جدول المذاكرة' : 'Study Schedule'}
                    </h1>
                    <p className={`text-base ${styles.subtext} mt-0.5 max-w-xl`}>
                      {language === 'ar'
                        ? 'خطط لأسبوعك ويومك بذكاء. جميع بياناتك محفوظة على جهازك فقط.'
                        : 'Plan your week and day smartly. All data stored locally on your device.'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {activeSchedule && (
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => window.print()} className={`px-4 py-2.5 rounded-xl border ${styles.border} backdrop-blur-xl ${styles.card} hover:bg-white/10 transition flex items-center gap-2 text-sm font-bold shadow-md no-print`}>
                      <Icons.Printer className="h-5 w-5" /> {language === 'ar' ? 'طباعة' : 'Print'}
                    </motion.button>
                  )}
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => { setEditingSchedule(null); setShowModal(true); }} className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold rounded-xl hover:scale-105 transition shadow-lg shadow-blue-500/30 flex items-center gap-2 text-base no-print">
                    <Icons.Plus className="h-5 w-5" /> {language === 'ar' ? 'جدول جديد' : 'New'}
                  </motion.button>
                </div>
              </div>
            </div>
          </WaveBorderCard>

          {/* ===== علامات التبويب ===== */}
          {schedules.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="flex flex-wrap gap-3 no-print">
              {schedules.map(s => (
                <motion.button
                  key={s.id}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setActiveId(s.id)}
                  className={`px-5 py-2.5 rounded-xl text-base font-bold transition-all border ${
                    activeId === s.id
                      ? 'bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-500/30'
                      : `${styles.card} border ${styles.border} ${styles.text} hover:border-blue-400/50`
                  }`}
                >
                  {s.name}
                </motion.button>
              ))}
            </motion.div>
          )}

          {/* ===== أزرار الوضع ===== */}
          {activeSchedule && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex items-center gap-4 no-print">
              <button onClick={() => setViewMode('weekly')} className={`px-5 py-2.5 rounded-xl text-base font-bold transition-all border ${viewMode === 'weekly' ? 'bg-blue-500 text-white border-blue-500 shadow-md shadow-blue-500/30' : `${styles.card} border ${styles.border} ${styles.text} hover:border-blue-400/50`}`}>
                📅 {language === 'ar' ? 'أسبوعي' : 'Weekly'}
              </button>
              <button onClick={() => setViewMode('daily')} className={`px-5 py-2.5 rounded-xl text-base font-bold transition-all border ${viewMode === 'daily' ? 'bg-blue-500 text-white border-blue-500 shadow-md shadow-blue-500/30' : `${styles.card} border ${styles.border} ${styles.text} hover:border-blue-400/50`}`}>
                📆 {language === 'ar' ? 'يومي' : 'Daily'}
              </button>
            </motion.div>
          )}

          {/* ===== المحتوى ===== */}
          <AnimatePresence mode="wait">
            {activeSchedule && viewMode === 'weekly' && (
              <motion.div key="weekly" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.3 }} className="space-y-6">
                {/* التنقل */}
                <div className="flex items-center justify-between no-print">
                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setWeekOffset(w => w - 1)} className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition shadow-md"><Icons.ChevronRight className="h-6 w-6" /></motion.button>
                  <div className="flex items-center gap-4">
                    <span className={`text-lg font-bold ${styles.text}`}>{weekDays[0]}</span>
                    <span className={`text-sm ${styles.subtext}`}>—</span>
                    <span className={`text-lg font-bold ${styles.text}`}>{weekDays[6]}</span>
                  </div>
                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setWeekOffset(w => w + 1)} disabled={weekOffset >= 4} className="p-3 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 transition shadow-md"><Icons.ChevronLeft className="h-6 w-6" /></motion.button>
                </div>

                {/* قائمة الأيام العمودية – كل يوم ببطاقة Wave Border */}
                <div className="space-y-4">
                  {weekDays.map((dateStr, idx) => {
                    const tasks = entries[dateStr]?.tasks || [];
                    const isPast = dateStr < today;
                    const isToday = dateStr === today;
                    const dayName = language === 'ar' ? DAYS_OF_WEEK[idx].ar : DAYS_OF_WEEK[idx].en;
                    // استخدام اللون المخزن في المصفوفة
                    const dayCardColor = dayColors[idx] || CARD_COLORS[0];

                    return (
                      <motion.div
                        key={dateStr}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                      >
                        <WaveBorderCard
                          initialColor={dayCardColor.name}
                          onColorChange={(newColor) => handleDayColorChange(idx, newColor)}
                        >
                          <div className={`p-5 transition-all duration-300 ${isPast ? 'opacity-60' : ''}`}>
                            {isToday && (
                              <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-blue-400/20 to-purple-400/20 blur-md opacity-60 animate-pulse pointer-events-none" />
                            )}
                            <div className="flex flex-col md:flex-row gap-4 relative z-10">
                              {/* معلومات اليوم */}
                              <div className="md:w-40 flex-shrink-0 flex flex-row md:flex-col items-center md:items-start gap-1 md:gap-0">
                                <span className={`text-lg font-bold ${styles.text}`}>{dayName}</span>
                                <span className={`text-sm ${isToday ? `text-${dayCardColor.name}-400 font-bold` : styles.subtext}`}>
                                  {dateStr.slice(5)}
                                  {isToday && ` (${language === 'ar' ? 'اليوم' : 'Today'})`}
                                </span>
                              </div>

                              {/* قائمة المهام */}
                              <div className="flex-1 min-w-0 space-y-2">
                                <AnimatePresence>
                                  {tasks.map(t => (
                                    <TaskCard
                                      key={t.id}
                                      task={t}
                                      onUpdate={(updates) => updateTask(dateStr, t.id, updates)}
                                      onDelete={() => deleteTask(dateStr, t.id)}
                                      onToggle={() => toggleDone(dateStr, t.id)}
                                      disabled={isPast}
                                      styles={styles}
                                      language={language}
                                      isDark={isDark}
                                    />
                                  ))}
                                </AnimatePresence>

                                {/* شريط التقدم */}
                                {(() => {
                                  const done = tasks.filter(t => t.done).length;
                                  const total = tasks.length;
                                  const pct = total > 0 ? (done / total) * 100 : 0;
                                  return total > 0 ? (
                                    <div className="mt-2">
                                      <div className="flex justify-between text-sm mb-1">
                                        <span className={styles.subtext}>{language === 'ar' ? 'مكتمل' : 'Done'}</span>
                                        <span className={`text-${dayCardColor.name}-400 font-bold`}>{done}/{total}</span>
                                      </div>
                                      <div className="w-full h-2 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                                        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} className={`h-full bg-gradient-to-r from-${dayCardColor.name}-400 to-${dayCardColor.name}-600 rounded-full`} />
                                      </div>
                                    </div>
                                  ) : null;
                                })()}

                                {!isPast && (
                                  <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => addTask(dateStr)}
                                    className={`w-full py-2.5 rounded-xl border border-dashed border-${dayCardColor.name}-400/40 text-${dayCardColor.name}-400 hover:bg-${dayCardColor.name}-400/10 transition flex items-center justify-center gap-2 text-sm font-bold no-print`}
                                  >
                                    <Icons.Plus className="h-5 w-5" /> {language === 'ar' ? 'أضف مهمة' : 'Add Task'}
                                  </motion.button>
                                )}
                              </div>
                            </div>
                          </div>
                        </WaveBorderCard>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {activeSchedule && viewMode === 'daily' && (
              <motion.div key="daily" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.3 }} className="space-y-6">
                <div className="flex items-center gap-4 no-print">
                  <input
                    type="date"
                    value={selectedDay}
                    onChange={e => setSelectedDay(e.target.value)}
                    max={today}
                    className={`p-4 rounded-xl text-lg font-bold ${styles.input} border ${styles.border} focus:ring-2 focus:ring-blue-400/30 outline-none shadow-md`}
                  />
                  {selectedDay === today && (
                    <span className="px-5 py-2 rounded-full bg-blue-500/30 text-blue-500 font-bold text-base shadow">{language === 'ar' ? 'اليوم' : 'Today'}</span>
                  )}
                </div>

                <WaveBorderCard initialColor={dailyCardColor.name} onColorChange={setDailyCardColor}>
                  <div className="p-6">
                    <h2 className={`text-2xl font-bold mb-5 ${styles.text} flex items-center gap-3`}>
                      <Icons.Calendar className="h-7 w-7 text-blue-500" />
                      {language === 'ar' ? `مهام ${selectedDay}` : `Tasks for ${selectedDay}`}
                    </h2>
                    <div className="space-y-3">
                      <AnimatePresence>
                        {selectedDateTasks.map(t => (
                          <TaskCard
                            key={t.id}
                            task={t}
                            onUpdate={(updates) => updateTask(selectedDay, t.id, updates)}
                            onDelete={() => deleteTask(selectedDay, t.id)}
                            onToggle={() => toggleDone(selectedDay, t.id)}
                            disabled={selectedDay < today}
                            styles={styles}
                            language={language}
                            isDark={isDark}
                          />
                        ))}
                      </AnimatePresence>
                      {selectedDay >= today && (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => addTask(selectedDay)}
                          className="w-full py-4 rounded-xl border border-dashed border-blue-400/40 text-blue-500 hover:bg-blue-400/10 transition flex items-center justify-center gap-3 font-bold text-lg no-print"
                        >
                          <Icons.Plus className="h-6 w-6" /> {language === 'ar' ? 'إضافة مهمة جديدة' : 'Add New Task'}
                        </motion.button>
                      )}
                    </div>
                  </div>
                </WaveBorderCard>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ===== إدارة الجدول ===== */}
          {activeSchedule && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="flex gap-4 justify-end no-print">
              <button onClick={() => { setEditingSchedule(activeSchedule); setShowModal(true); }} className={`px-4 py-2 rounded-xl text-sm font-bold border ${styles.border} ${styles.card} hover:bg-white/5 transition flex items-center gap-2 ${styles.text} shadow`}>
                <Icons.Edit className="h-4 w-4" /> {language === 'ar' ? 'تعديل الاسم' : 'Rename'}
              </button>
              <button onClick={() => handleDelete(activeSchedule.id)} className="px-4 py-2 rounded-xl text-sm font-bold bg-red-500/10 text-red-400 hover:bg-red-500/20 transition flex items-center gap-2 shadow">
                <Icons.Trash2 className="h-4 w-4" /> {language === 'ar' ? 'حذف' : 'Delete'}
              </button>
            </motion.div>
          )}
        </div>

        <ScheduleModal
          isOpen={showModal}
          onClose={() => { setShowModal(false); setEditingSchedule(null); }}
          onSave={(id, data) => { if (id) handleUpdate(id, data); else handleCreate(null, data); }}
          schedule={editingSchedule}
          language={language}
          styles={styles}
          isDark={isDark}
        />
      </div>
    </>
  );
}