import React, { useState } from "react";
import PropTypes from "prop-types";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe,
  Shield,
  Database,
  Layout,
  FileText,
  Cpu,
  Server,
  ExternalLink,
  Search,
  Info,
  Terminal,
  Activity,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const ITEMS_PER_PAGE = 5;

const PaginatedTable = ({ data, headers, renderRow, icon: Icon, title }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(data.length / ITEMS_PER_PAGE);

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedData = data.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const pages = Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
    if (totalPages <= 5) return i + 1;
    if (currentPage <= 3) return i + 1;
    if (currentPage >= totalPages - 2) return totalPages - 4 + i;
    return currentPage - 2 + i;
  });

  return (
    <div className="flex flex-col h-full group bg-card shadow-sm  rounded-none hover:shadow-2xl hover:shadow-blue-500/5 transition-all duration-500">
      <div className="flex items-center justify-between px-6 py-5 border-b border-theme bg-blue-500/10 ">
        <div className="flex items-center gap-4">
          <div>
            <h3 className="font-semibold font-serif text-foreground ">{title}</h3>
          </div>
        </div>
        <div className="flex flex-row items-end gap-2">
          {totalPages > 1 && (
            <div className=" px-3 py-1 font-serif ">
              Page <span className="text-foreground">{currentPage}</span> of{" "}
              <span className="text-foreground">{totalPages}</span>
            </div>
          )}
          <div className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-none font-serif text-blue-600  dark:text-slate-100 ">
            Total : {data.length}
          </div>
          
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {/* <div className="overflow-x-auto"> */}
        <div className="overflow-x-auto overflow-y-visible">
          <table className="w-full text-left">
            <thead className="bg-slate-500/[0.02]">
              <tr>
                {headers.map((h, i) => (
                  <th
                    key={i}
                    className={`px-8 py-5 font-serif   ${h.className || ""}`}
                  >
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="">
              {paginatedData.length > 0 ? (
                paginatedData.map((item, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-slate-500/5 transition-colors font-serif group/row" 
                  >
                    {renderRow(item, idx, startIndex + idx)}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={headers.length}
                    className="px-8 py-20 text-center font-serif  "
                  >
                    No Data Available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="mt-auto p-4 border-t border-theme bg-slate-500/[0.01] flex items-center justify-center gap-2">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="w-9 h-9 flex items-center justify-center font-serif hover:text-blue-600 disabled:opacity-20 transition-all border border-theme bg-card"
            >
              «
            </button>
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="w-9 h-9 flex items-center justify-center font-serif hover:text-blue-600 disabled:opacity-20 transition-all border border-theme bg-card"
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
              onClick={() =>
                setCurrentPage((prev) => Math.min(totalPages, prev + 1))
              }
              disabled={currentPage === totalPages}
              className="w-9 h-9 flex items-center justify-center font-serif hover:text-blue-600 disabled:opacity-20 transition-all border border-theme bg-card"
            >
              ›
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="w-9 h-9 flex items-center justify-center font-serif hover:text-blue-600 disabled:opacity-20 transition-all border border-theme bg-card"
            >
              »
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Small reusable dropdown used to toggle between "Packets" and "Connections"
// in the Internal / External IP tables' metric column header.
const MetricSelect = ({ value, onChange }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    onClick={(e) => e.stopPropagation()}
    className="bg-blue-500/10 text-blue-600 font-serif  border border-blue-500/20 rounded-none px-2 py-1 outline-none cursor-pointer  transition-colors"
  >
    <option value="packet_count">Packets</option>
    <option value="connections">Connections</option>
  </select>
);

MetricSelect.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func,
};

export default function PcapInsights({ data, onIpClick }) {
  if (!data || !data.pcap_insights) {
    return (
      <div className="p-4 text-slate-500">No insights data available.</div>
    );
  }

  const [hoveredRtIndex, setHoveredRtIndex] = useState(null);

  // Metric toggles for Internal / External IP tables (Packets vs Connections)
  const [internalMetric, setInternalMetric] = useState("packet_count");
  const [externalMetric, setExternalMetric] = useState("packet_count");

  const {
    dns_queries = [],
    domains = [],
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <PaginatedTable
          data={top_countries}
          title="Top Countries"
          icon={Globe}
          headers={[
            { label: "Country" },
            { label: "IPs", className: "text-center" },
            { label: "Packets" },
          ]}
          renderRow={(c) => (
            <>
              <td
                className="px-8 py-4 text-foreground max-w-[220px] truncate"
                title={c.name}
              >
                {c.name}
              </td>
              <td className="px-8 py-4 text-center">
                <span className=" px-2 py-0.5 font-serif  ">
                  {c.ip_count}
                </span>
              </td>
              <td className="px-8 py-4 font-serif text-orange-500">
                {c.packets?.toLocaleString()}
              </td>
            </>
          )}
        />

        <PaginatedTable
          data={top_cities}
          title="Top Cities"
          icon={Info}
          headers={[
            { label: "City" },
            { label: "IPs", className: "text-center" },
            { label: "Packets" },
          ]}
          renderRow={(c) => (
            <>
              <td
                className="px-8 py-4 text-foreground max-w-[220px] truncate"
                title={c.name}
              >
                {c.name}
              </td>
              <td className="px-8 py-4 text-center">
                <span className="font-serif  px-2 py-0.5  font-serif  ">
                  {c.ip_count}
                </span>
              </td>
              <td className="px-8 py-4 text-orange-500">
                {c.packets?.toLocaleString()}
              </td>
            </>
          )}
        />

        <PaginatedTable
          data={top_isps}
          title="Top ISPs"
          icon={Database}
          headers={[
            { label: "ISP" },
            { label: "IPs", className: "text-center" },
            { label: "Packets" },
          ]}
          renderRow={(c) => (
            <>
              <td
                className="px-8 py-4 text-foreground max-w-[220px] truncate"
                title={c.name}
              >
                {c.name}
              </td>
              <td className="px-8 py-4 text-center">
                <span className="  px-2 py-0.5  font-serif ">
                  {c.ip_count}
                </span>
              </td>
              <td className="px-8 py-4 text-orange-500 font-serif ">
                {c.packets?.toLocaleString()}
              </td>
            </>
          )}
        />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <PaginatedTable
          data={internal_ips}
          title="Internal IPs"
          icon={Shield}
          headers={[
            { label: "IP Address", className: "w-[400px]" },
            {
              label: (
                <MetricSelect
                  value={internalMetric}
                  onChange={setInternalMetric}
                />
              ),
            },
          ]}
          renderRow={(ip) => (
            <>
              <td
                className="px-8 py-4 font-serif text-foreground cursor-pointer hover:text-blue-600 transition-colors"
                onClick={() => onIpClick && onIpClick(ip.ip)}
              >
                {ip.ip}
              </td>
              <td className="px-8 py-4 font-serif text-orange-500">
                {(internalMetric === "connections"
                  ? ip.connections
                  : ip.packet_count
                )?.toLocaleString() ?? "N/A"}
              </td>
            </>
          )}
        />

        <PaginatedTable
          data={external_ips}
          title="External IPs"
          icon={Globe}
          headers={[
            { label: "IP / Location" },
            { label: "ISP" },
            {
              label: (
                <MetricSelect
                  value={externalMetric}
                  onChange={setExternalMetric}
                />
              ),
            },
          ]}
          renderRow={(ip) => (
            <>
              <td
                className="px-8 py-4 cursor-pointer font-serif group/ip"
                onClick={() => onIpClick && onIpClick(ip.ip)}
              >
                <div className=" text-foreground text-[20px] font-medium  font-serif group-hover/ip:text-blue-600 transition-colors">
                  {ip.ip}
                </div>
                <div className="text-[14px] font-serif ">
                  {ip.city && `${ip.city}, `}
                  {ip.country}
                </div>
              </td>
              <td className="px-8 py-4 font-serif  ">{ip.isp || "Unknown"}</td>
              <td className="px-8 py-4 font-serif   text-orange-500">
                {(externalMetric === "connections"
                  ? ip.connections
                  : ip.packet_count
                )?.toLocaleString() ?? "N/A"}
              </td>
            </>
          )}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <PaginatedTable
          data={dns_queries}
          title="DNS Queries"
          icon={Search}
          headers={[
            { label: "Domain" },
            { label: "Type", className: "text-center" },
            { label: "Count" },
          ]}
          renderRow={(dns, idx, globalIdx) => {
            const recordTypeMeanings = {
              A: {
                num: 1,
                desc: "Connects a domain name to an IPv4 address.",
                category: "Address",
                color: "#3b82f6",
              },

              NS: {
                num: 2,
                desc: "Shows which DNS server manages the domain.",
                category: "Delegation",
                color: "#8b5cf6",
              },

              CNAME: {
                num: 5,
                desc: "Makes one domain name point to another domain.",
                category: "Alias",
                color: "#06b6d4",
              },

              SOA: {
                num: 6,
                desc: "Contains the main information about the DNS zone.",
                category: "Zone",
                color: "#8b5cf6",
              },

              PTR: {
                num: 12,
                desc: "Finds the domain name from an IP address.",
                category: "Reverse",
                color: "#06b6d4",
              },

              MX: {
                num: 15,
                desc: "Shows which mail server receives emails.",
                category: "Mail",
                color: "#f59e0b",
              },

              TXT: {
                num: 16,
                desc: "Stores text like SPF, DKIM, and domain verification.",
                category: "Text",
                color: "#64748b",
              },

              AAAA: {
                num: 28,
                desc: "Connects a domain name to an IPv6 address.",
                category: "Address",
                color: "#3b82f6",
              },

              SRV: {
                num: 33,
                desc: "Shows the server and port for a service.",
                category: "Service",
                color: "#f59e0b",
              },

              NAPTR: {
                num: 35,
                desc: "Helps find network services like VoIP.",
                category: "Service",
                color: "#f59e0b",
              },

              DS: {
                num: 43,
                desc: "Helps secure DNS using DNSSEC.",
                category: "Security",
                color: "#ef4444",
              },

              RRSIG: {
                num: 46,
                desc: "Digital signature that protects DNS records.",
                category: "Security",
                color: "#ef4444",
              },

              NSEC: {
                num: 47,
                desc: "Proves that a DNS record does not exist.",
                category: "Security",
                color: "#ef4444",
              },

              DNSKEY: {
                num: 48,
                desc: "Stores the public key used by DNSSEC.",
                category: "Security",
                color: "#ef4444",
              },

              NSEC3: {
                num: 50,
                desc: "Securely proves missing DNS records.",
                category: "Security",
                color: "#ef4444",
              },

              SVCB: {
                num: 64,
                desc: "Provides connection details for services.",
                category: "Service",
                color: "#f59e0b",
              },

              HTTPS: {
                num: 65,
                desc: "Provides connection details for HTTPS websites.",
                category: "Service",
                color: "#f59e0b",
              },

              CAA: {
                num: 257,
                desc: "Controls who can issue SSL certificates.",
                category: "Security",
                color: "#ef4444",
              },

              ANY: {
                num: 255,
                desc: "Requests all DNS records for a domain.",
                category: "Query",
                color: "#64748b",
              },
            };

            const rt = String(dns.record_type || "").toUpperCase();
            const rec = recordTypeMeanings[rt];
            const accent = rec?.color || "#64748b";
            const tooltipId = `rt-meaning-${globalIdx}`;
            const isOpen = hoveredRtIndex === globalIdx;

            return (
              <>
                <td
                  className="px-8 py-4 font-serif  text-foreground max-w-[310px] truncate"
                  title={dns.domain}
                >
                  {dns.domain}
                </td>
                <td className="px-8 py-4 font-serif text-center">
                  <div
                    className="relative inline-block"
                    onMouseEnter={() => setHoveredRtIndex(globalIdx)}
                    onMouseLeave={() => setHoveredRtIndex(null)}
                    onFocus={() => setHoveredRtIndex(globalIdx)}
                    onBlur={() => setHoveredRtIndex(null)}
                  >
                    <button
                      type="button"
                      tabIndex={0}
                      className="bg-pink-500/10 text-pink-500 px-2 py-0.5 text-[14px]  font-serif rounded-md   border border-pink-500/10 cursor-help outline-none focus:ring-2 focus:ring-pink-500/30"
                      aria-describedby={tooltipId}
                    >
                      {dns.record_type}
                    </button>
 
                    <div
                      id={tooltipId}
                      role="tooltip"
                      className={`absolute z-[100] bottom-full mb-3 left-1/2 -translate-x-1/2 w-56   border overflow-hidden transform transition-all duration-200 origin-bottom ${
                        isOpen
                          ? "opacity-100 translate-y-0 scale-100 pointer-events-auto"
                          : "opacity-0 translate-y-2 scale-95 pointer-events-none"
                      }`}
                      style={{
                        backgroundColor: "#eaf1ff",
                        borderColor: "#c7dbfe",
                      }}
                    >
                      

                      <div
                        className="px-3.5 py-3"
                        style={{ backgroundColor: "#eaf1ff" }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className="font-serif"
                              style={{ color: accent }}
                            >
                              {rt || "Unknown"}
                            </span>
                            {rec && (
                              <span
                                className="font-serif px-1.5 py-0.5 rounded-full"
                                style={{
                                  color: accent,
                                  backgroundColor: `${accent}22`,
                                }}
                              >
                                {rec.category}
                              </span>
                            )}
                          </div>
                          {rec?.num !== undefined && (
                            <span
                              className="font-serif "
                              style={{ color: accent, opacity: 0.75 }}
                            >
                              Type {rec.num}
                            </span>
                          )}
                        </div>

                        <div className="font-serif dark:text-slate-900 leading-snug mt-1.5">
                          {rec?.desc ||
                            "No description available for this record type."}
                        </div>
                      </div>

                      
                    </div>
                  </div>
                </td>
                <td className="px-8 py-4 font-serif text-foreground ">{dns.count}</td>
              </>
            );
          }}
        />

        <PaginatedTable
          data={domains}
          title="Domains"
          icon={ExternalLink}
          headers={[
            { label: "Domain Name", className: "w-[400px]" },
            { label: "Requests" },
          ]}
          renderRow={(dom) => (
            <>
              <td
                className="px-8 py-4 font-serif min-w-[400px] truncate"
                title={dom.label}
              >
                {dom.label}
              </td>
              <td className="px-8 py-4 font-serif   text-emerald-500">{dom.value}</td>
            </>
          )}
        />
      </div>

      {urls.length > 0 && (
        <PaginatedTable
          data={urls}
          title="URLs"
          icon={Layout}
          headers={[
            { label: "Resource URL / Path", className: "w-[600px]" },
            { label: "Hits" },
          ]}
          renderRow={(url) => (
            <>
              <td className="px-8 py-4 max-w-xl font-serif truncate" title={url.label}>
                {url.label}
              </td>
              <td className="px-8 py-4 font-serif  text-foreground">{url.value}</td>
            </>
          )}
        />
      )}

      <PaginatedTable
        data={files_and_payloads}
        title="Extracted Files"
        icon={FileText}
        headers={[
          { label: "Filename" },
          { label: "MIME Type" },
          { label: "Protocol", className: "text-center" },
          { label: "Size (KB)" },
        ]}
        renderRow={(file) => (
          <>
            <td
              className="px-8 py-4 font-serif text-foreground max-w-[550px] truncate"
              title={file.filename}
            >
              {file.filename}
            </td>
            <td className="px-8 py-4 font-serif ">{file.type}</td>
            <td className="px-8 py-4 font-serif text-center">
              <span className="bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-none  border border-emerald-500/10">
                {file.protocol}
              </span>
            </td>
            <td className="px-8 py-4  font-serif text-foreground">{file.file_size}</td>
          </>
        )}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <PaginatedTable
          data={ports}
          title="Network Ports"
          icon={Terminal}
          headers={[
            { label: "Port" },
            { label: "Protocol" },
            { label: "Usage" },
          ]}
          renderRow={(p) => (
            <>
              <td className="px-8 py-4 font-serif text-orange-500">{p.port}</td>
              <td className="px-8 py-4 font-serif  ">{p.protocol}</td>
              <td className="px-8 py-4 font-serif text-foreground">
                {p.usage?.toLocaleString()}
              </td>
            </>
          )}
        />

        <PaginatedTable
          data={protocols}
          title="Protocols"
          icon={Activity}
          headers={[{ label: "Protocol" }, { label: "Packets" }]}
          renderRow={(proto) => (
            <>
              <td className="px-8 py-4  font-serif text-foreground">{proto.protocol}</td>
              <td className="px-8 py-4  font-serif text-purple-500">
                {proto.packet_count?.toLocaleString()}
              </td>
            </>
          )}
        />

        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-4 mt-6 first:mt-0">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Cpu size={18} className="text-blue-500" />
              </div>
              <h3 className="font-serif font-semibold text-foreground">User Agents</h3>
            </div>
          </div>
          <div className="flex flex-col gap-2 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
            {user_agents.length > 0 ? (
              user_agents.map((ua, idx) => (
                <div
                  key={idx}
                  className="bg-card border border-theme p-3 rounded-none shadow-sm hover:border-blue-500/30 transition-all group"
                >
                  <div className="font-serif text-orange-500 mb-1 flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 font-serif rounded-full bg-blue-500" />{" "}
                    Agent {idx + 1}
                  </div>
                  <div className="font-serif  leading-relaxed break-all line-clamp-2 group-hover:line-clamp-none transition-all">
                    {ua.user_agent}
                  </div>
                </div>
              ))
            ) : (
              <div className="py-6 text-center font-serif ">
                No data available.
              </div>
            )}
          </div>

          <div className="mt-6 bg-card border border-theme p-6 rounded-none shadow-sm transition-all">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-fuchsia-500/10 text-fuchsia-600 flex items-center justify-center rounded-lg">
                <Server size={20} />
              </div>
              <div>
                <h3 className="font-serif font-semibold   text-foreground">
                  FTP Session
                </h3>
              </div>
            </div>

            {ftp_session ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ">
                <div>
                  <div className="  font-serif   mb-1">
                    Command
                  </div>
                  <div className=" font-serif   font-semibold text-[20px] text-foreground">
                    {ftp_session.command || "N/A"}
                  </div>
                </div>
                <div>
                  <div className=" font-serif mb-1">
                    Username
                  </div>
                  <div className="font-serif  font-semibold  text-[20px] text-foreground">
                    {ftp_session.username || "N/A"}
                  </div>
                </div>
                <div>
                  <div className="font-serif   mb-1">
                    Source IP
                  </div>
                  <div className="font-serif  font-semibold  text-[20px] text-foreground">
                    {ftp_session.source_ip || "N/A"}
                  </div>
                </div>
                <div>
                  <div className=" font-serif  mb-1">
                    Destination IP
                  </div>
                  <div className="font-serif  font-semibold text-[20px] text-foreground">
                    {ftp_session.destination_ip || "N/A"}
                  </div>
                </div>
                <div>
                  <div className=" font-serif  mb-1">
                    Port
                  </div>
                  <div className="font-serif  font-semibold text-[20px]text-foreground">
                    {ftp_session.port || "N/A"}
                  </div>
                </div>
                <div className="md:col-span-2">
                  <div className="font-serif  mb-1">
                    Transferred File
                  </div>
                  <div className="font-serif  font-semibold text-[20px] text-foreground truncate">
                    {ftp_session.file_transferred || "N/A"}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-4 text-center ">
                Not Data available.
              </div>
            )}
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
  icon: PropTypes.elementType,
  title: PropTypes.string,
};

PcapInsights.propTypes = {
  data: PropTypes.shape({
    pcap_insights: PropTypes.object,
  }),
  onIpClick: PropTypes.func,
};