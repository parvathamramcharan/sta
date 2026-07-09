import { auth } from "@/auth";
import { redirect } from "next/navigation";
import PropTypes from "prop-types";
import PcapClientView from "./PcapClientView";
import PcapErrorView from "./PcapErrorView";
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
    pcapResponse = await fetchPcapSet(actualId, session.accessToken);
  } catch (error) {
    console.error("Failed to load PCAP set:", error);
    return <PcapErrorView />;
  }

  return <PcapClientView setId={actualId} initialResponse={pcapResponse} session={session} />;
}

PcapSetPage.propTypes = {
  params: PropTypes.object,
};