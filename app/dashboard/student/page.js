'use client';

import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Video, Award, Clock, TrendingUp } from 'lucide-react';
import Link from 'next/link';

export default function StudentDashboard() {
  const stats = [
    { title: 'الكورسات المسجل فيها', value: '4', icon: BookOpen, color: 'from-blue-400 to-blue-600' },
    { title: 'فيديوهات شاهدتها', value: '32', icon: Video, color: 'from-green-400 to-green-600' },
    { title: 'نقاط XP', value: '1,250', icon: Award, color: 'from-yellow-400 to-yellow-600' },
    { title: 'وقت التعلم', value: '18 ساعة', icon: Clock, color: 'from-purple-400 to-purple-600' },
  ];

  const courses = [
    { name: 'جرامر الترم الأول', progress: 75, teacher: 'محمد رضوان' },
    { name: 'كلمات الترم الأول', progress: 45, teacher: 'محمد رضوان' },
    { name: 'المحادثة والاستماع', progress: 20, teacher: 'محمد رضوان' },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-extrabold">مرحباً أيها الطالب 🎓</h1>
        <Link href="/dashboard/student/courses">
          <Button className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold shadow-lg shadow-yellow-400/20 hover:scale-105 transition">
            <TrendingUp className="h-5 w-5 ml-2" />
            استكشف الكورسات
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="bg-white/5 backdrop-blur border border-white/10 hover:border-yellow-400/50 transition-all duration-300">
              <CardContent className="p-6">
                <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${stat.color} bg-opacity-20 mb-4`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-gray-400 text-sm">{stat.title}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card className="bg-white/5 backdrop-blur border border-white/10">
        <CardHeader>
          <CardTitle>كورساتي</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {courses.map((course, i) => (
              <div key={i} className="p-4 bg-white/5 rounded-xl">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold">{course.name}</span>
                  <span className="text-sm text-gray-400">{course.teacher}</span>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full transition-all duration-500"
                    style={{ width: `${course.progress}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-gray-500">{course.progress}% مكتمل</span>
                  <Link href={`/dashboard/student/courses/${i}`} className="text-xs text-yellow-400 hover:text-yellow-300 transition">
                    متابعة
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}