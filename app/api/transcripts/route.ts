import { owner,json,failure,listRows,publicTranscript } from "../../../lib/server";
export const dynamic="force-dynamic";
export async function GET(){try{await owner();return json({transcripts:(await listRows()).map(publicTranscript)});}catch(e){return failure(e);}}
