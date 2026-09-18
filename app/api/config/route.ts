import { configured,json,signedIn } from "../../../lib/server";
export const dynamic = "force-dynamic";
export async function GET() { const ready=configured(); return json({transcriptionReady:ready&&!!(process.env.ASR_ENDPOINT&&process.env.ASR_API_KEY),storageReady:ready,signedIn:await signedIn()}); }
