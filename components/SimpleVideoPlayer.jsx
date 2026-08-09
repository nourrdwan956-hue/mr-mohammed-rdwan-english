//compinents/simple-video-player.jsx
'use client';

export default function SimpleVideoPlayer({ videoId }) {
  if (!videoId) return <p className="text-gray-400">لا يوجد فيديو</p>;

  return (
    <div className="rounded-2xl overflow-hidden shadow-2xl shadow-yellow-400/10 aspect-video">
      <iframe
        src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3`}
        title="مشغل الفيديو"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="w-full h-full"
      />
    </div>
  );
}