export type Language = "ti" | "am";
export type Transcript = { id: string; title: string; language: Language; text: string; original: string; createdAt: string; duration: number; source: "demo" | "recording" | "upload"; hasAudio: boolean; };
export const LANGUAGES = { ti: { name: "Tigrinya", native: "ትግርኛ" }, am: { name: "Amharic", native: "አማርኛ" } };
const ti = "ሰላም! ከመይ ኣለኹም? ሎሚ ምሳኹም ክዛረብ ደስ ይብለኒ።\n\nቋንቋና ናይ ባህልናን ታሪኽናን ኣገዳሲ ክፋል እዩ። ብቋንቋና ክንጽሕፍን ክንዛረብን ንኽእል።";
const am = "ሰላም! እንዴት ናችሁ? ዛሬ ከእናንተ ጋር ማውራት ደስ ይለኛል።\n\nቋንቋችን የባህላችንና የታሪካችን አስፈላጊ ክፍል ነው። በቋንቋችን መጻፍና መናገር እንችላለን።";
export const SAMPLES: Transcript[] = [
 { id: "sample-ti", title: "A voice from home", language: "ti", text: ti, original: ti, createdAt: "2026-09-16T09:00:00Z", duration: 0, source: "demo", hasAudio: false },
 { id: "sample-am", title: "A moment to connect", language: "am", text: am, original: am, createdAt: "2026-09-16T08:00:00Z", duration: 0, source: "demo", hasAudio: false }
];
export function formatTime(seconds: number) { return Math.floor(seconds / 60).toString().padStart(2,"0") + ":" + Math.floor(seconds % 60).toString().padStart(2,"0"); }

