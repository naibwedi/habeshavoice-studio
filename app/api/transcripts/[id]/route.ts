import { editSchema } from "../../../../lib/validation";
import { db,bucket,owner,json,failure,getOwned,publicTranscript,readJson } from "../../../../lib/server";
type Context={params:Promise<{id:string}>};
export const dynamic="force-dynamic";
export async function GET(_request:Request,context:Context){try{const user=await owner();return json({transcript:publicTranscript(await getOwned((await context.params).id,user))});}catch(e){return failure(e);}}
export async function PATCH(request:Request,context:Context){try{
 const user=await owner(request);const {id}=await context.params;const row=await getOwned(id,user);const input=editSchema.parse(await readJson(request));
 await db().prepare("UPDATE transcripts SET title = ?, text = ? WHERE id = ? AND owner = ?").bind(input.title,input.text,id,user).run();
 return json({transcript:publicTranscript({...row,...input})});
}catch(e){return failure(e);}}
export async function DELETE(request:Request,context:Context){try{
 const user=await owner(request);const{id}=await context.params;const row=await getOwned(id,user);
 if(row.audio_key)await bucket().delete(row.audio_key);
 await db().prepare("DELETE FROM transcripts WHERE id = ? AND owner = ?").bind(id,user).run();
 return json({deleted:true});
}catch(e){return failure(e);}}

