import { z } from "zod";
export const languageSchema=z.enum(["ti","am"]);
export const editSchema=z.object({title:z.string().trim().min(1).max(120),text:z.string().max(50000)}).strict();
export const inferenceSchema=z.object({text:z.string().min(1).max(50000),duration:z.number().finite().positive().max(300.5)});
export const MAX_AUDIO_BYTES=25*1024*1024;
export function isSameOrigin(request:Request){
 const origin=request.headers.get("origin");
 return request.headers.get("sec-fetch-site")!=="cross-site" && (!origin || origin===new URL(request.url).origin);
}

