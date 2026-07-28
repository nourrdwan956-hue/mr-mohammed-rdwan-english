

// app/api/codes/route.js
// API لإدارة أكواد الشحن (للمعلم فقط)
// يدعم: توليد أكواد جديدة، جلب الأكواد، تحديث، حذف

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// ================================================================
// 📥 GET – جلب الأكواد
// ================================================================
export async function GET(request) {
  try {
    const supabase = createClient(cookies());
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'غير مصرح لك' },
        { status: 401 }
      );
    }

    // التحقق من أن المستخدم معلم
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'teacher') {
      return NextResponse.json(
        { success: false, error: 'غير مصرح لك، هذه الخدمة للمعلمين فقط' },
        { status: 403 }
      );
    }

    // قراءة معاملات الاستعلام
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');
    const status = searchParams.get('status'); // used, unused, expired, all
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search');

    // جلب كورسات المعلم أولاً (للتحقق من الملكية)
    let courseQuery = supabase
      .from('courses')
      .select('id')
      .eq('teacher_id', user.id);

    if (courseId) {
      courseQuery = courseQuery.eq('id', courseId);
    }

    const { data: teacherCourses, error: coursesError } = await courseQuery;

    if (coursesError) {
      console.error('Error fetching teacher courses:', coursesError);
      return NextResponse.json(
        { success: false, error: 'حدث خطأ أثناء جلب الكورسات' },
        { status: 500 }
      );
    }

    const courseIds = teacherCourses.map(c => c.id);

    if (courseIds.length === 0) {
      return NextResponse.json({
        success: true,
        codes: [],
        total: 0,
        limit,
        offset,
      });
    }

    // بناء استعلام جلب الأكواد
    let query = supabase
      .from('course_access_codes')
      .select(`
        *,
        course:course_id (id, title),
        used_by:used_by_user_id (id, full_name, email)
      `)
      .in('course_id', courseIds);

    // فلترة حسب الحالة
    if (status === 'used') {
      query = query.eq('is_used', true);
    } else if (status === 'unused') {
      query = query.eq('is_used', false);
      // أيضاً التحقق من عدم انتهاء الصلاحية
      const now = new Date().toISOString();
      query = query.or(`expires_at.is.null,expires_at.gt.${now}`);
    } else if (status === 'expired') {
      query = query.eq('is_used', false);
      const now = new Date().toISOString();
      query = query.lt('expires_at', now);
    }

    // البحث (حسب الكود أو اسم الطالب)
    if (search) {
      query = query.or(`code.ilike.%${search}%,used_by.full_name.ilike.%${search}%`);
    }

    // ترتيب وحدود
    query = query
      .order('generated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: codes, error: codesError, count } = await query;

    if (codesError) {
      console.error('Error fetching codes:', codesError);
      return NextResponse.json(
        { success: false, error: 'حدث خطأ أثناء جلب الأكواد' },
        { status: 500 }
      );
    }

    // جلب العدد الإجمالي
    const { count: totalCount, error: countError } = await supabase
      .from('course_access_codes')
      .select('*', { count: 'exact', head: true })
      .in('course_id', courseIds);

    return NextResponse.json({
      success: true,
      codes: codes || [],
      total: totalCount || 0,
      limit,
      offset,
      hasMore: (offset + limit) < (totalCount || 0),
    });

  } catch (error) {
    console.error('GET /api/codes error:', error);
    return NextResponse.json(
      { success: false, error: 'حدث خطأ داخلي في الخادم' },
      { status: 500 }
    );
  }
}

// ================================================================
// ➕ POST – توليد أكواد جديدة
// ================================================================
export async function POST(request) {
  try {
    const supabase = createClient(cookies());
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'غير مصرح لك' },
        { status: 401 }
      );
    }

    // التحقق من أن المستخدم معلم
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'teacher') {
      return NextResponse.json(
        { success: false, error: 'غير مصرح لك، هذه الخدمة للمعلمين فقط' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      courseId,
      count = 1,
      maxDevices = 1,
      expiresInDays = 30,
      notes = '',
      prefix = '',
    } = body;

    if (!courseId) {
      return NextResponse.json(
        { success: false, error: 'معرف الكورس مطلوب' },
        { status: 400 }
      );
    }

    // التحقق من ملكية الكورس
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, title, teacher_id')
      .eq('id', courseId)
      .single();

    if (courseError || !course) {
      return NextResponse.json(
        { success: false, error: 'الكورس غير موجود' },
        { status: 404 }
      );
    }

    if (course.teacher_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'غير مصرح لك بتوليد أكواد لهذا الكورس' },
        { status: 403 }
      );
    }

    if (count < 1 || count > 100) {
      return NextResponse.json(
        { success: false, error: 'عدد الأكواد يجب أن يكون بين 1 و 100' },
        { status: 400 }
      );
    }

    // توليد الأكواد
    const generatedCodes = [];
    const expiresAt = expiresInDays > 0
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    for (let i = 0; i < count; i++) {
      const code = generateCode(prefix);
      generatedCodes.push({
        course_id: courseId,
        code,
        max_devices: maxDevices,
        is_used: false,
        is_active: true,
        generated_by: user.id,
        generated_at: new Date().toISOString(),
        expires_at: expiresAt,
        notes: notes || '',
      });
    }

    // إدراج الأكواد في قاعدة البيانات
    const { data: insertedCodes, error: insertError } = await supabase
      .from('course_access_codes')
      .insert(generatedCodes)
      .select();

    if (insertError) {
      console.error('Error generating codes:', insertError);
      return NextResponse.json(
        { success: false, error: 'حدث خطأ أثناء توليد الأكواد' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `تم توليد ${insertedCodes.length} كود بنجاح`,
      codes: insertedCodes,
      total: insertedCodes.length,
    });

  } catch (error) {
    console.error('POST /api/codes error:', error);
    return NextResponse.json(
      { success: false, error: 'حدث خطأ داخلي في الخادم' },
      { status: 500 }
    );
  }
}

