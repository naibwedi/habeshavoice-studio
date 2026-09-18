import { editSchema } from "../../../../lib/validation";
import { owner,json,failure,getOwned,publicTranscript,readJson,saveRow,deleteRow } from "../../../../lib/server";
type Context={params:Promise<{id:string}>};
export const dynamic="force-dynamic";
export async function GET(_request:Request,context:Context){try{const user=await owner();return json({transcript:publicTranscript(await getOwned((await context.params).id,user))});}catch(e){return failure(e);}}
export async function PATCH(request:Request,context:Context){try{
 const user=await owner(request);const row=await getOwned((await context.params).id,user);const input=editSchema.parse(await readJson(request));
 const updated={...row,...input};await saveRow(updated);
 return json({transcript:publicTranscript(updated)});
}catch(e){return failure(e);}}
export async function DELETE(request:Request,context:Context){try{
 const user=await owner(request);const row=await getOwned((await context.params).id,user);
 await deleteRow(row);return json({deleted:true});
}catch(e){return failure(e);}}
