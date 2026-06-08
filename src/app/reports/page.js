import { auth } from "@/auth";
import { redirect } from "next/navigation";
import ReportsClientView from "./ReportsClientView";

export default async function ReportsPage() {
  const session = await auth();
  
  if (!session) redirect("/");

  return (
    <div className="p-6">
      <ReportsClientView session={session} />
    </div>
  );
}
