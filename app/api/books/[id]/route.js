// app/api/books/[id]/route.js
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { deleteFromGoogleDrive } from '@/lib/googleDrive';

// ============================================================
// DELETE: حذف كتاب (يدعم المعلم والمساعد)
// ============================================================
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const userId = request.headers.get('x-user-id');
    const assistantId = request.headers.get('x-assistant-id');

    if (!userId && !assistantId) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    // ✅ استخدام SUPABASE_SERVICE_ROLE_KEY بدلاً من SUPABASE_SECRET_KEY
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // جلب بيانات الكتاب
    const { data: book, error: bookError } = await supabaseAdmin
      .from('books')
      .select('*')
      .eq('id', id)
      .single();

    if (bookError || !book) {
      return NextResponse.json({ error: 'الكتاب غير موجود' }, { status: 404 });
    }

    // التحقق من الملكية
    let teacherId = userId;
    if (assistantId) {
      const { data: assistant } = await supabaseAdmin
        .from('assistants')
        .select('teacher_id')
        .eq('id', assistantId)
        .single();
      teacherId = assistant?.teacher_id;
    }

    if (book.teacher_id !== teacherId) {
      return NextResponse.json({ error: 'غير مصرح بحذف هذا الكتاب' }, { status: 403 });
    }

    // حذف الملف من التخزين المناسب
    if (book.storage_path) {
      if (book.storage_path.startsWith('google_drive:')) {
        const fileId = book.storage_path.replace('google_drive:', '');
        try {
          await deleteFromGoogleDrive(fileId);
          console.log(`✅ Deleted from Google Drive: ${fileId}`);
        } catch (driveError) {
          console.error('❌ Google Drive delete error:', driveError);
        }
      } else {
        try {
          await supabaseAdmin.storage.from('books').remove([book.storage_path]);
          console.log(`✅ Deleted from Supabase Storage: ${book.storage_path}`);
        } catch (storageError) {
          console.error('❌ Supabase storage delete error:', storageError);
        }
      }
    }

    // حذف السجل من قاعدة البيانات
    const { error: deleteError } = await supabaseAdmin
      .from('books')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('❌ Database delete error:', deleteError);
      return NextResponse.json({ error: 'فشل حذف السجل من قاعدة البيانات' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'تم حذف الكتاب بنجاح',
    });

  } catch (error) {
    console.error('❌ Delete error:', error);
    return NextResponse.json({ error: error.message || 'حدث خطأ في الخادم' }, { status: 500 });
  }
}

// ============================================================
// GET: جلب كتاب واحد (يدعم المعلم والمساعد)
// ============================================================
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const userId = request.headers.get('x-user-id');
    const assistantId = request.headers.get('x-assistant-id');

    // ✅ استخدام SUPABASE_SERVICE_ROLE_KEY بدلاً من SUPABASE_SECRET_KEY
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    let teacherId = null;
    if (userId) {
      teacherId = userId;
    } else if (assistantId) {
      const { data: assistant } = await supabaseAdmin
        .from('assistants')
        .select('teacher_id')
        .eq('id', assistantId)
        .single();
      teacherId = assistant?.teacher_id;
    }

    let query = supabaseAdmin
      .from('books')
      .select('*')
      .eq('id', id);

    if (teacherId) {
      query = query.eq('teacher_id', teacherId);
    }

    const { data: book, error } = await query.single();

    if (error || !book) {
      return NextResponse.json({ error: 'الكتاب غير موجود' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      book: {
        ...book,
        download_url: book.file_url,
        file_size_display: book.file_size ? formatFileSize(book.file_size) : 'غير محدد',
        file_type_display: book.file_name?.split('.').pop()?.toLowerCase() || 'unknown',
      },
    });

  } catch (error) {
    console.error('❌ GET book error:', error);
    return NextResponse.json({ error: 'فشل جلب الكتاب' }, { status: 500 });
  }
}

// ============================================================
// دالة مساعدة لتنسيق حجم الملف
// ============================================================
function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return 'غير محدد';
  const k = 1024;
  const sizes = ['بايت', 'كيلوبايت', 'ميجابايت', 'جيجابايت'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}