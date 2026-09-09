'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import * as Icons from 'lucide-react';
import { useTheme } from '@/lib/hooks/useTheme';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';

// ================================================================
// ألوان البطاقات المتغيرة (نفس نظام الرئيسية)
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
// دوال مساعدة
// ================================================================
function parseGrade(gradeText) {
  if (!gradeText) return { stage: '', level: '' };
  const text = gradeText.trim();
  let stage = '';
  let level = '';
  if (text.includes('ابتدائي')) stage = 'ابتدائي';
  else if (text.includes('إعدادي')) stage = 'إعدادي';
  else if (text.includes('ثانوي')) stage = 'ثانوي';
  const levelMap = { 'الأول': '1', 'الثاني': '2', 'الثالث': '3', 'الرابع': '4', 'الخامس': '5', 'السادس': '6' };
  for (const [arabic, num] of Object.entries(levelMap)) {
    if (text.includes(arabic)) { level = num; break; }
  }
  return { stage, level };
}

function formatGradeArabic(stage, level) {
  if (!stage && !level) return '—';
  const stageMap = { 'primary': 'الابتدائي', 'middle': 'الإعدادي', 'high': 'الثانوي', 'ابتدائي': 'الابتدائي', 'إعدادي': 'الإعدادي', 'ثانوي': 'الثانوي' };
  const levelMap = { '1': 'الأول', '2': 'الثاني', '3': 'الثالث', '4': 'الرابع', '5': 'الخامس', '6': 'السادس' };
  const stageAr = stageMap[stage] || stage || '';
  const levelAr = levelMap[String(level)] || level || '';
  if (!levelAr) return stageAr;
  return `${levelAr} ${stageAr}`;
}

// ================================================================
// مكون حقل الإدخال الفاخر (محسن للتباين)
// ================================================================
const GlassInput = ({ label, icon: Icon, value, onChange, disabled, type = 'text', language }) => {
  const { styles } = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <div className="space-y-1.5">
      <label className={`flex items-center gap-2 text-sm font-semibold ${styles.label}`}>
        <span className="p-1 rounded-lg bg-yellow-400/10 text-yellow-500">
          <Icon className="h-3.5 w-3.5" />
        </span>
        {label}
      </label>
      <div className="relative group">
        <input
          type={type}
          value={value}
          onChange={onChange}
          disabled={disabled}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={`w-full py-3.5 px-4 rounded-2xl text-sm font-medium transition-all duration-300 outline-none
            ${disabled
              ? 'bg-white/5 dark:bg-white/5 border border-white/10 text-gray-600 dark:text-gray-400 cursor-not-allowed backdrop-blur-sm'
              : `${styles.input} border-2 ${focused ? 'border-yellow-400 ring-4 ring-yellow-400/20 shadow-lg shadow-yellow-400/10' : `${styles.border} hover:border-yellow-400/40`}`
            }
            ${disabled ? 'pr-12' : 'pr-4'}
          `}
        />
        {disabled && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center w-7 h-7 rounded-full bg-white/10 dark:bg-white/5 backdrop-blur-sm">
            <Icons.Lock className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
          </div>
        )}
        {!disabled && focused && (
          <motion.div
            layoutId="focus-border"
            className="absolute bottom-0 left-4 right-4 h-0.5 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full"
            transition={{ duration: 0.2 }}
          />
        )}
      </div>
    </div>
  );
};

