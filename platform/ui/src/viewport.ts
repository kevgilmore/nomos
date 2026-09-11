import type { Viewport } from "next";

/** Shared mobile viewport: keep safe-area insets available to the app shell. */
export const nomosViewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "dark light",
  themeColor: "#19171f",
};
