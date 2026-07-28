

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ============================================================
// API تحليلات بنك الأسئلة للمساعدين
// ============================================================

export async function GET(request) {
  try {
    // 1. جلب معرف المساعد من الهيدر
    const assistantId = request.headers.get('x-assistant-id');
    if (!assistantId) {
      return NextResponse.json({ error: 'معرف المساعد مطلوب' }, { status: 400 });
    }

    // 2. جلب parameters من URL (فلترة)
    const url = new URL(request.url);
    const selectedBankId = url.searchParams.get('bankId') || 'all';
    const fromDate = url.searchParams.get('from') || '';
    const toDate = url.searchParams.get('to') || '';

    // 3. استخدام Service Role لتجاوز RLS
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SECRET_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // 4. جلب بيانات المساعد (للتحقق من teacher_id)
    const { data: assistant, error: assistantError } = await supabaseAdmin
      .from('assistants')
      .select('id, teacher_id, full_name')
      .eq('id', assistantId)
      .single();

    if (assistantError || !assistant) {
      return NextResponse.json({ error: 'المساعد غير موجود' }, { status: 404 });
    }

    // 5. التحقق من صلاحية can_view على question_bank
    const { data: permissions, error: permsError } = await supabaseAdmin
      .from('assistant_permissions')
      .select('can_view')
      .eq('assistant_id', assistantId)
      .eq('module', 'question_bank')
      .single();

    if (permsError || !permissions?.can_view) {
      return NextResponse.json({ error: 'لا تملك صلاحية عرض تحليلات بنك الأسئلة' }, { status: 403 });
    }

    const teacherId = assistant.teacher_id;

    // 6. جلب البنوك الخاصة بالمعلم
    let bankQuery = supabaseAdmin
      .from('question_banks')
      .select('id, title, is_published, archived, created_at')
      .eq('teacher_id', teacherId);

    const { data: banksData, error: banksError } = await bankQuery;
    if (banksError) throw banksError;

    const totalBanks = banksData?.length || 0;
    const publishedBanks = banksData?.filter(b => b.is_published && !b.archived).length || 0;

    // 7. تحديد البنوك المستهدفة للفلترة
    const bankIds = banksData?.map(b => b.id) || [];
    let filteredBankIds = selectedBankId === 'all' ? bankIds : [selectedBankId];
    
    let allQuestions = [];
    let typeCount = {};
    let difficultyCount = {};
    let tagsCount = {};
    let bankQuestionCount = {};
    let gradeCount = {};
    let usageCount = {};

    // 8. جلب الأسئلة من البنوك المفلترة
    if (filteredBankIds.length > 0) {
      let qQuery = supabaseAdmin
        .from('questions')
        .select('*')
        .in('bank_id', filteredBankIds);

      // تطبيق فلترة التاريخ
      if (fromDate) qQuery = qQuery.gte('created_at', fromDate);
      if (toDate) qQuery = qQuery.lte('created_at', toDate);

      const { data: qData, error: qError } = await qQuery;
      if (qError) throw qError;
      allQuestions = qData || [];

      // حساب الإحصائيات
      allQuestions.forEach(q => {
        typeCount[q.type] = (typeCount[q.type] || 0) + 1;
        difficultyCount[q.difficulty] = (difficultyCount[q.difficulty] || 0) + 1;
        if (q.tags) {
          q.tags.forEach(tag => {
            tagsCount[tag] = (tagsCount[tag] || 0) + 1;
          });
        }
        bankQuestionCount[q.bank_id] = (bankQuestionCount[q.bank_id] || 0) + 1;
        if (q.grade_level) {
          gradeCount[q.grade_level] = (gradeCount[q.grade_level] || 0) + 1;
        }
      });

      // 9. جلب استخدام الأسئلة في الامتحانات
      const questionIds = allQuestions.map(q => q.id);
      if (questionIds.length > 0) {
        const { data: examUsage, error: usageError } = await supabaseAdmin
          .from('exam_questions')
          .select('bank_question_id, exam_id')
          .in('bank_question_id', questionIds);

        if (!usageError && examUsage) {
          examUsage.forEach(eq => {
            usageCount[eq.bank_question_id] = (usageCount[eq.bank_question_id] || 0) + 1;
          });
        }
      }
    }

    // 10. تجهيز البيانات للإرجاع
    const totalQuestions = allQuestions.length;
    const totalTags = Object.keys(tagsCount).length;
    const avgQuestions = totalBanks > 0 ? Math.round(totalQuestions / totalBanks) : 0;
    const mostUsedTag = Object.entries(tagsCount).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';
    const usedQuestions = Object.keys(usageCount).length;
    const usageRatio = totalQuestions > 0 ? Math.round((usedQuestions / totalQuestions) * 100) : 0;
    const avgUsage = totalQuestions > 0 ? (Object.values(usageCount).reduce((a, b) => a + b, 0) / totalQuestions) : 0;

    // 11. ترتيب الأسئلة الأكثر استخداماً
    const topQuestions = allQuestions
      .map(q => ({ ...q, usage_count: usageCount[q.id] || 0 }))
      .sort((a, b) => b.usage_count - a.usage_count)
      .slice(0, 10);

    // 12. النمو الزمني
    const months = {};
    allQuestions.forEach(q => {
      const date = new Date(q.created_at);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      months[key] = (months[key] || 0) + 1;
    });
    const sortedKeys = Object.keys(months).sort();
    const timeSeries = {
      labels: sortedKeys.map(k => k.replace('-', '/')),
      data: sortedKeys.map(k => months[k]),
    };

    // 13. حالة البنوك
    const bankStatus = {
      published: banksData?.filter(b => b.is_published && !b.archived).length || 0,
      draft: banksData?.filter(b => !b.is_published && !b.archived).length || 0,
      archived: banksData?.filter(b => b.archived).length || 0,
    };

    // 14. تجميع النتائج
    const stats = {
      totalBanks,
      publishedBanks,
      totalQuestions,
      totalTags,
      avgQuestions,
      mostUsedTag,
      typeCount,
      difficultyCount,
      usedQuestions,
      usageRatio,
      avgUsage: avgUsage.toFixed(1),
      bankStatus,
      // سنقوم بتوليد التوصيات لاحقاً في الصفحة أو هنا
    };

    // 15. بيانات الرسوم البيانية (جاهزة للاستخدام في المخططات)
    const chartData = {
      type: {
        labels: Object.keys(typeCount),
        data: Object.values(typeCount),
      },
      difficulty: {
        labels: Object.keys(difficultyCount),
        data: Object.values(difficultyCount),
      },
      bank: {
        labels: banksData?.map(b => b.title) || [],
        data: filteredBankIds.map(id => bankQuestionCount[id] || 0),
      },
      tags: {
        labels: Object.keys(tagsCount).slice(0, 10),
        data: Object.values(tagsCount).slice(0, 10),
      },
      grade: {
        labels: Object.keys(gradeCount),
        data: Object.values(gradeCount),
      },
      timeSeries,
    };

    return NextResponse.json({
      success: true,
      stats,
      chartData,
      topQuestions,
      banksList: banksData || [],
    });
  } catch (error) {
    console.error('❌ Analytics API error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء جلب التحليلات' },
      { status: 500 }
    );
  }
}