// ================================================================
// بطاقة الهوية الذهبية الأسطورية (مع Wave Border)
// ================================================================
const GoldenIDCard = ({ form, email, avatarUrl, language }) => {
  const [color, setColor] = useState(CARD_COLORS[0]);
  const handleColorChange = (newColor) => setColor(newColor);

  const rows = [
    { icon: Icons.User, label: language === 'ar' ? 'الاسم' : 'Name', value: form.full_name },
    { icon: Icons.Mail, label: language === 'ar' ? 'البريد' : 'Email', value: email },
    { icon: Icons.GraduationCap, label: language === 'ar' ? 'الصف' : 'Grade', value: formatGradeArabic(form.grade_stage, form.grade_level) },
    { icon: Icons.Building, label: language === 'ar' ? 'المدرسة' : 'School', value: form.school },
    { icon: Icons.MapPin, label: language === 'ar' ? 'المحافظة' : 'Governorate', value: form.governorate },
    { icon: Icons.Phone, label: language === 'ar' ? 'الهاتف' : 'Phone', value: form.phone },
    { icon: Icons.Users, label: language === 'ar' ? 'ولي الأمر' : 'Parent', value: form.parent_name },
    { icon: Icons.PhoneCall, label: language === 'ar' ? 'هاتف الولي' : 'Parent Tel', value: form.parent_phone },
  ];

  return (
    <WaveBorderCard initialColor={color.name} onColorChange={handleColorChange}>
      <div className="relative w-full max-w-lg mx-auto rounded-3xl overflow-hidden shadow-2xl">
        {/* طبقات الخلفية الفاخرة */}
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/10 via-white/90 dark:via-gray-800/90 to-yellow-600/10 backdrop-blur-2xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(251,191,36,0.15),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(251,191,36,0.1),transparent_60%)]" />
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600" />
        <motion.div
          className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-transparent via-white/60 to-transparent"
          animate={{ x: ['-100%', '100%'] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        />

        <div className="relative z-10 p-7 sm:p-8">
          {/* رأس البطاقة */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 to-yellow-700 dark:from-yellow-300 dark:to-yellow-500">
                {language === 'ar' ? 'بطاقة الطالب' : 'Student ID'}
              </h2>
              <p className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500 mt-0.5 tracking-widest uppercase">
                {language === 'ar' ? 'Mohamed Radwan Platform' : 'Mohamed Radwan Platform'}
              </p>
            </div>
            <motion.div
              whileHover={{ scale: 1.1, rotate: 3 }}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-black font-extrabold text-2xl sm:text-3xl shadow-2xl shadow-yellow-400/30 border-2 border-white/20 overflow-hidden"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span>{form.full_name?.charAt(0)?.toUpperCase() || 'ط'}</span>
              )}
            </motion.div>
          </div>

          {/* صفوف البيانات */}
          <div className="space-y-2">
            {rows.map((row, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.06 }}
                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-yellow-400/5 transition-colors group"
              >
                <div className="w-8 h-8 rounded-lg bg-yellow-400/10 flex items-center justify-center flex-shrink-0">
                  <row.icon className="h-4 w-4 text-yellow-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] sm:text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">{row.label}</p>
                  <p className={`font-bold text-sm truncate ${row.value && row.value !== '—' ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}`}>
                    {row.value || '—'}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* ختم المنصة */}
          <div className="mt-5 flex justify-center pointer-events-none opacity-10">
            <div className="transform -rotate-12 border-[3px] border-yellow-400 rounded-full px-6 py-1.5 text-center">
              <p className="text-[10px] sm:text-xs font-black text-yellow-600 tracking-[0.25em] whitespace-nowrap">
                MR. MOHAMED RADWAN
              </p>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600" />
      </div>
    </WaveBorderCard>
  );
};

