// ============================================================
// app/dashboard/assistant/courses/[id]/page.js
// مركز القيادة المتكامل للكورس – نسخة المساعد (متوافقة مع AssistantLayout و useTheme)
// ============================================================

'use client';

import { AssistantLayout } from '@/components/AssistantLayout';
import { useTheme } from '@/lib/hooks/useTheme';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as Icons from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
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
import { Bar, Doughnut } from 'react-chartjs-2';

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
// 0. دوال مساعدة لتنسيق الملفات
// ============================================================

const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return 'غير محدد';
  const k = 1024;
  const sizes = ['بايت', 'كيلوبايت', 'ميجابايت', 'جيجابايت'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getFileIcon = (fileName) => {
  if (!fileName) return Icons.File;
  const ext = fileName.split('.').pop()?.toLowerCase();
  const icons = {
    pdf: Icons.FileText,
    doc: Icons.FileText,
    docx: Icons.FileText,
    ppt: Icons.FileText,
    pptx: Icons.FileText,
    xls: Icons.FileSpreadsheet,
    xlsx: Icons.FileSpreadsheet,
    zip: Icons.FileArchive,
    rar: Icons.FileArchive,
    mp4: Icons.Video,
    mp3: Icons.Music,
    jpg: Icons.Image,
    jpeg: Icons.Image,
    png: Icons.Image,
    gif: Icons.Image,
  };
  return icons[ext] || Icons.File;
};

const getFileColor = (fileName) => {
  if (!fileName) return 'text-gray-400';
  const ext = fileName.split('.').pop()?.toLowerCase();
  const colors = {
    pdf: 'text-red-400',
    doc: 'text-blue-400',
    docx: 'text-blue-400',
    ppt: 'text-orange-400',
    pptx: 'text-orange-400',
    xls: 'text-green-400',
    xlsx: 'text-green-400',
    zip: 'text-yellow-400',
    rar: 'text-yellow-400',
    mp4: 'text-purple-400',
    mp3: 'text-pink-400',
    jpg: 'text-emerald-400',
    jpeg: 'text-emerald-400',
    png: 'text-emerald-400',
  };
  return colors[ext] || 'text-gray-400';
};

// ============================================================
// 2. خلفية الجسيمات (أنيقة)
// ============================================================

const ParticleBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width, height;
    const particles = [];

    const resize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    for (let i = 0; i < 40; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        r: Math.random() * 2 + 1,
        opacity: Math.random() * 0.2 + 0.05,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 215, 0, ${p.opacity})`;
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const dx = p.x - particles[j].x;
          const dy = p.y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(255, 215, 0, ${0.04 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      });
      requestAnimationFrame(draw);
    };
    draw();

    return () => window.removeEventListener('resize', resize);
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />;
};

// ============================================================
// 3. عداد متحرك
// ============================================================

const AnimatedCounter = ({ target, suffix = '', duration = 1500 }) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          let start = 0;
          const step = target / (duration / 16);
          const timer = setInterval(() => {
            start += step;
            if (start >= target) {
              setCount(target);
              clearInterval(timer);
            } else {
              setCount(Math.floor(start));
            }
          }, 16);
          return () => clearInterval(timer);
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);

  return (
    <span ref={ref} className="font-extrabold">
      {count}{suffix}
    </span>
  );
};

// ============================================================
// 4. بطاقة إحصائية (مدعومة بالثيم)
// ============================================================

const StatCard = ({ stat, styles }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: stat.delay }}
      whileHover={{ y: -6, scale: 1.02 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative ${styles.card} rounded-2xl p-5 ${styles.hover} transition-all duration-300 ${styles.shadow} overflow-hidden group`}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />
      <div className="relative z-10 flex items-start justify-between">
        <div>
          <p className={`${styles.subtext} text-sm`}>{stat.label}</p>
          <p className={`text-3xl font-extrabold ${styles.text} mt-1`}>
            <AnimatedCounter target={stat.value} suffix={stat.suffix || ''} />
          </p>
        </div>
        <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color} bg-opacity-20`}>
          <stat.icon className="h-6 w-6 text-white" />
        </div>
      </div>
      <div className="mt-4 h-1 w-full bg-white/5 rounded-full overflow-hidden">
        <motion.div
          className={`h-full bg-gradient-to-r ${stat.color} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: isHovered ? '100%' : '70%' }}
          transition={{ duration: 0.8 }}
        />
      </div>
    </motion.div>
  );
};

// ============================================================
// 5. مكونات التبويبات
// ============================================================

