import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";
import { del, get, list, put, head } from "@vercel/blob";
import type { Transcript } from "./types";
import { isSameOrigin } from "./validation";
import { ZodError } from "zod";

export class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }
const COOKIE = "hv_session";
const OWNER = "studio-owner";
const SESSION_AGE = 60 * 60 * 24 * 14;
const secret = () => process.env.SESSION_SECRET || "";
const sign = (value: string) => createHmac("sha256", secret()).update(value).digest("base64url");
export const configured = () => !!(process.env.STUDIO_PASSWORD && secret().length >= 32 && process.env.BLOB_READ_WRITE_TOKEN);

export async function signedIn() {
  if (!configured()) return false;
  const value = (await cookies()).get(COOKIE)?.value;
  if (!value) return false;
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return false;
  const expected = sign(payload);
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return false;
  const [owner, expires] = Buffer.from(payload, "base64url").toString("utf8").split(":");
  return owner === OWNER && Number(expires) > Date.now();
}
export async function createSession() {
  const payload = Buffer.from(OWNER + ":" + (Date.now() + SESSION_AGE * 1000)).toString("base64url");
  (await cookies()).set(COOKIE, payload + "." + sign(payload), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: SESSION_AGE });
}
export async function clearSession() { (await cookies()).delete(COOKIE); }
export async function owner(request?: Request) {
  if (request && !isSameOrigin(request)) throw new ApiError(403, "This request must come from your own workspace.");
  if (!await signedIn()) throw new ApiError(401, "Please sign in to your private studio.");
  return OWNER;
}
export function json(data: unknown, status = 200) { return Response.json(data, { status, headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } }); }
export function failure(e: unknown) {
  if (e instanceof ApiError) return json({ error: e.message }, e.status);
  if (e instanceof ZodError) return json({ error: "Please check the title, language, and transcript length." }, 400);
  console.error("HabeshaVoice request failed", { type: e instanceof Error ? e.name : "Unknown" });
  return json({ error: "Your request could not be completed. Please try again; your edits have been preserved." }, 503);
}
export type Row = Transcript & { audioUrl: string | null; mime: string | null };
const path = (id: string) => "transcripts/" + id + ".json";
export async function getOwned(id: string, _user: string): Promise<Row> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new ApiError(404, "This transcript was not found.");
  const blob = await get(path(id), { access: "private", useCache: false });
  if (!blob?.stream) throw new ApiError(404, "This transcript was not found.");
  return JSON.parse(await new Response(blob.stream).text()) as Row;
}
export async function saveRow(row: Row) { await put(path(row.id), JSON.stringify(row), { access: "private", allowOverwrite: true, contentType: "application/json" }); }
export async function deleteRow(row: Row) { await del(path(row.id)); if (row.audioUrl) await del(row.audioUrl); }
export async function listRows(): Promise<Row[]> {
  const rows: Row[] = []; let cursor: string | undefined;
  do {
    const page = await list({ prefix: "transcripts/", limit: 100, cursor });
    const fetched = await Promise.all(page.blobs.map(async blob => {
      const result = await get(blob.pathname, { access: "private", useCache: false });
      return result?.stream ? JSON.parse(await new Response(result.stream).text()) as Row : null;
    }));
    rows.push(...fetched.filter((row): row is Row => !!row));
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor && rows.length < 200);
  return rows.sort((a,b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 100);
}
export async function libraryLimit() { if ((await listRows()).length >= 100) throw new ApiError(429, "Your library is full. Export and delete a session before adding another."); }
export async function recordAttempt() {
  const prefix = "attempts/" + new Date().toISOString().slice(0,10) + "/";
  const current = await list({prefix,limit:21});
  if(current.blobs.length >= 20) throw new ApiError(429,"You have reached today's transcription limit. Please try again tomorrow.");
  await put(prefix + crypto.randomUUID() + ".txt", "", {access:"private",contentType:"text/plain"});
}
export async function readJson(request: Request) {
  if (Number(request.headers.get("content-length")) > 200000) throw new ApiError(413, "This request is too large.");
  return request.json();
}
export async function getAudio(pathname: string) { return get(pathname, { access: "private" }); }
export async function audioHead(pathname: string) { return head(pathname); }
export async function removeAudio(pathname: string) { await del(pathname); }
export function publicTranscript(row: Row): Transcript {
  const { id,title,language,text,original,createdAt,duration,source,hasAudio } = row;
  return {id,title,language,text,original,createdAt,duration,source,hasAudio};
}

