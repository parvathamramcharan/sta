import { auth } from "@/auth";
import { redirect } from "next/navigation";
import DashboardClientView from "./DashboardClientView";

import { Suspense } from "react";

export default async function AnalyticsDashboardPage() {
  const session = await auth();
  
  if (!session) redirect("/");
  if (!session.user?.roles?.includes("admin")) redirect("/reports?set=1");

  return (
    <div className="max-w-[1600px] mx-auto ">
      <Suspense fallback={<div className="h-screen flex items-center justify-center text-slate-500 font-black uppercase tracking-widest text-xs">Synchronizing Intelligence...</div>}>
        <DashboardClientView session={session} />
      </Suspense>
    </div>
  );
}
