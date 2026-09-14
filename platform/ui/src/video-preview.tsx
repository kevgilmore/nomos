"use client";

import { useEffect, useRef, useState } from "react";

/** Shows a decoded video frame at rest; never downloads a separate poster. */
export function VideoPreview({ src, poster, label }: { src: string; poster?: string | null; label: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const wantsPlayback = useRef(false);
  const [visible, setVisible] = useState(false);
  const [videoSource, setVideoSource] = useState<string>();
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setFailed(false);
    setVideoSource(src);
    return undefined;
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
    onBlur={pause} onClick={() => { if (playing) pause(); else play(); }}>
    {poster && <img src={poster} alt="" className={`absolute inset-0 size-full object-cover transition-opacity ${videoSource ? "opacity-0" : "opacity-100"}`} aria-hidden="true" />}
    <video ref={video} src={videoSource} muted loop playsInline preload="auto" className="absolute inset-0 size-full object-cover" aria-hidden="true"
      onCanPlay={() => { if (wantsPlayback.current) startPlayback(); }}
      onPlaying={() => { setPlaying(true); setFailed(false); }} onPause={() => setPlaying(false)} onError={() => setFailed(true)} />
    {failed && <span role="alert" className="relative text-sm text-white">Demonstration unavailable</span>}
  </button>;
}
