"use client";

import * as React from "react";
import { AlertCircle, CheckCircle2, X } from "lucide-react";

export type NomosToastTone = "success" | "error";
export type NomosToastOptions = { message: string; tone?: NomosToastTone; duration?: number };

const TOAST_EVENT = "nomos:toast";
const MAX_TOASTS = 3;

export function showNomosToast(options: NomosToastOptions | string) {
  if (typeof window === "undefined") return;
  const value = typeof options === "string" ? { message: options } : options;
  if (!value.message.trim()) return;
  window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: { ...value, message: value.message.trim() } }));
}

type Toast = NomosToastOptions & { id: number };

export function NomosToastViewport() {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const nextId = React.useRef(0);
  const activeKeys = React.useRef(new Set<string>());

  React.useEffect(() => {
    const onToast = (event: Event) => {
      const detail = (event as CustomEvent<NomosToastOptions>).detail;
      if (!detail?.message) return;
      const message = detail.message.trim();
      const key = `${detail.tone ?? "success"}:${message}`;
      if (activeKeys.current.has(key)) return;
      activeKeys.current.add(key);
      const toast = { ...detail, message, id: ++nextId.current };
      const duration = detail.duration ?? (detail.tone === "error" ? 6000 : 4000);
      setToasts((current) => [...current, toast].slice(-MAX_TOASTS));
      window.setTimeout(() => {
        activeKeys.current.delete(key);
        setToasts((current) => current.filter((item) => item.id !== toast.id));
      }, duration);
    };
    window.addEventListener(TOAST_EVENT, onToast);
    return () => window.removeEventListener(TOAST_EVENT, onToast);
  }, []);

  if (!toasts.length) return null;
  return <div className="pointer-events-none fixed left-1/2 top-3 z-[100] flex w-[min(22rem,calc(100vw-2rem))] -translate-x-1/2 flex-col gap-2 sm:left-4 sm:top-auto sm:bottom-4 sm:translate-x-0" aria-live="polite" aria-atomic="true">
    {toasts.map((toast) => {
      const error = toast.tone === "error";
      return <div key={toast.id} role={error ? "alert" : "status"} className={`pointer-events-auto flex items-start gap-2 rounded-xl border px-3 py-2.5 text-sm shadow-xl backdrop-blur ${error ? "border-red-400/35 bg-red-950/95 text-red-50" : "border-emerald-400/35 bg-emerald-950/95 text-emerald-50"}`}>
        {error ? <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-300" aria-hidden="true" /> : <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-300" aria-hidden="true" />}
        <span className="min-w-0 flex-1 leading-5">{toast.message}</span>
        <button type="button" onClick={() => { activeKeys.current.delete(`${toast.tone ?? "success"}:${toast.message}`); setToasts((current) => current.filter((item) => item.id !== toast.id)); }} className="-mr-1 rounded p-0.5 opacity-70 hover:opacity-100" aria-label="Dismiss notification"><X className="size-4" /></button>
      </div>;
    })}
  </div>;
}
