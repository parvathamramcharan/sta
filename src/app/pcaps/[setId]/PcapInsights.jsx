import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { motion } from "framer-motion";

const ITEMS_PER_PAGE = 5;

const PaginatedTable = ({
  data,
  headers,
  renderRow,
  title,
  scrollable = false,
  searchable = false,
  searchPlaceholder = "Search...",
  searchPredicate,
  headerExtra,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredData =
    searchable && searchQuery.trim()
      ? data.filter((item) => searchPredicate(item, searchQuery.trim().toLowerCase()))
      : data;

  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE) || 1;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedData = scrollable
    ? filteredData
    : filteredData.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const pages = Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
    if (totalPages <= 5) return i + 1;
    if (currentPage <= 3) return i + 1;
    if (currentPage >= totalPages - 2) return totalPages - 4 + i;
    return currentPage - 2 + i;
  });

  return (
    <div className="flex flex-col h-full group bg-card border border-slate-200/60 dark:border-slate-700/60 shadow-sm rounded-lg hover:shadow-2xl hover:shadow-blue-500/5 transition-all duration-500">
      <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-theme bg-blue-500/10 rounded-t-lg flex-wrap">
        <h3 className="font-semibold text-foreground">{title}</h3>

        <div className="flex items-center gap-3 flex-wrap">
          {headerExtra}
          {searchable && (
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-56 pl-3 pr-3 py-1.5 text-sm rounded-full border border-blue-500/20 bg-white/80 dark:bg-slate-900/40 text-foreground placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/40 transition-all"
              />
            </div>
          )}

          <span className="inline-flex items-center gap-1.5 pl-2.5 pr-3 py-1 rounded-full bg-white/70 dark:bg-slate-900/40 border border-blue-500/20 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">
              {filteredData.length}
            </span>
            <span className="text-[14px] font-semibold font-medium text-blue-600/70 dark:text-blue-300/60">
              Total
            </span>
          </span>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div
          className={
            scrollable
              ? "overflow-x-auto max-h-[300px] overflow-y-auto custom-scrollbar"
              : "overflow-visible"
          }
        >
          <table className="w-full text-left">
            <thead className={`bg-slate-500/[0.04] ${scrollable ? "sticky top-0 z-10 bg-card" : ""}`}>
              <tr>
                {headers.map((h, i) => (
                  <th key={i} className={`px-8 py-5 font-semibold ${h.className || ""}`}>
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="">
              {paginatedData.length > 0 ? (
                paginatedData.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-500/5 transition-colors group/row">
                    {renderRow(item, idx, startIndex + idx)}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={headers.length} className="px-8 py-20 text-center">
                    {searchable && searchQuery.trim() ? "No matching results" : "No Data Available"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {!scrollable && filteredData.length > 0 && (
          <div className="mt-auto px-4 py-3 border-t border-theme bg-slate-500/[0.01] flex items-center justify-between gap-3 flex-wrap">
            <span className="text-xs font-medium text-slate-500">
              Page <span className="text-foreground font-semibold">{currentPage}</span> of{" "}
              <span className="text-foreground font-semibold">{totalPages}</span>
            </span>

            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="w-9 h-9 flex items-center justify-center hover:text-blue-600 disabled:opacity-20 transition-all border border-theme bg-card"
                >
                  «
                </button>
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="w-9 h-9 flex items-center justify-center hover:text-blue-600 disabled:opacity-20 transition-all border border-theme bg-card"
                >
                  ‹
                </button>

                {pages.map((p) => (
                  <motion.button
                    key={p}
                    whileHover={{ scale: 1.1, y: -2 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setCurrentPage(p)}
                    className={`w-9 h-9 flex items-center justify-center text-[11px] font-black transition-all border rounded-none ${
                      currentPage === p
                        ? "bg-blue-50 text-blue-600 border-blue-600 shadow-[0_0_20px_rgba(37,99,235,0.15)] scale-110 z-10"
                        : "bg-card text-slate-500 border-theme hover:text-blue-600 hover:border-blue-600 hover:shadow-lg hover:shadow-blue-500/10"
                    }`}
                  >
                    {p}
                  </motion.button>
                ))}

                <button
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="w-9 h-9 flex items-center justify-center hover:text-blue-600 disabled:opacity-20 transition-all border border-theme bg-card"
                >
                  ›
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="w-9 h-9 flex items-center justify-center hover:text-blue-600 disabled:opacity-20 transition-all border border-theme bg-card"
                >
                  »
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Segmented pill toggle used to switch between "Packets" and "Connections"
// in the Internal / External IP tables' metric column header.
const MetricToggle = ({ value, onChange, id }) => {
  const options = [
    { key: "packet_count", label: "Packets" },
    { key: "connections", label: "Connections" },
  ];

  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-slate-500/10 p-1">
      {options.map((opt) => (
        <button
          key={opt.key}
          type="button"
          onClick={() => onChange(opt.key)}
          className={`relative px-3.5 py-1.5 text-xs font-semibold rounded-full transition-colors duration-200 cursor-pointer ${
            value === opt.key ? "text-white" : "text-slate-500 hover:text-blue-600"
          }`}
        >
          {value === opt.key && (
            <motion.span
              layoutId={`metric-toggle-bg-${id}`}
              className="absolute inset-0 rounded-full bg-blue-600 shadow-sm"
              transition={{ type: "spring", stiffness: 450, damping: 32 }}
            />
          )}
          <span className="relative z-10">{opt.label}</span>
        </button>
      ))}
    </div>
  );
};

MetricToggle.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func,
  id: PropTypes.string,
};

// Converts a KB value to a readable MB string.
const formatFileSizeMB = (sizeKb) => {
  const num = Number(sizeKb);
  if (sizeKb === null || sizeKb === undefined || isNaN(num)) return "N/A";
  return `${(num / 1024).toFixed(2)} MB`;
};

// DNS record type reference data
const recordTypeMeanings = {
  A: { num: 1, desc: "Connects a domain name to an IPv4 address.", category: "Address", color: "#3b82f6" },
  NS: { num: 2, desc: "Shows which DNS server manages the domain.", category: "Delegation", color: "#8b5cf6" },
  CNAME: { num: 5, desc: "Makes one domain name point to another domain.", category: "Alias", color: "#06b6d4" },
  SOA: { num: 6, desc: "Contains the main information about the DNS zone.", category: "Zone", color: "#8b5cf6" },
  PTR: { num: 12, desc: "Finds the domain name from an IP address.", category: "Reverse", color: "#06b6d4" },
  MX: { num: 15, desc: "Shows which mail server receives emails.", category: "Mail", color: "#f59e0b" },
  TXT: { num: 16, desc: "Stores text like SPF, DKIM, and domain verification.", category: "Text", color: "#64748b" },
  AAAA: { num: 28, desc: "Connects a domain name to an IPv6 address.", category: "Address", color: "#3b82f6" },
  SRV: { num: 33, desc: "Shows the server and port for a service.", category: "Service", color: "#f59e0b" },
  NAPTR: { num: 35, desc: "Helps find network services like VoIP.", category: "Service", color: "#f59e0b" },
  DS: { num: 43, desc: "Helps secure DNS using DNSSEC.", category: "Security", color: "#ef4444" },
  RRSIG: { num: 46, desc: "Digital signature that protects DNS records.", category: "Security", color: "#ef4444" },
  NSEC: { num: 47, desc: "Proves that a DNS record does not exist.", category: "Security", color: "#ef4444" },
  DNSKEY: { num: 48, desc: "Stores the public key used by DNSSEC.", category: "Security", color: "#ef4444" },
  NSEC3: { num: 50, desc: "Securely proves missing DNS records.", category: "Security", color: "#ef4444" },
  SVCB: { num: 64, desc: "Provides connection details for services.", category: "Service", color: "#f59e0b" },
  HTTPS: { num: 65, desc: "Provides connection details for HTTPS websites.", category: "Service", color: "#f59e0b" },
  CAA: { num: 257, desc: "Controls who can issue SSL certificates.", category: "Security", color: "#ef4444" },
  ANY: { num: 255, desc: "Requests all DNS records for a domain.", category: "Query", color: "#64748b" },
};

// Hover/focus tooltip explaining a DNS record type. Opens to the RIGHT of the
// badge (left-to-right) instead of above/below, so it's never clipped by the
// table's top/bottom edges.
const RecordTypeBadge = ({ recordType, index }) => {
  const [open, setOpen] = useState(false);
  const rt = String(recordType || "").toUpperCase();
  const rec = recordTypeMeanings[rt];
  const accent = rec?.color || "#64748b";
  const tooltipId = `rt-meaning-${index}`;

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <button
        type="button"
        tabIndex={0}
        aria-describedby={tooltipId}
        className="px-2.5 py-1 text-[13px] font-semibold rounded-md border cursor-help outline-none focus:ring-2 focus:ring-offset-1"
        style={{
          color: accent,
          backgroundColor: `${accent}14`,
          borderColor: `${accent}33`,
        }}
      >
        {recordType}
      </button>

      <div
        id={tooltipId}
        role="tooltip"
        className={`absolute z-[100] top-1/2 -translate-y-1/2 left-full ml-3 w-72 origin-left rounded-xl border shadow-xl bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 transition-all duration-200 ${
          open
            ? "opacity-100 translate-x-0 scale-100 pointer-events-auto"
            : "opacity-0 -translate-x-2 scale-95 pointer-events-none"
        }`}
      >
        {/* connector arrow pointing back at the badge */}
        <span className="absolute top-1/2 -left-[7px] -translate-y-1/2 w-3 h-3 rotate-45 bg-white dark:bg-slate-800 border-l border-b border-slate-200 dark:border-slate-700" />

        <div className="relative px-4 py-3">
          <div className="flex items-baseline gap-1.5 mb-1.5">
            <span className="text-[13px] font-bold" style={{ color: accent }}>
              {rt || "Unknown"}
            </span>
            {rec?.num !== undefined && (
              <span className="text-[12px] font-medium text-slate-400 dark:text-slate-500">
                - Type {rec.num}
              </span>
            )}
          </div>
          <p className="text-[12px] leading-relaxed text-slate-600 dark:text-slate-300">
            {rec?.desc || "No description available for this record type."}
          </p>
        </div>
      </div>
    </div>
  );
};

RecordTypeBadge.propTypes = {
  recordType: PropTypes.string,
  index: PropTypes.number,
};

export default function PcapInsights({ data, onIpClick }) {
  // Metric toggles for Internal / External IP tables (Packets vs Connections)
  const [internalMetric, setInternalMetric] = useState("packet_count");
  const [externalMetric, setExternalMetric] = useState("packet_count");

  if (!data || !data.pcap_insights) {
    return <div className="p-4 text-slate-500">No insights data available.</div>;
  }

  const {
    dns_queries = [],
    external_ips = [],
    files_and_payloads = [],
    internal_ips = [],
    ports = [],
    protocols = [],
    urls = [],
    user_agents = [],
    ftp_session = null,
    top_countries = [],
    top_cities = [],
    top_isps = [],
  } = data.pcap_insights;

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500 pb-10">
      {/* Outer card wrapper with left/right margins */}
      <div className="mx-4 md:mx-8 lg:mx-12 bg-card border border-theme rounded-xl shadow-lg overflow-hidden">
        <div className="p-6 md:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <PaginatedTable
              data={top_countries}
              title="Top Countries"
              scrollable
              headers={[
                { label: "S.NO" },
                { label: "Country" },
                { label: "IPs", className: "text-center" },
                { label: "Packets" },
              ]}
              renderRow={(c, idx, globalIdx) => (
                <>
                  <td className="px-8 py-4 text-slate-500">{globalIdx + 1}</td>
                  <td className="px-8 py-4 text-foreground max-w-[220px] truncate" title={c.name}>
                    {c.name}
                  </td>
                  <td className="px-8 py-4 text-center">
                    <span className="px-2 py-0.5">{c.ip_count}</span>
                  </td>
                  <td className="px-8 py-4 text-orange-500">{c.packets?.toLocaleString()}</td>
                </>
              )}
            />

            <PaginatedTable
              data={top_cities}
              title="Top Cities"
              scrollable
              headers={[
                { label: "S.NO" },
                { label: "City" },
                { label: "IPs", className: "text-center" },
                { label: "Packets" },
              ]}
              renderRow={(c, idx, globalIdx) => (
                <>
                  <td className="px-8 py-4 text-slate-500">{globalIdx + 1}</td>
                  <td className="px-8 py-4 text-foreground max-w-[220px] truncate" title={c.name}>
                    {c.name}
                  </td>
                  <td className="px-8 py-4 text-center">
                    <span className="px-2 py-0.5">{c.ip_count}</span>
                  </td>
                  <td className="px-8 py-4 text-orange-500">{c.packets?.toLocaleString()}</td>
                </>
              )}
            />
          </div>

          {/* Top ISPs and Protocols - side by side after countries/cities */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mt-8 pt-8 border-t border-theme">
            <PaginatedTable
              data={top_isps}
              title="Top ISPs"
              scrollable
              headers={[
                { label: "S.NO" },
                { label: "ISP" },
                { label: "IPs", className: "text-center" },
                { label: "Packets" },
              ]}
              renderRow={(c, idx, globalIdx) => (
                <>
                  <td className="px-8 py-4 text-slate-500">{globalIdx + 1}</td>
                  <td className="px-8 py-4 text-foreground max-w-[220px] truncate" title={c.name}>
                    {c.name}
                  </td>
                  <td className="px-8 py-4 text-center">
                    <span className="px-2 py-0.5">{c.ip_count}</span>
                  </td>
                  <td className="px-8 py-4 text-orange-500">{c.packets?.toLocaleString()}</td>
                </>
              )}
            />

            <PaginatedTable
              data={protocols}
              title="Protocols"
              headers={[{ label: "Protocol" }, { label: "Packets" }]}
              renderRow={(proto) => (
                <>
                  <td className="px-8 py-4 text-foreground">{proto.protocol}</td>
                  <td className="px-8 py-4 text-purple-500">{proto.packet_count?.toLocaleString()}</td>
                </>
              )}
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mt-8 pt-8 border-t border-theme">
            <PaginatedTable
              data={internal_ips}
              title="Internal IPs"
              headerExtra={<MetricToggle value={internalMetric} onChange={setInternalMetric} id="internal" />}
              headers={[
                { label: "IP Address", className: "w-[400px]" },
                { label: "Count" },
              ]}
              renderRow={(ip) => (
                <>
                  <td
                    className="px-8 py-4 text-foreground cursor-pointer hover:text-blue-600 transition-colors"
                    onClick={() => onIpClick && onIpClick(ip.ip)}
                  >
                    {ip.ip}
                  </td>
                  <td className="px-8 py-4 text-orange-500">
                    {(internalMetric === "connections" ? ip.connections : ip.packet_count)?.toLocaleString() ?? "N/A"}
                  </td>
                </>
              )}
            />

            <PaginatedTable
              data={external_ips}
              title="External IPs"
              headerExtra={<MetricToggle value={externalMetric} onChange={setExternalMetric} id="external" />}
              headers={[
                { label: "IP Address" },
                { label: "ISP" },
                { label: "Count" },
              ]}
              renderRow={(ip) => (
                <>
                  <td
                    className="px-8 py-4 text-foreground cursor-pointer hover:text-blue-600 transition-colors"
                    onClick={() => onIpClick && onIpClick(ip.ip)}
                  >
                    {ip.ip}
                  </td>
                  <td className="px-8 py-4">{ip.isp || "Unknown"}</td>
                  <td className="px-8 py-4 text-orange-500">
                    {(externalMetric === "connections" ? ip.connections : ip.packet_count)?.toLocaleString() ?? "N/A"}
                  </td>
                </>
              )}
            />
          </div>

          {/* DNS Queries and Network Ports - side by side */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mt-8 pt-8 border-t border-theme">
            <PaginatedTable
              data={dns_queries}
              title="DNS Queries"
              headers={[{ label: "Domain" }, { label: "Type", className: "text-center" }, { label: "Count" }]}
              renderRow={(dns, idx, globalIdx) => (
                <>
                  <td className="px-8 py-4 text-foreground max-w-[310px] truncate" title={dns.domain}>
                    {dns.domain}
                  </td>
                  <td className="px-8 py-4 text-center">
                    <RecordTypeBadge recordType={dns.record_type} index={globalIdx} />
                  </td>
                  <td className="px-8 py-4 text-foreground">{dns.count}</td>
                </>
              )}
            />

            <PaginatedTable
              data={ports}
              title="Network Ports"
              searchable
              searchPlaceholder="Search by port or protocol"
              searchPredicate={(p, q) =>
                String(p.port).toLowerCase().includes(q) || String(p.protocol).toLowerCase().includes(q)
              }
              headers={[{ label: "Port" }, { label: "Protocol" }, { label: "Usage" }]}
              renderRow={(p) => (
                <>
                  <td className="px-8 py-4 text-orange-500">{p.port}</td>
                  <td className="px-8 py-4">{p.protocol}</td>
                  <td className="px-8 py-4 text-foreground">{p.usage?.toLocaleString()}</td>
                </>
              )}
            />
          </div>

          {/* URLs and FTP Session - side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8 pt-8 border-t border-theme">
            {urls.length > 0 ? (
              <PaginatedTable
                data={urls}
                title="URLs"
                headers={[{ label: "Resource URL / Path", className: "w-[600px]" }, { label: "Hits" }]}
                renderRow={(url) => (
                  <>
                    <td className="px-8 py-4 max-w-xl truncate" title={url.label}>
                      {url.label}
                    </td>
                    <td className="px-8 py-4 text-foreground">{url.value}</td>
                  </>
                )}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center bg-white dark:bg-card border border-slate-200/60 dark:border-slate-700/60 rounded-lg p-10 text-slate-500">
                No URL data available.
              </div>
            )}

            <div className="bg-card border border-slate-200/60 dark:border-slate-700/60 shadow-sm rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-theme bg-blue-500/10 rounded-t-lg">
                <h3 className="font-semibold text-foreground">FTP Session</h3>
              </div>

              <div className="p-6">
              {ftp_session ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="mb-1">Command</div>
                    <div className="font-semibold text-[20px] text-foreground">{ftp_session.command || "N/A"}</div>
                  </div>
                  <div>
                    <div className="mb-1">Username</div>
                    <div className="font-semibold text-[20px] text-foreground">{ftp_session.username || "N/A"}</div>
                  </div>
                  <div>
                    <div className="mb-1">Source IP</div>
                    <div className="font-semibold text-[20px] text-foreground">{ftp_session.source_ip || "N/A"}</div>
                  </div>
                  <div>
                    <div className="mb-1">Destination IP</div>
                    <div className="font-semibold text-[20px] text-foreground">
                      {ftp_session.destination_ip || "N/A"}
                    </div>
                  </div>
                  <div>
                    <div className="mb-1">Port</div>
                    <div className="font-semibold text-[20px] text-foreground">{ftp_session.port || "N/A"}</div>
                  </div>
                  <div className="md:col-span-2">
                    <div className="mb-1">Transferred File</div>
                    <div className="font-semibold text-[20px] text-foreground truncate">
                      {ftp_session.file_transferred || "N/A"}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-4 text-center">Not Data available.</div>
              )}
              </div>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-theme">
            <PaginatedTable
              data={files_and_payloads}
              title="Extracted Files"
              headers={[
                { label: "Filename" },
                { label: "MIME Type" },
                { label: "Protocol", className: "text-center" },
                { label: "Size (MB)" },
              ]}
              renderRow={(file) => (
                <>
                  <td className="px-8 py-4 text-foreground max-w-[550px] truncate" title={file.filename}>
                    {file.filename}
                  </td>
                  <td className="px-8 py-4">{file.type}</td>
                  <td className="px-8 py-4 text-center">
                    <span className="bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-none border border-emerald-500/10">
                      {file.protocol}
                    </span>
                  </td>
                  <td className="px-8 py-4 text-foreground">{formatFileSizeMB(file.file_size)}</td>
                </>
              )}
            />
          </div>

          {/* User Agents */}
          <div className="mt-8 pt-8 border-t border-theme">
            <div className="bg-card border border-slate-200/60 dark:border-slate-700/60 shadow-sm rounded-lg">
              <div className="flex items-center px-6 py-4 border-b border-theme bg-blue-500/10 rounded-t-lg">
                <h3 className="font-semibold text-foreground">User Agents</h3>
              </div>
              <div className="flex flex-col gap-2 p-6 max-h-[350px] overflow-y-auto pr-6 custom-scrollbar">
                {user_agents.length > 0 ? (
                  user_agents.map((ua, idx) => (
                    <div
                          key={idx}
                          className="bg-white dark:bg-card border border-slate-200/60 dark:border-slate-700/60 p-3 rounded-lg shadow-sm hover:border-blue-500/30 transition-all group"
                        >
                      <div className="text-orange-500 mb-1 flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Agent {idx + 1}
                      </div>
                      <div className="leading-relaxed break-all line-clamp-2 group-hover:line-clamp-none transition-all">
                        {ua.user_agent}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-6 text-center">No data available.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

PaginatedTable.propTypes = {
  data: PropTypes.array,
  headers: PropTypes.array,
  renderRow: PropTypes.func,
  title: PropTypes.string,
  scrollable: PropTypes.bool,
  searchable: PropTypes.bool,
  searchPlaceholder: PropTypes.string,
  searchPredicate: PropTypes.func,
  headerExtra: PropTypes.node,
};

PcapInsights.propTypes = {
  data: PropTypes.shape({
    pcap_insights: PropTypes.object,
  }),
  onIpClick: PropTypes.func,
};