// ================================================================
// ✏️ PATCH – تحديث كود (تعطيل/تفعيل، تمديد الصلاحية)
// ================================================================
export async function PATCH(request) {
  try {
    const supabase = createClient(cookies());
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'غير مصرح لك' },
        { status: 401 }
      );
    }

    // التحقق من أن المستخدم معلم
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'teacher') {
      return NextResponse.json(
        { success: false, error: 'غير مصرح لك، هذه الخدمة للمعلمين فقط' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { codeId, isActive, expiresAt, notes } = body;

    if (!codeId) {
      return NextResponse.json(
        { success: false, error: 'معرف الكود مطلوب' },
        { status: 400 }
      );
    }

    // جلب الكود مع معلومات الكورس للتحقق من الملكية
    const { data: code, error: codeError } = await supabase
      .from('course_access_codes')
      .select(`
        id,
        course_id,
        course:course_id (teacher_id, title)
      `)
      .eq('id', codeId)
      .single();

    if (codeError || !code) {
      return NextResponse.json(
        { success: false, error: 'الكود غير موجود' },
        { status: 404 }
      );
    }

    // التحقق من ملكية الكورس للمعلم
    if (code.course?.teacher_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'غير مصرح لك بتحديث هذا الكود' },
        { status: 403 }
      );
    }

    // بناء كائن التحديث
    const updates = {};
    if (isActive !== undefined) {
      updates.is_active = isActive;
    }
    if (expiresAt) {
      updates.expires_at = expiresAt;
    }
    if (notes !== undefined) {
      updates.notes = notes;
    }
    updates.updated_at = new Date().toISOString();

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: 'لا توجد بيانات للتحديث' },
        { status: 400 }
      );
    }

    const { data: updatedCode, error: updateError } = await supabase
      .from('course_access_codes')
      .update(updates)
      .eq('id', codeId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating code:', updateError);
      return NextResponse.json(
        { success: false, error: 'حدث خطأ أثناء تحديث الكود' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'تم تحديث الكود بنجاح',
      code: updatedCode,
    });

  } catch (error) {
    console.error('PATCH /api/codes error:', error);
    return NextResponse.json(
      { success: false, error: 'حدث خطأ داخلي في الخادم' },
      { status: 500 }
    );
  }
}

// ================================================================
// 🗑️ DELETE – حذف كود
// ================================================================
export async function DELETE(request) {
  try {
    const supabase = createClient(cookies());
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'غير مصرح لك' },
        { status: 401 }
      );
    }

    // التحقق من أن المستخدم معلم
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'teacher') {
      return NextResponse.json(
        { success: false, error: 'غير مصرح لك، هذه الخدمة للمعلمين فقط' },
        { status: 403 }
      );
    }

    // قراءة معرف الكود من معاملات الاستعلام أو جسم الطلب
    const body = await request.json().catch(() => ({}));
    const codeId = body.codeId || new URL(request.url).searchParams.get('codeId');

    if (!codeId) {
      return NextResponse.json(
        { success: false, error: 'معرف الكود مطلوب' },
        { status: 400 }
      );
    }

    // جلب الكود مع معلومات الكورس للتحقق من الملكية
    const { data: code, error: codeError } = await supabase
      .from('course_access_codes')
      .select(`
        id,
        course:course_id (teacher_id, title)
      `)
      .eq('id', codeId)
      .single();

    if (codeError || !code) {
      return NextResponse.json(
        { success: false, error: 'الكود غير موجود' },
        { status: 404 }
      );
    }

    // التحقق من ملكية الكورس للمعلم
    if (code.course?.teacher_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'غير مصرح لك بحذف هذا الكود' },
        { status: 403 }
      );
    }

    // حذف الكود
    const { error: deleteError } = await supabase
      .from('course_access_codes')
      .delete()
      .eq('id', codeId);

    if (deleteError) {
      console.error('Error deleting code:', deleteError);
      return NextResponse.json(
        { success: false, error: 'حدث خطأ أثناء حذف الكود' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'تم حذف الكود بنجاح',
      codeId,
    });

  } catch (error) {
    console.error('DELETE /api/codes error:', error);
    return NextResponse.json(
      { success: false, error: 'حدث خطأ داخلي في الخادم' },
      { status: 500 }
    );
  }
}

// ================================================================
// دالة مساعدة: توليد كود فريد من 10 خانات مع شرطات (تنسيق 4-3-3)
// ================================================================
function generateCode(prefix = '') {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 10; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  // تنسيق الكود مع شرطات
  return code.slice(0, 4) + '-' + code.slice(4, 7) + '-' + code.slice(7, 10);
}

// ================================================================
// 📌 OPTIONS – دعم CORS
// ================================================================
export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      headers: {
        'Allow': 'GET, POST, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    }
  );
}