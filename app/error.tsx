"use client";
export default function ErrorPage({reset}:{reset:()=>void}){return <main className="empty" style={{minHeight:"100vh"}}><h1>The studio needs a moment.</h1><p>Please try again. Saved sessions are still in your library.</p><button className="button" onClick={reset}>Try again</button></main>;}

