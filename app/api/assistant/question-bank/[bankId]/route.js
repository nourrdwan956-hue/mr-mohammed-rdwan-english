

// app/api/assistant/question-bank/[bankId]/route.js
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY|| process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(request, { params }) {
  try {
    const { bankId } = await params;
    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get('teacher_id');

    if (!bankId) {
      return NextResponse.json({ error: 'معرف البنك مطلوب' }, { status: 400 });
    }
    if (!teacherId) {
      return NextResponse.json({ error: 'teacher_id مطلوب' }, { status: 400 });
    }

    const { data: bank, error } = await supabaseAdmin
      .from('question_banks')
      .select('*')
      .eq('id', bankId)
      .eq('teacher_id', teacherId)
      .single();

    if (error || !bank) {
      return NextResponse.json({ error: 'البنك غير موجود' }, { status: 404 });
    }

    return NextResponse.json({ success: true, bank });
  } catch (err) {
    console.error('❌ GET bank error:', err);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}
const handleAddQuestion = async (data) => {
  if (!canCreate) {
    toast.error('ليس لديك صلاحية لإضافة أسئلة');
    return;
  }
  // تأكد من وجود bankId
  if (!bankId) {
    toast.error('معرف البنك غير موجود');
    return;
  }
  try {
    const payload = { ...data, bank_id: bankId, teacher_id: teacherId };
    console.log('📤 [add-question] payload:', payload); // سجل لتصحيح الأخطاء
    const res = await fetch('/api/assistant/question-bank/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'فشل الإضافة');
    toast.success(t.addQuestionSuccess);
    mutateQuestions();
    setModals(prev => ({ ...prev, addQuestion: false }));
  } catch (err) {
    toast.error(err.message);
  }
};