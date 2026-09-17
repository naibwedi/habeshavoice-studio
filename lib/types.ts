export type Language = "ti" | "am";
export type Transcript = { id: string; title: string; language: Language; text: string; original: string; createdAt: string; duration: number; source: "recording" | "upload"; hasAudio: boolean; };
export const LANGUAGES = { ti: { name: "Tigrinya", native: "ትግርኛ" }, am: { name: "Amharic", native: "አማርኛ" } };
export function formatTime(seconds: number) { return Math.floor(seconds / 60).toString().padStart(2,"0") + ":" + Math.floor(seconds % 60).toString().padStart(2,"0"); }

