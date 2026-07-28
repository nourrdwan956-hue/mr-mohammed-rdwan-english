
// 📌 API: /api/announcements/[id]/like
// تبديل حالة الإعجاب (إضافة/حذف) مع إرجاع العدد
// ================================================================
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request, { params }) {
  try {
    const { id: announcement_id } = await params;
    if (!announcement_id) {
      return NextResponse.json({ error: 'معرف الإعلان مطلوب' }, { status: 400 });
    }

    // إنشاء عميل Supabase للخادم
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value;
          },
          set(name, value, options) {
            // في Route Handlers لا نحتاج لتعيين الكوكيز، لكن نتركها فارغة
          },
          remove(name, options) {
            // لا نحتاج لإزالة الكوكيز هنا
          },
        },
      }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const student_id = user.id;

    // التحقق من وجود إعجاب مسبق
    const { data: existingLike, error: checkError } = await supabase
      .from('announcement_likes')
      .select('id')
      .eq('announcement_id', announcement_id)
      .eq('student_id', student_id)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('خطأ في التحقق من الإعجاب:', checkError);
      return NextResponse.json({ error: 'فشل التحقق من الإعجاب' }, { status: 500 });
    }

    let operation = 'added';

    if (existingLike) {
      // حذف الإعجاب
      const { error: deleteError } = await supabase
        .from('announcement_likes')
        .delete()
        .eq('id', existingLike.id);

      if (deleteError) {
        console.error('خطأ في حذف الإعجاب:', deleteError);
        return NextResponse.json({ error: 'فشل إلغاء الإعجاب' }, { status: 500 });
      }
      operation = 'removed';
    } else {
      // إضافة إعجاب
      const { error: insertError } = await supabase
        .from('announcement_likes')
        .insert({
          announcement_id,
          student_id,
          created_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error('خطأ في إضافة الإعجاب:', insertError);
        return NextResponse.json({ error: 'فشل الإعجاب' }, { status: 500 });
      }
      operation = 'added';
    }

    // جلب العدد الجديد
    const { count, error: countError } = await supabase
      .from('announcement_likes')
      .select('id', { count: 'exact', head: true })
      .eq('announcement_id', announcement_id);

    if (countError) {
      console.error('خطأ في جلب عدد الإعجابات:', countError);
      return NextResponse.json({ error: 'فشل جلب الإحصائيات' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      liked: operation === 'added',
      totalLikes: count || 0,
      message: operation === 'added' ? 'تم الإعجاب ✅' : 'تم إلغاء الإعجاب 🔄',
    });

  } catch (error) {
    console.error('خطأ غير متوقع في API الإعجابات:', error);
    return NextResponse.json({ error: 'حدث خطأ داخلي في الخادم' }, { status: 500 });
  }
}