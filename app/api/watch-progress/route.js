// app/api/watch-progress/route.js
import { createClient } from '@supabase/supabase-js';

// إنشاء عميل Supabase بصلاحيات الخادم (Service Role) للكتابة
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    // استخراج توكن المستخدم من الكوكيز أو الهيدر
    const authHeader = request.headers.get('authorization');
    let accessToken = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      accessToken = authHeader.split(' ')[1];
    } else {
      // محاولة استخراجه من الكوكيز
      const cookieHeader = request.headers.get('cookie') || '';
      const match = cookieHeader.match(/sb-access-token=([^;]+)/);
      if (match) accessToken = match[1];
    }

    if (!accessToken) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // التحقق من المستخدم باستخدام التوكن
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(accessToken);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();
    const { videoId, courseId, intervals, watchedSeconds, progress } = body;

    if (!videoId || watchedSeconds === undefined) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Upsert في watch_history
    const { error: watchError } = await supabaseAdmin
      .from('watch_history')
      .upsert({
        video_id: videoId,
        student_id: user.id,
        watched_seconds: watchedSeconds,
        progress,
        intervals: intervals || [],
        watched_at: new Date().toISOString(),
      }, { onConflict: 'video_id,student_id' });

    if (watchError) {
      console.error('Watch history error:', watchError);
      return new Response(JSON.stringify({ error: watchError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // تحديث course_progress إذا كان هناك courseId
    if (courseId) {
      const { data: videos } = await supabaseAdmin
        .from('videos')
        .select('id, duration')
        .eq('course_id', courseId);

      if (videos && videos.length > 0) {
        const videoIds = videos.map(v => v.id);
        const { data: histories } = await supabaseAdmin
          .from('watch_history')
          .select('watched_seconds')
          .eq('student_id', user.id)
          .in('video_id', videoIds);

        let totalDuration = 0;
        videos.forEach(v => {
          const parts = (v.duration || '0:00').split(':').map(Number);
          totalDuration += (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
        });

        const totalWatched = histories?.reduce((acc, h) => acc + (h.watched_seconds || 0), 0) || 0;
        const overallProgress = totalDuration > 0
          ? Math.min((totalWatched / totalDuration) * 100, 100)
          : 0;

        await supabaseAdmin
          .from('course_progress')
          .upsert({
            course_id: courseId,
            student_id: user.id,
            overall_progress: overallProgress,
            total_watched_seconds: totalWatched,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'course_id,student_id' });
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Watch progress error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}