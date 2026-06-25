'use client';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Play, Users, Award, BookOpen, Shield, Zap } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b0e1a] via-[#1a1f2e] to-[#0b0e1a] text-white overflow-hidden">
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center px-4">
        <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 via-purple-500/10 to-blue-500/10 blur-3xl" />
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative text-center max-w-4xl"
        >
          <h1 className="text-6xl md:text-8xl font-extrabold bg-gradient-to-r from-yellow-300 via-orange-400 to-yellow-300 bg-clip-text text-transparent">
            منصة محمد رضوان
          </h1>
          <p className="mt-6 text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
            تعلم الإنجليزية باحترافية مع أقوى نظام تعليمي تفاعلي في العالم العربي
          </p>
          <div className="mt-10 flex flex-wrap gap-4 justify-center">
            <Button className="bg-gradient-to-r from-yellow-400 to-yellow-600 hover:scale-105 text-black font-bold px-8 py-6 text-lg rounded-full shadow-2xl transition-all">
              <Play className="mr-2 h-5 w-5" />
              ابدأ الآن مجاناً
            </Button>
            <Button variant="outline" className="border-white/20 bg-white/5 backdrop-blur text-white hover:bg-white/10 px-8 py-6 text-lg rounded-full">
              اكتشف الكورسات
            </Button>
          </div>
        </motion.div>
      </section>

      {/* Stats Section */}
      <section className="max-w-6xl mx-auto px-4 py-20 grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { icon: Users, label: 'طلاب', value: '+15,000' },
          { icon: Play, label: 'فيديو', value: '+120' },
          { icon: Award, label: 'نسبة رضا', value: '98%' },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="bg-white/5 backdrop-blur-xl border border-white/10 hover:border-yellow-400/50 transition-all duration-300">
              <CardContent className="text-center py-8">
                <stat.icon className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
                <h3 className="text-4xl font-bold text-yellow-400">{stat.value}</h3>
                <p className="text-gray-400 mt-2">{stat.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </section>

      {/* Features Section */}
      <section className="max-w-6xl mx-auto px-4 py-20 grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { icon: Shield, title: 'فيديوهات محمية', desc: 'تشفير متقدم وبصمة مائية تمنع التحميل' },
          { icon: BookOpen, title: 'كتب تفاعلية', desc: 'ملازم رقمية مع فيديوهات وملاحظات' },
          { icon: Zap, title: 'امتحانات ذكية', desc: 'مراقبة بالذكاء الاصطناعي ومنع الغش' },
        ].map((feat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="bg-white/5 backdrop-blur-xl border border-white/10 hover:border-yellow-400/50 transition-all p-6 text-center">
              <feat.icon className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">{feat.title}</h3>
              <p className="text-gray-400">{feat.desc}</p>
            </Card>
          </motion.div>
        ))}
      </section>
    </div>
  );
}