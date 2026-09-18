import { redirect } from "next/navigation";
import { signedIn } from "../../lib/server";
export const dynamic = "force-dynamic";
export default async function Login({searchParams}:{searchParams:Promise<{error?:string}>}) {
  const invalid=(await searchParams).error==="1";
  if (await signedIn()) redirect("/");
  return <main className="login-shell"><form action="/api/auth/login" method="post" className="login-card">
    <img src="/logo.png" alt="" width="56" height="56"/>
    <span className="eyebrow">HABESHAVOICE STUDIO</span>
    <h1>Welcome back.</h1>
    <p>Sign in to your private speech workspace.</p>
    {invalid&&<p role="alert">That password did not match. Please try again.</p>}
    <label htmlFor="password">Studio password</label>
    <input id="password" type="password" name="password" autoComplete="current-password" required/>
    <button type="submit">Open studio</button>
  </form></main>;
}
