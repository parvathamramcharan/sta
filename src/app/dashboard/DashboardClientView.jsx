"use client";

import { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { LayoutDashboard, FileText, Activity, Globe, Search, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { WorldMapLeaflet } from "./WorldMapLeaflet";
import { DashboardSummary } from "./DashboardSummary";
import { DashboardStats } from "./DashboardStats";
import TrafficDistribution from "../pcaps/[setId]/TrafficDistribution";
import { IPSearch } from "./IPSearch";
import { DashboardReports } from "./DashboardReports";
import { fetchGlobalMapData, fetchDashboardOverview, fetchDashboardInsights } from "./dashboardApiService";

DashboardClientView.propTypes = {
  session: PropTypes.object,
};

export default function DashboardClientView({ session }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "Pcap Summary");
  const tabBarRef = useRef(null);
  const [data, setData] = useState(null);
  const [mapData, setMapData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reportInitialMode, setReportInitialMode] = useState("country");

  const tabs = [
    { id: "Pcap Summary", icon: LayoutDashboard },
    { id: "Traffic Distribution", icon: Activity },
    { id: "IP Search", icon: Search },
    { id: "Pcap Insights", icon: Globe },
    { id: "Reports", icon: FileText },
  ];
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        console.log("[Dashboard] Starting data fetch...");
        const [overview, insights, globalMap] = await Promise.all([
          fetchDashboardOverview().then(d => { console.log("[Dashboard] Overview loaded"); return d; }),
          fetchDashboardInsights().then(d => { console.log("[Dashboard] Insights loaded"); return d; }),
          fetchGlobalMapData().then(d => { console.log("[Dashboard] Map data loaded"); return d; })
        ]);

        console.log("[Dashboard] All data received successfully");
        setMapData(globalMap.data || []);

        const summary = overview.capture_summary || {};
        const traffic = overview.traffic_distribution || {};
        const trends = insights.insights_trends || {};

        setData({
          summary: {
            total_pcaps: summary.total_pcaps || 0,
            pcap_packets: summary.pcap_packets || 0,
            internal_ip_count: summary.internal_ip_count || 0,
            infected_hosts_count: summary.infected_hosts_count || 0,
            external_ip_count: summary.external_ip_count || 0,
            duration_seconds: summary.duration_seconds || 0,
            bytes: summary.bytes || 0,
            connections: summary.connections || 0,
            ftp_sessions_count: summary.ftp_sessions_count || 0,
            file_size: summary.file_size || 0
          },
          traffic_distribution: traffic,
          stats_details: {
            top_active_ips: trends.top_active_ips || [],
            top_countries: trends.top_countries || [],
            top_cities: trends.top_cities || [],
            top_isps: trends.top_isps || [],
            infected_hosts: summary.infected_hosts || trends.infected_hosts || []
          }
        });
      } catch (err) {
        console.error("Dashboard data load failed:", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam && tabParam !== "Pcap Summary") {
      const timer = setTimeout(() => {
        if (tabBarRef.current) {
          const yOffset = -56; // Offset for navbar (h-14 is 56px)
          const element = tabBarRef.current;
          const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
          window.scrollTo({ top: y, behavior: 'smooth' });
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    const params = new URLSearchParams(searchParams);
    params.set("tab", tabId);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });

    // Scroll tab bar to top with offset for sticky navbar
    if (tabBarRef.current) {
      const yOffset = -56; // Offset for navbar (h-14 is 56px)
      const element = tabBarRef.current;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  if (isLoading || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 font-bold text-sm 
          animate-pulse">Fetching Data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">

      <div className="h-[650px] w-full">
        <WorldMapLeaflet
          mode="summary"
          countryData={mapData}
          title="Overall IP Geo Distribution"
        />
      </div>


      <div
        ref={tabBarRef}
        className="sticky top-14 z-30 bg-white dark:bg-slate-950 border-b border-theme flex w-full overflow-visible transition-colors"
      >
        <div className="absolute inset-0 bg-emerald-500/10 pointer-events-none" />
        {tabs.map((tab) => {
          if (tab.id === "Reports") {
            return (
              <div key={tab.id} className="flex-1 min-w-[150px] relative group">
                <button
                  onClick={() => { handleTabChange("Reports"); setReportInitialMode("country"); }}
                  className={`w-full flex items-center justify-center gap-3 px-6 py-4 font-bold font-black transition-all border-r border-theme relative ${activeTab === "Reports"
                      ? "text-blue-600 bg-blue-500/10"
                      : "text-slate-400 hover:text-foreground hover:bg-slate-500/5"
                    }`}
                >
                  <tab.icon size={14} className={activeTab === "Reports" ? "text-blue-600" : "text-slate-400"} />
                  {tab.id}
                  <ChevronDown size={14} className={activeTab === "Reports" ? "text-blue-600 opacity-70" : "opacity-50"} />
                  {activeTab === "Reports" && (
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-500/20" />
                  )}
                </button>

                {/* Dropdown Menu */}
                <div className="absolute top-full left-0 w-full bg-card border border-theme shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                  <button
                    onClick={() => { handleTabChange("Reports"); setReportInitialMode("country"); }}
                    className="w-full px-4 py-3 font-bold font-black text-slate-500 hover:text-blue-600 hover:bg-slate-500/10 transition-all text-center border-b border-theme "
                  >
                    Country
                  </button>
                  <button
                    onClick={() => { handleTabChange("Reports"); setReportInitialMode("isp"); }}
                    className="w-full px-4 py-3 font-bold font-black text-slate-500 hover:text-blue-600 hover:bg-slate-500/10 transition-all text-center  "
                  >
                    ISP
                  </button>
                </div>
              </div>
            );
          }
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex-1 flex items-center justify-center gap-3 px-6 py-4 font-bold font-black transition-all border-r border-theme last:border-r-0 relative ${activeTab === tab.id
                  ? "text-blue-600 bg-blue-500/10"
                  : "text-slate-400 hover:text-foreground hover:bg-slate-500/5"
                }`}
            >
              <tab.icon size={14} className={activeTab === tab.id ? "text-blue-600" : "text-slate-400"} />
              {tab.id}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-500/20" />
              )}
            </button>
          );
        })}
      </div>


      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab + reportInitialMode}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="min-h-[calc(100vh-112px)]"
        >
          {activeTab === "Pcap Summary" && (
            <DashboardSummary data={data.summary} />
          )}

          {activeTab === "Traffic Distribution" && (
            <TrafficDistribution data={data.traffic_distribution} />
          )}

          {activeTab === "IP Search" && (
            <IPSearch />
          )}

          {activeTab === "Pcap Insights" && (
            <DashboardStats stats={data.stats_details} />
          )}

          {activeTab === "Reports" && (
            <DashboardReports initialMode={reportInitialMode} session={session} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
