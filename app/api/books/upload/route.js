


import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { uploadToGoogleDrive } from '@/lib/googleDrive';

export async function POST(request) {
  try {
    const contentType = request.headers.get('content-type') || '';
    const userId = request.headers.get('x-user-id');
    const assistantId = request.headers.get('x-assistant-id');

    // التحقق من الهوية
    let teacherId = null;
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    if (userId) {
      teacherId = userId;
    } else if (assistantId) {
      const { data: assistant, error } = await supabaseAdmin
        .from('assistants')
        .select('teacher_id')
        .eq('id', assistantId)
        .single();
      if (error || !assistant) {
        return NextResponse.json({ error: 'المساعد غير موجود' }, { status: 404 });
      }
      teacherId = assistant.teacher_id;
    } else {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    let title = '';
    let description = '';
    let courseId = '';
    let file = null;
    let externalUrl = '';
    let fileName = '';
    let fileSize = 0; // ✅ دائماً رقم
    let sourceType = 'supabase';
    let fileUrl = null;
    let storagePath = null;

    // ----- الحالة 1: رفع ملف مباشر -----
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      file = formData.get('file');
      title = formData.get('title');
      description = formData.get('description') || '';
      courseId = formData.get('courseId');

      if (!file || !courseId || !title) {
        return NextResponse.json({ error: 'البيانات ناقصة' }, { status: 400 });
      }

      fileName = file.name;
      fileSize = file.size; // ✅ حجم الملف الحقيقي

      // التحقق من ملكية الكورس
      const { data: course, error: courseError } = await supabaseAdmin
        .from('courses')
        .select('id')
        .eq('id', courseId)
        .eq('teacher_id', teacherId)
        .single();

      if (courseError || !course) {
        return NextResponse.json({ error: 'الكورس غير موجود أو غير مملوك لك' }, { status: 404 });
      }

      const MAX_SUPABASE_SIZE = 50 * 1024 * 1024;

      if (file.size > MAX_SUPABASE_SIZE) {
        // ✅ ملف كبير → Google Drive
        sourceType = 'external';
        try {
          const fileBuffer = Buffer.from(await file.arrayBuffer());
          const driveResult = await uploadToGoogleDrive(fileBuffer, file.name, file.type);
          fileUrl = driveResult.webContentLink || driveResult.webViewLink;
          storagePath = `google_drive:${driveResult.fileId}`;
        } catch (driveError) {
          console.error('❌ Google Drive upload error:', driveError);
          return NextResponse.json({ error: 'فشل رفع الملف إلى Google Drive: ' + driveError.message }, { status: 500 });
        }
      } else {
        // ✅ ملف صغير → Supabase Storage
        sourceType = 'supabase';
        try {
          const fileBuffer = await file.arrayBuffer();
          const fileExtension = file.name.split('.').pop();
          const uniqueName = `${uuidv4()}.${fileExtension}`;
          const path = `${teacherId}/${courseId}/${uniqueName}`;

          const { error: uploadError } = await supabaseAdmin.storage
            .from('books')
            .upload(path, fileBuffer, { contentType: file.type });

          if (uploadError) {
            return NextResponse.json({ error: 'فشل رفع الملف إلى Supabase: ' + uploadError.message }, { status: 500 });
          }

          const { data: urlData } = supabaseAdmin.storage
            .from('books')
            .getPublicUrl(path);

          fileUrl = urlData?.publicUrl || '';
          storagePath = path;
        } catch (supabaseError) {
          return NextResponse.json({ error: 'فشل رفع الملف إلى Supabase' }, { status: 500 });
        }
      }

    // ----- الحالة 2: رابط خارجي -----
    } else if (contentType.includes('application/json')) {
      const body = await request.json();
      title = body.title;
      description = body.description || '';
      courseId = body.courseId;
      externalUrl = body.externalUrl;
      fileName = body.fileName || 'رابط خارجي';
      
      // ✅ معالجة fileSize: إذا كان نصاً أو فارغاً، نحوله إلى 0 (رقم)
      if (body.fileSize) {
        if (typeof body.fileSize === 'string') {
          fileSize = parseInt(body.fileSize.replace(/[^0-9]/g, '')) || 0;
        } else if (typeof body.fileSize === 'number') {
          fileSize = body.fileSize;
        } else {
          fileSize = 0;
        }
      } else {
        fileSize = 0;
      }

      if (!courseId || !title || !externalUrl) {
        return NextResponse.json({ error: 'البيانات ناقصة' }, { status: 400 });
      }

      const { data: course, error: courseError } = await supabaseAdmin
        .from('courses')
        .select('id')
        .eq('id', courseId)
        .eq('teacher_id', teacherId)
        .single();

      if (courseError || !course) {
        return NextResponse.json({ error: 'الكورس غير موجود أو غير مملوك لك' }, { status: 404 });
      }

      sourceType = 'external';
      fileUrl = externalUrl;
      storagePath = null;

    } else {
      return NextResponse.json({ error: 'نوع الطلب غير مدعوم' }, { status: 400 });
    }

    // حفظ البيانات في قاعدة البيانات
    const newBook = {
      teacher_id: teacherId,
      course_id: courseId,
      title: title.trim(),
      description: description.trim(),
      file_name: fileName,
      file_size: fileSize, // ✅ الآن دائماً رقم (bigint)
      source_type: sourceType,
      file_url: fileUrl,
      external_url: sourceType === 'external' && !fileUrl ? externalUrl : null,
      storage_path: storagePath,
      is_published: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: book, error: insertError } = await supabaseAdmin
      .from('books')
      .insert(newBook)
      .select()
      .single();

    if (insertError) {
      console.error('❌ Insert error:', insertError);
      if (storagePath && sourceType === 'supabase') {
        await supabaseAdmin.storage.from('books').remove([storagePath]);
      }
      return NextResponse.json({ error: 'فشل حفظ البيانات: ' + insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      book,
      message: sourceType === 'supabase' ? 'تم رفع الكتاب بنجاح' : 'تم إضافة الملف بنجاح',
    });

  } catch (error) {
    console.error('❌ Upload error:', error);
    return NextResponse.json({ error: error.message || 'حدث خطأ في الخادم' }, { status: 500 });
  }
}