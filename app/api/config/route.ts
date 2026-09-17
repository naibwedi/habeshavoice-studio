import { bindings,json,failure } from "../../../lib/server";
import { getChatGPTUser } from "../../chatgpt-auth";
export const dynamic="force-dynamic";
export async function GET(){try{const b=bindings();const user=await getChatGPTUser();return json({transcriptionReady:!!(b.ASR_ENDPOINT&&b.ASR_API_KEY&&b.DB&&b.BUCKET),storageReady:!!b.DB,signedIn:!!user});}catch(e){return failure(e);}}