// 5.1 تبويب الفيديوهات
const VideosTab = ({ videos, courseId, onDelete, onEdit, onAdd, styles }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredVideos = useMemo(() => {
    if (!searchTerm.trim()) return videos;
    return videos.filter(v => v.title.toLowerCase().includes(searchTerm.trim().toLowerCase()));
  }, [videos, searchTerm]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Icons.Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ابحث في الفيديوهات..."
            className={`w-full p-2 pr-8 ${styles.input} rounded-lg text-sm focus:ring-2 focus:ring-yellow-400/50 outline-none transition`}
          />
        </div>
        <button
          onClick={onAdd}
          className="px-4 py-2 bg-yellow-400/20 hover:bg-yellow-400/30 text-yellow-300 rounded-xl text-sm font-semibold transition flex items-center gap-1 whitespace-nowrap"
        >
          <Icons.Plus className="h-4 w-4" /> إضافة فيديو
        </button>
      </div>

      {filteredVideos.length === 0 ? (
        <div className="text-center py-8">
          <Icons.Video className="h-12 w-12 text-gray-600 mx-auto mb-2" />
          <p className={`${styles.subtext}`}>
            {searchTerm ? 'لا توجد نتائج تطابق البحث' : 'لا توجد فيديوهات في هذا الكورس'}
          </p>
          {!searchTerm && (
            <button
              onClick={onAdd}
              className="mt-3 px-4 py-2 bg-yellow-400/20 hover:bg-yellow-400/30 text-yellow-300 rounded-xl text-sm font-semibold transition"
            >
              أضف أول فيديو
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredVideos.map((video, index) => (
            <motion.div
              key={video.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className={`${styles.card} rounded-xl p-4 ${styles.hover} transition-all duration-300`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">#{index + 1}</span>
                    <Icons.Play className="h-4 w-4 text-yellow-400 flex-shrink-0" />
                    <span className={`font-medium ${styles.text} truncate`}>{video.title}</span>
                  </div>
                  <div className={`flex flex-wrap items-center gap-3 mt-1 text-xs ${styles.subtext}`}>
                    <span className="flex items-center gap-1">
                      <Icons.Eye className="h-3 w-3" /> {video.views || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <Icons.Clock className="h-3 w-3" />{' '}
                      {video.duration ? `${Math.floor(video.duration / 60)} د` : 'غير محدد'}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] ${
                        video.is_published ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                      }`}
                    >
                      {video.is_published ? 'منشور' : 'مسودة'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 mr-4">
                  <Link
                    href={`/watch/${video.id}`}
                    target="_blank"
                    className="p-1.5 hover:bg-blue-500/20 rounded-lg transition text-blue-400 hover:text-blue-300"
                  >
                    <Icons.Eye className="h-4 w-4" />
                  </Link>
                  <button
                    onClick={() => onEdit(video.id, 'video')}
                    className="p-1.5 hover:bg-yellow-400/20 rounded-lg transition text-yellow-400 hover:text-yellow-300"
                  >
                    <Icons.Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onDelete(video.id, 'video')}
                    className="p-1.5 hover:bg-red-500/20 rounded-lg transition text-red-400 hover:text-red-300"
                  >
                    <Icons.Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

// 5.2 تبويب الامتحانات
const ExamsTab = ({ exams, courseId, onDelete, onEdit, onAdd, styles }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredExams = useMemo(() => {
    if (!searchTerm.trim()) return exams;
    return exams.filter(e => e.title.toLowerCase().includes(searchTerm.trim().toLowerCase()));
  }, [exams, searchTerm]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Icons.Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ابحث في الامتحانات..."
            className={`w-full p-2 pr-8 ${styles.input} rounded-lg text-sm focus:ring-2 focus:ring-yellow-400/50 outline-none transition`}
          />
        </div>
        <button
          onClick={onAdd}
          className="px-4 py-2 bg-yellow-400/20 hover:bg-yellow-400/30 text-yellow-300 rounded-xl text-sm font-semibold transition flex items-center gap-1 whitespace-nowrap"
        >
          <Icons.Plus className="h-4 w-4" /> إضافة امتحان
        </button>
      </div>

      {filteredExams.length === 0 ? (
        <div className="text-center py-8">
          <Icons.FileText className="h-12 w-12 text-gray-600 mx-auto mb-2" />
          <p className={`${styles.subtext}`}>
            {searchTerm ? 'لا توجد نتائج تطابق البحث' : 'لا توجد امتحانات في هذا الكورس'}
          </p>
          {!searchTerm && (
            <button
              onClick={onAdd}
              className="mt-3 px-4 py-2 bg-yellow-400/20 hover:bg-yellow-400/30 text-yellow-300 rounded-xl text-sm font-semibold transition"
            >
              أضف أول امتحان
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredExams.map((exam, index) => {
            const status = exam.is_published ? 'منشور' : 'مسودة';
            const statusColor = exam.is_published
              ? 'bg-green-500/20 text-green-400'
              : 'bg-gray-500/20 text-gray-400';
            return (
              <motion.div
                key={exam.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className={`${styles.card} rounded-xl p-4 ${styles.hover} transition-all duration-300`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500">#{index + 1}</span>
                      <Icons.FileText className="h-4 w-4 text-purple-400 flex-shrink-0" />
                      <span className={`font-medium ${styles.text} truncate`}>{exam.title}</span>
                    </div>
                    <div className={`flex flex-wrap items-center gap-3 mt-1 text-xs ${styles.subtext}`}>
                      <span className="flex items-center gap-1">
                        <Icons.Users className="h-3 w-3" /> {exam.students_count || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <Icons.Star className="h-3 w-3" /> {exam.total_marks || 0} درجة
                      </span>
                      <span className="flex items-center gap-1">
                        <Icons.Clock className="h-3 w-3" /> {exam.duration_minutes || 0} د
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] ${statusColor}`}>
                        {status}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 mr-4">
                    <Link
                      href={`/dashboard/assistant/exams/${exam.id}/results`}
                      className="p-1.5 hover:bg-blue-500/20 rounded-lg transition text-blue-400 hover:text-blue-300"
                    >
                      <Icons.BarChart className="h-4 w-4" />
                    </Link>
                    <button
                      onClick={() => onEdit(exam.id, 'exam')}
                      className="p-1.5 hover:bg-yellow-400/20 rounded-lg transition text-yellow-400 hover:text-yellow-300"
                    >
                      <Icons.Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onDelete(exam.id, 'exam')}
                      className="p-1.5 hover:bg-red-500/20 rounded-lg transition text-red-400 hover:text-red-300"
                    >
                      <Icons.Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// 5.3 تبويب الكتب (نسخة المساعد)
const BooksTab = ({ books, courseId, onDelete, onAdd, styles }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredBooks = useMemo(() => {
    if (!searchTerm.trim()) return books;
    return books.filter(b => b.title.toLowerCase().includes(searchTerm.trim().toLowerCase()));
  }, [books, searchTerm]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Icons.Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ابحث في الكتب..."
            className={`w-full p-2 pr-8 ${styles.input} rounded-lg text-sm focus:ring-2 focus:ring-yellow-400/50 outline-none transition`}
          />
        </div>
        <button
          onClick={onAdd}
          className="px-4 py-2 bg-yellow-400/20 hover:bg-yellow-400/30 text-yellow-300 rounded-xl text-sm font-semibold transition flex items-center gap-1 whitespace-nowrap"
        >
          <Icons.Plus className="h-4 w-4" /> إضافة كتاب
        </button>
      </div>

      {filteredBooks.length === 0 ? (
        <div className="text-center py-8">
          <Icons.Book className="h-12 w-12 text-gray-600 mx-auto mb-2" />
          <p className={`${styles.subtext}`}>
            {searchTerm ? 'لا توجد نتائج تطابق البحث' : 'لا توجد كتب في هذا الكورس'}
          </p>
          {!searchTerm && (
            <button
              onClick={onAdd}
              className="mt-3 px-4 py-2 bg-yellow-400/20 hover:bg-yellow-400/30 text-yellow-300 rounded-xl text-sm font-semibold transition"
            >
              أضف أول كتاب
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBooks.map((book, index) => {
            const Icon = getFileIcon(book.file_name || book.title);
            const colorClass = getFileColor(book.file_name || book.title);
            const fileSize = book.file_size_display || formatFileSize(book.file_size);
            const sourceLabel = book.source_type === 'external' ? 'رابط خارجي' : 'مخزن داخلي';
            const SourceIcon = book.source_type === 'external' ? Icons.Link : Icons.Upload;
            const downloadUrl = book.download_url || book.file_url;

            return (
              <motion.div
                key={book.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className={`${styles.card} rounded-xl p-4 ${styles.hover} transition-all duration-300`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500">#{index + 1}</span>
                      <Icon className={`h-5 w-5 ${colorClass} flex-shrink-0`} />
                      <span className={`font-medium ${styles.text} truncate`}>{book.title}</span>
                    </div>
                    <div className={`flex flex-wrap items-center gap-3 mt-1 text-xs ${styles.subtext}`}>
                      {book.description && (
                        <span className="truncate max-w-[200px]">{book.description}</span>
                      )}
                      {book.file_name && (
                        <span className="flex items-center gap-1">
                          <Icons.File className="h-3 w-3" /> {book.file_name}
                        </span>
                      )}
                      {fileSize && (
                        <span className="flex items-center gap-1">
                          <Icons.HardDrive className="h-3 w-3" /> {fileSize}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <SourceIcon className="h-3 w-3" /> {sourceLabel}
                      </span>
                      {book.file_type_display && (
                        <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-[10px]">
                          {book.file_type_display}
                        </span>
                      )}
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] ${
                          book.is_published ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                        }`}
                      >
                        {book.is_published ? 'منشور' : 'مسودة'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 mr-4">
                    {downloadUrl && (
                      <a
                        href={downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 hover:bg-blue-500/20 rounded-lg transition text-blue-400 hover:text-blue-300"
                      >
                        <Icons.Download className="h-4 w-4" />
                      </a>
                    )}
                    <button
                      onClick={() => onDelete(book.id)}
                      className="p-1.5 hover:bg-red-500/20 rounded-lg transition text-red-400 hover:text-red-300"
                    >
                      <Icons.Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// 5.4 تبويب الطلاب
const StudentsTab = ({ students, courseId, onRefresh, styles }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('progress');

  const filteredStudents = useMemo(() => {
    let result = students;
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      result = result.filter(
        s => s.full_name.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q)
      );
    }
    result = [...result].sort((a, b) => {
      if (sortBy === 'progress') return (b.progress || 0) - (a.progress || 0);
      if (sortBy === 'name') return a.full_name.localeCompare(b.full_name);
      if (sortBy === 'recent') return new Date(b.updated_at) - new Date(a.updated_at);
      return 0;
    });
    return result;
  }, [students, searchTerm, sortBy]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative flex-1 min-w-[150px] max-w-xs">
            <Icons.Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ابحث عن طالب..."
              className={`w-full p-2 pr-8 ${styles.input} rounded-lg text-sm focus:ring-2 focus:ring-yellow-400/50 outline-none transition`}
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className={`p-2 ${styles.input} rounded-lg text-sm focus:ring-2 focus:ring-yellow-400/50 outline-none transition`}
          >
            <option value="progress">حسب التقدم</option>
            <option value="name">حسب الاسم</option>
            <option value="recent">الأحدث</option>
          </select>
        </div>
        <button
          onClick={onRefresh}
          className={`px-3 py-1.5 ${styles.card} hover:bg-white/10 rounded-lg text-sm ${styles.subtext} hover:text-white transition flex items-center gap-1`}
        >
          <Icons.RefreshCw className="h-3 w-3" /> تحديث
        </button>
      </div>

      {filteredStudents.length === 0 ? (
        <div className="text-center py-8">
          <Icons.Users className="h-12 w-12 text-gray-600 mx-auto mb-2" />
          <p className={`${styles.subtext}`}>
            {searchTerm ? 'لا توجد نتائج تطابق البحث' : 'لا يوجد طلاب مسجلين في هذا الكورس'}
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {filteredStudents.map((student, index) => {
            const statusColor = student.completed_at
              ? 'text-green-400 bg-green-400/10'
              : student.progress > 0
              ? 'text-yellow-400 bg-yellow-400/10'
              : 'text-gray-400 bg-gray-400/10';
            const statusLabel = student.completed_at
              ? 'مكتمل'
              : student.progress > 0
              ? 'جاري'
              : 'لم يبدأ';
            return (
              <motion.div
                key={student.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
                className={`${styles.card} rounded-xl p-3 ${styles.hover} transition-all duration-300`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400/20 to-yellow-600/20 flex items-center justify-center text-yellow-400 font-bold text-sm flex-shrink-0">
                        {student.full_name?.charAt(0) || 'ط'}
                      </div>
                      <div className="min-w-0">
                        <p className={`text-sm font-medium ${styles.text} truncate`}>
                          {student.full_name || 'طالب'}
                        </p>
                        <p className={`text-xs ${styles.subtext} truncate`}>{student.email || ''}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0 mr-2">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full transition-all"
                          style={{ width: `${student.progress || 0}%` }}
                        />
                      </div>
                      <span className={`text-xs ${styles.subtext}`}>{student.progress || 0}%</span>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${statusColor}`}>
                      {statusLabel}
                    </span>
                    <Link
                      href={`/dashboard/assistant/students/${student.id}`}
                      className="p-1.5 hover:bg-blue-500/20 rounded-lg transition text-blue-400 hover:text-blue-300"
                    >
                      <Icons.Eye className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// 5.5 تبويب بنوك الأسئلة
const BanksTab = ({ banks, courseId, onDelete, onEdit, onAdd, onViewQuestions, styles }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredBanks = useMemo(() => {
    if (!searchTerm.trim()) return banks;
    return banks.filter(b => b.title.toLowerCase().includes(searchTerm.trim().toLowerCase()));
  }, [banks, searchTerm]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Icons.Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ابحث في بنوك الأسئلة..."
            className={`w-full p-2 pr-8 ${styles.input} rounded-lg text-sm focus:ring-2 focus:ring-yellow-400/50 outline-none transition`}
          />
        </div>
        <button
          onClick={onAdd}
          className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-xl text-sm font-semibold transition flex items-center gap-1 whitespace-nowrap"
        >
          <Icons.Plus className="h-4 w-4" /> إضافة بنك أسئلة
        </button>
      </div>

      {filteredBanks.length === 0 ? (
        <div className="text-center py-8">
          <Icons.Database className="h-12 w-12 text-gray-600 mx-auto mb-2" />
          <p className={`${styles.subtext}`}>
            {searchTerm ? 'لا توجد نتائج تطابق البحث' : 'لا توجد بنوك أسئلة في هذا الكورس'}
          </p>
          {!searchTerm && (
            <button
              onClick={onAdd}
              className="mt-3 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-xl text-sm font-semibold transition"
            >
              أضف أول بنك أسئلة
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredBanks.map((bank, index) => (
            <motion.div
              key={bank.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className={`${styles.card} rounded-xl p-4 ${styles.hover} transition-all duration-300`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">#{index + 1}</span>
                    <Icons.Database className="h-4 w-4 text-purple-400 flex-shrink-0" />
                    <span className={`font-medium ${styles.text} truncate`}>{bank.title}</span>
                  </div>
                  <div className={`flex flex-wrap items-center gap-3 mt-1 text-xs ${styles.subtext}`}>
                    <span className="flex items-center gap-1">
                      <Icons.Clipboard className="h-3 w-3" /> {bank.questions_count || 0} سؤال
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] ${
                        bank.is_published ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                      }`}
                    >
                      {bank.is_published ? 'منشور' : 'مسودة'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 mr-4">
                  <button
                    onClick={() => onViewQuestions(bank.id)}
                    className="p-1.5 hover:bg-blue-500/20 rounded-lg transition text-blue-400 hover:text-blue-300"
                  >
                    <Icons.Eye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onEdit(bank.id, 'bank')}
                    className="p-1.5 hover:bg-yellow-400/20 rounded-lg transition text-yellow-400 hover:text-yellow-300"
                  >
                    <Icons.Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onDelete(bank.id, 'bank')}
                    className="p-1.5 hover:bg-red-500/20 rounded-lg transition text-red-400 hover:text-red-300"
                  >
                    <Icons.Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================
// 6. مودال رفع الكتب (نسخة المساعد – تستخدم assistantId)
// ============================================================

const UploadBookModal = ({ isOpen, onClose, courseId, onSuccess, styles }) => {
  const [uploadMethod, setUploadMethod] = useState('file');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [externalUrl, setExternalUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState('');
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setFile(null);
    setExternalUrl('');
    setFileName('');
    setFileSize('');
    setUploadMethod('file');
    setDragOver(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  useEffect(() => {
    if (!isOpen) resetForm();
  }, [isOpen]);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;
    setFile(selected);
    setFileName(selected.name);
    setFileSize(formatFileSize(selected.size));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (!dropped) return;
    setFile(dropped);
    setFileName(dropped.name);
    setFileSize(formatFileSize(dropped.size));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('يرجى إدخال عنوان الكتاب');
      return;
    }

    let assistantId = null;
    try {
      const assistantData = sessionStorage.getItem('assistantData');
      const assistant = assistantData ? JSON.parse(assistantData) : null;
      assistantId = assistant?.id;
    } catch (err) {
      console.error('Error parsing assistantData:', err);
    }

    if (!assistantId) {
      toast.error('معرف المساعد غير موجود');
      return;
    }

    setLoading(true);
    try {
      let response;
      if (uploadMethod === 'file') {
        if (!file) {
          toast.error('يرجى اختيار ملف');
          setLoading(false);
          return;
        }
        const formData = new FormData();
        formData.append('title', title);
        formData.append('description', description);
        formData.append('courseId', courseId);
        formData.append('file', file);

        response = await fetch('/api/books/upload', {
          method: 'POST',
          headers: { 'x-assistant-id': assistantId },
          body: formData,
        });
      } else {
        if (!externalUrl.trim()) {
          toast.error('يرجى إدخال رابط خارجي');
          setLoading(false);
          return;
        }
        const numericSize = parseInt(fileSize.replace(/[^0-9]/g, '')) || 0;
        const payload = {
          title,
          description,
          courseId,
          externalUrl: externalUrl.trim(),
          fileName: fileName.trim() || 'رابط خارجي',
          fileSize: numericSize,
        };
        response = await fetch('/api/books/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-assistant-id': assistantId,
          },
          body: JSON.stringify(payload),
        });
      }

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'فشل الرفع');

      toast.success('✅ تم رفع الكتاب بنجاح');
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.message || 'حدث خطأ أثناء الرفع');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className={`relative ${styles.card} rounded-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto ${styles.shadow}`}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-lg font-bold ${styles.text}`}>رفع كتاب جديد</h3>
          <button
            onClick={onClose}
            className={`p-1 rounded-lg hover:bg-white/10 transition ${styles.subtext}`}
          >
            <Icons.X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="flex gap-2 border-b border-white/10 pb-3">
              <button
                type="button"
                onClick={() => setUploadMethod('file')}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                  uploadMethod === 'file'
                    ? 'bg-yellow-400/20 text-yellow-300 border border-yellow-400/30'
                    : `${styles.subtext} hover:text-white hover:bg-white/5`
                }`}
              >
                <Icons.Upload className="h-4 w-4 inline ml-1" /> رفع ملف
              </button>
              <button
                type="button"
                onClick={() => setUploadMethod('link')}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                  uploadMethod === 'link'
                    ? 'bg-yellow-400/20 text-yellow-300 border border-yellow-400/30'
                    : `${styles.subtext} hover:text-white hover:bg-white/5`
                }`}
              >
                <Icons.Link className="h-4 w-4 inline ml-1" /> رابط خارجي
              </button>
            </div>

            <div>
              <label className={`block text-sm font-medium ${styles.label} mb-1`}>عنوان الكتاب *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={`w-full p-2 ${styles.input} rounded-lg text-sm focus:ring-2 focus:ring-yellow-400/50 outline-none transition`}
                placeholder="أدخل عنوان الكتاب"
                required
              />
            </div>

            <div>
              <label className={`block text-sm font-medium ${styles.label} mb-1`}>وصف (اختياري)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={`w-full p-2 ${styles.input} rounded-lg text-sm focus:ring-2 focus:ring-yellow-400/50 outline-none transition resize-none`}
                rows="2"
                placeholder="وصف مختصر للكتاب"
              />
            </div>

            {uploadMethod === 'file' ? (
              <div
                className={`border-2 border-dashed rounded-xl p-6 text-center transition ${dragOver ? 'border-yellow-400 bg-yellow-400/10' : 'border-white/10'} ${styles.hover}`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer block">
                  <Icons.Upload className="h-10 w-10 text-gray-500 mx-auto mb-2" />
                  <p className={`text-sm ${styles.subtext}`}>
                    اسحب الملف هنا أو <span className="text-yellow-400">اختر ملف</span>
                  </p>
                  <p className={`text-xs ${styles.subtext} mt-1`}>جميع الملفات مقبولة (بدون حد للحجم)</p>
                </label>
                {file && (
                  <div className="mt-3 p-2 bg-white/5 rounded-lg flex items-center gap-2 text-sm">
                    <Icons.File className="h-4 w-4 text-yellow-400" />
                    <span className={`${styles.text}`}>{fileName}</span>
                    <span className={`${styles.subtext} text-xs`}>({fileSize})</span>
                    <button
                      type="button"
                      onClick={() => { setFile(null); setFileName(''); setFileSize(''); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                      className="mr-auto text-red-400 hover:text-red-300"
                    >
                      <Icons.X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div>
                  <label className={`block text-sm font-medium ${styles.label} mb-1`}>الرابط الخارجي *</label>
                  <input
                    type="url"
                    value={externalUrl}
                    onChange={(e) => setExternalUrl(e.target.value)}
                    className={`w-full p-2 ${styles.input} rounded-lg text-sm focus:ring-2 focus:ring-yellow-400/50 outline-none transition`}
                    placeholder="https://example.com/book.pdf"
                    required
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${styles.label} mb-1`}>اسم الملف (اختياري)</label>
                  <input
                    type="text"
                    value={fileName}
                    onChange={(e) => setFileName(e.target.value)}
                    className={`w-full p-2 ${styles.input} rounded-lg text-sm focus:ring-2 focus:ring-yellow-400/50 outline-none transition`}
                    placeholder="مثال: كتاب الرياضيات.pdf"
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${styles.label} mb-1`}>حجم الملف (اختياري، بالأرقام فقط)</label>
                  <input
                    type="text"
                    value={fileSize}
                    onChange={(e) => setFileSize(e.target.value)}
                    className={`w-full p-2 ${styles.input} rounded-lg text-sm focus:ring-2 focus:ring-yellow-400/50 outline-none transition`}
                    placeholder="مثال: 2500 (بايت)"
                  />
                </div>
              </>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 ${styles.card} rounded-xl text-sm font-semibold ${styles.subtext} hover:text-white transition`}
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-yellow-400/20 hover:bg-yellow-400/30 text-yellow-300 rounded-xl text-sm font-semibold transition flex items-center gap-2 disabled:opacity-50"
            >
              {loading && <Icons.Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? 'جاري الرفع...' : 'رفع الكتاب'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

// ============================================================
// 7. الصفحة الرئيسية – مركز القيادة المتكامل للكورس (نسخة المساعد)
// ============================================================

export default function AssistantCourseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.id;
  const { theme, toggleTheme, styles } = useTheme();

  // ===== حالات عامة =====
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('videos');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ===== بيانات المحتوى =====
  const [videos, setVideos] = useState([]);
  const [exams, setExams] = useState([]);
  const [books, setBooks] = useState([]);
  const [students, setStudents] = useState([]);
  const [banks, setBanks] = useState([]);

  // ===== إحصائيات متقدمة =====
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalVideos: 0,
    totalExams: 0,
    totalBooks: 0,
    avgProgress: 0,
    completed: 0,
    notStarted: 0,
    avgExamScore: 0,
    totalViews: 0,
    totalBanks: 0,
    totalBankQuestions: 0,
  });

  // ===== بيانات الرسوم البيانية =====
  const [chartData, setChartData] = useState({
    progressDistribution: { labels: [], datasets: [] },
    examScores: { labels: [], datasets: [] },
    weeklyActivity: { labels: [], datasets: [] },
  });

  // ===== بيانات المرحلة (للرسم البياني) =====
  const gradeChartData = useMemo(() => {
    const stages = {};
    if (course?.grade_stage) {
      stages[course.grade_stage] = 1;
    } else {
      stages['غير محدد'] = 1;
    }
    const labels = Object.keys(stages);
    const data = Object.values(stages);
    return {
      labels,
      datasets: [
        {
          data,
          backgroundColor: ['#c9a84c', '#4a8fe0', '#38b27a', '#e05a5a', '#9b6bcc'],
          borderWidth: 1,
        },
      ],
    };
  }, [course]);

  // ===== جلب البيانات =====
  const fetchCourseData = useCallback(async () => {
    setIsRefreshing(true);
    setLoading(true);
    try {
      let assistantId = null;
      try {
        const assistantData = sessionStorage.getItem('assistantData');
        const assistant = assistantData ? JSON.parse(assistantData) : null;
        assistantId = assistant?.id;
      } catch (err) {
        console.error('Error parsing assistantData:', err);
      }

      if (!assistantId) {
        toast.error('معرف المساعد غير موجود');
        router.push('/dashboard/assistant');
        return;
      }

      // 1. جلب الكورس
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single();

      if (courseError) throw courseError;
      if (!courseData) {
        router.push('/dashboard/assistant/courses');
        return;
      }

      setCourse(courseData);

      // 2. جلب الفيديوهات
      const { data: videosData } = await supabase
        .from('videos')
        .select('*')
        .eq('course_id', courseId)
        .order('order_index', { ascending: true });

      setVideos(videosData || []);

      // 3. جلب الامتحانات
      const { data: examsData } = await supabase
        .from('exams')
        .select('*')
        .eq('course_id', courseId)
        .order('created_at', { ascending: true });

      setExams(examsData || []);

      // 4. جلب الكتب عبر API
      const booksResponse = await fetch(`/api/books?courseId=${courseId}`, {
        headers: { 'x-assistant-id': assistantId },
      });
      const booksResult = await booksResponse.json();
      setBooks(booksResult.success ? booksResult.books : []);

      // 5. جلب الطلاب المسجلين
      const { data: enrollmentsData } = await supabase
        .from('enrollments')
        .select(`
          student_id,
          progress,
          completed_at,
          updated_at,
          profiles:student_id (full_name, email)
        `)
        .eq('course_id', courseId);

      const studentsList = (enrollmentsData || []).map(en => ({
        id: en.student_id,
        full_name: en.profiles?.full_name || 'طالب',
        email: en.profiles?.email || '',
        progress: en.progress || 0,
        completed_at: en.completed_at,
        updated_at: en.updated_at,
      }));
      setStudents(studentsList);

      // 6. جلب محاولات الامتحانات
      const examIds = (examsData || []).map(e => e.id);
      let avgExamScore = 0;
      let attemptsData = [];
      if (examIds.length > 0) {
        const { data: attempts } = await supabase
          .from('exam_attempts')
          .select('score, total_marks')
          .in('exam_id', examIds)
          .eq('status', 'completed');

        attemptsData = attempts || [];
        if (attemptsData.length > 0) {
          const percentages = attemptsData.map(a => 
            a.total_marks > 0 ? (a.score / a.total_marks) * 100 : 0
          );
          avgExamScore = percentages.reduce((a, b) => a + b, 0) / percentages.length;
        }
      }

      // 7. جلب بنوك الأسئلة
      const { data: banksData } = await supabase
        .from('question_banks')
        .select('id, title, questions:questions(count), is_published')
        .eq('course_id', courseId)
        .order('created_at', { ascending: true });

      const banksWithCount = (banksData || []).map(b => ({
        ...b,
        questions_count: b.questions?.[0]?.count || 0,
      }));
      setBanks(banksWithCount || []);

      // 8. حساب الإحصائيات
      const total = studentsList.length;
      const completed = studentsList.filter(s => s.completed_at !== null).length;
      const notStarted = studentsList.filter(s => s.progress === 0).length;
      const progresses = studentsList.map(s => s.progress);
      const avg = progresses.length > 0 ? progresses.reduce((a, b) => a + b, 0) / progresses.length : 0;
      const totalViews = (videosData || []).reduce((acc, v) => acc + (v.views || 0), 0);
      const totalBanks = banksWithCount.length;
      const totalBankQuestions = banksWithCount.reduce((acc, b) => acc + b.questions_count, 0);
      const totalBooks = booksResult.success ? booksResult.books.length : 0;

      setStats({
        totalStudents: total,
        totalVideos: videosData?.length || 0,
        totalExams: examsData?.length || 0,
        totalBooks,
        avgProgress: Math.round(avg),
        completed,
        notStarted,
        avgExamScore: Math.round(avgExamScore),
        totalViews,
        totalBanks,
        totalBankQuestions,
      });

      // 9. إعداد بيانات الرسوم البيانية
      const progressRanges = { '0-20': 0, '21-40': 0, '41-60': 0, '61-80': 0, '81-100': 0 };
      studentsList.forEach(s => {
        const p = s.progress || 0;
        if (p <= 20) progressRanges['0-20']++;
        else if (p <= 40) progressRanges['21-40']++;
        else if (p <= 60) progressRanges['41-60']++;
        else if (p <= 80) progressRanges['61-80']++;
        else progressRanges['81-100']++;
      });

      const examScoreRanges = { '0-20': 0, '21-40': 0, '41-60': 0, '61-80': 0, '81-100': 0 };
      if (attemptsData.length > 0) {
        attemptsData.forEach(a => {
          const p = a.total_marks > 0 ? (a.score / a.total_marks) * 100 : 0;
          if (p <= 20) examScoreRanges['0-20']++;
          else if (p <= 40) examScoreRanges['21-40']++;
          else if (p <= 60) examScoreRanges['41-60']++;
          else if (p <= 80) examScoreRanges['61-80']++;
          else examScoreRanges['81-100']++;
        });
      }

      setChartData({
        progressDistribution: {
          labels: ['0-20%', '21-40%', '41-60%', '61-80%', '81-100%'],
          datasets: [{
            label: 'عدد الطلاب',
            data: Object.values(progressRanges),
            backgroundColor: ['rgba(239, 68, 68, 0.7)', 'rgba(251, 146, 60, 0.7)', 'rgba(234, 179, 8, 0.7)', 'rgba(74, 222, 128, 0.7)', 'rgba(52, 211, 153, 0.7)'],
            borderColor: ['rgb(239, 68, 68)', 'rgb(251, 146, 60)', 'rgb(234, 179, 8)', 'rgb(74, 222, 128)', 'rgb(52, 211, 153)'],
            borderWidth: 2,
          }],
        },
        examScores: {
          labels: ['0-20%', '21-40%', '41-60%', '61-80%', '81-100%'],
          datasets: [{
            label: 'عدد الامتحانات',
            data: Object.values(examScoreRanges),
            backgroundColor: ['rgba(239, 68, 68, 0.7)', 'rgba(251, 146, 60, 0.7)', 'rgba(234, 179, 8, 0.7)', 'rgba(74, 222, 128, 0.7)', 'rgba(52, 211, 153, 0.7)'],
            borderColor: ['rgb(239, 68, 68)', 'rgb(251, 146, 60)', 'rgb(234, 179, 8)', 'rgb(74, 222, 128)', 'rgb(52, 211, 153)'],
            borderWidth: 2,
          }],
        },
        weeklyActivity: {
          labels: ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
          datasets: [{
            label: 'عدد المشاهدات',
            data: [12, 19, 15, 22, 8, 5, 14],
            borderColor: 'rgb(255, 215, 0)',
            backgroundColor: 'rgba(255, 215, 0, 0.1)',
            fill: true,
            tension: 0.4,
          }],
        },
      });

    } catch (err) {
      console.error('Error fetching course data:', err);
      setError('فشل جلب بيانات الكورس: ' + err.message);
      toast.error('فشل جلب البيانات');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [courseId, router]);

  useEffect(() => {
    if (courseId) fetchCourseData();
  }, [courseId, fetchCourseData]);

  // ===== دوال الإدارة =====
  const handleDelete = async (id, type) => {
    const typeMap = { video: 'فيديو', exam: 'امتحان', book: 'كتاب', bank: 'بنك أسئلة' };
    if (!confirm(`هل أنت متأكد من حذف هذا ${typeMap[type] || 'العنصر'}؟`)) return;

    try {
      const table = type === 'video' ? 'videos' : type === 'exam' ? 'exams' : type === 'book' ? 'books' : 'question_banks';
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success(`✅ تم حذف ${typeMap[type] || 'العنصر'} بنجاح`);
      fetchCourseData();
    } catch (err) {
      console.error('Error deleting:', err);
      toast.error('فشل الحذف');
    }
  };

  const handleDeleteBook = async (bookId) => {
    if (!confirm('هل أنت متأكد من حذف هذا الكتاب؟')) return;
    try {
      let assistantId = null;
      try {
        const assistantData = sessionStorage.getItem('assistantData');
        const assistant = assistantData ? JSON.parse(assistantData) : null;
        assistantId = assistant?.id;
      } catch (err) {
        console.error('Error parsing assistantData:', err);
      }
      if (!assistantId) {
        toast.error('معرف المساعد غير موجود');
        return;
      }
      const response = await fetch(`/api/books/${bookId}`, {
        method: 'DELETE',
        headers: { 'x-assistant-id': assistantId },
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'فشل الحذف');
      toast.success('✅ تم حذف الكتاب بنجاح');
      fetchCourseData();
    } catch (err) {
      toast.error(err.message || 'فشل الحذف');
    }
  };

  const navigateToAdd = (type) => {
    if (type === 'question-bank') {
      router.push(`/dashboard/assistant/question-bank/new?course_id=${courseId}`);
    } else {
      router.push(`/dashboard/assistant/${type}s/new?course_id=${courseId}`);
    }
  };

  const navigateToEdit = (id, type) => {
    if (type === 'bank') {
      router.push(`/dashboard/assistant/question-bank/${id}/edit`);
    } else {
      router.push(`/dashboard/assistant/${type}s/${id}/edit`);
    }
  };

  const togglePublish = async () => {
    try {
      const { error } = await supabase
        .from('courses')
        .update({ is_published: !course.is_published })
        .eq('id', courseId);
      if (error) throw error;
      toast.success(`✅ تم ${course.is_published ? 'إلغاء نشر' : 'نشر'} الكورس`);
      fetchCourseData();
    } catch (err) {
      toast.error('فشل تغيير الحالة');
    }
  };

  const goToCoursesList = () => router.push('/dashboard/assistant/courses');

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const lang = {
    title: 'تفاصيل الكورس',
    back: 'العودة للقائمة',
    editCourse: 'تعديل الكورس',
    publish: 'نشر',
    unpublish: 'إلغاء النشر',
    refresh: 'تحديث',
    statsStudents: 'الطلاب',
    statsVideos: 'الفيديوهات',
    statsExams: 'الامتحانات',
    statsBooks: 'الكتب',
    statsAvgProgress: 'متوسط التقدم',
    statsCompleted: 'مكتمل',
    statsNotStarted: 'لم يبدأ',
    statsAvgExamScore: 'متوسط درجات الامتحانات',
    statsTotalViews: 'إجمالي المشاهدات',
    tabVideos: 'الفيديوهات',
    tabExams: 'الامتحانات',
    tabBooks: 'الكتب',
    tabStudents: 'الطلاب',
    tabBanks: 'بنوك الأسئلة',
    addVideo: 'إضافة فيديو',
    addExam: 'إضافة امتحان',
    addBook: 'إضافة كتاب',
    addBank: 'إضافة بنك أسئلة',
    noVideos: 'لا توجد فيديوهات',
    noExams: 'لا توجد امتحانات',
    noBooks: 'لا توجد كتب',
    noStudents: 'لا يوجد طلاب مسجلين',
    noBanks: 'لا توجد بنوك أسئلة',
    delete: 'حذف',
    edit: 'تعديل',
    view: 'عرض',
    status: 'الحالة',
    published: 'منشور',
    draft: 'مسودة',
    progress: 'التقدم',
    completed: 'مكتمل',
    inProgress: 'جاري',
    notStarted: 'لم يبدأ',
    quickActions: 'إجراءات سريعة',
    home: 'الرئيسية',
    courses: 'الكورسات',
    allExams: 'جميع الامتحانات',
    allBooks: 'جميع الكتب',
    allVideos: 'جميع الفيديوهات',
    loading: 'جاري التحميل...',
    courseDescription: 'وصف الكورس',
    level: 'المستوى',
    price: 'السعر',
    duration: 'المدة',
    studentsCount: 'عدد الطلاب',
    rating: 'التقييم',
    freeLabel: '🎁 مجاني',
    chartProgress: 'توزيع تقدم الطلاب',
    chartExamScores: 'توزيع درجات الامتحانات',
    chartWeeklyActivity: 'النشاط الأسبوعي',
    chartGradeDistribution: 'توزيع المرحلة الدراسية',
    recommendations: 'توصيات ذكية',
    recAddVideo: 'إضافة فيديو جديد لزيادة التفاعل',
    recAddExam: 'إضافة امتحان لتقييم الطلاب',
    recPromoteCourse: 'نشر الكورس لجذب المزيد من الطلاب',
    recContactStudents: 'التواصل مع الطلاب لتحفيزهم',
  };

  const recommendations = [];
  if (stats.totalVideos === 0) {
    recommendations.push({ icon: Icons.Video, title: lang.recAddVideo, color: 'blue' });
  }
  if (stats.totalExams === 0) {
    recommendations.push({ icon: Icons.FileText, title: lang.recAddExam, color: 'purple' });
  }
  if (!course?.is_published && stats.totalStudents > 0) {
    recommendations.push({ icon: Icons.Megaphone, title: lang.recPromoteCourse, color: 'yellow' });
  }
  if (stats.totalStudents > 0 && stats.completed < stats.totalStudents / 2) {
    recommendations.push({ icon: Icons.MessageSquare, title: lang.recContactStudents, color: 'green' });
  }
  if (recommendations.length === 0) {
    recommendations.push({ icon: Icons.Trophy, title: 'كل شيء على ما يرام! استمر في تقديم محتوى رائع', color: 'gold' });
  }

  if (loading) {
    return (
      <AssistantLayout>
        <div className="flex items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
        </div>
      </AssistantLayout>
    );
  }

  if (!course) return null;

  return (
    <AssistantLayout>
      <div className={`relative ${styles.bg} min-h-screen`}>
        <ParticleBackground />

        <div className="relative z-10 p-4 md:p-6">
          {/* ===== شريط التنقل الداخلي ===== */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={goToCoursesList}
                className={`${styles.subtext} hover:text-yellow-400 transition p-1.5`}
              >
                <Icons.ArrowRight className="h-5 w-5" />
              </button>
              <h1 className={`text-xl font-extrabold ${styles.text} truncate max-w-[200px] md:max-w-md`}>
                {course.title}
              </h1>
              <span className="text-xs text-gray-500">#{course.slug}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={fetchCourseData}
                disabled={isRefreshing}
                className={`p-2 rounded-xl transition ${isRefreshing ? 'animate-spin' : 'hover:bg-white/5'} ${styles.card} ${styles.border}`}
                title={lang.refresh}
              >
                <Icons.RefreshCw className="h-4 w-4" />
              </button>
              <button
                onClick={toggleTheme}
                className={`p-2 rounded-xl transition hover:bg-white/5 ${styles.card} ${styles.border}`}
                title={theme === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن'}
              >
                {theme === 'dark' ? <Icons.Sun className="h-4 w-4 text-yellow-400" /> : <Icons.Moon className="h-4 w-4 text-gray-600" />}
              </button>
              <Link
                href={`/dashboard/assistant/courses/${courseId}/edit`}
                className="px-3 py-1.5 bg-yellow-400/20 hover:bg-yellow-400/30 text-yellow-300 rounded-xl text-xs font-semibold transition flex items-center gap-1"
              >
                <Icons.Edit className="h-3 w-3" /> {lang.editCourse}
              </Link>
              <button
                onClick={togglePublish}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1 ${
                  course.is_published
                    ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400'
                    : 'bg-green-500/20 hover:bg-green-500/30 text-green-400'
                }`}
              >
                {course.is_published ? <Icons.EyeOff className="h-3 w-3" /> : <Icons.Eye className="h-3 w-3" />}
                {course.is_published ? lang.unpublish : lang.publish}
              </button>
              <Link
                href={`/dashboard/assistant/students?courseId=${courseId}`}
                className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-xl text-xs font-semibold transition flex items-center gap-1"
              >
                <Icons.Users className="h-3 w-3" /> طلاب
              </Link>
            </div>
          </div>

          {/* ===== الأخطاء ===== */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-xl mb-4 flex items-center gap-3 text-sm"
              >
                <Icons.AlertCircle className="h-5 w-5 flex-shrink-0" />
                <span className="flex-1">{error}</span>
                <button onClick={() => setError('')} className="text-red-400/70 hover:text-red-400">
                  <Icons.X className="h-4 w-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ===== بطاقة الكورس + الإحصائيات ===== */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* بطاقة الكورس */}
            <div className="lg:col-span-1">
              <div className={`${styles.card} rounded-2xl overflow-hidden ${styles.hover} transition-all duration-500`}>
                <div className="aspect-[16/9] bg-gradient-to-br from-yellow-400/20 via-purple-500/20 to-blue-500/20 flex items-center justify-center relative">
                  {course.cover_image ? (
                    <img src={course.cover_image} alt={course.title} className="w-full h-full object-cover" />
                  ) : (
                    <Icons.BookOpen className="h-20 w-20 text-gray-600" />
                  )}
                  <div className="absolute top-3 right-3 flex flex-col gap-1 items-end">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full border ${
                        course.is_published
                          ? 'bg-green-500/20 text-green-400 border-green-500/30'
                          : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                      }`}
                    >
                      {course.is_published ? 'منشور' : 'مسودة'}
                    </span>
                    {course.is_free && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                        🎁 مجاني
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-5">
                  <h2 className={`text-xl font-bold ${styles.text}`}>{course.title}</h2>
                  <p className={`text-sm ${styles.subtext} mt-2 line-clamp-3`}>
                    {course.description || lang.courseDescription}
                  </p>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                    <div className={`${styles.card} rounded-lg p-2 text-center`}>
                      <span className={styles.subtext}>المرحلة</span>
                      <p className={`font-medium ${styles.text}`}>{course.grade_stage || 'غير محدد'}</p>
                    </div>
                    <div className={`${styles.card} rounded-lg p-2 text-center`}>
                      <span className={styles.subtext}>الصف</span>
                      <p className={`font-medium ${styles.text}`}>{course.grade_level || 'غير محدد'}</p>
                    </div>
                    <div className={`${styles.card} rounded-lg p-2 text-center`}>
                      <span className={styles.subtext}>{lang.price}</span>
                      {course.is_free ? (
                        <p className="font-medium text-green-400">🎁 مجاني</p>
                      ) : (
                        <p className={`font-medium ${styles.text}`}>{course.price || 0} ج.م</p>
                      )}
                    </div>
                    <div className={`${styles.card} rounded-lg p-2 text-center`}>
                      <span className={styles.subtext}>{lang.studentsCount}</span>
                      <p className={`font-medium ${styles.text}`}>{stats.totalStudents}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* الإحصائيات */}
            <div className="lg:col-span-2 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard stat={{ label: lang.statsStudents, value: stats.totalStudents, suffix: '', icon: Icons.Users, color: 'from-blue-400 to-blue-600', delay: 0 }} styles={styles} />
                <StatCard stat={{ label: lang.statsVideos, value: stats.totalVideos, suffix: '', icon: Icons.Video, color: 'from-green-400 to-green-600', delay: 0.1 }} styles={styles} />
                <StatCard stat={{ label: lang.statsExams, value: stats.totalExams, suffix: '', icon: Icons.FileText, color: 'from-purple-400 to-purple-600', delay: 0.2 }} styles={styles} />
                <StatCard stat={{ label: lang.statsBooks, value: stats.totalBooks, suffix: '', icon: Icons.Book, color: 'from-orange-400 to-orange-600', delay: 0.3 }} styles={styles} />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                <StatCard stat={{ label: lang.statsAvgProgress, value: stats.avgProgress, suffix: '%', icon: Icons.TrendingUp, color: 'from-yellow-400 to-yellow-600', delay: 0.4 }} styles={styles} />
                <StatCard stat={{ label: lang.statsCompleted, value: stats.completed, suffix: '', icon: Icons.CheckCircle, color: 'from-green-400 to-green-600', delay: 0.5 }} styles={styles} />
                <StatCard stat={{ label: lang.statsNotStarted, value: stats.notStarted, suffix: '', icon: Icons.Clock, color: 'from-gray-400 to-gray-600', delay: 0.6 }} styles={styles} />
                <StatCard stat={{ label: lang.statsAvgExamScore, value: stats.avgExamScore, suffix: '%', icon: Icons.Star, color: 'from-purple-400 to-purple-600', delay: 0.7 }} styles={styles} />
                <StatCard stat={{ label: 'بنوك الأسئلة', value: stats.totalBanks || 0, suffix: '', icon: Icons.Database, color: 'from-purple-400 to-purple-600', delay: 0.8 }} styles={styles} />
                <StatCard stat={{ label: 'أسئلة في البنوك', value: stats.totalBankQuestions || 0, suffix: '', icon: Icons.Clipboard, color: 'from-indigo-400 to-indigo-600', delay: 0.9 }} styles={styles} />
              </div>
            </div>
          </div>

          {/* ===== الرسوم البيانية ===== */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className={`${styles.card} rounded-2xl p-5`}>
              <h3 className={`text-sm font-bold ${styles.text} mb-4 text-center`}>{lang.chartProgress}</h3>
              <div className="h-56">
                <Bar
                  data={chartData.progressDistribution}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: { color: theme === 'dark' ? '#fff' : '#333' },
                        grid: { color: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' },
                      },
                      x: {
                        ticks: { color: theme === 'dark' ? '#fff' : '#333' },
                        grid: { display: false },
                      },
                    },
                  }}
                />
              </div>
            </div>
            <div className={`${styles.card} rounded-2xl p-5`}>
              <h3 className={`text-sm font-bold ${styles.text} mb-4 text-center`}>{lang.chartExamScores}</h3>
              <div className="h-56">
                <Bar
                  data={chartData.examScores}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: { color: theme === 'dark' ? '#fff' : '#333' },
                        grid: { color: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' },
                      },
                      x: {
                        ticks: { color: theme === 'dark' ? '#fff' : '#333' },
                        grid: { display: false },
                      },
                    },
                  }}
                />
              </div>
            </div>
            <div className={`${styles.card} rounded-2xl p-5`}>
              <h3 className={`text-sm font-bold ${styles.text} mb-4 text-center`}>{lang.chartGradeDistribution}</h3>
              <div className="h-56 max-w-xs mx-auto">
                <Doughnut
                  data={gradeChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'bottom',
                        labels: { color: theme === 'dark' ? '#fff' : '#333' },
                      },
                    },
                  }}
                />
              </div>
            </div>
          </div>

          {/* ===== توصيات ذكية ===== */}
          <div className="bg-gradient-to-r from-yellow-400/10 to-purple-500/10 border border-white/10 rounded-2xl p-4 mb-6">
            <h3 className={`text-sm font-bold ${styles.text} mb-3 flex items-center gap-2`}>
              <Icons.Brain className="h-5 w-5 text-yellow-400" />
              {lang.recommendations}
            </h3>
            <div className="flex flex-wrap gap-3">
              {recommendations.map((rec, index) => {
                const colors = {
                  blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
                  purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
                  yellow: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
                  green: 'bg-green-500/10 text-green-400 border-green-500/20',
                  gold: 'bg-yellow-400/10 text-yellow-300 border-yellow-400/20',
                };
                const colorClass = colors[rec.color] || colors.gold;
                const Icon = rec.icon;
                return (
                  <div
                    key={index}
                    className={`px-4 py-2 rounded-xl border ${colorClass} text-sm flex items-center gap-2`}
                  >
                    <Icon className="h-4 w-4" />
                    {rec.title}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ===== التبويبات ===== */}
          <div className={`${styles.card} rounded-2xl p-5 ${styles.hover} transition-all duration-500`}>
            <div className="flex flex-wrap gap-2 mb-6 border-b border-white/5 pb-4">
              {[
                { id: 'videos', label: `${lang.tabVideos} (${stats.totalVideos})`, icon: Icons.Video },
                { id: 'exams', label: `${lang.tabExams} (${stats.totalExams})`, icon: Icons.FileText },
                { id: 'books', label: `${lang.tabBooks} (${stats.totalBooks})`, icon: Icons.Book },
                { id: 'students', label: `${lang.tabStudents} (${stats.totalStudents})`, icon: Icons.Users },
                { id: 'banks', label: `${lang.tabBanks} (${stats.totalBanks})`, icon: Icons.Database },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'bg-yellow-400/20 text-yellow-300 border border-yellow-400/30'
                      : `${styles.subtext} hover:text-white hover:bg-white/5`
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {activeTab === 'videos' && (
                <motion.div
                  key="videos"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <VideosTab
                    videos={videos}
                    courseId={courseId}
                    onDelete={handleDelete}
                    onEdit={navigateToEdit}
                    onAdd={() => navigateToAdd('video')}
                    styles={styles}
                  />
                </motion.div>
              )}

              {activeTab === 'exams' && (
                <motion.div
                  key="exams"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <ExamsTab
                    exams={exams}
                    courseId={courseId}
                    onDelete={handleDelete}
                    onEdit={navigateToEdit}
                    onAdd={() => navigateToAdd('exam')}
                    styles={styles}
                  />
                </motion.div>
              )}

              {activeTab === 'books' && (
                <motion.div
                  key="books"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <BooksTab
                    books={books}
                    courseId={courseId}
                    onDelete={handleDeleteBook}
                    onAdd={() => setIsUploadModalOpen(true)}
                    styles={styles}
                  />
                </motion.div>
              )}

              {activeTab === 'students' && (
                <motion.div
                  key="students"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <StudentsTab
                    students={students}
                    courseId={courseId}
                    onRefresh={fetchCourseData}
                    styles={styles}
                  />
                </motion.div>
              )}

              {activeTab === 'banks' && (
                <motion.div
                  key="banks"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <BanksTab
                    banks={banks}
                    courseId={courseId}
                    onDelete={handleDelete}
                    onEdit={navigateToEdit}
                    onAdd={() => navigateToAdd('question-bank')}
                    onViewQuestions={(bankId) => router.push(`/dashboard/assistant/question-bank/${bankId}`)}
                    styles={styles}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ===== الإجراءات السريعة ===== */}
          <div className={`${styles.card} rounded-2xl p-5 mt-6 ${styles.hover} transition-all duration-500`}>
            <h3 className={`font-bold ${styles.text} mb-3 flex items-center gap-2`}>
              <Icons.Link className="h-5 w-5 text-yellow-400" />
              {lang.quickActions}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              <Link
                href="/dashboard/assistant"
                className={`text-center text-xs ${styles.card} hover:bg-white/10 p-3 rounded-xl transition ${styles.border} ${styles.hover}`}
              >
                <Icons.Home className="h-5 w-5 mx-auto mb-1 text-yellow-400" />
                {lang.home}
              </Link>
              <Link
                href="/dashboard/assistant/courses"
                className={`text-center text-xs ${styles.card} hover:bg-white/10 p-3 rounded-xl transition ${styles.border} ${styles.hover}`}
              >
                <Icons.Book className="h-5 w-5 mx-auto mb-1 text-blue-400" />
                {lang.courses}
              </Link>
              <Link
                href="/dashboard/assistant/exams"
                className={`text-center text-xs ${styles.card} hover:bg-white/10 p-3 rounded-xl transition ${styles.border} ${styles.hover}`}
              >
                <Icons.FileText className="h-5 w-5 mx-auto mb-1 text-purple-400" />
                {lang.allExams}
              </Link>
              <Link
                href="/dashboard/assistant/books"
                className={`text-center text-xs ${styles.card} hover:bg-white/10 p-3 rounded-xl transition ${styles.border} ${styles.hover}`}
              >
                <Icons.BookOpen className="h-5 w-5 mx-auto mb-1 text-green-400" />
                {lang.allBooks}
              </Link>
              <Link
                href="/dashboard/assistant/question-bank"
                className={`text-center text-xs ${styles.card} hover:bg-white/10 p-3 rounded-xl transition ${styles.border} ${styles.hover}`}
              >
                <Icons.Database className="h-5 w-5 mx-auto mb-1 text-purple-400" />
                بنوك الأسئلة
              </Link>
            </div>
          </div>
        </div>

        {/* ===== مودال رفع الكتاب ===== */}
        <UploadBookModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          courseId={courseId}
          onSuccess={fetchCourseData}
          styles={styles}
        />
      </div>
    </AssistantLayout>
  );
}