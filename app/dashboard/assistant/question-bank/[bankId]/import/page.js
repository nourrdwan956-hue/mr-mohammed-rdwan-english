'use client';

// ============================================================
// استيراد أسئلة من ملف – نسخة المساعد (مع صلاحيات)
// ============================================================

import { AssistantLayout } from '@/components/AssistantLayout';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect, useMemo } from 'react';
import * as Icons from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { useTheme } from '@/lib/hooks/useTheme';
import { hasPermission } from '@/lib/permissions';

// ============================================================
// الترجمات (نفس الترجمات من ملف المعلم)
// ============================================================
const translations = {
  ar: {
    title: '📤 استيراد أسئلة',
    subtitle: 'ارفع ملفاً لاستخلاص الأسئلة وإضافتها إلى البنك',
    backToBank: 'العودة إلى البنك',
    chooseFile: 'اختر ملفاً',
    supportedFormats: 'الصيغ المدعومة: PDF, DOCX, TXT, CSV, JSON',
    dragDrop: 'اسحب الملف هنا أو اضغط للاختيار',
    fileSelected: 'تم اختيار الملف:',
    importButton: 'استخلاص الأسئلة',
    extracting: 'جاري الاستخلاص...',
    extractedQuestions: 'الأسئلة المستخلصة',
    questionText: 'نص السؤال',
    type: 'النوع',
    difficulty: 'الصعوبة',
    correctAnswer: 'الإجابة الصحيحة',
    options: 'الخيارات',
    explanation: 'الشرح',
    tags: 'الوسوم',
    saveAll: 'حفظ جميع الأسئلة',
    saving: 'جاري الحفظ...',
    savingSuccess: 'تم حفظ الأسئلة بنجاح',
    savingFailed: 'فشل حفظ الأسئلة',
    noQuestionsExtracted: 'لم يتم استخلاص أي أسئلة',
    edit: 'تعديل',
    delete: 'حذف',
    confirmDeleteQuestion: 'هل أنت متأكد من حذف هذا السؤال؟',
    questionDeleteSuccess: 'تم حذف السؤال',
    selectBank: 'البنك المستهدف',
    themeLight: 'فاتح',
    themeDark: 'داكن',
    language: 'اللغة',
    gold: 'ذهبي',
    blue: 'أزرق',
    green: 'أخضر',
    purple: 'بنفسجي',
    cancel: 'إلغاء',
    close: 'إغلاق',
    noFile: 'لم يتم اختيار ملف',
    invalidFile: 'نوع الملف غير مدعوم',
    extractionFailed: 'فشل استخلاص الأسئلة',
    preview: 'معاينة السؤال',
    emptyBank: 'لا توجد بنوك',
    save: 'حفظ',
    typeMCQ: 'اختيار من متعدد',
    typeTrueFalse: 'صح/خطأ',
    typeShort: 'إجابة قصيرة',
    typeEssay: 'مقالي',
    typeMatching: 'مزاوجة',
    difficultyEasy: 'سهل',
    difficultyMedium: 'متوسط',
    difficultyHard: 'صعب',
    difficultyExpert: 'خبير',
    errorOccurred: 'حدث خطأ',
    retry: 'إعادة المحاولة',
    processing: 'جاري المعالجة...',
    fileSizeExceeded: 'الملف كبير جداً (الحد الأقصى 50 ميجابايت)',
    append: 'إلحاق',
    replace: 'استبدال',
    merge: 'دمج (تجنب المكررات)',
    defaultDifficulty: 'الصعوبة الافتراضية',
    defaultTags: 'وسوم افتراضية',
    pasteText: 'لصق نص',
    extractFromText: 'استخلاص من النص',
    noText: 'لم يتم إدخال نص',
    previewFile: 'معاينة الملف',
    selectAll: 'تحديد الكل',
    deselectAll: 'إلغاء الكل',
    deleteSelected: 'حذف المحدد',
    selectedCount: 'مختار',
    exportExtracted: 'تصدير',
    stepUpload: 'جارٍ تحميل الملف...',
    stepAnalyze: 'جارٍ تحليل النص...',
    stepExtract: 'جارٍ استخلاص الأسئلة...',
    stepDone: 'تم الانتهاء ✅',
    noPermission: 'ليس لديك صلاحية لإضافة أسئلة إلى هذا البنك',
  },
  en: {
    title: '📤 Import Questions',
    subtitle: 'Upload a file to extract questions and add them to the bank',
    backToBank: 'Back to Bank',
    chooseFile: 'Choose a file',
    supportedFormats: 'Supported formats: PDF, DOCX, TXT, CSV, JSON',
    dragDrop: 'Drag and drop your file here or click to select',
    fileSelected: 'File selected:',
    importButton: 'Extract Questions',
    extracting: 'Extracting...',
    extractedQuestions: 'Extracted Questions',
    questionText: 'Question Text',
    type: 'Type',
    difficulty: 'Difficulty',
    correctAnswer: 'Correct Answer',
    options: 'Options',
    explanation: 'Explanation',
    tags: 'Tags',
    saveAll: 'Save All Questions',
    saving: 'Saving...',
    savingSuccess: 'Questions saved successfully',
    savingFailed: 'Failed to save questions',
    noQuestionsExtracted: 'No questions extracted',
    edit: 'Edit',
    delete: 'Delete',
    confirmDeleteQuestion: 'Are you sure you want to delete this question?',
    questionDeleteSuccess: 'Question deleted',
    selectBank: 'Target Bank',
    themeLight: 'Light',
    themeDark: 'Dark',
    language: 'Language',
    gold: 'Gold',
    blue: 'Blue',
    green: 'Green',
    purple: 'Purple',
    cancel: 'Cancel',
    close: 'Close',
    noFile: 'No file selected',
    invalidFile: 'File type not supported',
    extractionFailed: 'Failed to extract questions',
    preview: 'Preview Question',
    emptyBank: 'No banks available',
    save: 'Save',
    typeMCQ: 'Multiple Choice',
    typeTrueFalse: 'True/False',
    typeShort: 'Short Answer',
    typeEssay: 'Essay',
    typeMatching: 'Matching',
    difficultyEasy: 'Easy',
    difficultyMedium: 'Medium',
    difficultyHard: 'Hard',
    difficultyExpert: 'Expert',
    errorOccurred: 'An error occurred',
    retry: 'Retry',
    processing: 'Processing...',
    fileSizeExceeded: 'File too large (max 50 MB)',
    append: 'Append',
    replace: 'Replace',
    merge: 'Merge (Avoid Duplicates)',
    defaultDifficulty: 'Default Difficulty',
    defaultTags: 'Default Tags',
    pasteText: 'Paste Text',
    extractFromText: 'Extract from Text',
    noText: 'No text entered',
    previewFile: 'File Preview',
    selectAll: 'Select All',
    deselectAll: 'Deselect All',
    deleteSelected: 'Delete Selected',
    selectedCount: 'Selected',
    exportExtracted: 'Export',
    stepUpload: 'Uploading file...',
    stepAnalyze: 'Analyzing text...',
    stepExtract: 'Extracting questions...',
    stepDone: 'Done ✅',
    noPermission: 'You do not have permission to add questions to this bank',
  },
};

