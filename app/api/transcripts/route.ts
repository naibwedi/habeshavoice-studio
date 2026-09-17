import { db,owner,json,failure,publicTranscript,type Row } from "../../../lib/server";
export const dynamic="force-dynamic";
export async function GET(){try{const user=await owner();const result=await db().prepare("SELECT * FROM transcripts WHERE owner = ? AND source != 'demo' ORDER BY created_at DESC LIMIT 100").bind(user).all<Row>();return json({transcripts:result.results.map(publicTranscript)});}catch(e){return failure(e);}}
