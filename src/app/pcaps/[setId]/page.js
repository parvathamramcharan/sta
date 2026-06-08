import { auth } from "@/auth";
import { redirect } from "next/navigation";
import PropTypes from "prop-types";
import PcapClientView from "./PcapClientView";
import { fetchPcapSet } from "./apiService";

export default async function PcapSetPage({ params }) {
  const session = await auth();
  
  if (!session) redirect("/");
  if (!session.user?.roles?.includes("admin")) redirect("/reports");
  
  const resolvedParams = await params;
  const setId = resolvedParams.setId;
  
 
  const actualId = setId.replace("set-", "");


  let pcapResponse;
  try {
    pcapResponse = await fetchPcapSet(actualId);
  } catch (error) {
    console.error("Failed to load PCAP set:", error);
    return (
      <div className="flex items-center justify-center h-[60vh] bg-background">
        <div className="p-8 bg-card border border-rose-500/20 rounded-2xl text-center shadow-2xl max-w-md">
          <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
             <div className="w-8 h-8 rounded-full border-4 border-rose-500 border-t-transparent animate-spin" />
          </div>
         
          <p className="text-slate-400 mb-6 text-sm">
             This could take some seconds...
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-block px-6 py-2 bg-slate-500/10 hover:bg-slate-500/20 text-foreground font-bold rounded-xl transition-all border border-theme"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return <PcapClientView setId={actualId} initialResponse={pcapResponse} session={session} />;
}

PcapSetPage.propTypes = {
  params: PropTypes.object,
};
