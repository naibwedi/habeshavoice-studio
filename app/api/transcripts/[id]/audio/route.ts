import { owner,failure,getOwned,ApiError,getAudio } from "../../../../../lib/server";
export const dynamic="force-dynamic";
export async function GET(_request:Request,context:{params:Promise<{id:string}>}){try{
 const row=await getOwned((await context.params).id,await owner());if(!row.audioUrl)throw new ApiError(404,"This session has no audio.");
 const blob=await getAudio(row.audioUrl);if(!blob?.stream)throw new ApiError(404,"This recording is unavailable.");
 return new Response(blob.stream,{headers:{"Content-Type":row.mime||"application/octet-stream","Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff","Content-Disposition":"inline"}});
}catch(e){return failure(e);}}
