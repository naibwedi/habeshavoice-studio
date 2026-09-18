import { clearSession } from "../../../../lib/server";
import { isSameOrigin } from "../../../../lib/validation";
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return new Response("Forbidden",{status:403});
  await clearSession();
  return Response.redirect(new URL("/login",request.url),303);
}
