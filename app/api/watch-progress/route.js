// app/api/watch-progress/route.js
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response('Unauthorized', { status: 401 });

    const body = await request.json();
    const { videoId, courseId, intervals, watchedSeconds, progress } = body;

    // Upsert في watch_history
    const { error: watchError } = await supabase
      .from('watch_history')
      .upsert({
        video_id: videoId,
        student_id: user.id,
        watched_seconds: watchedSeconds,
        progress,
        intervals, // يجب أن يكون العمود من نوع jsonb
        watched_at: new Date().toISOString(),
      }, { onConflict: 'video_id,student_id' });

    if (watchError) throw watchError;

    // تحديث course_progress إذا وجد courseId
    if (courseId) {
      // جلب كل فيديوهات الكورس لحساب التقدم الكلي
      const { data: videos } = await supabase
        .from('videos')
        .select('id, duration')
        .eq('course_id', courseId);
      
      if (videos && videos.length > 0) {
        // جلب كل سجلات المشاهدة لهذا الطالب في هذا الكورس
        const videoIds = videos.map(v => v.id);
        const { data: histories } = await supabase
          .from('watch_history')
          .select('watched_seconds')
          .eq('student_id', user.id)
          .in('video_id', videoIds);
        
        let totalDuration = 0;
        videos.forEach(v => {
          // parse duration to seconds
          const parts = (v.duration || '0:00').split(':').map(Number);
          totalDuration += (parts[0] * 3600 + parts[1] * 60 + (parts[2] || 0));
        });
        const totalWatched = histories?.reduce((acc, h) => acc + (h.watched_seconds || 0), 0) || 0;
        const overallProgress = totalDuration > 0 ? Math.min((totalWatched / totalDuration) * 100, 100) : 0;
        
        await supabase
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

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error('Watch progress error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}