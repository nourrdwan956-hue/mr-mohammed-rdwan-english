'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';
import { useTheme } from '@/lib/hooks/useTheme';
import { toast } from 'react-hot-toast';

// ================================================================
// 🗄️ إدارة قاعدة بيانات IndexedDB للملاحظات
// ================================================================
const DB_NAME = 'StudentNotesDB_V4';
const DB_VERSION = 4;
const STORE_NAME = 'notes';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('created_at', 'created_at', { unique: false });
        store.createIndex('pinned', 'pinned', { unique: false });
        store.createIndex('color', 'color', { unique: false });
      } else {
        const store = event.target.transaction.objectStore(STORE_NAME);
        if (!store.indexNames.contains('pinned')) {
          store.createIndex('pinned', 'pinned', { unique: false });
        }
        if (!store.indexNames.contains('color')) {
          store.createIndex('color', 'color', { unique: false });
        }
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

const notesDB = {
  async getAll() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },
  async add(note) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.add(note);
      request.onsuccess = () => resolve(note);
      request.onerror = () => reject(request.error);
    });
  },
  async update(id, updates) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const getRequest = store.get(id);
      getRequest.onsuccess = () => {
        const existing = getRequest.result;
        if (!existing) {
          reject(new Error('Note not found'));
          return;
        }
        const updated = { ...existing, ...updates, updated_at: new Date().toISOString() };
        const putRequest = store.put(updated);
        putRequest.onsuccess = () => resolve(updated);
        putRequest.onerror = () => reject(putRequest.error);
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  },
  async delete(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
};

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// ================================================================
// 🎨 ألوان البطاقات المتغيرة (نفس نظام الرئيسية)
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
// 🎨 ألوان الملاحظات (من الكود الأصلي)
// ================================================================
const NOTE_COLORS = [
  { name: 'أصفر', value: 'yellow', bg: 'bg-yellow-100 dark:bg-yellow-900/40', border: 'border-yellow-300 dark:border-yellow-600/50', shadow: 'shadow-yellow-200/50 dark:shadow-yellow-900/30', text: 'text-yellow-800 dark:text-yellow-200' },
  { name: 'أزرق', value: 'blue', bg: 'bg-blue-100 dark:bg-blue-900/40', border: 'border-blue-300 dark:border-blue-600/50', shadow: 'shadow-blue-200/50 dark:shadow-blue-900/30', text: 'text-blue-800 dark:text-blue-200' },
  { name: 'أخضر', value: 'green', bg: 'bg-green-100 dark:bg-green-900/40', border: 'border-green-300 dark:border-green-600/50', shadow: 'shadow-green-200/50 dark:shadow-green-900/30', text: 'text-green-800 dark:text-green-200' },
  { name: 'وردي', value: 'pink', bg: 'bg-pink-100 dark:bg-pink-900/40', border: 'border-pink-300 dark:border-pink-600/50', shadow: 'shadow-pink-200/50 dark:shadow-pink-900/30', text: 'text-pink-800 dark:text-pink-200' },
  { name: 'بنفسجي', value: 'purple', bg: 'bg-purple-100 dark:bg-purple-900/40', border: 'border-purple-300 dark:border-purple-600/50', shadow: 'shadow-purple-200/50 dark:shadow-purple-900/30', text: 'text-purple-800 dark:text-purple-200' },
  { name: 'رمادي', value: 'gray', bg: 'bg-gray-100 dark:bg-gray-800/50', border: 'border-gray-300 dark:border-gray-600/50', shadow: 'shadow-gray-200/50 dark:shadow-gray-900/30', text: 'text-gray-800 dark:text-gray-200' },
  { name: 'برتقالي', value: 'orange', bg: 'bg-orange-100 dark:bg-orange-900/40', border: 'border-orange-300 dark:border-orange-600/50', shadow: 'shadow-orange-200/50 dark:shadow-orange-900/30', text: 'text-orange-800 dark:text-orange-200' },
  { name: 'نعناعي', value: 'teal', bg: 'bg-teal-100 dark:bg-teal-900/40', border: 'border-teal-300 dark:border-teal-600/50', shadow: 'shadow-teal-200/50 dark:shadow-teal-900/30', text: 'text-teal-800 dark:text-teal-200' },
  { name: 'ليموني', value: 'lime', bg: 'bg-lime-100 dark:bg-lime-900/40', border: 'border-lime-300 dark:border-lime-600/50', shadow: 'shadow-lime-200/50 dark:shadow-lime-900/30', text: 'text-lime-800 dark:text-lime-200' },
  { name: 'خزامي', value: 'lavender', bg: 'bg-purple-100 dark:bg-purple-900/40', border: 'border-purple-300 dark:border-purple-600/50', shadow: 'shadow-purple-200/50 dark:shadow-purple-900/30', text: 'text-purple-800 dark:text-purple-200' },
  { name: 'كرزي', value: 'cherry', bg: 'bg-red-100 dark:bg-red-900/40', border: 'border-red-300 dark:border-red-600/50', shadow: 'shadow-red-200/50 dark:shadow-red-900/30', text: 'text-red-800 dark:text-red-200' },
];

