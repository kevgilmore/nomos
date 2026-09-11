"use client";

import { useEffect, useRef, useState } from "react";

/** Shows a decoded video frame at rest; never downloads a separate poster. */
export function VideoPreview({ src, label }: { src: string; label: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const wantsPlayback = useRef(false);
  const [visible, setVisible] = useState(false);
  const [videoSource, setVideoSource] = useState<string>();
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

  useEffect(() => {
    if (!visible) return;
    let disposed = false;
    let objectUrl: string | undefined;
    setFailed(false);
    setVideoSource(undefined);
    // Load each nearby clip once. Decoding a local blob avoids repeated range
    // downloads when the MP4's metadata is at the end of the file.
    void fetch(src).then(async (response) => {
      if (!response.ok) throw new Error("Video unavailable");
      const blob = await response.blob();
      if (disposed) return;
      objectUrl = URL.createObjectURL(blob);
      setVideoSource(`${objectUrl}#t=0.001`);
    }).catch(() => { if (!disposed) setFailed(true); });
    return () => {
      disposed = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src, visible]);

  const startPlayback = () => {
    void video.current?.play().catch((error: unknown) => {
      if (!(error instanceof DOMException && error.name === "AbortError")) setFailed(true);
    });
  };
  const play = () => {
    wantsPlayback.current = true;
    setVisible(true);
    if (videoSource) startPlayback();
  };
  const pause = () => {
    wantsPlayback.current = false;
    video.current?.pause();
  };

  return <button type="button" className="absolute inset-0 size-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]" aria-label={`${playing ? "Pause" : "Play"} ${label} demonstration`} aria-pressed={playing} aria-busy={visible && !videoSource && !failed}
    onPointerEnter={(event) => { if (event.pointerType === "mouse") play(); }}
    onPointerLeave={(event) => { if (event.pointerType === "mouse") pause(); }}
    onBlur={pause} onClick={() => { if (wantsPlayback.current) pause(); else play(); }}>
    {/* The time fragment paints a frame on mobile Safari without autoplay. */}
    <video ref={video} src={videoSource} muted loop playsInline preload="auto" className="absolute inset-0 size-full object-cover" aria-hidden="true"
      onCanPlay={() => { if (wantsPlayback.current) startPlayback(); }}
      onPlaying={() => { setPlaying(true); setFailed(false); }} onPause={() => setPlaying(false)} onError={() => setFailed(true)} />
    {failed && <span role="alert" className="relative text-sm text-white">Demonstration unavailable</span>}
  </button>;
}
