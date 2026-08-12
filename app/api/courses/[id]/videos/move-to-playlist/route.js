// app/api/courses/[id]/videos/move-to-playlist/route.js
import { supabase } from '@/lib/supabaseClient';
import { NextResponse } from 'next/server';

export async function POST(request, { params }) {
  try {
    // 1. استقبل البيانات
    const body = await request.json();
    const { videoId, playlistId } = body;

    // 2. تحقق من وجود videoId
    if (!videoId) {
      return NextResponse.json({ error: 'videoId مطلوب' }, { status: 400 });
    }

    // 3. قم بالتحديث مباشرة (تجاوز كل التحققات الأخرى مؤقتاً)
    const { data, error } = await supabase
      .from('videos')
      .update({ playlist_id: playlistId || null })
      .eq('id', videoId)
      .select();

    if (error) {
      console.error('Supabase update error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 4. أعد النجاح
    return NextResponse.json({ success: true, video: data?.[0] || null });

  } catch (error) {
    console.error('Unhandled error:', error);
    return NextResponse.json({ error: error.message || 'خطأ داخلي' }, { status: 500 });
  }
}