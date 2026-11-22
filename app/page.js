import { redirect } from "next/navigation";
import { currentMember } from "../lib/auth.js";
import Tracker from "./Tracker.jsx";

export const dynamic = "force-dynamic";

export default async function Home() {
  const me = await currentMember();
  if (!me) redirect("/login");
  return <Tracker />;
}
