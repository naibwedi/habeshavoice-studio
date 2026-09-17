import { owner,bucket,failure,getOwned,ApiError } from "../../../../../lib/server";
export const dynamic="force-dynamic";
export async function GET(request:Request,context:{params:Promise<{id:string}>}){try{
 const row=await getOwned((await context.params).id,await owner());if(!row.audio_key)throw new ApiError(404,"This session has no audio.");
 const object=await bucket().get(row.audio_key,{range:request.headers});if(!object)throw new ApiError(404,"This recording is unavailable.");
 const headers=new Headers({"Content-Type":row.mime||"application/octet-stream","Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff","Accept-Ranges":"bytes","Content-Disposition":"inline"});
 let status=200;
 if(object.range && "offset" in object.range && "length" in object.range){const r=object.range as {offset:number;length:number};headers.set("Content-Range",`bytes ${r.offset}-${r.offset+r.length-1}/${object.size}`);headers.set("Content-Length",String(r.length));status=206;}else headers.set("Content-Length",String(object.size));
 return new Response(object.body,{status,headers});
}catch(e){return failure(e);}}

