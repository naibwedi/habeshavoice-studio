import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { owner, failure, ApiError } from "../../../lib/server";
import { MAX_AUDIO_BYTES } from "../../../lib/validation";
export const dynamic="force-dynamic";
export async function POST(request: Request) {
  try {
    const body = await request.json() as HandleUploadBody;
    return Response.json(await handleUpload({
      body, request,
      onBeforeGenerateToken: async pathname => {
        await owner(request);
        if (!/^pending\/[0-9a-f-]{36}\.(mp3|wav|m4a|mp4|webm|ogg|flac)$/i.test(pathname)) throw new ApiError(400,"Invalid recording name.");
        return { allowedContentTypes: ["audio/*","application/octet-stream"], maximumSizeInBytes: MAX_AUDIO_BYTES, addRandomSuffix: false, tokenPayload: "studio-owner" };
      },
      onUploadCompleted: async () => {},
    }));
  } catch(e) { return failure(e); }
}
