import { createSchema } from "../../../lib/validation";
import { SAMPLES } from "../../../lib/types";
import { db,owner,json,failure,publicTranscript,readJson,libraryLimit,ApiError,type Row } from "../../../lib/server";
export const dynamic="force-dynamic";
export async function GET(){try{const user=await owner();const result=await db().prepare("SELECT * FROM transcripts WHERE owner = ? ORDER BY created_at DESC LIMIT 100").bind(user).all<Row>();return json({transcripts:result.results.map(publicTranscript)});}catch(e){return failure(e);}}
export async function POST(request:Request){try{
 const user=await owner(request);const input=createSchema.parse(await readJson(request));
 const sample=SAMPLES.find(s=>s.id===input.sampleId && s.language===input.language);if(!sample)throw new ApiError(400,"Choose a matching sample language.");
 await libraryLimit(user);
 const id=crypto.randomUUID(),createdAt=new Date().toISOString();
 await db().prepare("INSERT INTO transcripts (id,owner,title,language,text,original,created_at,duration,source) VALUES (?,?,?,?,?,?,?,0,'demo')").bind(id,user,input.title,input.language,input.text,sample.original,createdAt).run();
 return json({transcript:{id,title:input.title,language:input.language,text:input.text,original:sample.original,createdAt,duration:0,source:"demo",hasAudio:false}},201);
}catch(e){return failure(e);}}

