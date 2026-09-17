import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../app/chatgpt-auth";
import type { Transcript } from "./types";
import { isSameOrigin } from "./validation";
import { ZodError } from "zod";
export type Bindings={DB?:D1Database;BUCKET?:R2Bucket;ASR_ENDPOINT?:string;ASR_API_KEY?:string};
export const bindings=()=>env as unknown as Bindings;
export class ApiError extends Error {constructor(public status:number,message:string){super(message);}}
export async function owner(request?:Request){
 if(request && !isSameOrigin(request)) throw new ApiError(403,"This request must come from your own workspace.");
 const user=await getChatGPTUser();
 if(!user) throw new ApiError(401,"Sign in to save or open your private library.");
 return user.userId;
}
export function db(){const b=bindings().DB;if(!b)throw new ApiError(503,"Your library is temporarily unavailable. Your edits are still here; please try again.");return b;}
export function bucket(){const b=bindings().BUCKET;if(!b)throw new ApiError(503,"Audio storage is temporarily unavailable.");return b;}
export function json(data:unknown,status=200){return Response.json(data,{status,headers:{"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});}
export function failure(e:unknown){
 if(e instanceof ApiError) return json({error:e.message},e.status);
 if(e instanceof ZodError) return json({error:"Please check the title, language, and transcript length."},400);
 if(e instanceof SyntaxError) return json({error:"The request could not be read."},400);
 console.error("HabeshaVoice request failed",{type:e instanceof Error?e.name:"Unknown"});
 return json({error:"Your request could not be completed. Please try again; your edits have been preserved."},503);
}
export type Row={id:string;owner:string;title:string;language:"ti"|"am";text:string;original:string;created_at:string;duration:number;source:"demo"|"recording"|"upload";audio_key:string|null;mime:string|null};
export function publicTranscript(row:Row):Transcript{return{id:row.id,title:row.title,language:row.language,text:row.text,original:row.original,createdAt:row.created_at,duration:row.duration,source:row.source,hasAudio:!!row.audio_key};}
export async function getOwned(id:string,user:string){
 if(!/^[0-9a-f-]{36}$/i.test(id))throw new ApiError(404,"This transcript was not found.");
 const row=await db().prepare("SELECT * FROM transcripts WHERE id = ? AND owner = ?").bind(id,user).first<Row>();
 if(!row)throw new ApiError(404,"This transcript was not found.");
 return row;
}
export async function boundedBody(request:Request,max:number){
 if(Number(request.headers.get("content-length"))>max)throw new ApiError(413,"This file is too large. The limit is 25 MB.");
 if(!request.body)throw new ApiError(400,"No content was received.");
 const reader=request.body.getReader();let length=0;const parts:Uint8Array[]=[];
 try{for(;;){const{done,value}=await reader.read();if(done)break;length+=value.length;if(length>max){await reader.cancel();throw new ApiError(413,"This request is too large.");}parts.push(value);}}
 finally{reader.releaseLock();}
 const bytes=new Uint8Array(length);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.length;}return bytes;
}
export async function readJson(request:Request){const bytes=await boundedBody(request,200000);return JSON.parse(new TextDecoder().decode(bytes));}
export async function libraryLimit(user:string){
 const count=await db().prepare("SELECT count(*) AS n FROM transcripts WHERE owner = ?").bind(user).first<{n:number}>();
 if((count?.n??0)>=100)throw new ApiError(429,"Your library holds 100 sessions. Export and delete a session before adding another.");
}

