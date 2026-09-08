"use client";

import { useEffect, useRef, useState } from "react";

/** Shows a decoded video frame at rest; never downloads a separate poster. */
export function VideoPreview({ src, label }: { src: string; label: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const element = video.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: "200px" });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const play = () => {
    setVisible(true);
    void video.current?.play().catch(() => undefined);
  };
  const pause = () => video.current?.pause();

  return <button type="button" className="absolute inset-0 size-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]" aria-label={`${playing ? "Pause" : "Play"} ${label} demonstration`} aria-pressed={playing}
    onPointerEnter={(event) => { if (event.pointerType === "mouse") play(); }}
    onPointerLeave={(event) => { if (event.pointerType === "mouse") pause(); }}
    onBlur={pause} onClick={() => { if (video.current?.paused) play(); else pause(); }}>
    <video ref={video} src={visible ? `${src}#t=0.001` : undefined} muted loop playsInline preload="auto" className="absolute inset-0 size-full object-cover" aria-hidden="true"
      onLoadedMetadata={(event) => {
        // A nonzero seek makes mobile Safari paint a frame without autoplay.
        if (event.currentTarget.paused) event.currentTarget.currentTime = 0.001;
      }} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onError={() => setFailed(true)} />
    {failed && <span role="alert" className="relative text-sm text-white">Demonstration unavailable</span>}
  </button>;
}
