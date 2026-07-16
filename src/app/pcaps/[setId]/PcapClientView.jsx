"use client";

import { useState, useEffect, useMemo, memo } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, Filter, HardDrive, Clock, Activity, Hash, ArrowUp, ArrowDown, Shield, Globe, Shuffle, Terminal, ArrowRight, X, ChevronDown, FileText, ChevronLeft, ChevronRight, LayoutDashboard, Zap } from "lucide-react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import CaptureSummary from "./CaptureSummary";
import TrafficDistribution from "./TrafficDistribution";
import PcapInsights from "./PcapInsights";
import { fetchPcapOverview, fetchPcapInsights, fetchPcapTimeline, fetchPcapConnections, fetchIpScan, fetchPcapGeoReport, fetchPcapDetails, fetchPcapMap } from "./apiService";
import PropTypes from "prop-types";
import { DashboardReports } from "../../dashboard/DashboardReports";
import { Server, User, Cpu, MapPin, ExternalLink, RefreshCw, AlertTriangle, CheckCircle2 } from "lucide-react";
import dynamic from "next/dynamic";
const WorldMapLeaflet = dynamic(() => import("../../dashboard/WorldMapLeaflet").then(mod => mod.WorldMapLeaflet), { ssr: false });

export function formatBytes(bytes, precision = 2) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(precision)) + ' ' + sizes[i];
}

export function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

// Anti-gravity motion constants
const ANTIGRAVITY_SPRING = {
  type: "spring",
  stiffness: 140,
  damping: 20,
  mass: 0.8,
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.1,
    }
  }
};