const EMOJIS = ['📝', '💡', '🎯', '⭐', '🔥', '💪', '🧠', '📌', '🎨', '💎', '🚀', '💫', '🌟', '🎈', '🏷️', '✏️', '📚', '🔖'];

// ================================================================
// 🌊 مكون الحدود الموجية (Wave Border)
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
// 🪟 نافذة تعديل الملاحظة (مطورة)
// ================================================================
const EditNoteModal = ({ isOpen, onClose, note, onSave, language, styles }) => {
  const [text, setText] = useState(note?.note || '');
  const [color, setColor] = useState(note?.color || 'yellow');
  const [emoji, setEmoji] = useState(note?.emoji || '📝');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (note) {
      setText(note.note || '');
      setColor(note.color || 'yellow');
      setEmoji(note.emoji || '📝');
    }
  }, [note]);

  const handleSave = async () => {
    if (!text.trim()) {
      toast.error(language === 'ar' ? 'المحتوى مطلوب' : 'Content required');
      return;
    }
    setSaving(true);
    try {
      await onSave(note.id, { note: text.trim(), color, emoji });
      onClose();
      toast.success(language === 'ar' ? 'تم تحديث الملاحظة' : 'Note updated');
    } catch (err) {
      toast.error(language === 'ar' ? 'فشل التحديث' : 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20, rotateX: -10 }} animate={{ scale: 1, y: 0, rotateX: 0 }} exit={{ scale: 0.9, y: 20, rotateX: -10 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className={`rounded-3xl p-8 max-w-lg w-full ${styles.card} border ${styles.border} shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className={`font-bold text-2xl ${styles.text}`}>{language === 'ar' ? 'تعديل الملاحظة' : 'Edit Note'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-red-500/20 rounded-lg transition"><Icons.X className="h-6 w-6 text-red-400" /></button>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          placeholder={language === 'ar' ? 'اكتب ملاحظتك...' : 'Write your note...'}
          className={`w-full p-4 text-lg rounded-xl ${styles.input} border ${styles.border} focus:ring-2 focus:ring-yellow-400/50 outline-none resize-none`}
        />
        {/* اختيار الإيموجي */}
        <div className="mt-4">
          <label className={`block text-base font-medium mb-2 ${styles.subtext}`}>
            {language === 'ar' ? 'اختر إيموجي' : 'Choose Emoji'}
          </label>
          <div className="flex flex-wrap gap-2">
            {EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => setEmoji(e)}
                className={`text-3xl transition-all hover:scale-125 ${emoji === e ? 'scale-125 ring-2 ring-yellow-400 rounded-full p-1' : ''}`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>
        {/* اختيار اللون */}
        <div className="mt-4">
          <label className={`block text-base font-medium mb-2 ${styles.subtext}`}>
            {language === 'ar' ? 'اللون' : 'Color'}
          </label>
          <div className="flex flex-wrap gap-2">
            {NOTE_COLORS.map((c) => (
              <button
                key={c.value}
                onClick={() => setColor(c.value)}
                className={`w-10 h-10 rounded-full border-2 transition-all ${c.bg} ${c.border} ${color === c.value ? 'ring-2 ring-yellow-400 scale-110 shadow-lg' : 'hover:scale-105'}`}
                title={c.name}
              />
            ))}
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-4 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold rounded-xl hover:scale-105 transition flex items-center justify-center gap-2 shadow-lg shadow-yellow-400/30 text-lg">
            {saving ? <div className="w-6 h-6 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : <Icons.Save className="h-5 w-5" />}
            {language === 'ar' ? 'حفظ' : 'Save'}
          </button>
          <button onClick={onClose} className={`flex-1 py-4 rounded-xl border ${styles.border} ${styles.card} hover:bg-white/5 transition text-lg font-bold ${styles.text}`}>
            {language === 'ar' ? 'إلغاء' : 'Cancel'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ================================================================
// 🎴 بطاقة الملاحظة (مع Wave Border ومشبك وإيموجي)
// تحسين التباين في الوضع الداكن: نص أبيض على خلفية رمادية داكنة
// ================================================================
const NoteCard = ({ note, onEdit, onDelete, onTogglePin, language, styles, isDark }) => {
  const colorObj = NOTE_COLORS.find(c => c.value === note.color) || NOTE_COLORS[0];
  const rotation = useMemo(() => (Math.random() * 4 - 2), [note.id]);
  const [cardColor, setCardColor] = useState(CARD_COLORS[Math.floor(Math.random() * CARD_COLORS.length)]);

  const handleColorChange = (newColor) => setCardColor(newColor);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8, rotateZ: -5 }}
      animate={{ opacity: 1, scale: 1, rotateZ: rotation }}
      exit={{ opacity: 0, scale: 0.8, rotateZ: 5 }}
      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      <WaveBorderCard initialColor={cardColor.name} onColorChange={handleColorChange}>
        {/* ✅ تحسين الخلفية والتباين: في الداكن نستخدم خلفية رمادية داكنة ونص أبيض */}
        <div className={`relative rounded-2xl border-2 ${colorObj.border} ${isDark ? 'bg-gray-800/90' : colorObj.bg} ${colorObj.shadow} shadow-lg p-6 group overflow-hidden`}>
          {/* مشبك ورق (Clip) في الزاوية العلوية اليمنى */}
          <div className="absolute -top-1 -right-1 rotate-12 opacity-80 group-hover:rotate-0 transition-all duration-300">
            <Icons.Paperclip className="h-8 w-8 text-gray-500 dark:text-gray-400 drop-shadow-md" strokeWidth={1.5} />
          </div>
          
          {/* ظل داخلي خفيف */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none rounded-2xl dark:from-white/5" />
          
          {/* محتوى البطاقة */}
          <div className="relative z-10 flex flex-col h-full min-h-[160px]">
            <div className="flex items-start gap-3">
              <span className="text-3xl flex-shrink-0">{note.emoji || '📝'}</span>
              {/* ✅ النص: في الداكن يكون أبيض مباشرة مع زيادة الوزن للوضوح */}
              <p className={`text-base whitespace-pre-wrap ${isDark ? 'text-white font-medium' : styles.text} leading-relaxed flex-1`}>
                {note.note}
              </p>
            </div>
            
            <div className="mt-4 flex items-center justify-between gap-3 border-t border-black/10 dark:border-white/10 pt-3">
              <div className="flex flex-col text-xs">
                <span className={isDark ? 'text-gray-300' : styles.subtext}>
                  {new Date(note.created_at).toLocaleDateString(
                    language === 'ar' ? 'ar-EG' : 'en-US',
                    { year: 'numeric', month: 'short', day: 'numeric' }
                  )}
                </span>
                {note.updated_at && note.updated_at !== note.created_at && (
                  <span className={`${isDark ? 'text-gray-400' : styles.subtext} italic opacity-60`}>
                    {language === 'ar' ? 'عدل' : 'edited'}
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => onTogglePin(note.id)} className={`p-2 rounded-lg transition ${note.pinned ? 'text-yellow-500' : isDark ? 'text-gray-400 hover:text-yellow-400' : 'text-yellow-500'}`} title={language === 'ar' ? 'تثبيت' : 'Pin'}>
                  <Icons.Pin className={`h-5 w-5 ${note.pinned ? 'fill-yellow-500' : ''}`} />
                </button>
                <button onClick={() => onEdit(note)} className={`p-2 rounded-lg hover:bg-yellow-400/20 transition ${isDark ? 'text-gray-300 hover:text-yellow-400' : 'text-yellow-400'}`} title={language === 'ar' ? 'تعديل' : 'Edit'}>
                  <Icons.Edit className="h-5 w-5" />
                </button>
                <button onClick={() => onDelete(note.id)} className="p-2 rounded-lg hover:bg-red-500/20 transition text-red-400" title={language === 'ar' ? 'حذف' : 'Delete'}>
                  <Icons.Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </WaveBorderCard>
    </motion.div>
  );
};

// ================================================================
// 🏠 الصفحة الرئيسية – نسخة فاخرة مع Wave Border
// ================================================================
export default function StudentNotesPage() {
  const { language, styles, theme } = useTheme();
  const isDark = theme === 'dark';
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [newNoteColor, setNewNoteColor] = useState('yellow');
  const [newNoteEmoji, setNewNoteEmoji] = useState('📝');
  const [adding, setAdding] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterColor, setFilterColor] = useState('all');
  const [showStats, setShowStats] = useState(true);
  const [viewMode, setViewMode] = useState('grid');

  // ألوان متغيرة للرأس والإحصائيات
  const [headerColor, setHeaderColor] = useState(CARD_COLORS[0]);
  const [statsColor, setStatsColor] = useState(CARD_COLORS[1]);

  // جلب البيانات
  const fetchNotes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await notesDB.getAll();
      const sorted = data.sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return new Date(b.created_at) - new Date(a.created_at);
      });
      setNotes(sorted);
    } catch (err) {
      toast.error(language === 'ar' ? 'فشل تحميل الملاحظات' : 'Failed to load notes');
    } finally {
      setLoading(false);
    }
  }, [language]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const sortNotes = (notesList) => {
    return [...notesList].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.created_at) - new Date(a.created_at);
    });
  };

  const filteredNotes = useMemo(() => {
    let result = notes;
    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      result = result.filter(n => n.note.toLowerCase().includes(term));
    }
    if (filterColor !== 'all') {
      result = result.filter(n => n.color === filterColor);
    }
    return sortNotes(result);
  }, [notes, searchTerm, filterColor]);

  const stats = useMemo(() => {
    const total = notes.length;
    const totalWords = notes.reduce((acc, n) => acc + n.note.split(/\s+/).filter(w => w.length > 0).length, 0);
    const pinned = notes.filter(n => n.pinned).length;
    return { total, totalWords, pinned };
  }, [notes]);

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setAdding(true);
    try {
      const newNoteObj = {
        id: generateId(),
        note: newNote.trim(),
        color: newNoteColor,
        emoji: newNoteEmoji,
        pinned: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await notesDB.add(newNoteObj);
      setNotes(prev => sortNotes([newNoteObj, ...prev]));
      setNewNote('');
      setNewNoteColor('yellow');
      setNewNoteEmoji('📝');
      toast.success(language === 'ar' ? 'تمت الإضافة' : 'Added');
    } catch (err) {
      toast.error(language === 'ar' ? 'فشل الإضافة' : 'Add failed');
    } finally {
      setAdding(false);
    }
  };

  const handleEditClick = (note) => {
    setEditingNote(note);
    setIsEditModalOpen(true);
  };

  const handleUpdateNote = async (id, updates) => {
    await notesDB.update(id, updates);
    setNotes(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, ...updates, updated_at: new Date().toISOString() } : n);
      return sortNotes(updated);
    });
  };

  const handleDeleteNote = async (id) => {
    if (!window.confirm(language === 'ar' ? 'هل أنت متأكد من الحذف؟' : 'Are you sure?')) return;
    try {
      await notesDB.delete(id);
      setNotes(prev => sortNotes(prev.filter(n => n.id !== id)));
      toast.success(language === 'ar' ? 'تم الحذف' : 'Deleted');
    } catch (err) {
      toast.error(language === 'ar' ? 'فشل الحذف' : 'Delete failed');
    }
  };

  const handleTogglePin = async (id) => {
    const note = notes.find(n => n.id === id);
    if (!note) return;
    const newPinned = !note.pinned;
    await notesDB.update(id, { pinned: newPinned });
    setNotes(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, pinned: newPinned } : n);
      return sortNotes(updated);
    });
    toast.success(newPinned ? (language === 'ar' ? 'تم التثبيت' : 'Pinned') : (language === 'ar' ? 'تم إلغاء التثبيت' : 'Unpinned'));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
          <p className={`text-base ${styles.subtext}`}>{language === 'ar' ? 'جاري التحميل...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${styles.bg} transition-colors duration-300 relative overflow-hidden`}>
      {/* خلفية متحركة */}
      <motion.div
        animate={{ x: ['-5%', '5%', '-5%'], y: ['-5%', '5%', '-5%'] }}
        transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
        className="fixed -top-60 -right-60 w-[800px] h-[800px] bg-blue-500/5 dark:bg-blue-400/5 rounded-full blur-3xl pointer-events-none"
      />
      <motion.div
        animate={{ x: ['5%', '-5%', '5%'], y: ['5%', '-5%', '5%'] }}
        transition={{ duration: 35, repeat: Infinity, ease: 'linear' }}
        className="fixed -bottom-60 -left-60 w-[900px] h-[900px] bg-purple-500/5 dark:bg-purple-400/5 rounded-full blur-3xl pointer-events-none"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8 relative z-10">
        {/* ===== رأس الصفحة مع Wave Border ===== */}
        <WaveBorderCard initialColor={headerColor.name} onColorChange={setHeaderColor}>
          <div className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{ scale: [1, 1.08, 1], boxShadow: ['0 0 0px rgba(59,130,246,0.3)', '0 0 25px rgba(59,130,246,0.5)', '0 0 0px rgba(59,130,246,0.3)'] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                  className="p-3 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-xl"
                >
                  <Icons.StickyNote className="h-8 w-8 text-white" />
                </motion.div>
                <div>
                  <h1 className={`text-3xl md:text-4xl font-black ${styles.text}`}>
                    {language === 'ar' ? 'ملاحظاتي' : 'My Notes'}
                  </h1>
                  <p className={`text-base ${styles.subtext} mt-0.5`}>
                    {language === 'ar' ? 'دون أفكارك وملاحظاتك المهمة.' : 'Jot down your important thoughts.'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowStats(!showStats)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold border ${styles.border} ${styles.card} hover:bg-white/5 transition flex items-center gap-2 ${styles.text}`}
                >
                  <Icons.BarChart3 className="h-5 w-5" />
                  {showStats ? (language === 'ar' ? 'إخفاء الإحصائيات' : 'Hide Stats') : (language === 'ar' ? 'عرض الإحصائيات' : 'Show Stats')}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                  className={`px-4 py-2 rounded-xl text-sm font-bold border ${styles.border} ${styles.card} hover:bg-white/5 transition flex items-center gap-2 ${styles.text}`}
                >
                  {viewMode === 'grid' ? <Icons.List className="h-5 w-5" /> : <Icons.LayoutGrid className="h-5 w-5" />}
                  {viewMode === 'grid' ? (language === 'ar' ? 'قائمة' : 'List') : (language === 'ar' ? 'شبكة' : 'Grid')}
                </motion.button>
              </div>
            </div>
          </div>
        </WaveBorderCard>

        {/* ===== الإحصائيات (مع Wave Border) ===== */}
        {showStats && (
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: language === 'ar' ? 'المجموع' : 'Total', value: stats.total, icon: Icons.StickyNote },
              { label: language === 'ar' ? 'الكلمات' : 'Words', value: stats.totalWords, icon: Icons.Type },
              { label: language === 'ar' ? 'مثبت' : 'Pinned', value: stats.pinned, icon: Icons.Pin },
            ].map((stat, idx) => (
              <WaveBorderCard key={idx} initialColor={CARD_COLORS[idx % CARD_COLORS.length].name}>
                <div className="p-5 flex items-center justify-between">
                  <div>
                    <p className={`text-sm ${styles.subtext}`}>{stat.label}</p>
                    <p className={`text-3xl font-black ${styles.text}`}>{stat.value}</p>
                  </div>
                  <stat.icon className="h-8 w-8 text-blue-500 dark:text-blue-400" />
                </div>
              </WaveBorderCard>
            ))}
          </div>
        )}

        {/* ===== حقل الإضافة والبحث والتصفية (مع Wave Border) ===== */}
        <WaveBorderCard initialColor={CARD_COLORS[2].name}>
          <div className="p-6 space-y-4">
            <div className="flex flex-wrap gap-3">
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder={language === 'ar' ? 'اكتب ملاحظة جديدة...' : 'Write a new note...'}
                rows={2}
                className={`flex-1 min-w-[200px] p-4 text-lg rounded-xl resize-none ${styles.input} border ${styles.border} focus:ring-2 focus:ring-blue-500/40 outline-none`}
              />
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex gap-1">
                  {EMOJIS.slice(0, 6).map((e) => (
                    <button
                      key={e}
                      onClick={() => setNewNoteEmoji(e)}
                      className={`text-2xl transition-all hover:scale-125 ${newNoteEmoji === e ? 'scale-125 ring-2 ring-blue-500 rounded-full p-0.5' : ''}`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
                <div className="flex gap-1">
                  {NOTE_COLORS.slice(0, 6).map((c) => (
                    <button
                      key={c.value}
                      onClick={() => setNewNoteColor(c.value)}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${c.bg} ${c.border} ${newNoteColor === c.value ? 'ring-2 ring-blue-500 scale-110' : 'hover:scale-105'}`}
                      title={c.name}
                    />
                  ))}
                </div>
                <button
                  onClick={handleAddNote}
                  disabled={adding || !newNote.trim()}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold rounded-xl hover:scale-105 transition shadow-lg shadow-blue-500/30 disabled:opacity-50 flex items-center gap-2 text-base"
                >
                  {adding ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Icons.Plus className="h-6 w-6" />}
                  {language === 'ar' ? 'إضافة' : 'Add'}
                </button>
              </div>
            </div>
            {/* البحث والتصفية */}
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex-1 min-w-[150px] relative">
                <Icons.Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={language === 'ar' ? 'بحث...' : 'Search...'}
                  className={`w-full pl-4 pr-10 py-3 rounded-xl text-lg ${styles.input} border ${styles.border} focus:ring-2 focus:ring-blue-500/40 outline-none`}
                />
              </div>
              <select
                value={filterColor}
                onChange={(e) => setFilterColor(e.target.value)}
                className={`px-4 py-3 rounded-xl text-lg ${styles.input} border ${styles.border} focus:ring-2 focus:ring-blue-500/40 outline-none`}
              >
                <option value="all">{language === 'ar' ? 'كل الألوان' : 'All colors'}</option>
                {NOTE_COLORS.map(c => (
                  <option key={c.value} value={c.value}>{c.name}</option>
                ))}
              </select>
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="text-red-400 hover:text-red-300 text-lg">
                  <Icons.X className="h-6 w-6" />
                </button>
              )}
            </div>
          </div>
        </WaveBorderCard>

        {/* ===== قائمة الملاحظات ===== */}
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6' : 'space-y-4'}>
          <AnimatePresence>
            {filteredNotes.length === 0 ? (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className={`col-span-full text-center py-20 rounded-3xl border ${styles.border} ${styles.card}`}>
                <Icons.StickyNote className="h-20 w-20 text-gray-500 mx-auto mb-4" />
                <p className={`text-2xl font-bold ${styles.text}`}>
                  {searchTerm || filterColor !== 'all'
                    ? (language === 'ar' ? 'لا توجد نتائج مطابقة' : 'No matching results')
                    : (language === 'ar' ? 'لا توجد ملاحظات بعد' : 'No notes yet')}
                </p>
                <p className={`text-base ${styles.subtext}`}>
                  {searchTerm || filterColor !== 'all'
                    ? (language === 'ar' ? 'جرب تغيير معايير البحث' : 'Try changing search criteria')
                    : (language === 'ar' ? 'ابدأ بكتابة أول ملاحظة لك!' : 'Start writing your first note!')}
                </p>
              </motion.div>
            ) : (
              filteredNotes.map(note => (
                <NoteCard
                  key={note.id}
                  note={note}
                  onEdit={handleEditClick}
                  onDelete={handleDeleteNote}
                  onTogglePin={handleTogglePin}
                  language={language}
                  styles={styles}
                  isDark={isDark}
                />
              ))
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ===== مودال التعديل ===== */}
      <EditNoteModal
        isOpen={isEditModalOpen}
        onClose={() => { setIsEditModalOpen(false); setEditingNote(null); }}
        note={editingNote}
        onSave={handleUpdateNote}
        language={language}
        styles={styles}
      />
    </div>
  );
}