// ============================================================
// مكون معاينة السؤال (نفسه من ملف المعلم)
// ============================================================
const QuestionPreviewItem = ({ question, index, onEdit, onDelete, language, existingTags }) => {
  const t = translations[language];
  const [isEditing, setIsEditing] = useState(false);
  const [edited, setEdited] = useState(question);

  const handleSaveEdit = () => {
    onEdit(index, edited);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--primary-color)', borderRadius: '12px', padding: '16px', marginBottom: '12px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input type="text" value={edited.question_text} onChange={e => setEdited({...edited, question_text: e.target.value})} style={{ padding: '8px 12px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', outline: 'none', fontSize: '14px' }} placeholder={t.questionText} />
          <input type="text" value={edited.passage || ''} onChange={e => setEdited({...edited, passage: e.target.value})} placeholder="نص تمهيدي (اختياري)" style={{ padding: '8px 12px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', outline: 'none', fontSize: '14px' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <select value={edited.type} onChange={e => setEdited({...edited, type: e.target.value})} style={{ padding: '8px 12px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', outline: 'none', fontSize: '14px' }}>
              <option value="mcq">{t.typeMCQ}</option>
              <option value="truefalse">{t.typeTrueFalse}</option>
              <option value="short">{t.typeShort}</option>
              <option value="essay">{t.typeEssay}</option>
              <option value="matching">{t.typeMatching}</option>
            </select>
            <select value={edited.difficulty} onChange={e => setEdited({...edited, difficulty: e.target.value})} style={{ padding: '8px 12px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', outline: 'none', fontSize: '14px' }}>
              <option value="easy">{t.difficultyEasy}</option>
              <option value="medium">{t.difficultyMedium}</option>
              <option value="hard">{t.difficultyHard}</option>
              <option value="expert">{t.difficultyExpert}</option>
            </select>
          </div>
          <input type="text" value={edited.options?.join(', ')} onChange={e => setEdited({...edited, options: e.target.value.split(',').map(s => s.trim()).filter(Boolean)})} style={{ padding: '8px 12px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', outline: 'none', fontSize: '14px' }} placeholder={t.options} />
          <input type="text" value={edited.correct_answer} onChange={e => setEdited({...edited, correct_answer: e.target.value})} style={{ padding: '8px 12px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', outline: 'none', fontSize: '14px' }} placeholder={t.correctAnswer} />
          <input type="text" value={edited.explanation} onChange={e => setEdited({...edited, explanation: e.target.value})} style={{ padding: '8px 12px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', outline: 'none', fontSize: '14px' }} placeholder={t.explanation} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <input type="number" value={edited.marks || 1} onChange={e => setEdited({...edited, marks: parseFloat(e.target.value) || 1})} placeholder="العلامة" style={{ padding: '8px 12px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', outline: 'none', fontSize: '14px' }} />
            <div></div>
          </div>
          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>{t.tags}</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '6px' }}>
              {existingTags.map(tag => (
                <span 
                  key={tag} 
                  onClick={() => {
                    const currentTags = edited.tags || [];
                    if (!currentTags.includes(tag)) {
                      setEdited({...edited, tags: [...currentTags, tag]});
                    }
                  }}
                  style={{ 
                    padding: '4px 10px', 
                    backgroundColor: 'rgba(251,191,36,0.1)', 
                    color: 'var(--primary-color)', 
                    borderRadius: '9999px', 
                    fontSize: '12px', 
                    cursor: 'pointer', 
                    border: '1px solid rgba(251,191,36,0.2)'
                  }}
                >
                  + {tag}
                </span>
              ))}
            </div>
            <input 
              type="text" 
              value={edited.tags?.join(', ') || ''} 
              onChange={e => setEdited({...edited, tags: e.target.value.split(',').map(s => s.trim()).filter(Boolean)})} 
              placeholder="وسوم جديدة (افصل بفاصلة)" 
              style={{ width: '100%', padding: '8px 12px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', outline: 'none', fontSize: '14px' }} 
            />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={handleSaveEdit} style={{ padding: '6px 16px', backgroundColor: 'var(--primary-color)', color: '#000', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>{t.save}</button>
            <button onClick={() => setIsEditing(false)} style={{ padding: '6px 16px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer', color: 'var(--text-primary)', fontSize: '13px' }}>{t.cancel}</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '14px 16px', marginBottom: '10px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>{question.question_text}</p>
        {question.passage && (
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px', padding: '6px 10px', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: '6px', borderLeft: '3px solid var(--primary-color)' }}>
            <Icons.FileText style={{ height: 14, width: 14, display: 'inline', marginRight: '4px' }} />
            {question.passage.substring(0, 100)}...
          </div>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px', fontSize: '13px', color: 'var(--text-muted)' }}>
          <span style={{ padding: '2px 12px', backgroundColor: 'rgba(251,191,36,0.1)', borderRadius: '9999px', color: 'var(--primary-color)' }}>{question.type}</span>
          <span style={{ padding: '2px 12px', backgroundColor: 'rgba(251,191,36,0.1)', borderRadius: '9999px', color: 'var(--primary-color)' }}>{question.difficulty}</span>
          {question.correct_answer && <span style={{ color: '#22c55e' }}>✓ {question.correct_answer}</span>}
          {question.tags && question.tags.length > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Icons.Tag style={{ height: 14, width: 14 }} /> {question.tags.join(', ')}</span>}
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{question.marks || 1} نقطة</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
        <button onClick={() => setIsEditing(true)} style={{ padding: '6px', borderRadius: '8px', border: 'none', backgroundColor: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}><Icons.Edit style={{ height: 18, width: 18 }} /></button>
        <button onClick={() => onDelete(index)} style={{ padding: '6px', borderRadius: '8px', border: 'none', backgroundColor: 'transparent', color: '#ef4444', cursor: 'pointer' }}><Icons.Trash2 style={{ height: 18, width: 18 }} /></button>
      </div>
    </div>
  );
};

// ============================================================
// الصفحة الرئيسية للمساعد
// ============================================================
export default function AssistantImportQuestionsPage() {
  const router = useRouter();
  const params = useParams();
  const bankId = params?.bankId;

  // استخدام useTheme لإدارة الثيم واللغة
  const { theme, toggleTheme, language, toggleLanguage, styles } = useTheme();
  const t = translations[language];

  // حالة الصلاحيات وبيانات المساعد
  const [assistantId, setAssistantId] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [hasCreatePermission, setHasCreatePermission] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // حالات الملف والأسئلة
  const [file, setFile] = useState(null);
  const [extractedQuestions, setExtractedQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bankName, setBankName] = useState('');
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [filePreview, setFilePreview] = useState('');
  const [existingTags, setExistingTags] = useState([]);
  const [selectedIndices, setSelectedIndices] = useState([]);
  const [importMode, setImportMode] = useState('append');
  const [defaultDifficulty, setDefaultDifficulty] = useState('medium');
  const [defaultTags, setDefaultTags] = useState('');
  const [textInput, setTextInput] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);

  // جلب بيانات المساعد والصلاحيات من sessionStorage
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
        // جلب الصلاحيات من sessionStorage (تم تخزينها في layout)
        const perms = JSON.parse(sessionStorage.getItem('assistantPermissions') || '[]');
        setPermissions(perms);
        // التحقق من صلاحية can_create على وحدة question_bank
        const canCreate = hasPermission(perms, 'question_bank', 'can_create');
        setHasCreatePermission(canCreate);
        if (!canCreate) {
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

  // جلب اسم البنك والوسوم
  useEffect(() => {
    const fetchBankData = async () => {
      if (!bankId || !assistantId || !hasCreatePermission) return;
      try {
        const { data, error } = await supabase
          .from('question_banks')
          .select('title')
          .eq('id', bankId)
          .single();
        if (error) throw error;
        setBankName(data?.title || '');
        
        const { data: tagsData } = await supabase
          .from('question_bank_tags')
          .select('tag')
          .eq('bank_id', bankId);
        if (tagsData) setExistingTags(tagsData.map(row => row.tag));
      } catch (err) {
        console.error('خطأ في جلب بيانات البنك:', err);
      }
    };
    fetchBankData();
  }, [bankId, assistantId, hasCreatePermission]);

  // حساب الإحصائيات
  const stats = useMemo(() => {
    if (extractedQuestions.length === 0) return null;
    const total = extractedQuestions.length;
    const byType = extractedQuestions.reduce((acc, q) => {
      acc[q.type] = (acc[q.type] || 0) + 1;
      return acc;
    }, {});
    const byDifficulty = extractedQuestions.reduce((acc, q) => {
      acc[q.difficulty] = (acc[q.difficulty] || 0) + 1;
      return acc;
    }, {});
    return { total, byType, byDifficulty };
  }, [extractedQuestions]);

  // معاينة الملف
  const handleFilePreview = async (file) => {
    try {
      const text = await file.text();
      const preview = text.substring(0, 500) + (text.length > 500 ? '...' : '');
      setFilePreview(preview);
    } catch {
      setFilePreview('لا يمكن معاينة هذا الملف (غير نصي)');
    }
  };

  // معالجة رفع الملف
  const handleFileChange = async (e) => {
    const selected = e.target.files[0];
    if (!selected) return;
    const maxSize = 50 * 1024 * 1024;
    if (selected.size > maxSize) {
      toast.error(t.fileSizeExceeded);
      return;
    }
    const validExtensions = ['pdf', 'docx', 'txt', 'csv', 'json'];
    const ext = selected.name.split('.').pop().toLowerCase();
    if (!validExtensions.includes(ext)) {
      toast.error(t.invalidFile);
      return;
    }
    setFile(selected);
    setExtractedQuestions([]);
    await handleFilePreview(selected);
  };

  // استخلاص الأسئلة عبر API
  const handleExtract = async () => {
    if (!file) {
      toast.error(t.noFile);
      return;
    }
    setLoading(true);
    setCurrentStep(1);
    setProgress(10);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error('لم يتم العثور على رمز المصادقة. يرجى تسجيل الدخول مرة أخرى.');
      }

      setCurrentStep(2);
      setProgress(40);

      const response = await fetch('/api/extract-questions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      setCurrentStep(3);
      setProgress(80);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t.extractionFailed);
      }

      setCurrentStep(4);
      setProgress(100);
      if (data.questions.length === 0) {
        toast.error(t.noQuestionsExtracted);
        setExtractedQuestions([]);
      } else {
        const questionsWithDefaults = data.questions.map(q => ({
          ...q,
          difficulty: q.difficulty || defaultDifficulty,
          tags: q.tags || (defaultTags ? defaultTags.split(',').map(s => s.trim()).filter(Boolean) : []),
        }));
        setExtractedQuestions(questionsWithDefaults);
        toast.success(`تم استخلاص ${data.count} سؤال بنجاح`);
      }
    } catch (err) {
      console.error(err);
      let msg = t.extractionFailed;
      if (err.message.includes('no text')) msg = 'الملف فارغ أو لا يحتوي على نصوص صالحة';
      else if (err.message.includes('format')) msg = 'صيغة الأسئلة غير معروفة، يرجى التأكد من التنسيق (مثال: 1. سؤال؟)';
      else if (err.message.includes('network')) msg = 'حدث خطأ في الاتصال بالخادم، يرجى المحاولة مرة أخرى';
      toast.error(msg);
      setExtractedQuestions([]);
    } finally {
      setLoading(false);
      setProgress(0);
      setCurrentStep(0);
    }
  };

  // استخلاص من النص المباشر
  const handleTextExtract = async () => {
    if (!textInput.trim()) {
      toast.error('الرجاء إدخال النص');
      return;
    }
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/extract-questions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: textInput }),
      });
      const data = await response.json();
      if (response.ok && data.questions) {
        const questionsWithDefaults = data.questions.map(q => ({
          ...q,
          difficulty: q.difficulty || defaultDifficulty,
          tags: q.tags || (defaultTags ? defaultTags.split(',').map(s => s.trim()).filter(Boolean) : []),
        }));
        setExtractedQuestions(questionsWithDefaults);
        toast.success(`تم استخلاص ${data.count} سؤال`);
        setTextInput('');
        setShowTextInput(false);
      } else {
        throw new Error(data.error || 'فشل الاستخلاص');
      }
    } catch (err) {
      toast.error(err.message || 'فشل الاستخلاص');
    } finally {
      setLoading(false);
    }
  };

  // تعديل سؤال
  const handleEditQuestion = (index, newData) => {
    const updated = [...extractedQuestions];
    updated[index] = newData;
    setExtractedQuestions(updated);
  };

  // حذف سؤال
  const handleDeleteQuestion = (index) => {
    if (!confirm(t.confirmDeleteQuestion)) return;
    const updated = extractedQuestions.filter((_, i) => i !== index);
    setExtractedQuestions(updated);
    setSelectedIndices([]);
    toast.success(t.questionDeleteSuccess);
  };

  // تحديد الكل / إلغاء الكل
  const handleSelectAll = () => {
    if (selectedIndices.length === extractedQuestions.length) {
      setSelectedIndices([]);
    } else {
      setSelectedIndices(extractedQuestions.map((_, i) => i));
    }
  };

  // حذف المحدد
  const handleDeleteSelected = () => {
    if (selectedIndices.length === 0) return;
    if (!confirm(`حذف ${selectedIndices.length} سؤال؟`)) return;
    const updated = extractedQuestions.filter((_, i) => !selectedIndices.includes(i));
    setExtractedQuestions(updated);
    setSelectedIndices([]);
    toast.success(`تم حذف ${selectedIndices.length} سؤال`);
  };

  // حفظ جميع الأسئلة (مع مراعاة وضع الاستيراد)
  const handleSaveAll = async () => {
    if (extractedQuestions.length === 0) {
      toast.error(t.noQuestionsExtracted);
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('يجب تسجيل الدخول');

      let questionsToInsert = extractedQuestions.map(q => ({
        bank_id: bankId,
        question_text: q.question_text,
        type: q.type || 'mcq',
        difficulty: q.difficulty || 'medium',
        options: q.options || [],
        correct_answer: q.correct_answer || '',
        explanation: q.explanation || '',
        tags: q.tags || [],
        marks: q.marks || 1,
        passage: q.passage || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      // معالجة وضع الاستيراد
      if (importMode === 'replace') {
        const { error: deleteError } = await supabase
          .from('questions')
          .delete()
          .eq('bank_id', bankId);
        if (deleteError) throw deleteError;
      } else if (importMode === 'merge') {
        const { data: existing } = await supabase
          .from('questions')
          .select('question_text')
          .eq('bank_id', bankId);
        const existingTexts = new Set(existing.map(q => q.question_text.trim()));
        questionsToInsert = questionsToInsert.filter(q => !existingTexts.has(q.question_text.trim()));
        if (questionsToInsert.length === 0) {
          toast.info('جميع الأسئلة موجودة بالفعل، لم يتم إضافة جديد');
          setSaving(false);
          return;
        }
      }

      if (questionsToInsert.length === 0) {
        toast.info('لا توجد أسئلة جديدة للإضافة');
        setSaving(false);
        return;
      }

      const { error } = await supabase
        .from('questions')
        .insert(questionsToInsert);

      if (error) throw error;

      toast.success(`تم حفظ ${questionsToInsert.length} سؤال بنجاح`);
      setExtractedQuestions([]);
      setSelectedIndices([]);
      setFile(null);
      setFilePreview('');
      setTimeout(() => {
        router.push(`/dashboard/assistant/question-bank/${bankId}`);
      }, 1500);
    } catch (err) {
      console.error(err);
      toast.error(err.message || t.savingFailed);
    } finally {
      setSaving(false);
    }
  };

  // تصدير الأسئلة المستخلصة
  const handleExportExtracted = () => {
    if (extractedQuestions.length === 0) {
      toast.error(t.noQuestionsExtracted);
      return;
    }
    const dataStr = JSON.stringify(extractedQuestions, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `questions_export_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('تم التصدير بنجاح');
  };

  // إذا كان التحميل جارياً أو لا يوجد صلاحية، نعرض شاشة تحميل أو رسالة
  if (loadingAuth) {
    return (
      <AssistantLayout>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: 'var(--bg-primary)' }}>
          <div style={{ color: 'var(--text-primary)' }}>جاري التحقق من الصلاحيات...</div>
        </div>
      </AssistantLayout>
    );
  }

  if (!hasCreatePermission) {
    return (
      <AssistantLayout>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: 'var(--bg-primary)' }}>
          <div style={{ color: 'var(--text-primary)' }}>{t.noPermission}</div>
        </div>
      </AssistantLayout>
    );
  }

  // ===== العرض الرئيسي =====
  return (
    <AssistantLayout>
      <div style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', minHeight: '100vh', transition: 'all 0.3s' }}>
        <div style={{ maxWidth: '1024px', margin: '0 auto', padding: '20px' }}>
          {/* الرأس */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <Link href={`/dashboard/assistant/question-bank/${bankId}`} style={{ color: 'var(--text-muted)', transition: 'color 0.2s' }}>
              <Icons.ArrowRight style={{ height: 24, width: 24 }} />
            </Link>
            <div>
              <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{t.title}</h1>
              <p style={{ fontSize: '15px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                {t.subtitle} <span style={{ fontWeight: 600, color: 'var(--primary-color)' }}>{bankName}</span>
              </p>
            </div>
          </div>

          {/* خيارات الاستيراد المتقدمة */}
          <div style={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            alignItems: 'center', 
            gap: '16px', 
            padding: '12px 16px', 
            backgroundColor: 'rgba(255,255,255,0.03)', 
            borderRadius: '12px', 
            marginBottom: '16px',
            border: '1px solid var(--border-color)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>وضع الاستيراد:</span>
              <select value={importMode} onChange={(e) => setImportMode(e.target.value)} style={{ padding: '6px 12px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', outline: 'none', fontSize: '13px' }}>
                <option value="append">{t.append}</option>
                <option value="replace">{t.replace}</option>
                <option value="merge">{t.merge}</option>
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{t.defaultDifficulty}:</span>
              <select value={defaultDifficulty} onChange={(e) => setDefaultDifficulty(e.target.value)} style={{ padding: '6px 12px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', outline: 'none', fontSize: '13px' }}>
                <option value="easy">{t.difficultyEasy}</option>
                <option value="medium">{t.difficultyMedium}</option>
                <option value="hard">{t.difficultyHard}</option>
                <option value="expert">{t.difficultyExpert}</option>
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{t.defaultTags}:</span>
              <input type="text" value={defaultTags} onChange={(e) => setDefaultTags(e.target.value)} placeholder="رياضيات, جبر" style={{ padding: '6px 12px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', outline: 'none', fontSize: '13px', width: '150px' }} />
            </div>
          </div>

          {/* تبويب رفع / لصق */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '12px' }}>
            <button 
              onClick={() => setShowTextInput(false)} 
              style={{ padding: '6px 16px', borderRadius: '8px', border: showTextInput ? '1px solid var(--border-color)' : '2px solid var(--primary-color)', backgroundColor: showTextInput ? 'transparent' : 'rgba(251,191,36,0.1)', color: showTextInput ? 'var(--text-muted)' : 'var(--primary-color)', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}
            >
              📁 {t.chooseFile}
            </button>
            <button 
              onClick={() => setShowTextInput(true)} 
              style={{ padding: '6px 16px', borderRadius: '8px', border: showTextInput ? '2px solid var(--primary-color)' : '1px solid var(--border-color)', backgroundColor: showTextInput ? 'rgba(251,191,36,0.1)' : 'transparent', color: showTextInput ? 'var(--primary-color)' : 'var(--text-muted)', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}
            >
              📝 {t.pasteText}
            </button>
          </div>

          {/* منطقة رفع الملف */}
          {!showTextInput ? (
            <div
              style={{
                backgroundColor: 'var(--bg-card)',
                border: `2px dashed var(--border-color)`,
                borderRadius: '16px',
                padding: '40px 20px',
                textAlign: 'center',
                marginBottom: '24px',
                transition: 'border-color 0.3s',
                cursor: 'pointer',
              }}
              onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--primary-color)'; }}
              onDragLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; }}
              onDrop={(e) => {
                e.preventDefault();
                const dropped = e.dataTransfer.files[0];
                if (dropped) {
                  const maxSize = 50 * 1024 * 1024;
                  if (dropped.size > maxSize) {
                    toast.error(t.fileSizeExceeded);
                    return;
                  }
                  const ext = dropped.name.split('.').pop().toLowerCase();
                  if (!['pdf', 'docx', 'txt', 'csv', 'json'].includes(ext)) {
                    toast.error(t.invalidFile);
                    return;
                  }
                  setFile(dropped);
                  setExtractedQuestions([]);
                  handleFilePreview(dropped);
                }
              }}
            >
              <input
                type="file"
                id="fileInput"
                style={{ display: 'none' }}
                onChange={handleFileChange}
                accept=".pdf,.docx,.txt,.csv,.json"
              />
              <label htmlFor="fileInput" style={{ cursor: 'pointer', display: 'block' }}>
                <Icons.Upload style={{ height: 48, width: 48, color: 'var(--text-muted)', marginBottom: '12px' }} />
                <p style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>{t.dragDrop}</p>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{t.supportedFormats}</p>
                {file && (
                  <div style={{ marginTop: '12px', padding: '10px 16px', backgroundColor: 'rgba(34,197,94,0.1)', borderRadius: '10px', display: 'inline-block' }}>
                    <Icons.File style={{ height: 18, width: 18, display: 'inline', marginRight: '8px', color: '#22c55e' }} />
                    <span style={{ color: '#22c55e', fontWeight: 600 }}>{file.name}</span>
                  </div>
                )}
              </label>
            </div>
          ) : (
            <div style={{ marginBottom: '16px' }}>
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="الصق النص الذي يحتوي على الأسئلة هنا (مثال: 1. ما هو ...؟)"
                rows={6}
                style={{ width: '100%', padding: '12px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '12px', color: 'var(--text-primary)', outline: 'none', fontSize: '14px', resize: 'vertical' }}
              />
              <button
                onClick={handleTextExtract}
                disabled={loading}
                style={{ marginTop: '8px', padding: '8px 20px', backgroundColor: 'var(--primary-color)', color: '#000', fontWeight: 700, borderRadius: '10px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1 }}
              >
                {loading ? t.extracting : t.extractFromText}
              </button>
            </div>
          )}

          {/* معاينة الملف */}
          {filePreview && !loading && !showTextInput && (
            <div style={{ 
              backgroundColor: 'rgba(255,255,255,0.03)', 
              border: '1px solid var(--border-color)', 
              borderRadius: '12px', 
              padding: '12px 16px', 
              marginBottom: '16px',
              maxHeight: '120px',
              overflowY: 'auto'
            }}>
              <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                <Icons.Eye style={{ height: 14, width: 14, display: 'inline', marginRight: '6px' }} />
                {t.previewFile}:
              </p>
              <pre style={{ fontSize: '12px', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'monospace' }}>{filePreview}</pre>
            </div>
          )}

          {/* شريط التقدم التفصيلي */}
          {loading && progress > 0 && (
            <div style={{ marginBottom: '16px', backgroundColor: 'var(--bg-card)', borderRadius: '10px', padding: '12px 16px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px', color: 'var(--text-muted)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {currentStep <= 3 && <Icons.Loader2 style={{ height: 16, width: 16, animation: 'spin 1s linear infinite' }} />}
                  <span>
                    {currentStep === 1 && t.stepUpload}
                    {currentStep === 2 && t.stepAnalyze}
                    {currentStep === 3 && t.stepExtract}
                    {currentStep === 4 && t.stepDone}
                    {currentStep === 0 && t.processing}
                  </span>
                </span>
                <span>{progress}%</span>
              </div>
              <div style={{ width: '100%', height: '6px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '9999px', overflow: 'hidden', marginTop: '6px' }}>
                <div style={{ width: `${progress}%`, height: '100%', backgroundColor: progress === 100 ? '#22c55e' : 'var(--primary-color)', transition: 'width 0.5s ease, background-color 0.5s' }} />
              </div>
            </div>
          )}

          {/* أزرار الإجراء */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
            {!showTextInput && (
              <button
                onClick={handleExtract}
                disabled={!file || loading || saving}
                style={{
                  padding: '12px 28px',
                  backgroundColor: 'var(--primary-color)',
                  color: '#000',
                  fontWeight: 700,
                  borderRadius: '12px',
                  border: 'none',
                  cursor: (!file || loading || saving) ? 'not-allowed' : 'pointer',
                  opacity: (!file || loading || saving) ? 0.5 : 1,
                  fontSize: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  transition: 'all 0.2s',
                  boxShadow: '0 4px 12px rgba(251,191,36,0.2)',
                }}
              >
                {loading ? <><Icons.Loader2 style={{ height: 20, width: 20, animation: 'spin 1s linear infinite' }} /> {t.extracting}</> : <><Icons.Zap style={{ height: 20, width: 20 }} /> {t.importButton}</>}
              </button>
            )}
            <button
              onClick={() => router.push(`/dashboard/assistant/question-bank/${bankId}`)}
              style={{
                padding: '12px 24px',
                backgroundColor: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                fontSize: '16px',
                transition: 'all 0.2s',
              }}
            >
              {t.cancel}
            </button>
          </div>

          {/* قائمة الأسئلة المستخلصة */}
          {extractedQuestions.length > 0 && (
            <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '20px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Icons.ClipboardList style={{ height: 22, width: 22, color: 'var(--primary-color)' }} />
                  {t.extractedQuestions} ({extractedQuestions.length})
                </h3>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    onClick={handleExportExtracted}
                    disabled={extractedQuestions.length === 0}
                    style={{
                      padding: '8px 14px',
                      backgroundColor: 'rgba(59,130,246,0.12)',
                      color: '#3b82f6',
                      borderRadius: '10px',
                      border: '1px solid rgba(59,130,246,0.2)',
                      cursor: extractedQuestions.length === 0 ? 'not-allowed' : 'pointer',
                      opacity: extractedQuestions.length === 0 ? 0.5 : 1,
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Icons.Download style={{ height: 16, width: 16 }} /> {t.exportExtracted}
                  </button>
                  <button
                    onClick={handleSaveAll}
                    disabled={saving}
                    style={{
                      padding: '8px 18px',
                      backgroundColor: 'var(--primary-color)',
                      color: '#000',
                      fontWeight: 700,
                      borderRadius: '10px',
                      border: 'none',
                      cursor: saving ? 'not-allowed' : 'pointer',
                      opacity: saving ? 0.5 : 1,
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    {saving ? <><Icons.Loader2 style={{ height: 18, width: 18, animation: 'spin 1s linear infinite' }} /> {t.saving}</> : <><Icons.Save style={{ height: 18, width: 18 }} /> {t.saveAll}</>}
                  </button>
                </div>
              </div>

              {/* إحصائيات سريعة */}
              {stats && (
                <div style={{ 
                  display: 'flex', 
                  flexWrap: 'wrap', 
                  gap: '12px', 
                  padding: '12px 16px', 
                  backgroundColor: 'rgba(255,255,255,0.03)', 
                  borderRadius: '10px', 
                  marginBottom: '16px',
                  border: '1px solid var(--border-color)'
                }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    الإجمالي: <span style={{ color: 'var(--primary-color)' }}>{stats.total}</span>
                  </span>
                  {Object.entries(stats.byType).map(([type, count]) => (
                    <span key={type} style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                      {type}: <span style={{ color: 'var(--primary-color)', fontWeight: 600 }}>{count}</span>
                    </span>
                  ))}
                  {Object.entries(stats.byDifficulty).map(([diff, count]) => (
                    <span key={diff} style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                      {diff}: <span style={{ color: 'var(--primary-color)', fontWeight: 600 }}>{count}</span>
                    </span>
                  ))}
                </div>
              )}

              {/* أدوات تحديد وحذف */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px' }}>
                {selectedIndices.length > 0 && (
                  <>
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{selectedIndices.length} {t.selectedCount}</span>
                    <button onClick={handleDeleteSelected} style={{ padding: '4px 12px', backgroundColor: 'rgba(239,68,68,0.12)', color: '#ef4444', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>{t.deleteSelected}</button>
                  </>
                )}
                <button onClick={handleSelectAll} style={{ padding: '4px 12px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '6px', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '12px' }}>
                  {selectedIndices.length === extractedQuestions.length ? t.deselectAll : t.selectAll}
                </button>
              </div>

              {/* قائمة الأسئلة */}
              <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                {extractedQuestions.map((q, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <input 
                      type="checkbox" 
                      checked={selectedIndices.includes(idx)} 
                      onChange={() => {
                        setSelectedIndices(prev =>
                          prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
                        );
                      }} 
                      style={{ marginTop: '14px', accentColor: 'var(--primary-color)', width: 16, height: 16, flexShrink: 0 }} 
                    />
                    <div style={{ flex: 1 }}>
                      <QuestionPreviewItem
                        question={q}
                        index={idx}
                        onEdit={handleEditQuestion}
                        onDelete={handleDeleteQuestion}
                        language={language}
                        existingTags={existingTags}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* نصائح ذكية */}
          <div style={{ backgroundColor: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: '12px', padding: '16px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--primary-color)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Icons.Lightbulb style={{ height: 18, width: 18 }} /> نصائح ذكية للاستيراد
            </h4>
            <ul style={{ fontSize: '13px', color: 'var(--text-muted)', padding: 0, margin: 0, listStyle: 'none' }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}><Icons.CheckCircle style={{ height: 14, width: 14, color: '#22c55e' }} /> استخدم صيغة CSV أو JSON لضمان دقة الاستخلاص</li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}><Icons.CheckCircle style={{ height: 14, width: 14, color: '#22c55e' }} /> تأكد من أن كل سؤال يبدأ برقم (1. أو سؤال 1) لتسهيل التعرف عليه</li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}><Icons.CheckCircle style={{ height: 14, width: 14, color: '#22c55e' }} /> يمكنك تعديل الأسئلة المستخلصة قبل الحفظ</li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}><Icons.CheckCircle style={{ height: 14, width: 14, color: '#22c55e' }} /> استخدم الوسوم لتصنيف الأسئلة حسب المادة أو الموضوع</li>
            </ul>
          </div>
        </div>
      </div>
    </AssistantLayout>
  );
}