const cardVariants = {
  hidden: {
    opacity: 0,
    y: 20,
    scale: 0.94
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      ...ANTIGRAVITY_SPRING,
      opacity: { duration: 0.4 }
    }
  },
  hover: {
    y: -10,
    scale: 1.02,
    transition: {
      ...ANTIGRAVITY_SPRING,
      stiffness: 240,
      damping: 18
    }
  },
  floating: {
    y: [0, -4, 0],
    transition: {
      duration: 5,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

const StatItem = memo(({ label, value, icon: Icon, color, isSelected }) => {
  const colorMap = {
    blue: "text-blue-500",
    emerald: "text-emerald-500",
    orange: "text-orange-500",
    purple: "text-purple-500",
    amber: "text-amber-500",
    rose: "text-rose-500",
    slate: "text-slate-500"
  };

  const iconColor = colorMap[color] || "text-slate-400";

  return (
    <motion.div
      layout="position"
      className="flex items-center gap-3"
    >
      <div className={`flex items-center justify-center shrink-0 transition-colors ${isSelected ? "text-white" : iconColor
        }`}>
        <Icon size={16} strokeWidth={2.5} />
      </div>
      <div className="min-w-0">
        <div className={`text-[13px] font-black tabular-nums leading-tight truncate ${isSelected ? "text-white" : "text-foreground"}`}>
          {value}
        </div>
        <div className={`text-[9px] font-black uppercase tracking-[0.1em] leading-none ${isSelected ? "text-blue-100/60" : "text-slate-400"}`}>
          {label}
        </div>
      </div>
    </motion.div>
  );
});

StatItem.displayName = "StatItem";

StatItem.propTypes = {
  label: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  icon: PropTypes.elementType,
  color: PropTypes.string,
  isSelected: PropTypes.bool,
};

const PcapCard = memo(({ file, isSelected, onClick }) => {
  return (
    <motion.div
      layout
      initial="hidden"
      animate={["visible", "floating"]}
      exit="hidden"
      whileHover="hover"
      variants={cardVariants}
      key={file.pcap_id}
      onClick={onClick}
      className={`relative flex flex-col aspect-square cursor-pointer border-2 rounded-xl p-5 pt-8 justify-start gap-8 overflow-hidden transition-colors duration-300 will-change-transform transform-gpu ${isSelected
          ? "bg-blue-600 border-blue-600 ring-2 ring-blue-600 shadow-2xl shadow-blue-500/30 z-20"
          : `bg-slate-500/[0.01] border-blue-400/40 shadow-blue-500/10 hover:border-blue-500 hover:shadow-2xl hover:shadow-blue-500/20 z-10`
        }`}
    >
      <div className="relative z-10 flex flex-col items-start text-left gap-1.5 h-[72px]">
        <div className={`flex items-center gap-2 ${isSelected ? "text-blue-100/80" : "text-blue-600"}`}>
          {file.infected_host && <Shield size={12} className="text-rose-500 animate-pulse" />}
          <span className="text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap">PCAP File :</span>
        </div>
        <div className="pr-2">
          <div className={`font-black text-[13px] leading-[1.4] line-clamp-2 tracking-tight ${isSelected ? "text-white" : "text-foreground"}`} title={file.filename}>
            {file.filename}
          </div>
        </div>
      </div>

      {/* Telemetry Matrix */}
      <div className="relative z-10 grid grid-cols-2 gap-x-3 gap-y-7 pt-1">
        <StatItem
          label="Size"
          value={formatBytes(file.size)}
          icon={HardDrive}
          color="slate"
          isSelected={isSelected}
        />
        <StatItem
          label="Packets"
          value={file.packets.toLocaleString()}
          icon={Activity}
          color="emerald"
          isSelected={isSelected}
        />
        <StatItem
          label="Duration"
          value={formatDuration(file.duration)}
          icon={Clock}
          color="amber"
          isSelected={isSelected}
        />
        <StatItem
          label="External IPs"
          value={file.ip_count}
          icon={Hash}
          color="purple"
          isSelected={isSelected}
        />
      </div>
    </motion.div>
  );
});

PcapCard.displayName = "PcapCard";

PcapCard.propTypes = {
  file: PropTypes.shape({
    pcap_id: PropTypes.string,
    infected_host: PropTypes.string,
    filename: PropTypes.string,
    size: PropTypes.number,
    packets: PropTypes.number,
    duration: PropTypes.number,
    ip_count: PropTypes.number,
  }),
  isSelected: PropTypes.bool,
  onClick: PropTypes.func,
};

export default function PcapClientView({ setId, initialResponse, session }) {
  const initialData = initialResponse.data || [];
  const stats = initialResponse.repository_stats || {};

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Random");
  const [sortOrder, setSortOrder] = useState("desc");
  const [randomSeed, setRandomSeed] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Optimized Cache Matrix
  const [dataCache, setDataCache] = useState({});


  const pcapIdQuery = searchParams.get('pcap');
  const activeTab = searchParams.get('tab') || "Pcap Summary";

  const selectedFile = initialData.find(f => f.pcap_id === pcapIdQuery) || null;
  const tabs = [
    { id: "Pcap Summary", icon: LayoutDashboard, color: "blue" },
    { id: "IP Geomap", icon: Globe, color: "emerald" },
    { id: "Traffic Distribution", icon: Activity, color: "purple" },
    { id: "Pcap Insights", icon: Zap, color: "amber" },
    { id: "Reports", icon: FileText, color: "slate" },
    { id: "IP Search", icon: Search, color: "rose" },
  ];


  const [overviewData, setOverviewData] = useState(null);
  const [connectionsData, setConnectionsData] = useState(null);
  const [connectionsPagination, setConnectionsPagination] = useState(null);
  const [connectionsPage, setConnectionsPage] = useState(1);
  const [insightsData, setInsightsData] = useState(null);
  const [mapData, setMapData] = useState([]);
  const [timelineData, setTimelineData] = useState(null);
  const [ipSearchTerm, setIpSearchTerm] = useState("");
  const [reportInitialMode, setReportInitialMode] = useState("country");
  const [scanResults, setScanResults] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState("");
  const [timeFilter, setTimeFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isLoadingConnections, setIsLoadingConnections] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem('ipSearchHistory');
    if (saved) {
      try { setHistory(JSON.parse(saved)); } catch (e) {}
    }
  }, []);

  const saveToHistory = (searchIp) => {
    const newHistory = [searchIp, ...history.filter(h => h !== searchIp)].slice(0, 5);
    setHistory(newHistory);
    localStorage.setItem('ipSearchHistory', JSON.stringify(newHistory));
  };

  const updateUrl = (pcapId, tab) => {
    const params = new URLSearchParams(searchParams);
    if (pcapId) params.set('pcap', pcapId);
    else params.delete('pcap');
    if (tab) params.set('tab', tab);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  useEffect(() => {
    if (!selectedFile) {
      setOverviewData(null);
      setConnectionsData(null);
      return;
    }

    const loadData = async () => {
      const cacheKey = `pcap-core-${selectedFile.pcap_id}`;
      if (dataCache[cacheKey]) {
        setOverviewData(dataCache[cacheKey].overview);
        setTimelineData(dataCache[cacheKey].timeline);
        return;
      }

      setIsLoadingDetails(true);
      setApiError(null);
      try {
        const [overview, timeline] = await Promise.all([
          fetchPcapOverview(selectedFile.pcap_id),
          fetchPcapTimeline(selectedFile.pcap_id)
        ]);
        setOverviewData(overview);
        setTimelineData(timeline);
        setDataCache(prev => ({ ...prev, [cacheKey]: { overview, timeline } }));
      } catch (err) {
        console.error("Data load failed:", err);
        setApiError("Unable to connect to analysis server. Please try again later.");
      } finally {
        setIsLoadingDetails(false);
      }
    };

    loadData();
  }, [selectedFile?.pcap_id, dataCache]);

  // Reset connections state when PCAP changes
  useEffect(() => {
    if (selectedFile) {
      setConnectionsPage(1);
      setConnectionsData(null);
      setConnectionsPagination(null);
      setTimeFilter("");
    }
  }, [selectedFile?.pcap_id]);

  useEffect(() => {
    if (!selectedFile || (activeTab !== "Pcap Insights" && activeTab !== "IP Geomap")) return;
    if (insightsData && insightsData.pcap_id === selectedFile.pcap_id) return;

    const loadInsights = async () => {
      setIsLoadingDetails(true);
      try {
        const data = await fetchPcapInsights(selectedFile.pcap_id);
        setInsightsData({ ...data, pcap_id: selectedFile.pcap_id });
      } catch (err) {
        console.error("Insights load failed:", err);
      } finally {
        setIsLoadingDetails(false);
      }
    };

    loadInsights();
  }, [selectedFile?.pcap_id, activeTab]);

  // Load per-pcap map data from the backend map endpoint when IP Geomap tab is active
  useEffect(() => {
    if (!selectedFile || activeTab !== "IP Geomap") return;

    const loadMap = async () => {
      try {
        const mapResp = await fetchPcapMap(selectedFile.pcap_id);
        // mapResp may be an object with `external_ips` or a list directly
        const ips = Array.isArray(mapResp) ? mapResp : (mapResp.external_ips || mapResp.data || []);
        setMapData(ips);
      } catch (err) {
        console.error('Map load failed:', err);
        setMapData([]);
      }
    };

    loadMap();
  }, [selectedFile?.pcap_id, activeTab]);

  useEffect(() => {
    if (!selectedFile || activeTab !== "Pcap Summary") return;

    const loadConnections = async () => {
      const cacheKey = `pcap-conn-${selectedFile.pcap_id}-${connectionsPage}-${timeFilter}`;
      if (dataCache[cacheKey]) {
        setConnectionsData(dataCache[cacheKey].data);
        setConnectionsPagination(dataCache[cacheKey].pagination);
        return;
      }

      setIsLoadingConnections(true);
      try {
        const response = await fetchPcapConnections(selectedFile.pcap_id, connectionsPage, timeFilter);
        
        // Robust data extraction
        let rawData = response.data || response.connections || response;
        if (rawData && !Array.isArray(rawData) && typeof rawData === 'object') {
          rawData = rawData.connections || rawData.data || rawData.results || [];
        }
        const data = Array.isArray(rawData) ? rawData : [];
        
        // Prioritize API pagination if available
        let pagination = response.pagination || response.meta || null;
        
        if (!pagination) {
          // Fallback to overview data or local count
          const total = overviewData?.capture_summary?.connections || data.length;
          pagination = {
            total: total,
            total_pages: Math.ceil(total / 100),
            page: connectionsPage,
            limit: 100
          };
        } else if (overviewData?.capture_summary?.connections && pagination.total < overviewData.capture_summary.connections) {
            // If API says fewer than summary, but summary is reliable, we can use summary for total
            // but only if we trust the API is returning a subset
            pagination.total = overviewData.capture_summary.connections;
            pagination.total_pages = Math.ceil(pagination.total / (pagination.limit || 100));
        }

        setConnectionsData(data);
        setConnectionsPagination(pagination);
        setDataCache(prev => ({ ...prev, [cacheKey]: { data, pagination } }));
      } catch (err) {
        console.error("Connections load failed:", err);
      } finally {
        setIsLoadingConnections(false);
      }
    };

    loadConnections();
  }, [selectedFile?.pcap_id, connectionsPage, timeFilter, activeTab, overviewData?.capture_summary?.connections]);

  const handleIpClick = (ip) => {
    setIpSearchTerm(ip);
    updateUrl(selectedFile.pcap_id, "IP Search");
    handleScan(ip);
  };

  const handleScan = async (targetIp) => {
    const ipToScan = targetIp || ipSearchTerm;
    if (!ipToScan) return;

    const ipv4Regex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (!ipv4Regex.test(ipToScan)) {
       setScanError("Please enter a valid IPv4 address.");
       setScanResults(null);
       return;
    }

    saveToHistory(ipToScan);
    setIpSearchTerm(ipToScan);

    setIsScanning(true);
    setScanResults(null);
    setScanError("");
    try {
      const data = await fetchIpScan(ipToScan);
      if (data && data.success) {
        setScanResults(data.data);
      } else {
        setScanError(data.message || "Failed to retrieve IP intelligence.");
      }
    } catch (err) {
      console.error("Scan failed:", err);
      setScanError("Unable to connect to the intelligence server.");
    } finally {
      setIsScanning(false);
    }
  };





  const filteredData = initialData.filter(item =>
    item.filename.toLowerCase().includes(search.toLowerCase())
  );

  // Apply date range filtering when set
  const filteredAndDated = filteredData.filter(item => {
    if (!dateFrom && !dateTo) return true;

    const itemStartDate = item.start_time ? item.start_time.slice(0, 10) : null;
    const itemEndDate = item.end_time ? item.end_time.slice(0, 10) : null;
    if (!itemStartDate && !itemEndDate) return false;

    const fromDate = dateFrom || null;
    const toDate = dateTo || null;

    const fromOK = !fromDate || (itemStartDate ? itemStartDate >= fromDate : itemEndDate ? itemEndDate >= fromDate : false);
    const toOK = !toDate || (itemEndDate ? itemEndDate <= toDate : itemStartDate ? itemStartDate <= toDate : false);

    return fromOK && toOK;
  });


  let sortedData = [...filteredAndDated];
  const orderMultiplier = sortOrder === "asc" ? 1 : -1;

  if (filter === "Random") {

    sortedData.sort((a, b) => {
      const seedA = (Number.parseInt(a.pcap_id.substring(0, 4), 16) || 0) + randomSeed;
      const seedB = (Number.parseInt(b.pcap_id.substring(0, 4), 16) || 0) + randomSeed;
      return (Math.sin(seedA) - Math.sin(seedB));
    });
  }
  if (filter === "Size") sortedData.sort((a, b) => (a.size - b.size) * orderMultiplier);
  if (filter === "Duration") sortedData.sort((a, b) => (a.duration - b.duration) * orderMultiplier);
  if (filter === "Packets") sortedData.sort((a, b) => (a.packets - b.packets) * orderMultiplier);
  if (filter === "Date") {
    sortedData.sort((a, b) => {
      const aDate = a.start_time || a.end_time || "";
      const bDate = b.start_time || b.end_time || "";
      return (new Date(aDate) - new Date(bDate)) * orderMultiplier;
    });
  }
  if (filter === "External IPs") sortedData.sort((a, b) => (a.ip_count - b.ip_count) * orderMultiplier);

  const handleFilterClick = (label) => {
    if (label === "Random") {
      setFilter("Random");
      setRandomSeed(prev => prev + 1);
      return;
    }

    if (filter === label) {
      setSortOrder(sortOrder === "desc" ? "asc" : "desc");
    } else {
      setFilter(label);
      setSortOrder("desc");
    }
    setCurrentPage(1);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const FilterBtn = ({ label }) => {
    const isActive = filter === label;
    return (
      <button
        onClick={() => handleFilterClick(label)}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-bold rounded-md border transition-all ${isActive
            ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/20"
            : "bg-card border-theme text-slate-500 hover:text-foreground hover:bg-slate-500/5"
          }`}
      >
        {label}
        {isActive && (
          label === "Random" ? (
            <Shuffle size={14} className="text-white animate-in zoom-in duration-300" />
          ) : (
            sortOrder === "asc" ? <ArrowUp size={14} className="text-white" /> : <ArrowDown size={14} className="text-white" />
          )
        )}
      </button>
    );
  };

  return (
    <div className="flex flex-col gap-3 pb-10">

      <div className="flex items-center justify-between shrink-0 pt-1">
        <h1 className="text-xl font-black text-foreground tracking-tight flex items-center gap-3">
          PCAP Set {setId}
          <span className="text-amber-500 text-sm font-medium bg-amber-500/10 px-3 py-1 rounded-none border border-amber-500/20">
            {stats.total_pcaps || initialData.length} Files
          </span>
          {stats.repository_size && (
            <span className="text-blue-500 text-sm font-medium bg-blue-500/10 px-3 py-1 rounded-none border border-blue-500/20">
              {formatBytes(stats.repository_size)} Total
            </span>
          )}
          {stats.observed_ips && (
            <span className="text-emerald-500 text-sm font-medium bg-emerald-500/10 px-3 py-1 rounded-none border border-emerald-500/20">
              {stats.observed_ips.toLocaleString()} External IPs
            </span>
          )}
        </h1>

        <div className="relative w-[600px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search pcap files..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 bg-card border border-theme rounded-none text-[13px] font-medium text-foreground focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-sm placeholder:text-slate-500"
          />
        </div>
      </div>


      <div className="flex items-center justify-between bg-card p-2 rounded-xl border border-theme shadow-sm shrink-0">
        <div className="flex items-center gap-1.5">
          <Filter size={15} className="text-slate-400 mx-1.5" />
          <FilterBtn label="Random" />
          <FilterBtn label="Size" />
          <FilterBtn label="Duration" />
          <FilterBtn label="Packets" />
          <FilterBtn label="External IPs" />
          <FilterBtn label="Date" />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-card rounded-md px-2 py-1 border border-theme">
            <label className="text-[13px] font-bold text-slate-500">From</label>
            <input
              type="date"
              value={dateFrom}
              max={dateTo || undefined}
              onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1); }}
              className="text-[13px] font-bold px-2 py-1 bg-transparent border border-transparent rounded-md"
              placeholder="dd/mm/yyyy"
            />
            <label className="text-[13px] font-bold text-slate-500">To</label>
            <input
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1); }}
              className="text-[13px] font-bold px-2 py-1 bg-transparent border border-transparent rounded-md"
              placeholder="dd/mm/yyyy"
            />
            <button
              onClick={() => { setDateFrom(""); setDateTo(""); setCurrentPage(1); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-bold rounded-md border transition-all bg-card border-theme text-slate-500 hover:text-foreground hover:bg-slate-500/5`}
            >
              Clear
            </button>
          </div>
        </div>
        <div className="px-4 text-[11px] font-black text-foreground uppercase tracking-widest border-l border-theme ml-2">
          <span className="text-blue-600">{(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, sortedData.length)}</span> <span className="text-slate-400 px-1 normal-case font-bold">of</span> <span className="text-foreground">{sortedData.length}</span> PCAPs
        </div>
      </div>


      <div className={`transition-all duration-500 ease-in-out overflow-y-auto pr-2 pb-2 overflow-x-hidden custom-scrollbar ${selectedFile ? "h-[32vh]" : "h-[78vh]"
        }`}>
        <LayoutGroup>
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 p-2"
            style={{ contain: "layout paint" }}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              {sortedData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((file, idx) => {
                const isSelected = selectedFile?.pcap_id === file.pcap_id;

                return (
                  <PcapCard
                    key={file.pcap_id}
                    file={file}
                    isSelected={isSelected}
                    onClick={() => {
                      if (isSelected) {
                        updateUrl(null, activeTab);
                      } else {
                        updateUrl(file.pcap_id, "Pcap Summary");
                      }
                    }}
                  />
                );
              })}
            </AnimatePresence>
          </motion.div>
        </LayoutGroup>

        {/* Pagination UI */}
        {sortedData.length > itemsPerPage && (
          <div className="flex items-center justify-center gap-2 mt-8 mb-4">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className={`p-2 rounded-lg border transition-all ${currentPage === 1
                  ? "text-slate-300 border-slate-100 cursor-not-allowed"
                  : "text-slate-600 border-slate-200 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50"
                }`}
            >
              <ChevronLeft size={18} />
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: Math.ceil(sortedData.length / itemsPerPage) }).map((_, i) => {
                const pageNum = i + 1;
                if (
                  pageNum === 1 ||
                  pageNum === Math.ceil(sortedData.length / itemsPerPage) ||
                  (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                ) {
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`min-w-[36px] h-9 px-2 rounded-lg border text-sm font-bold transition-all ${currentPage === pageNum
                          ? "bg-blue-500/10 border-blue-500/20 text-blue-600 shadow-sm"
                          : "bg-card border-theme text-slate-500 hover:border-blue-500 hover:text-blue-600"
                        }`}
                    >
                      {pageNum}
                    </button>
                  );
                } else if (
                  pageNum === currentPage - 2 ||
                  pageNum === currentPage + 2
                ) {
                  return <span key={pageNum} className="px-1 text-slate-400">...</span>;
                }
                return null;
              })}
            </div>

            <button
              onClick={() => setCurrentPage(prev => Math.min(Math.ceil(sortedData.length / itemsPerPage), prev + 1))}
              disabled={currentPage === Math.ceil(sortedData.length / itemsPerPage)}
              className={`p-2 rounded-lg border transition-all ${currentPage === Math.ceil(sortedData.length / itemsPerPage)
                  ? "text-slate-300 border-slate-100 cursor-not-allowed"
                  : "text-slate-600 border-slate-200 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50"
                }`}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>


      <AnimatePresence>
        {selectedFile && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed inset-0 top-[120px] z-[40] bg-background flex flex-col"
          >
            <div className="flex-1 flex flex-col w-full bg-card border-t border-theme overflow-hidden">
              <div className="flex items-center gap-0 bg-emerald-500/10 border-b border-theme shrink-0">
                <div className="flex-1 flex items-center gap-0">
                  {tabs.map((tab) => {
                    if (tab.id === "Reports") {
                      return (
                        <div key={tab.id} className="flex-1 relative group">
                          <button
                            onClick={() => { updateUrl(selectedFile.pcap_id, "Reports"); setReportInitialMode("country"); }}
                            className={`w-full whitespace-nowrap px-4 py-4 font-bold font-black transition-all text-center border-r border-theme relative group flex items-center justify-center gap-2 ${activeTab === "Reports"
                                ? "text-blue-600 bg-blue-500/10"
                                : "text-slate-400 hover:text-foreground hover:bg-slate-500/5"
                              }`}
                          >
                            <tab.icon size={14} className={activeTab === "Reports" ? "text-blue-600" : "text-slate-400"} />
                            {tab.id}
                            <ChevronDown size={14} className={activeTab === "Reports" ? "text-blue-600 opacity-70" : "opacity-50"} />
                            {activeTab === "Reports" && (
                              <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500/20" />
                            )}
                          </button>

                          {/* Discovery Mode Dropdown */}
                          <div className="absolute top-full left-0 w-full bg-card  border  border-theme shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[60]">
                            <button
                              onClick={() => { updateUrl(selectedFile.pcap_id, "Reports"); setReportInitialMode("country"); }}
                              className="w-full px-4 py-3 font-semibold font-black text-slate-500 hover:text-blue-600 hover:bg-slate-500/10 transition-all text-center border-b border-theme "
                            >
                              Country
                            </button>
                            <button
                              onClick={() => { updateUrl(selectedFile.pcap_id, "Reports"); setReportInitialMode("isp"); }}
                              className="w-full px-4 py-3 font-semibold font-black text-slate-500 hover:text-blue-600 hover:bg-slate-500/10 transition-all text-center "
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
                        onClick={() => updateUrl(selectedFile.pcap_id, tab.id)}
                        className={`flex-1 whitespace-nowrap px-4 py-4 font-bold font-black  transition-all text-center border-r border-theme last:border-r-0 relative group flex items-center justify-center gap-2 ${activeTab === tab.id
                            ? "text-blue-600 bg-blue-500/10"
                            : "text-slate-400 hover:text-foreground hover:bg-slate-500/5"
                          }`}
                      >
                        <tab.icon size={14} className={activeTab === tab.id ? "text-blue-600" : "text-slate-400"} />
                        {tab.id}
                        {activeTab === tab.id && (
                          <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500/20" />
                        )}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => updateUrl(null, activeTab)}
                  className="w-16 h-full flex items-center justify-center bg-rose-500/5 text-rose-500 hover:bg-rose-500 hover:text-white transition-all group shrink-0 border-l border-theme"
                >
                  <X size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="h-full flex flex-col">
                  <div className="px-8 py-4 border-b border-theme bg-card shrink-0 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col">
                        <div className="text-[10px] font-black text-blue-600 uppercase  mb-1">PCAP FILENAME</div>
                        <span className="text-[20px] font-black text-foreground uppercase  leading-none">{selectedFile.filename}</span>
                      </div> 
                    </div>
                  </div>

                  <div className="flex-1 p-0">
                    {isLoadingDetails ? (
                      <div className="p-8 space-y-8 animate-pulse">
                        <div className="grid grid-cols-3 gap-6">
                          {[1, 2, 3].map(i => (
                            <div key={i} className="h-36 bg-slate-500/5 rounded-none border border-slate-200" />
                          ))}
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                           <div className="h-64 bg-slate-500/5 rounded-none border border-slate-200" />
                           <div className="h-64 bg-slate-500/5 rounded-none border border-slate-200" />
                        </div>
                        <div className="h-80 bg-slate-500/5 rounded-none border border-slate-200" />
                      </div>
                    ) : apiError ? (
                      <div className="flex items-center justify-center h-48 text-rose-500 font-bold bg-rose-500/5 rounded-2xl border border-rose-500/10">
                        {apiError}
                      </div>
                    ) : activeTab === "Pcap Summary" && overviewData ? (
                        <CaptureSummary
                          overviewData={overviewData}
                          connectionsData={connectionsData}
                          timelineData={timelineData}
                          connectionsPagination={connectionsPagination}
                          connectionsPage={connectionsPage}
                          setConnectionsPage={setConnectionsPage}
                          timeFilter={timeFilter}
                          setTimeFilter={setTimeFilter}
                          isLoadingConnections={isLoadingConnections}
                          onIpClick={handleIpClick}
                          pcapId={selectedFile?.pcap_id || pcapIdQuery}
                          onTimelineClick={(from, to) => { setDateFrom(from); setDateTo(to); setCurrentPage(1); }}
                        />
                    ) : activeTab === "Traffic Distribution" && overviewData ? (
                      <TrafficDistribution
                        data={overviewData.traffic_distribution}
                      />
                    ) : activeTab === "Pcap Insights" && insightsData ? (
                      <PcapInsights data={insightsData} onIpClick={handleIpClick} />
                    ) : activeTab === "IP Geomap" ? (
                      <div className="h-[750px] w-full rounded-none overflow-hidden border border-theme relative group shadow-2xl transition-colors bg-card">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(37,99,235,0.05),transparent_70%)] pointer-events-none z-10" />
                        <WorldMapLeaflet
                          mode="pcap"
                          externalIps={mapData}
                          onIpClick={handleIpClick}
                        />
                      </div>
                    ) : activeTab === "IP Search" ? (
                      <div className="space-y-8 animate-in fade-in duration-500 pb-10">
                        <div className="flex justify-center mb-6 pt-16">
                          <div className="relative w-full max-w-xl group">
                            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                            <input
                              type="text"
                              value={ipSearchTerm}
                              onChange={(e) => {
                                setIpSearchTerm(e.target.value);
                                if (!e.target.value) {
                                  setScanResults(null);
                                  setScanError("");
                                }
                              }}
                              onKeyDown={(e) => e.key === 'Enter' && handleScan()}
                              placeholder="Enter IP Address for Deep Intelligence..."
                              className="w-full pl-12 pr-12 py-4 bg-card border border-theme rounded-none text-[15px] font-medium text-foreground focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-sm placeholder:text-slate-500"
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center">
                              {isScanning ? (
                                <Activity size={18} className="animate-spin text-blue-500" />
                              ) : (
                                <button onClick={() => handleScan()} disabled={!ipSearchTerm} className="text-slate-400 hover:text-blue-500 transition-colors disabled:opacity-0 p-1">
                                  <ArrowRight size={20} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-center gap-2 -mt-2 mb-8 min-h-[24px]">
                          <Clock size={13} className="" />
                          <span className="text-[13px] font-black   mr-2">Recent:</span>
                          {history.length > 0 ? (
                            history.map((h, i) => (
                              <button
                                key={i}
                                onClick={() => handleScan(h)}
                                className="px-3 py-1  hover:bg-blue-500/10 border hover:border-blue-500/30 text-[11px] font-bold  hover:text-blue-500 rounded-none transition-all"
                              >
                                {h}
                              </button>
                            ))
                          ) : (
                            <span className="text-[11px]">No recent searches</span>
                          )}
                        </div>

                        {scanError && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-rose-500/5 border border-rose-500/10 text-rose-500 p-6 rounded-none text-sm font-black flex items-center gap-3 mb-8 max-w-xl mx-auto"
                          >
                            <Shield size={20} />
                            {scanError}
                          </motion.div>
                        )}
                        <AnimatePresence mode="wait">
                          {scanResults && (
                            <motion.div
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="space-y-8"
                            >
                              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                                <div className="lg:col-span-4 flex flex-col gap-8">
                                  <div className="bg-card border border-theme p-8 rounded-none relative overflow-hidden">
                                    <div className={`absolute top-6 right-6 px-3 py-1 rounded-none text-[10px] font-black uppercase tracking-widest ${scanResults.status === 'up' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-slate-500/10 text-slate-500 border border-slate-500/20'}`}>
                                      {scanResults.status || 'Unknown'}
                                    </div>
                                    <div className="flex items-center gap-5 mb-8">
                                      <div className="w-16 h-16 bg-blue-500/10 rounded-none flex items-center justify-center shrink-0">
                                        <Server size={28} className="text-blue-500" />
                                      </div>
                                      <div className="min-w-0">
                                        <div className="font-bold mb-1">Host Identity</div>
                                        <div className="text-2xl font-black text-foreground truncate">{scanResults.ip}</div>
                                      </div>
                                    </div>

                                    <div className="space-y-4">
                                      <DetailRow icon={Globe} label="Autonomous System Number" value={scanResults.asn} color="blue" />
                                      <DetailRow icon={Cpu} label="OS Match" value={scanResults.os_info?.best_match} subValue={`Confidence: ${scanResults.os_info?.confidence}%`} color="purple" />
                                      <DetailRow icon={Shield} label="DNSBL Status" value={scanResults.dnsbl?.listed ? "Listed / At Risk" : "Clean"} color={scanResults.dnsbl?.listed ? "rose" : "emerald"} />
                                      <DetailRow icon={Terminal} label="rDNS / Hostname" value={scanResults.rdns || (scanResults.hostnames?.length ? scanResults.hostnames.join(", ") : null)} color="slate" />
                                      <DetailRow icon={Zap} label="Proxy Type" value={scanResults.proxy_type} color="amber" />

                                    </div>
                                  </div>






                                  <div className="bg-card border border-theme p-8 rounded-none">
                                    <div className="flex items-center gap-4 mb-6">
                                      <div className="p-2 bg-orange-500/10 rounded-none">
                                        <MapPin size={20} className="text-orange-500" />
                                      </div>
                                      <div className="font-bold font-black text-foreground">Geographic Intel</div>
                                    </div>
                                    <div className="space-y-6">
                                      <div>
                                        <div className="font-bold   mb-2">City / Region</div>
                                        <div className="text-[14px] font-bold  break-words leading-tight text-slate-600">{scanResults.geo?.city || 'Unknown City'}</div>
                                      </div>
                                      <div>
                                        <div className="fomt-bold font-black  mb-2">Country</div>
                                        <div className="text-[14px] font-bold  break-words leading-tight text-slate-600">{scanResults.geo?.country || 'Unknown Country'}</div>
                                      </div>
                                      <div>
                                        <div className="font-bold font-black  mb-2">Service Provider</div>
                                        <div className="text-[14px] font-bold  break-words leading-tight text-slate-600">{scanResults.geo?.isp || 'Unknown ISP'}</div>
                                      </div>
                                      <div className="grid grid-cols-2 gap-4 pt-4">
                                        <div>
                                          <div className="font-bold font-black   mb-1">Latitude</div>
                                          <div className="text-[14px] font-bold  break-words leading-tight text-slate-600">{scanResults.geo?.latitude || scanResults.location?.lat || 'N/A'}</div>
                                        </div>
                                        <div>
                                          <div className="font-bold font-black   mb-1">Longitude</div>
                                          <div className="text-[14px] font-bold  break-words leading-tight text-slate-600">{scanResults.geo?.longitude || scanResults.location?.lon || 'N/A'}</div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>


                                <div className="lg:col-span-8 flex flex-col gap-8">
                                  <div className="flex flex-col gap-4">

                                    <div className="flex items-center justify-between px-4">
                                      <div className="flex items-center gap-4">
                                        <div className="p-3 bg-slate-500/[0.05] border border-theme rounded-none shadow-sm">
                                          <Activity size={24} className="text-rose-500" />
                                        </div>
                                        <div>
                                          <h3 className="text-lg font-black text-foreground">Ports & Service Detection</h3>
                                          <p className="font-sm font-black text-slate-600   mt-0.5">Active Network Services</p>
                                        </div>
                                      </div>
                                      <div className="flex flex-col items-end gap-1">
                                        <div className="px-4 py-1.5 bg-blue-500/10 rounded-none text-[11px] font-black text-blue-500 border border-blue-500/20">
                                          {scanResults.ports?.length || 0} Ports Found
                                        </div>
                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                                          Page <span className="text-foreground">1</span> of <span className="text-foreground">1</span>
                                        </div>
                                      </div>
                                    </div>


                                    <div className="bg-card rounded-none overflow-hidden flex flex-col shadow-sm">
                                      <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                          <thead className="bg-slate-500/5">
                                            <tr>
                                              <th className="px-8 py-5 text-md font-black text-slate-600">Port</th>
                                              <th className="px-8 py-5 text-md font-black text-slate-600">Service</th>
                                              <th className="px-8 py-5 text-md font-black text-slate-600">Protocol</th>
                                              <th className="px-8 py-5 text-md font-black text-slate-600">State</th>
                                              <th className="px-8 py-5 text-md font-black text-slate-600 text-right">Reason</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {(scanResults.ports || []).map((p, i) => (
                                              <tr key={i} className="group hover:bg-slate-500/5 transition-colors">
                                                <td className="px-8 py-5">
                                                  <div className="flex items-center gap-3">
                                                    <span className="text-sm font-black text-foreground">{p.port}</span>
                                                    {p.state === 'open' && <CheckCircle2 size={12} className="text-emerald-500" />}
                                                  </div>
                                                </td>
                                                <td className="px-8 py-5">
                                                  <div className="text-[11px] font-black text-blue-500 uppercase bg-blue-500/5 px-2 py-1 rounded-lg border border-blue-500/10 inline-block">
                                                    {p.service || p.application || 'Unknown'}
                                                  </div>
                                                </td>
                                                <td className="px-8 py-5 text-[11px] font-black text-slate-500 uppercase tracking-widest">{p.protocol}</td>
                                                <td className="px-8 py-5">
                                                  <span className={`text-[10px] font-black uppercase tracking-tighter px-2 py-1 rounded-md border ${p.state === 'open' ? 'text-emerald-500 bg-emerald-500/5 border-emerald-500/20' : 'text-slate-400 bg-slate-500/5 border-slate-500/20'}`}>
                                                    {p.state}
                                                  </span>
                                                </td>
                                                <td className="px-8 py-5 text-right">
                                                  <span className="text-[10px] font-bold text-slate-400 uppercase italic">{p.reason || 'N/A'}</span>
                                                </td>
                                              </tr>
                                            ))}
                                            {(!scanResults.ports || scanResults.ports.length === 0) && (
                                              <tr>
                                                <td colSpan="5" className="px-8 py-20 text-center text-xs font-bold uppercase tracking-widest opacity-30">
                                                  No Open Ports Discovered
                                                </td>
                                              </tr>
                                            )}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  </div>


                                  <div className="bg-card p-8 rounded-none">
                                    <div className="flex items-center gap-4 mb-8">
                                      <div className="p-2 bg-emerald-500/10 rounded-none">
                                        <User size={20} className="text-emerald-500" />
                                      </div>
                                      <div className="text-lg font-black text-foreground ">Ownership Details</div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                                      <WhoisSection title="Registrant Information" data={scanResults.whois?.contacts?.registrant} />
                                      <WhoisSection title="Technical Contact" data={scanResults.whois?.contacts?.technical} />
                                      <WhoisSection title="Abuse Contact" data={scanResults.whois?.contacts?.abuse} />
                                      <WhoisSection title="Administrative Contact" data={scanResults.whois?.contacts?.administrative} />

                                      <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6 pt-10 border-t border-theme">
                                        <WhoisField label="Organization" value={scanResults.whois?.org || scanResults.whois?.name} />
                                        <WhoisField label="Network Owner" value={scanResults.whois?.network_owner} />
                                        <WhoisField label="CIDR Range" value={scanResults.whois?.cidr} />
                                        <WhoisField label="Registrar" value={scanResults.whois?.registrar} />
                                        <WhoisField label="Registered Date" value={scanResults.whois?.registered} />
                                        <WhoisField label="Top Level Domain" value={scanResults.whois?.tld} />
                                        <WhoisField label="Website" value={scanResults.whois?.website} />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {isScanning && (
                          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-10">
                            <div className="bg-card border border-theme p-10 rounded-none shadow-2xl flex flex-col items-center gap-6 max-w-sm w-full animate-in zoom-in-95 duration-300">
                              <div className="relative">
                                <div className="w-20 h-20 border-4 border-blue-500/10 border-t-blue-500 rounded-none animate-spin" />
                                <Search className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-500" size={32} />
                              </div>
                              <div className="text-center">
                                <div className="text-xl font-black text-foreground uppercase tracking-tight mb-2">Scanning Host</div>
                                <div className="text-sm font-bold text-slate-500">Querying global intelligence databases for {ipSearchTerm}...</div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : activeTab === "Reports" && selectedFile ? (
                      <DashboardReports
                        pcapId={selectedFile.pcap_id}
                        initialMode={reportInitialMode}
                        customFetchGeo={fetchPcapGeoReport}
                        customFetchDetails={fetchPcapDetails}
                        session={session}
                      />
                    ) : (
                      <div className="bg-slate-500/5 border border-theme border-dashed rounded-[3rem] flex items-center justify-center text-slate-500 h-[500px] font-black text-xs uppercase tracking-widest opacity-40">
                        Detailed {activeTab} widgets under construction
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

function DetailRow({ icon: Icon, label, value, subValue, color }) {
  const colorMap = {
    blue: "text-blue-500 bg-blue-500/5 border-blue-500/10",
    purple: "text-purple-500 bg-purple-500/5 border-purple-500/10",
    rose: "text-rose-500 bg-rose-500/5 border-rose-500/10",
    emerald: "text-emerald-500 bg-emerald-500/5 border-emerald-500/20",
    slate: "text-slate-500 bg-slate-500/5 border-slate-500/10",
    amber: "text-amber-500 bg-amber-500/5 border-amber-500/10",
  };

  return (
    <div className={`flex flex-col p-6 rounded-none border ${colorMap[color] || colorMap.slate} space-y-3`}>
      <div className="flex items-center gap-4">
        <Icon size={20} className="shrink-0" />
        <div className="text-bold font-black ">{label}</div>
      </div>
      <div className="min-w-0">
        <div className="text-[15px] font-black text-foreground break-all leading-tight">{value || "N/A"}</div>
        {subValue && <div className="text-[12px] font-bold opacity-60 mt-0.5">{subValue}</div>}
      </div>
    </div>
  );
}

function WhoisSection({ title, data }) {
  if (!data) return null;
  return (
    <div className="p-6 bg-slate-500/[0.03] border border-theme rounded-none space-y-6">
      <h4 className="font-black text-blue-500 
        border-b border-blue-500/10 pb-3">{title}</h4>
      <div className="space-y-4">
        <WhoisField label="Name" value={data.name} />
        <WhoisField label="Email" value={data.email} />
        <WhoisField label="Phone" value={data.phone} />
        <WhoisField label="Handle" value={data.handle} />
        <WhoisField label="Address" value={data.address} />
      </div>
    </div>
  );
}

function WhoisField({ label, value }) {
  return (
    <div>
      <div className="font-bold font-black  mb-1">{label}</div>
      <div className="text-[14px] font-bold  break-words leading-tight text-slate-600">{value || "N/A"}</div>
    </div>
  );
}

PcapClientView.propTypes = {
  setId: PropTypes.string,
  initialResponse: PropTypes.shape({
    data: PropTypes.array,
    repository_stats: PropTypes.object,
  }),
  session: PropTypes.object,
};

DetailRow.propTypes = {
  icon: PropTypes.elementType.isRequired,
  label: PropTypes.string,
  value: PropTypes.string,
  subValue: PropTypes.string,
  color: PropTypes.string,
};

WhoisSection.propTypes = {
  title: PropTypes.string,
  data: PropTypes.shape({
    name: PropTypes.string,
    email: PropTypes.string,
    phone: PropTypes.string,
    handle: PropTypes.string,
    address: PropTypes.string,
  }),
};

WhoisField.propTypes = {
  label: PropTypes.string,
  value: PropTypes.string,
};