// ================================================================
// الصفحة الرئيسية – نسخة فاخرة مع Wave Border
// ================================================================
export default function StudentProfilePage() {
  const router = useRouter();
  const { theme, styles, language } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ full_name: '', phone: '', parent_name: '', parent_phone: '', grade_stage: '', grade_level: '', governorate: '', school: '' });
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const fetchedRef = useRef(false);

  // ألوان متغيرة للرأس ونموذج التعديل
  const [headerColor, setHeaderColor] = useState(CARD_COLORS[0]);
  const [formColor, setFormColor] = useState(CARD_COLORS[2]);

  const extractParentName = (fullName) => {
    if (!fullName) return '';
    const parts = fullName.trim().split(/\s+/);
    return parts.length > 1 ? parts.slice(1).join(' ') : '';
  };

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/login'); return; }
        setEmail(user.email);
        const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (error && error.code !== 'PGRST116') throw error;
        let stage = data?.grade_stage || '';
        let level = data?.grade_level || '';
        if ((!stage || !level) && data?.grade) {
          const parsed = parseGrade(data.grade);
          stage = stage || parsed.stage;
          level = level || parsed.level;
          if (stage || level) {
            supabase.from('profiles').update({ grade_stage: stage, grade_level: level }).eq('id', user.id).then(() => {});
          }
        }
        const fullName = data?.full_name || '';
        setForm({ full_name: fullName, phone: data?.phone || '', parent_name: data?.parent_name || extractParentName(fullName), parent_phone: data?.parent_phone || '', grade_stage: stage, grade_level: level, governorate: data?.governorate || '', school: data?.school || '' });
        setAvatarUrl(data?.avatar_url || '');
      } catch (err) { console.error(err); toast.error(language === 'ar' ? 'فشل تحميل البيانات' : 'Failed to load data'); }
      finally { setLoading(false); }
    })();
  }, [router, language]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const updates = { phone: form.phone?.trim() || '', parent_phone: form.parent_phone?.trim() || '', updated_at: new Date().toISOString() };
      const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);
      if (error) throw error;
      toast.success(language === 'ar' ? 'تم الحفظ بنجاح' : 'Saved successfully');
    } catch (err) { console.error(err); toast.error(language === 'ar' ? 'فشل الحفظ' : 'Save failed'); }
    finally { setSaving(false); }
  };

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const openUploadWidget = () => {
    if (typeof window === 'undefined' || !window.cloudinary) {
      toast.error(language === 'ar' ? 'أداة الرفع غير متاحة حاليًا' : 'Upload widget not available');
      return;
    }

    const widget = window.cloudinary.createUploadWidget(
      {
        cloudName: 'yeuqiwty',
        uploadPreset: 'student_avatars',
        sources: ['local', 'url', 'camera'],
        cropping: true,
        multiple: false,
        clientAllowedFormats: ['png', 'jpg', 'jpeg', 'webp'],
        maxFileSize: 3000000,
        language: language === 'ar' ? 'ar' : 'en',
        showAdvancedOptions: false,
        styles: {
          palette: {
            window: '#0b0e1a',
            windowBorder: '#FACC15',
            tabIcon: '#FACC15',
            menuIcons: '#FACC15',
            textDark: '#FFFFFF',
            textLight: '#000000',
            link: '#FACC15',
            action: '#FACC15',
            inProgress: '#FACC15',
            complete: '#22C55E',
            error: '#EF4444',
            sourceBg: '#1e2433',
          },
        },
      },
      (error, result) => {
        if (!error && result && result.event === 'success') {
          const url = result.info.secure_url;
          setAvatarUrl(url);
          supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) {
              supabase
                .from('profiles')
                .update({ avatar_url: url })
                .eq('id', user.id)
                .then(({ error }) => {
                  if (error) {
                    toast.error(language === 'ar' ? 'فشل حفظ الصورة' : 'Failed to save image');
                  } else {
                    toast.success(language === 'ar' ? 'تم تحديث الصورة' : 'Avatar updated');
                  }
                });
            }
          });
        } else if (error) {
          toast.error(language === 'ar' ? 'فشل الرفع' : 'Upload failed');
          console.error('Upload error:', error);
        }
      }
    );
    widget.open();
  };

  if (loading) return (
    <div className="h-screen w-full flex items-center justify-center bg-[var(--bg-primary)]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
        <p className={`text-base ${styles.subtext}`}>{language === 'ar' ? 'جاري التحميل...' : 'Loading...'}</p>
      </div>
    </div>
  );

  return (
    <div className={`w-full min-h-screen ${styles.bg} transition-colors duration-300 relative overflow-hidden`}>
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 relative z-10">
        {/* ===== رأس الصفحة مع Wave Border ===== */}
        <WaveBorderCard initialColor={headerColor.name} onColorChange={setHeaderColor}>
          <div className="p-6 sm:p-8">
            <div className="flex items-center gap-4 sm:gap-5">
              <motion.div
                animate={{ scale: [1, 1.08, 1], rotate: [0, 3, -3, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-yellow-400 to-yellow-600 shadow-2xl shadow-yellow-400/30 overflow-hidden"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg object-cover" />
                ) : (
                  <Icons.User className="h-8 w-8 sm:h-10 sm:w-10 text-black" />
                )}
              </motion.div>
              <div>
                <h1 className={`text-3xl sm:text-4xl md:text-5xl font-black tracking-tight ${styles.text}`}>
                  {language === 'ar' ? 'الملف الشخصي' : 'My Profile'}
                </h1>
                <p className={`text-sm sm:text-base ${styles.subtext} mt-1 max-w-md`}>
                  {language === 'ar' ? 'بطاقة هويتك الإلكترونية وبياناتك الشخصية.' : 'Your digital ID card and personal information.'}
                </p>
              </div>
            </div>
          </div>
        </WaveBorderCard>

        {/* ===== المحتوى الرئيسي ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12 mt-10">
          {/* نموذج التعديل */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="lg:col-span-3"
          >
            <WaveBorderCard initialColor={formColor.name} onColorChange={setFormColor}>
              <form onSubmit={handleSave} className="p-6 sm:p-8 space-y-6">
                <h2 className={`text-xl font-extrabold ${styles.text} mb-6 flex items-center gap-3`}>
                  <div className="p-2 rounded-xl bg-yellow-400/20">
                    <Icons.Edit className="h-5 w-5 text-yellow-400" />
                  </div>
                  {language === 'ar' ? 'تعديل البيانات' : 'Edit Information'}
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* زر تغيير الصورة + الاسم */}
                  <div className="md:col-span-2 flex items-end gap-4">
                    <div className="flex-1">
                      <GlassInput label={language === 'ar' ? 'الاسم الكامل' : 'Full Name'} icon={Icons.User} value={form.full_name} disabled language={language} />
                    </div>
                    <button
                      type="button"
                      onClick={openUploadWidget}
                      disabled={uploading}
                      className="p-3 rounded-xl bg-yellow-400/20 hover:bg-yellow-400/30 text-yellow-400 transition flex items-center gap-2 text-sm font-medium"
                    >
                      <Icons.Camera className="h-5 w-5" />
                      {uploading ? (language === 'ar' ? 'جاري...' : 'Uploading...') : (language === 'ar' ? 'تغيير' : 'Change')}
                    </button>
                  </div>

                  <GlassInput label={language === 'ar' ? 'البريد الإلكتروني' : 'Email'} icon={Icons.Mail} value={email} disabled language={language} />
                  <GlassInput label={language === 'ar' ? 'رقم الهاتف' : 'Phone'} icon={Icons.Phone} value={form.phone} onChange={(e) => handleChange('phone', e.target.value)} language={language} />
                  <GlassInput label={language === 'ar' ? 'ولي الأمر' : 'Parent'} icon={Icons.Users} value={form.parent_name} disabled language={language} />
                  <GlassInput label={language === 'ar' ? 'هاتف الولي' : 'Parent Tel'} icon={Icons.PhoneCall} value={form.parent_phone} onChange={(e) => handleChange('parent_phone', e.target.value)} language={language} />
                  <GlassInput label={language === 'ar' ? 'المرحلة' : 'Stage'} icon={Icons.GraduationCap} value={form.grade_stage || '—'} disabled language={language} />
                  <GlassInput label={language === 'ar' ? 'الصف' : 'Level'} icon={Icons.BookOpen} value={formatGradeArabic(form.grade_stage, form.grade_level)} disabled language={language} />
                  <GlassInput label={language === 'ar' ? 'المحافظة' : 'Governorate'} icon={Icons.MapPin} value={form.governorate} disabled language={language} />
                  <GlassInput label={language === 'ar' ? 'المدرسة' : 'School'} icon={Icons.Building} value={form.school} disabled language={language} />
                </div>

                <div className="pt-4">
                  <motion.button
                    whileHover={{ scale: 1.02, boxShadow: '0 20px 50px rgba(251,191,36,0.4)' }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={saving}
                    className="w-full py-4 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-extrabold rounded-2xl hover:from-yellow-500 hover:to-yellow-700 transition-all shadow-2xl shadow-yellow-400/30 disabled:opacity-60 flex items-center justify-center gap-3 text-lg tracking-wide"
                  >
                    {saving ? (
                      <><div className="w-6 h-6 border-3 border-black/30 border-t-black rounded-full animate-spin" />{language === 'ar' ? 'جارٍ الحفظ...' : 'Saving...'}</>
                    ) : (
                      <><Icons.Save className="h-6 w-6" />{language === 'ar' ? 'حفظ التعديلات' : 'Save Changes'}</>
                    )}
                  </motion.button>
                </div>
              </form>
            </WaveBorderCard>
          </motion.div>

          {/* بطاقة الهوية */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, type: 'spring' }}
            className="lg:col-span-2 flex justify-center"
          >
            <div className="w-full max-w-lg sticky top-8">
              <GoldenIDCard form={form} email={email} avatarUrl={avatarUrl} language={language} />
              <p className={`text-xs ${styles.subtext} text-center mt-6 opacity-50`}>
                {language === 'ar' ? 'بطاقتك الإلكترونية الرسمية على المنصة' : 'Your official digital ID card'}
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}