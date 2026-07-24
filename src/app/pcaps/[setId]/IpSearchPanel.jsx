"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PropTypes from "prop-types";
import {  Activity,  ArrowRight,  CheckCircle2, Clock,  Cpu,  Globe,  MapPin,  Search,  Server,  Shield,  Terminal, User, Zap,} from "lucide-react";
import { fetchIpScan } from "./apiService";

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
      <h4 className="font-black text-blue-500 border-b border-blue-500/10 pb-3">{title}</h4>
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
      <div className="font-bold font-black mb-1">{label}</div>
      <div className="text-[14px] font-bold break-words leading-tight text-slate-600">{value || "N/A"}</div>
    </div>
  );
}

export default function IpSearchPanel({ initialIp, onScanComplete }) {
  const [ipSearchTerm, setIpSearchTerm] = useState("");
  const [scanResults, setScanResults] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState("");
  const [history, setHistory] = useState([]);
  const ipSearchTermRef = useRef("");

  useEffect(() => {
    ipSearchTermRef.current = ipSearchTerm;
  }, [ipSearchTerm]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const saved = window.localStorage.getItem("ipSearchHistory");
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (error) {
        console.error("Unable to load IP search history", error);
      }
    }
  }, []);

  const saveToHistory = useCallback((searchIp) => {
    setHistory((prevHistory) => {
      const nextHistory = [searchIp, ...prevHistory.filter((entry) => entry !== searchIp)].slice(0, 5);
      if (typeof window !== "undefined") {
        window.localStorage.setItem("ipSearchHistory", JSON.stringify(nextHistory));
      }
      return nextHistory;
    });
  }, []);

  const handleScan = useCallback(async (targetIp) => {
    const ipToScan = targetIp || ipSearchTermRef.current;
    if (!ipToScan) return;

    const ipv4Regex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (!ipv4Regex.test(ipToScan)) {
      setScanError("Please enter a valid IPv4 address.");
      setScanResults(null);
      return;
    }

    saveToHistory(ipToScan);
    setIpSearchTerm(ipToScan);
    ipSearchTermRef.current = ipToScan;
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
    } catch (error) {
      console.error("Scan failed:", error);
      setScanError("Unable to connect to the intelligence server.");
    } finally {
      setIsScanning(false);
      onScanComplete?.();
    }
  }, [onScanComplete, saveToHistory]);

  useEffect(() => {
    if (!initialIp) return;

    setIpSearchTerm(initialIp);
    ipSearchTermRef.current = initialIp;
    void handleScan(initialIp);
  }, [handleScan, initialIp]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <div className="flex justify-center mb-6 pt-16">
        <div className="relative w-full max-w-xl group">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
          <input
            type="text"
            value={ipSearchTerm}
            onChange={(event) => {
              const nextValue = event.target.value;
              setIpSearchTerm(nextValue);
              if (!nextValue) {
                setScanResults(null);
                setScanError("");
              }
            }}
            onKeyDown={(event) => event.key === "Enter" && handleScan()}
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
        <span className="text-[13px] font-black mr-2">Recent:</span>
        {history.length > 0 ? (
          history.map((entry, index) => (
            <button
              key={`${entry}-${index}`}
              onClick={() => handleScan(entry)}
              className="px-3 py-1 hover:bg-blue-500/10 border hover:border-blue-500/30 text-[11px] font-bold hover:text-blue-500 rounded-none transition-all"
            >
              {entry}
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
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-4 flex flex-col gap-8">
                <div className="bg-card border border-theme p-8 rounded-none relative overflow-hidden">
                  <div className={`absolute top-6 right-6 px-3 py-1 rounded-none text-[10px] font-black uppercase tracking-widest ${scanResults.status === "up" ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-slate-500/10 text-slate-500 border border-slate-500/20"}`}>
                    {scanResults.status || "Unknown"}
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
                      <div className="font-bold mb-2">City / Region</div>
                      <div className="text-[14px] font-bold break-words leading-tight text-slate-600">{scanResults.geo?.city || "Unknown City"}</div>
                    </div>
                    <div>
                      <div className="font-bold font-black mb-2">Country</div>
                      <div className="text-[14px] font-bold break-words leading-tight text-slate-600">{scanResults.geo?.country || "Unknown Country"}</div>
                    </div>
                    <div>
                      <div className="font-bold font-black mb-2">Service Provider</div>
                      <div className="text-[14px] font-bold break-words leading-tight text-slate-600">{scanResults.geo?.isp || "Unknown ISP"}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-4">
                      <div>
                        <div className="font-bold font-black mb-1">Latitude</div>
                        <div className="text-[14px] font-bold break-words leading-tight text-slate-600">{scanResults.geo?.latitude || scanResults.location?.lat || "N/A"}</div>
                      </div>
                      <div>
                        <div className="font-bold font-black mb-1">Longitude</div>
                        <div className="text-[14px] font-bold break-words leading-tight text-slate-600">{scanResults.geo?.longitude || scanResults.location?.lon || "N/A"}</div>
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
                        <p className="font-sm font-black text-slate-600 mt-0.5">Active Network Services</p>
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
                          {(scanResults.ports || []).map((portEntry, index) => (
                            <tr key={`${portEntry.port}-${index}`} className="group hover:bg-slate-500/5 transition-colors">
                              <td className="px-8 py-5">
                                <div className="flex items-center gap-3">
                                  <span className="text-sm font-black text-foreground">{portEntry.port}</span>
                                  {portEntry.state === "open" && <CheckCircle2 size={12} className="text-emerald-500" />}
                                </div>
                              </td>
                              <td className="px-8 py-5">
                                <div className="text-[11px] font-black text-blue-500 uppercase bg-blue-500/5 px-2 py-1 rounded-lg border border-blue-500/10 inline-block">
                                  {portEntry.service || portEntry.application || "Unknown"}
                                </div>
                              </td>
                              <td className="px-8 py-5 text-[11px] font-black text-slate-500 uppercase tracking-widest">{portEntry.protocol}</td>
                              <td className="px-8 py-5">
                                <span className={`text-[10px] font-black uppercase tracking-tighter px-2 py-1 rounded-md border ${portEntry.state === "open" ? "text-emerald-500 bg-emerald-500/5 border-emerald-500/20" : "text-slate-400 bg-slate-500/5 border-slate-500/20"}`}>
                                  {portEntry.state}
                                </span>
                              </td>
                              <td className="px-8 py-5 text-right">
                                <span className="text-[10px] font-bold text-slate-400 uppercase italic">{portEntry.reason || "N/A"}</span>
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
                    <div className="text-lg font-black text-foreground">Ownership Details</div>
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
  );
}

IpSearchPanel.propTypes = {
  initialIp: PropTypes.string,
  onScanComplete: PropTypes.func,
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
