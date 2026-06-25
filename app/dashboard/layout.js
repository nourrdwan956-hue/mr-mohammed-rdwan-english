// app/dashboard/layout.js
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { signOut } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { 
  Home, BookOpen, Video, FileText, Users, BarChart, 
  Settings, LogOut, Menu, X, User, GraduationCap
} from 'lucide-react';

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
      if (!user) {
        router.push('/login');
      }
    };
    getUser();
  }, [router]);

  const handleLogout = async () => {
    await signOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b0e1a]">
        <div className="text-yellow-400 text-xl">جاري التحميل...</div>
      </div>
    );
  }

  if (!user) return null;

  const userRole = user.user_metadata?.role || 'student';
  const userName = user.user_metadata?.full_name || user.email;

  const navItems = [
    { name: 'الرئيسية', icon: Home, href: `/dashboard/${userRole}` },
    { name: 'الكورسات', icon: BookOpen, href: `/dashboard/${userRole}/courses` },
    { name: 'الفيديوهات', icon: Video, href: `/dashboard/${userRole}/videos` },
    { name: 'الامتحانات', icon: FileText, href: `/dashboard/${userRole}/exams` },
  ];

  if (userRole === 'teacher') {
    navItems.push(
      { name: 'الطلاب', icon: Users, href: '/dashboard/teacher/students' },
      { name: 'التقارير', icon: BarChart, href: '/dashboard/teacher/reports' }
    );
  } else {
    navItems.push(
      { name: 'تقدمي', icon: BarChart, href: '/dashboard/student/progress' },
      { name: 'شهاداتي', icon: GraduationCap, href: '/dashboard/student/certificates' }
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0e1a] text-white flex">
      {/* شريط جانبي */}
      <aside className={`fixed inset-y-0 right-0 z-50 w-72 bg-[#131826] border-l border-white/5 transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'} lg:translate-x-0 lg:static`}>
        <div className="p-6 flex flex-col h-full">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-black font-extrabold text-lg shadow-lg shadow-yellow-400/20">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-bold text-white">{userName}</p>
              <p className="text-xs text-gray-500">{userRole === 'teacher' ? 'معلم' : 'طالب'}</p>
            </div>
          </div>

          <nav className="space-y-1 flex-1">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 hover:text-yellow-400 transition-all duration-300 text-gray-400 text-sm"
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.name}</span>
              </Link>
            ))}
          </nav>

          <div className="pt-6 border-t border-white/5 space-y-2">
            <Link href="/dashboard/settings" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 hover:text-yellow-400 transition-all duration-300 text-gray-400 text-sm">
              <Settings className="h-5 w-5" />
              <span>الإعدادات</span>
            </Link>
            <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 hover:text-red-400 transition-all duration-300 text-gray-400 text-sm w-full">
              <LogOut className="h-5 w-5" />
              <span>تسجيل الخروج</span>
            </button>
          </div>
        </div>
      </aside>

      {/* المحتوى الرئيسي */}
      <div className="flex-1 min-h-screen">
        {/* شريط علوي */}
        <header className="sticky top-0 z-40 bg-[#0b0e1a]/80 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex items-center justify-between">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden text-white">
            {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
          <h2 className="text-lg font-bold bg-gradient-to-r from-yellow-300 to-yellow-500 bg-clip-text text-transparent">
            لوحة التحكم
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 hidden sm:block">{user.email}</span>
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-black font-bold text-sm">
              {userName.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* المحتوى */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}