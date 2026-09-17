import { languageSchema,inferenceSchema,MAX_AUDIO_BYTES } from "../../../lib/validation";
import { owner,db,bucket,bindings,json,failure,ApiError,boundedBody,libraryLimit } from "../../../lib/server";
export const dynamic="force-dynamic";
export async function POST(request:Request){
 let audioKey:string|null=null;
 try{
 const user=await owner(request);const b=bindings();
 if(!b.ASR_ENDPOINT||!b.ASR_API_KEY)throw new ApiError(503,"The speech engine is not connected yet. Your audio has not been uploaded. Ask the workspace owner to connect the inference service.");
 const endpoint=new URL(b.ASR_ENDPOINT);if(endpoint.protocol!=="https:")throw new ApiError(503,"The speech engine requires a secure connection.");
 if(!request.headers.get("content-type")?.startsWith("multipart/form-data"))throw new ApiError(415,"Upload an audio file using the studio.");
 const bytes=await boundedBody(request,MAX_AUDIO_BYTES+65536);
 const form=await new Response(bytes,{headers:{"Content-Type":request.headers.get("content-type")!}}).formData();
 const audio=form.get("audio"),language=languageSchema.parse(form.get("language"));
 if(form.get("consent")!=="true")throw new ApiError(400,"Permission to process this recording is required.");
 if(!(audio instanceof File)||!audio.size||audio.size>MAX_AUDIO_BYTES)throw new ApiError(400,"Choose a non-empty audio file up to 25 MB.");
 if(!/\.(mp3|wav|m4a|mp4|webm|ogg|flac)$/i.test(audio.name))throw new ApiError(415,"This audio format is not supported.");
 await libraryLimit(user);
 const day=new Date().toISOString().slice(0,10);
 const limit=await db().prepare("INSERT INTO rate_limits (owner,day,count) VALUES (?,?,1) ON CONFLICT(owner,day) DO UPDATE SET count = count + 1 WHERE count < 20 RETURNING count").bind(user,day).first<{count:number}>();
 if(!limit)throw new ApiError(429,"You have reached 20 transcription attempts today. Please try again tomorrow.");
 const upstream=new FormData();upstream.append("audio",audio);upstream.append("language",language);
 const response=await fetch(endpoint.toString(),{method:"POST",headers:{"Authorization":"Bearer "+b.ASR_API_KEY},body:upstream,signal:AbortSignal.timeout(180000),redirect:"error"});
 if(!response.ok){if(response.status===422)throw new ApiError(422,"The recording could not be decoded or is longer than five minutes. Try a shorter, clear audio clip.");if(response.status===429)throw new ApiError(429,"The speech engine is busy. Please try again shortly.");throw new ApiError(502,"The speech engine could not complete this recording. Your audio is still on your device; try again.");}
 const result=inferenceSchema.parse(await response.json());
 const id=crypto.randomUUID(),createdAt=new Date().toISOString(),source=form.get("source")==="recording"?"recording":"upload";
 const title=source==="recording"?"Voice note · "+new Date().toISOString().slice(0,10):audio.name.replace(/\.[^.]+$/,"").slice(0,120)||"Untitled recording";
 audioKey="audio/"+id;
 const mime=audio.type.startsWith("audio/")?audio.type:"application/octet-stream";
 await bucket().put(audioKey,audio.stream(),{httpMetadata:{contentType:mime}});
 await db().prepare("INSERT INTO transcripts (id,owner,title,language,text,original,created_at,duration,source,audio_key,mime) VALUES (?,?,?,?,?,?,?,?,?,?,?)").bind(id,user,title,language,result.text,result.text,createdAt,result.duration,source,audioKey,mime).run();
 audioKey=null;
 return json({transcript:{id,title,language,text:result.text,original:result.text,createdAt,duration:result.duration,source,hasAudio:true}},201);
 }catch(e){
 if(audioKey){try{await bucket().delete(audioKey);}catch{console.error("Audio cleanup failed");}}
 if(e instanceof DOMException && (e.name==="TimeoutError"||e.name==="AbortError"))return json({error:"Transcription took too long. Your audio is still on your device. Please try a shorter clip."},504);
 return failure(e);
 }
}

