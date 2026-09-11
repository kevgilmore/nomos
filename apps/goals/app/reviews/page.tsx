"use client";

import { useEffect } from "react";

export default function Page() {
  useEffect(() => {
    const week = new URLSearchParams(window.location.search).get("week");
    window.location.replace(week ? `/week/?week=${encodeURIComponent(week)}` : "/week/");
  }, []);

  return null;
}
