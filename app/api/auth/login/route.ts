import { createHash, timingSafeEqual } from "node:crypto";
import { configured, createSession } from "../../../../lib/server";
import { isSameOrigin } from "../../../../lib/validation";
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return new Response("Forbidden", {status:403});
  if (!configured()) return new Response("Studio is not configured.", {status:503});
  const form = await request.formData();
  const supplied = String(form.get("password") || "");
  const expected = process.env.STUDIO_PASSWORD || "";
  const a = createHash("sha256").update(supplied).digest();
  const b = createHash("sha256").update(expected).digest();
  if (!timingSafeEqual(a,b)) return Response.redirect(new URL("/login?error=1",request.url),303);
  await createSession();
  return Response.redirect(new URL("/",request.url),303);
}
