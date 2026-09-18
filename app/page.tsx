import Studio from "./studio";
import { signedIn } from "../lib/server";
import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";
export default async function Home() { if (!await signedIn()) redirect("/login"); return <Studio />; }
