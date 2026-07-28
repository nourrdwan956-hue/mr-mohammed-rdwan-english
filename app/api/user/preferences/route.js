

// ================================================================
// 📌 API: /api/user/preferences
// إدارة تفضيلات المستخدم (تشغيل/إيقاف الإشعارات)
// ================================================================
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function PUT(request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name) { return cookieStore.get(name)?.value; },
          set(name, value, options) {},
          remove(name, options) {},
        },
      }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const body = await request.json();
    const { notifications_enabled } = body;

    if (typeof notifications_enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'الحقل notifications_enabled يجب أن يكون قيمة منطقية (true/false)' },
        { status: 400 }
      );
    }

    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({
        notifications_enabled,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select('id, full_name, notifications_enabled')
      .single();

    if (updateError) {
      console.error('خطأ في تحديث تفضيل الإشعارات:', updateError);
      return NextResponse.json({ error: 'فشل تحديث التفضيلات' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      profile: updatedProfile,
      message: notifications_enabled
        ? 'تم تفعيل الإشعارات 📢'
        : 'تم إيقاف الإشعارات 🔕',
    });

  } catch (error) {
    console.error('خطأ غير متوقع في API التفضيلات:', error);
    return NextResponse.json({ error: 'حدث خطأ داخلي' }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name) { return cookieStore.get(name)?.value; },
          set(name, value, options) {},
          remove(name, options) {},
        },
      }
    );

    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('notifications_enabled')
      .eq('id', user.id)
      .single();

    if (profileError) throw profileError;

    return NextResponse.json({
      notifications_enabled: profile?.notifications_enabled ?? true,
    });

  } catch (error) {
    console.error('خطأ في جلب التفضيلات:', error);
    return NextResponse.json({ error: 'فشل الجلب' }, { status: 500 });
  }
}