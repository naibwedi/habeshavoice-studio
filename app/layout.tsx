import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "HabeshaVoice Studio — Tigrinya & Amharic Voice to Text", description: "A thoughtful space for your words. Record, transcribe, review and export Tigrinya and Amharic speech.", icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" }, manifest: "/manifest.webmanifest", appleWebApp: { capable: true, title: "HabeshaVoice", statusBarStyle: "black-translucent" } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }

