"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Globe, MapPin, Server, Activity, ArrowRight, Shield, 
  Search, ChevronRight, Loader2,
  Database, Terminal,
  CheckCircle2, User, Cpu, AlertTriangle, X, Zap
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { fetchReportsGeo, fetchReportsDetails, fetchIPScan } from "./dashboardApiService";
import { WorldMapLeaflet } from "./WorldMapLeaflet";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import PropTypes from "prop-types";

DashboardReports.propTypes = {
  initialMode: PropTypes.string,
  pcapId: PropTypes.string,
  customFetchGeo: PropTypes.func,
  customFetchDetails: PropTypes.func,
  session: PropTypes.object,
};

export function DashboardReports({ 
  initialMode = "country", 
  pcapId = null,
  customFetchGeo = null,
  customFetchDetails = null,
  session
}) {
  const [geoData, setGeoData] = useState({ countries: [], cities: [], isps: [] });
  const [selectedItem, setSelectedItem] = useState(null);
  const [detailsData, setDetailsData] = useState([]);
  const [selectedIp, setSelectedIp] = useState(null);
  const [ipIntelligence, setIpIntelligence] = useState(null);
  const detailsRef = useRef(null);
  
  const [isLoadingGeo, setIsLoadingGeo] = useState(true);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isLoadingIntel, setIsLoadingIntel] = useState(false);
  const [error, setError] = useState(null);
 
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [discoveryMode, setDiscoveryMode] = useState(initialMode); // 'country' or 'isp'
  const [searchQuery, setSearchQuery] = useState("");
  


  useEffect(() => {
    setDiscoveryMode(initialMode);
    setSelectedItem(null);
    setDetailsData([]);
    setSelectedIp(null);
    setIpIntelligence(null);
    setCurrentPage(1);
  }, [initialMode, pcapId]);

  const pageSize = 12;

  useEffect(() => {
    const loadGeoData = async () => {
      setIsLoadingGeo(true);
      try {
        const fetchFn = customFetchGeo || fetchReportsGeo;
        const data = await fetchFn(pcapId);
        if (data.success) {
          setGeoData({
            countries: data.data.countries || [],
            cities: data.data.cities || [],
            isps: data.data.isps || []
          });
        }
      } catch (err) {
        console.error("Failed to load geo data:", err);
        setError("Intelligence server connection failed.");
      } finally {
        setIsLoadingGeo(false);
      }
    };
    loadGeoData();
  }, [pcapId]);

    const handleItemSelect = async (item) => {
    setSelectedItem(item);
    setDetailsData([]);
    setSelectedIp(null);
    setIpIntelligence(null);
    setCurrentPage(1);
    setIsLoadingDetails(true);
    setError(null);

    // Smooth scroll to details anchor
    setTimeout(() => {
      detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
    }, 100);

    try {
      const fetchFn = customFetchDetails || fetchReportsDetails;
      const data = pcapId 
        ? await fetchFn(pcapId, discoveryMode, item.name)
        : await fetchFn(discoveryMode, item.name);
        
      // Support both { data: [...] } and direct array responses
      const results = data.data || (Array.isArray(data) ? data : []);
      setDetailsData(results);
      
      if (results.length > 0) {
        handleIpSelect(results[0].ip);
      }
    } catch (err) {
      console.error("Failed to load details:", err);
      setError("Intelligence lookup failed. Please re-synchronize.");
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleIpSelect = async (ip) => {
    setSelectedIp(ip);
    setIsLoadingIntel(true);
    setIpIntelligence(null);

    try {
      const data = await fetchIPScan(ip);
      if (data?.success) {
        setIpIntelligence(data.data);
      }
    } catch (err) {
      console.error("IP Intelligence fetch failed:", err);
    } finally {
      setIsLoadingIntel(false);
    }
  };

  const handleDownloadReport = async () => {
    if (!selectedItem || detailsData.length === 0) return;
    startPdfGeneration();
  };

  const startPdfGeneration = async () => {
    setIsGeneratingPdf(true);
    const userPassword = session?.user?.pdfPassword || "";
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      encryption: {
        userPassword: userPassword,
        ownerPassword: userPassword,
        userPermissions: ["print", "modify", "copy", "annot-forms"]
      }
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const blue = [37, 99, 235]; // #2563eb
    const slate = [100, 116, 139];

    // --- COVER PAGE ---
    doc.setFillColor(30, 41, 59); // Dark background
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
    
    // Accent Line
    doc.setDrawColor(blue[0], blue[1], blue[2]);
    doc.setLineWidth(1.5);
    doc.line(20, 40, 20, 120);

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("REPORT", 30, 45);
    
    doc.setFontSize(48);
    doc.text(selectedItem.name.toUpperCase(), 30, 75, { maxWidth: 160 });
    
    doc.setFontSize(12);
    doc.setTextColor(slate[0], slate[1], slate[2]);
    doc.text(`GENERATED ON: ${new Date().toLocaleString()}`, 30, 145);
    doc.text(`TOTAL IDENTIFIERS: ${detailsData.length}`, 30, 155);
    doc.setFontSize(10);
    doc.setTextColor(blue[0], blue[1], blue[2]);
    doc.text("CDAC-Hyderabd", 30, pageHeight - 30);

    // --- DEEP TELEMETRY (Optimized with Batch Fetching) ---
    const ipsToDetail = detailsData.slice(0, 500); 
    const intelCache = new Map();
    const batchSize = 5; // Concurrency limit to avoid overwhelming the server
    
    // Step 1: Pre-fetch all intelligence data in parallel batches
    setIsGeneratingPdf(true); // Ensure loading state is active
    for (let i = 0; i < ipsToDetail.length; i += batchSize) {
      const batch = ipsToDetail.slice(i, i + batchSize);
      await Promise.all(batch.map(async (item) => {
        try {
          const res = await fetchIPScan(item.ip);
          if (res?.success) {
            intelCache.set(item.ip, res.data);
          }
        } catch (e) {
          console.error(`Failed to pre-fetch intel for ${item.ip}:`, e);
        }
      }));
    }

    let currentY = 0;
    
    for (const [index, item] of ipsToDetail.entries()) {
      const sNo = `[#${(index + 1).toString().padStart(3, '0')}]`;
      
      // Intelligent Page Breaking
      if (currentY === 0 || currentY > pageHeight - 110) {
        doc.addPage();
        currentY = 0;
      } else {
        currentY += 12;
        doc.setDrawColor(241, 245, 249);
        doc.setLineWidth(0.5);
        doc.line(20, currentY, pageWidth - 20, currentY);
        currentY += 8;
      }
      
      // Relative Header Bar
      doc.setFillColor(30, 41, 59);
      doc.rect(0, currentY, pageWidth, 35, 'F');
      
      doc.setDrawColor(blue[0], blue[1], blue[2]);
      doc.setLineWidth(1);
      doc.line(20, currentY + 10, 20, currentY + 25);
      
      doc.setTextColor(150, 150, 150);
      doc.setFontSize(8);
      doc.text("IP INTELLIGENCE FOR", 25, currentY + 13);
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.text(`${sNo}  ${item.ip}`, 25, currentY + 28);
      
      currentY += 45;

      const intel = intelCache.get(item.ip);
      if (intel) {
        try {
          // Section 1: Host Identity
          doc.setTextColor(blue[0], blue[1], blue[2]);
          doc.setFontSize(10);
          doc.setFont("helvetica", "bold");
          doc.text("HOST IDENTITY & NETWORK ORIGIN", 20, currentY + 5);
          
          autoTable(doc, {
            startY: currentY + 10,
            head: [['PARAMETER', 'VALUE']],
            body: [
              ['AUTONOMOUS SYSTEM NUMBER', intel.asn || 'N/A'],
              ['OS MATCH', intel.os_info?.best_match || 'N/A'],
              ['OS CONFIDENCE', intel.os_info?.confidence ? `${intel.os_info.confidence}%` : 'N/A'],
              ['SYSTEM STATUS', intel.status?.toUpperCase() || 'N/A'],
              ['DNSBL REPUTATION', intel.dnsbl?.listed ? "LISTED / AT RISK" : "CLEAN"],
              ['rDNS / HOSTNAME', intel.rdns || 'N/A'],
              ['PROXY TYPE', intel.proxy_type || 'N/A'],

            ],
            theme: 'grid',
            headStyles: { fillColor: [100, 116, 139], fontSize: 8 },
            bodyStyles: { fontSize: 8 },
            columnStyles: { 0: { cellWidth: 50, fontStyle: 'bold', fillColor: [245, 247, 250] } }
          });

          // Section 2: Ports & Services (With Reason)
          doc.text("ACTIVE NETWORK SERVICES", 20, doc.lastAutoTable.finalY + 12);
          autoTable(doc, {
            startY: doc.lastAutoTable.finalY + 16,
            head: [['PORT', 'SERVICE / APPLICATION', 'PROTOCOL', 'STATE', 'REASON']],
            body: (intel.ports || []).map(p => [
              p.port, 
              p.service || p.application || 'Unknown', 
              p.protocol?.toUpperCase(), 
              p.state?.toUpperCase(), 
              p.reason || 'N/A'
            ]),
            headStyles: { fillColor: blue, fontSize: 8 },
            bodyStyles: { fontSize: 8 }
          });

          // Section 3: Geographic & Diagnostics
          doc.text("GEOGRAPHIC INTEL", 20, doc.lastAutoTable.finalY + 12);
          autoTable(doc, {
            startY: doc.lastAutoTable.finalY + 16,
            head: [['METADATA', 'VALUE']],
            body: [
              ['CITY / REGION', intel.geo?.city || 'N/A'],
              ['COUNTRY', intel.geo?.country || 'N/A'],
              ['ISP', intel.geo?.isp || 'N/A'],
              ['COORDINATES', `${intel.geo?.latitude || 'N/A'}, ${intel.geo?.longitude || 'N/A'}`],          
            ],
            theme: 'grid',
            headStyles: { fillColor: [100, 116, 139], fontSize: 8 },
            bodyStyles: { fontSize: 8 },
            columnStyles: { 0: { cellWidth: 50, fontStyle: 'bold', fillColor: [245, 247, 250] } }
          });
          
          // Section 4: WHOIS & Ownership Hierarchy
          doc.text("OWNERSHIP DETAILS", 20, doc.lastAutoTable.finalY + 12);
          
          // Contacts Summary Table
          autoTable(doc, {
            startY: doc.lastAutoTable.finalY + 16,
            head: [['CONTACT TYPE', 'NAME', 'EMAIL', 'PHONE']],
            body: [
              ['REGISTRANT', intel.whois?.contacts?.registrant?.name || 'N/A', intel.whois?.contacts?.registrant?.email || 'N/A', intel.whois?.contacts?.registrant?.phone || 'N/A'],
              ['TECHNICAL', intel.whois?.contacts?.technical?.name || 'N/A', intel.whois?.contacts?.technical?.email || 'N/A', intel.whois?.contacts?.technical?.phone || 'N/A'],
              ['ABUSE', intel.whois?.contacts?.abuse?.name || 'N/A', intel.whois?.contacts?.abuse?.email || 'N/A', intel.whois?.contacts?.abuse?.phone || 'N/A']
            ],
            headStyles: { fillColor: [100, 116, 139], fontSize: 8 },
            bodyStyles: { fontSize: 7 }
          });

          // Extended Ownership Table
          autoTable(doc, {
            startY: doc.lastAutoTable.finalY + 8,
            body: [
              ['ORGANIZATION', intel.whois?.org || intel.whois?.name || 'N/A'],
              ['NETWORK OWNER', intel.whois?.network_owner || 'N/A'],
              ['CIDR RANGE', intel.whois?.cidr || 'N/A'],
              ['REGISTRAR', intel.whois?.registrar || 'N/A'],
              ['TOP LEVEL DOMAIN / WEBSITE', `${intel.whois?.tld || 'N/A'} / ${intel.whois?.website || 'N/A'}`],
              ['REGISTERED DATE', intel.whois?.registered || 'N/A']
            ],
            theme: 'grid',
            bodyStyles: { fontSize: 8 },
            columnStyles: { 0: { cellWidth: 50, fontStyle: 'bold', fillColor: [245, 247, 250] } }
          });
          currentY = doc.lastAutoTable.finalY;
        } catch (e) {
          console.error('Deep telemetry acquisition failed:', e);
          doc.setTextColor(200, 0, 0);
          doc.text("CRITICAL: Deep telemetry acquisition failed for this node.", 20, currentY + 10);
          currentY += 20;
        }
      }
    }

    doc.save(`SINKHOLE_INTEL_${selectedItem.name.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
    setIsGeneratingPdf(false);
    setShowPasswordModal(true);
  };

  if (isLoadingGeo) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        <p className="text-slate-500 font-black text-[11px] uppercase animate-pulse">Aggregating Global Intelligence...</p>
      </div>
    );
  }

  const sortedCountries = [...geoData.countries].sort((a, b) => a.name.localeCompare(b.name));
  const totalPages = Math.ceil(detailsData.length / pageSize);
  const paginatedIps = detailsData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-700">
      
      {/* Discovery Vector Status Header (Redundancy Removed) */}
      <div className="flex items-center justify-between gap-4 px-10 pt-6">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3 px-6 py-3 bg-blue-500/10 border border-blue-500/20 rounded-none shadow-[0_0_20px_rgba(59,130,246,0.1)] backdrop-blur-sm"
        >
          <div className="relative">
            <Globe size={16} className="text-blue-500 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
          </div>
          <span className="text-[19px] font-black text-foreground/90 drop-shadow-sm">
            {discoveryMode === "country" ? "Countries" : "ISP's"}
          </span>
        </motion.div>

        <div className="flex-1 max-w-2xl relative group ml-auto">
          <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none z-10">
            <Search size={18} className="text-violet-500 transition-all duration-500" />
          </div>
          <input
            type="text"
            placeholder={`Search ${discoveryMode === 'country' ? 'Country' : 'ISP'}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-violet-500/[0.05] border border-violet-500/20 px-14 py-4 text-[12px] font-medium focus:outline-none focus:border-violet-500 transition-all duration-500 placeholder:text-violet-400 placeholder:font-bold rounded-none shadow-sm"
          />
        </div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-10 bg-card/50 backdrop-blur-md border border-slate-500/20 rounded-none shadow-2xl shadow-slate-500/5 overflow-hidden"
      >
        <div className="p-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 max-h-[300px] overflow-y-auto pr-6 custom-scrollbar">
            {(discoveryMode === "country" ? sortedCountries : [...geoData.isps].sort((a, b) => a.name.localeCompare(b.name)))
              .filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()))
              .map((item, idx) => {
              const colors = {
                'bg-blue-500': 'hover:border-blue-500 hover:bg-blue-500/[0.03]',
                'bg-rose-500': 'hover:border-rose-500 hover:bg-rose-500/[0.03]',
                'bg-emerald-500': 'hover:border-emerald-500 hover:bg-emerald-500/[0.03]',
                'bg-amber-500': 'hover:border-amber-500 hover:bg-amber-500/[0.03]',
                'bg-indigo-500': 'hover:border-indigo-500 hover:bg-indigo-500/[0.03]',
                'bg-violet-500': 'hover:border-violet-500 hover:bg-violet-500/[0.03]',
                'bg-cyan-500': 'hover:border-cyan-500 hover:bg-cyan-500/[0.03]'
              };
              const colorKeys = Object.keys(colors);
              const colorClass = colorKeys[idx % colorKeys.length];
              const hoverStyles = colors[colorClass];
              
              return (
                <motion.button
                  key={idx}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleItemSelect(item)}
                  className={`transition-all duration-300 text-left px-5 py-4 rounded-none border-2 group relative overflow-hidden ${
                    selectedItem?.name === item.name
                      ? "bg-blue-600 border-blue-600 text-white shadow-2xl shadow-blue-600/40 z-10 scale-[1.03]"
                      : "bg-card border-slate-200/50 text-slate-500 hover:bg-blue-50/50 hover:text-blue-600"
                  }`}
                >
                  {/* FOOLPROOF HOVER BORDER */}
                  <div className="absolute inset-0 border-2 border-transparent group-hover:border-blue-600 transition-colors pointer-events-none z-20" />
                  
                  <div className="flex items-center gap-4 relative z-10">
                    <div className={`w-2 h-2 rounded-none ${selectedItem?.name === item.name ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]' : `${colorClass} group-hover:scale-125 transition-all`} shrink-0 shadow-sm`} />
                    <div className="text-[15px]  truncate group-hover:translate-x-0.5 transition-transform duration-300">
                      {item.name}
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* Selected Country Context Bar */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div 
            ref={detailsRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center justify-between px-10 py-8 bg-card border border-theme shadow-sm scroll-mt-20"
          >
            <div className="flex items-center gap-6">
              <h3 className="text-3xl font-bold text-foreground  ">{selectedItem.name}</h3>
            </div>
            
              <div className="flex items-center gap-3">
                {/* MAP VIEW */}
                <button
                  onClick={() => setIsMapOpen(true)}
                  className="group relative flex items-center gap-3 pl-4 pr-7 py-0 h-12 bg-slate-500/10 hover:bg-gradient-to-r hover:from-blue-600/20 hover:to-slate-500/10 active:scale-[0.98] transition-all duration-200 shadow-sm border border-theme hover:border-blue-500/30 overflow-hidden cursor-pointer"
                >
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
                  <div className="flex items-center justify-center w-8 h-8 bg-blue-600/10 group-hover:bg-blue-600/20 rounded-none shrink-0 transition-colors">
                    <Globe size={16} className="text-blue-500 transition-colors" />
                  </div>
                  <span className="text-[19px] font-black text-blue-500  whitespace-nowrap">
                    Map View
                  </span>
                </button>

                {/* DOWNLOAD REPORT */}
                <button
                  onClick={handleDownloadReport}
                  disabled={isGeneratingPdf}
                  className="group relative flex items-center gap-3 pl-4 pr-7 py-0 h-12 bg-slate-500/10 hover:bg-gradient-to-r hover:from-emerald-600/20 hover:to-slate-500/10 active:scale-[0.98] transition-all duration-200 shadow-sm border border-theme hover:border-emerald-500/30 overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="flex items-center justify-center w-8 h-8 bg-emerald-500/10 group-hover:bg-emerald-500/20 rounded-none shrink-0 transition-colors">
                    <Database size={16} className={`text-emerald-500 transition-colors ${isGeneratingPdf ? 'animate-spin' : ''}`} />
                  </div>
                  <span className="text-[19px] font-black text-slate-400 group-hover:text-emerald-500  whitespace-nowrap transition-colors">
                    {isGeneratingPdf ? 'Generating...' : 'Download Report'}
                  </span>
                  {isGeneratingPdf && (
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-1" />
                  )}
                </button>
              </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Geospatial Modal Overlay */}
      <AnimatePresence>
        {isMapOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-12 bg-slate-900/40 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full h-full bg-card border border-theme shadow-2xl rounded-none overflow-hidden relative flex flex-col"
            >
              <div className="px-10 py-6 border-b border-theme bg-card flex items-center justify-between z-10">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-blue-600/10 rounded-none">
                    <Globe size={24} className="text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-foreground uppercase tracking-tight">{selectedItem?.name}</h2>
                    <p className="text-[10px] text-slate-400 font-black tracking-widest mt-0.5">IP Geo Distribution</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsMapOpen(false)}
                  className="p-3 hover:bg-rose-500/10 hover:text-rose-500 rounded-full transition-colors text-slate-400"
                >
                  <X size={24} />
                </button>
              </div>
              
              <div className="flex-1 relative">
                <WorldMapLeaflet 
                  externalIps={detailsData} 
                  mode="reports"
                  onIpClick={(ip) => {
                    handleIpSelect(ip);
                    setIsMapOpen(false);
                  }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {selectedItem && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8"
          >
            {/* IP List Column */}
            <div className="lg:col-span-3 space-y-6">
              <div className="bg-card shadow-sm overflow-hidden flex flex-col h-full min-h-[1000px]">
                <div className="px-8 py-4 bg-slate-500/[0.02] flex items-center justify-between">
                  <span className="text-[17px]   ">Discovered IPs</span>
                  <div className="flex flex-col items-end gap-1">
                    <div className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-none text-[14px]  text-blue-600 ">
                      {isLoadingDetails ? '...' : detailsData.length} Records Total
                    </div>
                
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                  {isLoadingDetails ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                      <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                      <p className="text-slate-400 font-black text-[9px]  animate-pulse">IP Searching....</p>
                    </div>
                  ) : error ? (
                    <div className="flex flex-col items-center justify-center py-20 px-8 text-center gap-4">
                      <AlertTriangle className="w-8 h-8 text-rose-500" />
                      <p className="text-rose-500 font-black text-[10px] uppercase tracking-widest">{error}</p>
                    </div>
                  ) : detailsData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 px-8 text-center gap-4">
                      <div className="p-4 bg-slate-500/5 rounded-none">
                        <Terminal className="w-8 h-8 text-slate-300" />
                      </div>
                      <div>
                        <p className="text-slate-500 font-black text-[10px] ">No Records Discovered</p>
                        <p className="text-[9px]  mt-1">Select a different region to begin discovery</p>
                      </div>
                    </div>
                  ) : (
                    <div className="">
                      {paginatedIps.map((item, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleIpSelect(item.ip)}
                          className={`w-full px-8 py-6 text-left transition-all flex items-center justify-between group cursor-pointer ${
                            selectedIp === item.ip 
                              ? "bg-blue-600/10" 
                              : "bg-card hover:bg-slate-500/[0.03]"
                          }`}
                        >
                          <div>
                            <div className="text-[15px] font-black ">{item.ip}</div>
                            <div className="text-[13px] font-bold mt-1 text-slate-500">
                              {item.isp || "Unknown Provider"}
                            </div>
                          </div>
                          <ChevronRight size={18} className={`transition-transform ${
                            selectedIp === item.ip ? "translate-x-1 opacity-100" : "opacity-0 group-hover:opacity-100"
                          }`} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Pagination Control */}
                {totalPages > 1 && (
                  <div className="p-4 bg-slate-500/5 border-t border-theme flex flex-col gap-4">
                    <div className="flex items-center justify-between px-2">
                      <span className="text-[12px]">
                        Page {currentPage} of {totalPages}
                      </span>
                     
                    </div>
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                        className="w-8 h-8 flex items-center justify-center text-[10px] font-black text-slate-400 hover:text-blue-600 disabled:opacity-20 transition-all border border-theme bg-card"
                      >
                        «
                      </button>
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="w-8 h-8 flex items-center justify-center text-[10px] font-black text-slate-400 hover:text-blue-600 disabled:opacity-20 transition-all border border-theme bg-card"
                      >
                        ‹
                      </button>

                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else {
                          if (currentPage <= 3) pageNum = i + 1;
                          else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                          else pageNum = currentPage - 2 + i;
                        }

                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`w-8 h-8 flex items-center justify-center text-[10px] font-black transition-all border ${
                              currentPage === pageNum
                                ? "bg-blue-50 text-blue-600 border-blue-600 shadow-md shadow-blue-500/10"
                                : "text-slate-500 border-theme hover:border-blue-500/30 hover:bg-slate-500/10 bg-card"
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}

                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="w-8 h-8 flex items-center justify-center text-[10px] font-black text-slate-400 hover:text-blue-600 disabled:opacity-20 transition-all border border-theme bg-card"
                      >
                        ›
                      </button>
                      <button
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage === totalPages}
                        className="w-8 h-8 flex items-center justify-center text-[10px] font-black text-slate-400 hover:text-blue-600 disabled:opacity-20 transition-all border border-theme bg-card"
                      >
                        »
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Intelligence Profile Column (Matching IPSearch layout) */}
            <div className="lg:col-span-9">
              <div className="flex flex-col h-full">
                {isLoadingIntel ? (
                  <div className="bg-card/30 backdrop-blur-sm border border-theme shadow-sm flex-1 flex flex-col items-center justify-center py-40 gap-6 rounded-none">
                    <div className="relative">
                      <Activity className="w-16 h-16 text-blue-600 animate-pulse" />
                      <div className="absolute inset-0 bg-blue-500/20 blur-2xl rounded-full animate-pulse" />
                    </div>
                    <span className="text-[11px] font-black text-blue-500 uppercase tracking-[0.4em] animate-pulse">Scanning Intelligence...</span>
                  </div>
                ) : ipIntelligence ? (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in slide-in-from-bottom-4 duration-500">
                    
                    {/* Left Column (col-span-4) */}
                    <div className="lg:col-span-4 flex flex-col gap-8">
                      {/* Identity Header */}
                      <div className="bg-card border border-theme p-8 rounded-none relative overflow-hidden">
                        <div className={`absolute top-6 right-6 px-3 py-1 rounded-none text-[10px] font-black uppercase tracking-widest ${ipIntelligence.status === 'up' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-slate-500/10 text-slate-500 border border-slate-500/20'}`}>
                          {ipIntelligence.status || 'Unknown'}
                        </div>
                        <div className="flex items-center gap-5 mb-8">
                          <div className="w-16 h-16 bg-blue-500/10 rounded-none flex items-center justify-center shrink-0">
                            <Server size={28} className="text-blue-500" />
                          </div>
                          <div className="min-w-0">
                            <div className=" font-black mb-1">Host Identity</div>
                            <div className="text-2xl font-black text-foreground truncate">{ipIntelligence.ip}</div>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <DetailRow icon={Globe} label="Autonomous System Number" value={ipIntelligence.asn} color="blue" />
                          <DetailRow icon={Cpu} label="OS Match" value={ipIntelligence.os_info?.best_match} subValue={`Confidence: ${ipIntelligence.os_info?.confidence}%`} color="purple" />
                          <DetailRow icon={Shield} label="DNSBL Status" value={ipIntelligence.dnsbl?.listed ? "Listed / At Risk" : "Clean"} color={ipIntelligence.dnsbl?.listed ? "rose" : "emerald"} />
                          <DetailRow icon={Terminal} label="rDNS / Hostname" value={ipIntelligence.rdns || (ipIntelligence.hostnames?.length ? ipIntelligence.hostnames.join(", ") : null)} color="slate" />
                          <DetailRow icon={Zap} label="Proxy Type" value={ipIntelligence.proxy_type} color="amber" />

                        </div>
                      </div>

                    
                     

                      {/* Geographic Intel */}
                      <div className="bg-card border border-theme p-8 rounded-none">
                        <div className="flex items-center gap-4 mb-6">
                          <div className="p-2 bg-orange-500/10 rounded-none">
                            <MapPin size={20} className="text-orange-500" />
                          </div>
                          <div className="font-bold font-black text-foreground ">Geographic Intel</div>
                        </div>
                        <div className="space-y-6">
                          <div>
                            <div className="text-bold font-black   mb-2">City / Region</div>
                            <div className="text-[14px] font-bold  break-words leading-tight text-slate-600">{ipIntelligence.geo?.city || 'Unknown City'}</div>
                          </div>
                          <div>
                            <div className="fomt-bold font-black  mb-2">Country</div>
                            <div className="text-[14px] font-bold  break-words leading-tight text-slate-600">{ipIntelligence.geo?.country || 'Unknown Country'}</div>
                          </div>
                          <div>
                            <div className="font-bold font-black  mb-2">Service Provider</div>
                            <div className="text-[14px] font-bold  break-words leading-tight text-slate-600">{ipIntelligence.geo?.isp || 'Unknown ISP'}</div>
                          </div>
                          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-theme">
                             <div>
                                <div className="font-bold font-black   mb-1">Latitude</div>
                                <div className="text-[14px] font-bold  break-words leading-tight text-slate-600">{ipIntelligence.geo?.latitude || 'N/A'}</div>
                             </div>
                             <div>
                                <div className="font-bold font-black   mb-1">Longitude</div>
                                <div className="text-[14px] font-bold  break-words leading-tight text-slate-600">{ipIntelligence.geo?.longitude || 'N/A'}</div>
                             </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Column (col-span-8) */}
                    <div className="lg:col-span-8 flex flex-col gap-8">
                      {/* Services Table */}
                      <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between px-4">
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-slate-500/[0.05] border border-theme rounded-none shadow-sm">
                              <Activity size={24} className="text-rose-500" />
                            </div>
                            <div>
                              <h3 className="text-lg font-black text-foreground ">Ports & Service Detection</h3>
                              <p className="font-smfont-black text-slate-600   mt-0.5">Active Network Services</p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <div className="px-4 py-1.5 bg-blue-500/10 rounded-none text-[11px] font-black text-blue-500 border border-blue-500/20">
                              {ipIntelligence.ports?.length || 0} Ports Found
                            </div>
                            
                          </div>
                        </div>

                        <div className="bg-card rounded-none overflow-hidden flex flex-col shadow-sm">
                          <div className="overflow-x-auto">
                            <table className="w-full text-left">
                              <thead className="bg-slate-500/5">
                                <tr>
                                  <th className="px-8 py-5 text-md font-black text-slate-600 ">Port</th>
                                  <th className="px-8 py-5 text-md font-black text-slate-600 ">Service</th>
                                  <th className="px-8 py-5 text-md font-black text-slate-600 ">Protocol</th>
                                  <th className="px-8 py-5 text-md font-black text-slate-600 ">State</th>
                                  <th className="px-8 py-5 text-md   font-black text-slate-600  text-right">Reason</th>
                                </tr>
                              </thead>
                              <tbody className="">
                                {ipIntelligence.ports?.map((p, i) => (
                                  <tr key={i} className="group hover:bg-slate-500/5 transition-colors">
                                    <td className="px-8 py-5">
                                      <div className="flex items-center gap-3">
                                        <span className="text-sm font-black text-foreground">{p.port}</span>
                                        {p.state === 'open' && <CheckCircle2 size={12} className="text-emerald-500" />}
                                      </div>
                                    </td>
                                    <td className="px-8 py-5">
                                      <div className="text-[11px] font-black text-blue-500 uppercase bg-blue-500/5 px-2 py-1 rounded-none border border-blue-500/10 inline-block">
                                        {p.service || p.application || 'Unknown'}
                                      </div>
                                    </td>
                                    <td className="px-8 py-5 text-[11px] font-black text-slate-500 uppercase tracking-widest">{p.protocol}</td>
                                    <td className="px-8 py-5">
                                      <span className={`text-[10px] font-black uppercase tracking-tighter px-2 py-1 rounded-none border ${p.state === 'open' ? 'text-emerald-500 bg-emerald-500/5 border-emerald-500/20' : 'text-slate-400 bg-slate-500/5 border-slate-500/20'}`}>
                                        {p.state}
                                      </span>
                                    </td>
                                    <td className="px-8 py-5 text-left">
                                      <span className="text-[10px] font-bold text-slate-600 ">{p.reason || 'N/A'}</span>
                                    </td>
                                  </tr>
                                ))}
                                {(!ipIntelligence.ports || ipIntelligence.ports.length === 0) && (
                                  <tr>
                                    <td colSpan="5" className="px-8 py-20 text-center text-xs ">No Open Ports Discovered</td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>

                      {/* WHOIS Section */}
                      <div className="bg-card border border-theme p-8 rounded-none">
                        <div className="flex items-center gap-4 mb-8">
                          <div className="p-2 bg-emerald-500/10 rounded-none">
                            <User size={20} className="text-emerald-500" />
                          </div>
                          <div className="text-lg font-black text-foreground">Ownership Details</div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                          <WhoisSection title="Registrant Information" data={ipIntelligence.whois?.contacts?.registrant} />
                          <WhoisSection title="Technical Contact" data={ipIntelligence.whois?.contacts?.technical} />
                          <WhoisSection title="Abuse Contact" data={ipIntelligence.whois?.contacts?.abuse} />
                          <WhoisSection title="Administrative Contact" data={ipIntelligence.whois?.contacts?.administrative} />
                          
                          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6 pt-10 border-t border-theme">
                            <WhoisField label="Organization" value={ipIntelligence.whois?.org || ipIntelligence.whois?.name} />
                            <WhoisField label="Network Owner" value={ipIntelligence.whois?.network_owner} />
                            <WhoisField label="CIDR Range" value={ipIntelligence.whois?.cidr} />
                            <WhoisField label="Registrar" value={ipIntelligence.whois?.registrar} />
                            <WhoisField label="Registered Date" value={ipIntelligence.whois?.registered} />
                            <WhoisField label="Top Level Domain" value={ipIntelligence.whois?.tld} />
                            <WhoisField label="Website" value={ipIntelligence.whois?.website} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                    <div className="bg-card border border-theme shadow-sm flex-1 flex flex-col items-center justify-center py-60 gap-4 text-center">
                      <div className="w-16 h-16 bg-slate-500/5 rounded-full flex items-center justify-center border border-theme animate-pulse">
                        <ArrowRight className="text-slate-300" size={32} />
                      </div>
                      <div className="max-w-xs">
                        <h4 className="text-[12px] font-black text-foreground uppercase tracking-[0.3em] opacity-80">IP SEARCHING</h4>
                      </div>
                    </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPasswordModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[9999] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="bg-card border-2 border-theme p-8 max-w-md w-full relative shadow-2xl flex flex-col items-center text-center rounded-none"
            >
              <div className="w-16 h-16 bg-blue-500/10 border border-blue-500/20 text-blue-500 flex items-center justify-center mb-6 rounded-none">
                <Shield size={32} className="animate-pulse" />
              </div>
              
              <h3 className="text-xl font-black text-foreground uppercase tracking-tight mb-4">
                PDF Securely Encrypted
              </h3>
              
              <div className="space-y-4 text-left w-full mb-8">
                <p className="text-[14px] text-slate-500 font-medium leading-relaxed text-center">
                  To open the downloaded report, please use your dynamic PDF password.
                </p>
                <div className="bg-slate-500/5 border border-theme p-4 text-[12px] font-black text-foreground/90 uppercase tracking-wider space-y-2 text-center rounded-none">
                  <div className="text-blue-500">Password Formula:</div>
                  <div className="text-[13px] lowercase font-mono bg-card px-3 py-2 border border-theme inline-block select-all whitespace-nowrap">
                    username(first 5) + password(first 5)
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 italic text-center font-medium leading-normal">
                  Example: If username is <strong>admin1</strong> and password is <strong>password</strong>, the PDF password is <strong className="font-mono not-italic text-blue-500">adminpassw</strong>.
                </p>
              </div>

              <button
                onClick={() => setShowPasswordModal(false)}
                className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-black text-[12px] uppercase tracking-widest transition-all shadow-lg hover:shadow-blue-500/20 active:scale-95 rounded-none"
              >
                I Understand
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

DetailRow.propTypes = {
  icon: PropTypes.elementType.isRequired,
  label: PropTypes.string,
  value: PropTypes.string,
  subValue: PropTypes.string,
  color: PropTypes.string,
};

function DetailRow({ icon: Icon, label, value, subValue, color }) {
  const colorMap = {
    blue: "text-blue-500 bg-blue-500/5 border-blue-500/10",
    purple: "text-purple-500 bg-purple-500/5 border-purple-500/10",
    rose: "text-rose-500 bg-rose-500/5 border-rose-500/10",
    emerald: "text-emerald-500 bg-emerald-500/5 border-emerald-500/10",
    slate: "text-slate-500 bg-slate-500/5 border-slate-500/10",
    amber: "text-amber-500 bg-amber-500/5 border-amber-500/10",
  };

  return (
    <div className={`flex flex-col p-6 rounded-none border ${colorMap[color] || colorMap.slate} space-y-3`}>
      <div className="flex items-center gap-4">
        <Icon size={20} className="shrink-0" />
      <div className="font-bold font-black ">{label}</div>
      </div>
      <div className="min-w-0">
        <div className="text-[15px] font-black text-foreground break-all leading-tight">{value || "N/A"}</div>
        {subValue && <div className="text-[12px] font-bold opacity-60 mt-0.5">{subValue}</div>}
      </div>
    </div>
  );
}

WhoisSection.propTypes = {
  title: PropTypes.string,
  data: PropTypes.object,
};

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

WhoisField.propTypes = {
  label: PropTypes.string,
  value: PropTypes.string,
};

function WhoisField({ label, value }) {
  return (
    <div className="min-w-0">
      <div className="text-bold font-black  mb-1.5">{label}</div>
      <div className="text-[14px] text-slate-600  font-bold font-black text-foreground break-all leading-snug">{value || "N/A"}</div>
    </div>
  );
}
