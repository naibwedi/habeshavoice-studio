import { languageSchema,inferenceSchema,MAX_AUDIO_BYTES } from "../../../lib/validation";
import { owner,json,failure,ApiError,libraryLimit,audioHead,getAudio,removeAudio,saveRow,recordAttempt, type Row } from "../../../lib/server";
import { z } from "zod";
export const dynamic="force-dynamic";
export const maxDuration=300;
const inputSchema=z.object({audioUrl:z.string().url(),language:languageSchema,source:z.enum(["recording","upload"]),fileName:z.string().min(1).max(200),mime:z.string().max(100),consent:z.literal(true)}).strict();
export async function POST(request:Request){
 let audioUrl:string|null=null;
 try{
  await owner(request);
  if(!process.env.ASR_ENDPOINT||!process.env.ASR_API_KEY)throw new ApiError(503,"Transcription is temporarily unavailable. Please try again later.");
  const input=inputSchema.parse(await request.json());audioUrl=input.audioUrl;
  const url=new URL(audioUrl);
  if(url.protocol!=="https:"||!url.hostname.endsWith(".private.blob.vercel-storage.com")||!url.pathname.startsWith("/pending/"))throw new ApiError(400,"Choose a recording from this studio.");
  const metadata=await audioHead(audioUrl);
  if(!metadata||metadata.size>MAX_AUDIO_BYTES)throw new ApiError(400,"Choose an audio file up to 25 MB.");
  await libraryLimit();
  await recordAttempt();
  const source=await getAudio(audioUrl);
  if(!source?.stream)throw new ApiError(404,"This recording is unavailable.");
  const audio=new Blob([await new Response(source.stream).arrayBuffer()],{type:input.mime});
  const form=new FormData();form.append("audio",audio,input.fileName);form.append("language",input.language);
  const endpoint=new URL(process.env.ASR_ENDPOINT);if(endpoint.protocol!=="https:")throw new ApiError(503,"Transcription is temporarily unavailable.");
  const response=await fetch(endpoint,{method:"POST",headers:{Authorization:"Bearer "+process.env.ASR_API_KEY},body:form,signal:AbortSignal.timeout(180000),redirect:"manual"});
  if(response.status>=300&&response.status<400)throw new ApiError(504,"Transcription took too long. Try a shorter recording.");
  if(!response.ok){if(response.status===422)throw new ApiError(422,"No clear speech was found. Try a short, clear clip.");if(response.status===429)throw new ApiError(429,"The speech engine is busy. Try again shortly.");throw new ApiError(502,"The speech engine could not complete this recording. Try again.");}
  const result=inferenceSchema.parse(await response.json());
  const id=crypto.randomUUID(),createdAt=new Date().toISOString();
  const title=input.source==="recording"?"Voice note - "+createdAt.slice(0,10):input.fileName.replace(/\.[^.]+$/,"").slice(0,120)||"Untitled recording";
  const row:Row={id,title,language:input.language,text:result.text,original:result.text,createdAt,duration:result.duration,source:input.source,hasAudio:true,audioUrl,mime:input.mime};
  await saveRow(row);audioUrl=null;
  return json({transcript:row},201);
 }catch(e){
  if(audioUrl){try{await removeAudio(audioUrl);}catch{console.error("Temporary audio cleanup failed");}}
  if(e instanceof DOMException&&(e.name==="TimeoutError"||e.name==="AbortError"))return json({error:"Transcription took too long. Try a shorter recording."},504);
  return failure(e);
 }
}
