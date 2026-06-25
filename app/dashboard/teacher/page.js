'use client';

import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Video, FileText, TrendingUp, PlusCircle } from 'lucide-react';
import Link from 'next/link';

export default function TeacherDashboard() {
  const stats = [
    { title: 'الطلاب', value: '24', icon: Users, color: 'from-blue-400 to-blue-600' },
    { title: 'الفيديوهات', value: '18', icon: Video, color: 'from-green-400 to-green-600' },
    { title: 'الامتحانات', value: '12', icon: FileText, color: 'from-purple-400 to-purple-600' },
    { title: 'نسبة الإنجاز', value: '87%', icon: TrendingUp, color: 'from-yellow-400 to-yellow-600' },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-extrabold">مرحباً أيها المعلم 👋</h1>
        <Link href="/dashboard/teacher/courses/new">
          <Button className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold shadow-lg shadow-yellow-400/20 hover:scale-105 transition">
            <PlusCircle className="h-5 w-5 ml-2" />
            إنشاء كورس جديد
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white/5 backdrop-blur border border-white/10">
          <CardHeader>
            <CardTitle>أحدث الفيديوهات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {['فيديو 1', 'فيديو 2', 'فيديو 3'].map((v, i) => (
                <div key={i} className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
                  <span>{v}</span>
                  <span className="text-xs text-gray-500">12 مشاهدة</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 backdrop-blur border border-white/10">
          <CardHeader>
            <CardTitle>أحدث الطلاب</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {['أحمد', 'سارة', 'محمد'].map((s, i) => (
                <div key={i} className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
                  <span>{s}</span>
                  <span className="text-xs text-gray-500">انضم منذ 3 أيام</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}