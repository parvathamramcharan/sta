import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import PropTypes from 'prop-types';
import { formatBytes, formatDuration } from './PcapClientView';

function KpiCard({ title, value, colorClass = "text-foreground" }) {
  return (
    <div className="bg-card px-6 py-6 border border-theme flex flex-col justify-between transition-all hover:bg-slate-500/[0.02] min-h-[110px]">
      <div className="font-bold text-slate-500/80 mb-3">{title}</div>
      <div className={`text-xl font-black tracking-tight ${colorClass} truncate`} title={typeof value === 'string' ? value : ''}>
        {value}
      </div>
    </div>
  );
}

KpiCard.propTypes = {
  title: PropTypes.string,
  value: PropTypes.node,
  colorClass: PropTypes.string,
};

export default function CaptureSummary({
  overviewData,
  connectionsData,
  timelineData,
  connectionsPagination,
  connectionsPage,
  setConnectionsPage,
  timeFilter,
  setTimeFilter,
  isLoadingConnections,
  onIpClick
}) {
  if (!overviewData || !overviewData.capture_summary) {
    return <div className="p-4 text-slate-500">Loading capture summary...</div>;
  }

  const {
    bytes: total_bytes,
    connections: total_connections,
    duration_seconds,
    end_time_utc,
    file_name,
    file_size,
    ftp_sessions_count,
    infected_host,
    pcap_packets: total_packets,
    start_time_utc,
    internal_ip_count,
    external_ip_count
  } = overviewData.capture_summary;

  const formatTime = (time) => {
    try {
      if (!time) return "-";

      if (!Number.isNaN(time) && !String(time).includes('T')) {
        const d = new Date(Number.parseFloat(time) * 1000);
        return d.toLocaleTimeString([], { hour12: false });
      }

      const d = new Date(time);
      return d.toLocaleTimeString([], { hour12: false });
    } catch {
      return time;
    }
  };


  const session_timeline = (timelineData || []).map(item => ({
    label: formatTime(item.label),
    value: item.value
  }));


  return (
    <div className="flex flex-col gap-8 pb-10">

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 border-l border-t border-theme">
        <KpiCard title="Total Packets" value={total_packets?.toLocaleString() || "0"} colorClass="text-blue-600" />
        <KpiCard title="Total Bytes" value={total_bytes ? formatBytes(total_bytes) : "0 B"} colorClass="text-emerald-600" />
        <KpiCard title="Total Duration" value={duration_seconds ? formatDuration(duration_seconds) : "0s"} colorClass="text-amber-600" />
        <KpiCard
          title="Start Time"
          value={
            start_time_utc ? (
              <div className="flex flex-col leading-none gap-1">
                <span className="text-[18px] font-black tracking-tight">{start_time_utc.split('T')[0]}, {start_time_utc.split('T')[1]?.split(/[.+Z]/)[0]}</span>
              </div>
            ) : "-"
          }
          colorClass="text-slate-600"
        />
        <KpiCard
          title="End Time"
          value={
            end_time_utc ? (
              <div className="flex flex-col leading-none gap-1">
                <span className="text-[18px] font-black tracking-tight">{end_time_utc.split('T')[0]},   {end_time_utc.split('T')[1]?.split(/[.+Z]/)[0]}</span>
              </div>
            ) : "-"
          }
          colorClass="text-slate-600"
        />
        <KpiCard title="Connections" value={total_connections?.toLocaleString() || "0"} colorClass="text-purple-600" />
        
        <KpiCard title="Internal IPs" value={internal_ip_count || "0"} colorClass="text-teal-600" />
        <KpiCard title="External IPs" value={external_ip_count || "0"} colorClass="text-indigo-600" />
        <KpiCard title="Affected Host" value={infected_host || "None"} colorClass="text-rose-600" />
        <KpiCard
          title="FTP Sessions"
          value={ftp_sessions_count === 0 ? "NA" : ftp_sessions_count?.toLocaleString() || "NA"}
          colorClass="text-fuchsia-600"
        />
      </div>


      <div className="bg-card shadow-sm p-8 h-96 flex flex-col transition-colors">
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-blue-600" />
            <h3 className="text-[13px] font-black  text-foreground">PCAP Session Timeline</h3>
          </div>
        </div>
        <div className="flex-1 w-full min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={session_timeline || []} margin={{ top: 20, right: 30, left: 60, bottom: 50 }}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="currentColor" strokeDasharray="3 3" className="text-slate-200 dark:text-slate-800" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: 'currentColor', fontWeight: 'bold' }}
                className="text-slate-500 dark:text-slate-400"
                axisLine={{ stroke: 'currentColor' }}
                tickLine={false}
                label={{ value: 'TIME (24H FORMAT)', position: 'insideBottom', offset: -30, fontSize: 15, fontWeight: 'bold', fill: 'currentColor', letterSpacing: '0.1em' }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'currentColor', fontWeight: 'bold' }}
                className="text-slate-500 dark:text-slate-400"
                axisLine={{ stroke: 'currentColor' }}
                tickLine={false}
                label={{ value: 'PACKETS', angle: -90, position: 'center', fontSize: 15, fontWeight: 'bold', fill: 'currentColor', letterSpacing: '0.1em', dx: -45 }}
              />
              <Tooltip
                contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '0', border: '1px solid hsl(var(--border))', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                itemStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'black', textTransform: 'uppercase', fontSize: '10px' }}
              />
              <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3.5} fillOpacity={1} fill="url(#colorValue)" animationDuration={1500} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>


      <div className="bg-card shadow-sm overflow-hidden flex flex-col transition-colors">
        <div className="px-8 py-5 border-b border-theme bg-slate-500/[0.02] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center px-4 py-2 bg-emerald-500/8 border border-emerald-500/20 rounded-none">
              <span className="font-bold font-black text-emerald-700 ">PCAP Connection Logs</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-black text-slate-500  ">Time Filter:</span>
              <select
                value={timeFilter}
                onChange={(e) => {
                  setTimeFilter(e.target.value);
                  setConnectionsPage(1);
                }}
                className="bg-card border border-theme rounded-none px-4 py-2 text-[10px] font-black text-foreground outline-none focus:border-blue-600 transition-all cursor-pointer appearance-none hover:bg-slate-500/10"
              >
                <option value="" className="bg-card">All Temporal Records</option>
                <option value="1d" className="bg-card">Last 24 Hours</option>
                <option value="2d" className="bg-card">Last 48 Hours</option>
                <option value="7d" className="bg-card">Last 7 Days</option>
                <option value="30d" className="bg-card">Last 30 Days</option>
              </select>
            </div>

            {connectionsPagination && (() => {
              const total = connectionsPagination.total || 0;
              const tp = connectionsPagination.total_pages || Math.ceil(total / 100);
              return (
                <div className="flex flex-col items-end gap-1">
                  <div className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-none text-[10px] font-black text-blue-600 uppercase tracking-widest">
                    {total} Records Total
                  </div>

                </div>
              );
            })()}
          </div>
        </div>
        <div className="overflow-x-auto relative">
          {isLoadingConnections && (
            <div className="absolute inset-0 bg-background/40 backdrop-blur-[2px] z-10 flex flex-col p-8 space-y-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="h-10 w-full bg-slate-200/50 animate-pulse rounded-none border border-slate-300/20" />
              ))}
            </div>
          )}
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-theme bg-slate-500/5 transition-colors">
                <th className="px-8 py-4 font-bold font-black text-slate-700 dark:text-slate-300 text-left">Timestamp</th>
                <th className="px-8 py-4 font-bold font-black text-slate-700 dark:text-slate-300 text-left">Source IP</th>
                <th className="px-8 py-4 font-bold font-black text-slate-700 dark:text-slate-300 text-left">Dest IP</th>
                <th className="px-8 py-4 font-bold font-black text-slate-700 dark:text-slate-300 text-left">Port</th>
                <th className="px-8 py-4 font-bold font-black text-slate-700 dark:text-slate-300 text-left">Protocol</th>
                <th className="px-8 py-4 font-bold font-black text-slate-700 dark:text-slate-300 text-left">Service</th>
                <th className="px-8 py-4 font-bold font-black text-slate-700 dark:text-slate-300 text-left">Status</th>
                <th className="px-8 py-4 font-bold font-black text-slate-700 dark:text-slate-300 text-left">Bytes</th>
              </tr>
            </thead>
            <tbody className="">
              {(connectionsData || []).map((conn, idx) => {
                const stateDesc = conn.conn_state_desc || conn.status;
                const stateCode = conn.conn_state;
                const isEstablished = stateCode === 'SF';
                const isRefused = stateCode === 'REJ' || stateCode === 'RSTOS0';
                const isPending = stateCode === 'S0' || stateCode === 'S1';

                return (
                  <tr key={idx} className="hover:bg-blue-500/[0.04] transition-colors group border-b border-theme last:border-0">
                    <td className="px-8 py-3.5 whitespace-nowrap">
                      <span className="text-[14px] text-slate-600 dark:text-slate-400 tabular-nums">{formatTime(conn.timestamp || conn.ts)}</span>
                    </td>
                    <td className="px-8 py-3.5">
                      <button
                        type="button"
                        className="text-[14px] text-foreground cursor-pointer hover:text-blue-600 transition-colors bg-transparent border-none p-0"
                        onClick={() => onIpClick && onIpClick(conn.src_ip || conn["id.orig_h"] || conn.source_ip)}
                      >
                        {conn.src_ip || conn["id.orig_h"] || conn.source_ip}
                      </button>
                    </td>
                    <td className="px-8 py-3.5">
                      <button
                        type="button"
                        className="text-[14px] text-foreground cursor-pointer hover:text-blue-600 transition-colors bg-transparent border-none p-0"
                        onClick={() => onIpClick && onIpClick(conn.dest_ip || conn["id.resp_h"] || conn.destination_ip)}
                      >
                        {conn.dest_ip || conn["id.resp_h"] || conn.destination_ip}
                      </button>
                    </td>
                    <td className="px-8 py-3.5">
                      <span className="text-[14px] text-orange-500">{conn.resp_port || conn["id.resp_p"] || conn.dest_port || conn.destination_port}</span>
                    </td>
                    <td className="px-8 py-3.5">
                      <span className="text-[14px] text-slate-500 dark:text-slate-400 uppercase tracking-widest">{conn.proto || conn.protocol}</span>
                    </td>
                    <td className="px-8 py-3.5">
                      {conn.service ? (
                        <span className="text-[12px] text-purple-600 dark:text-purple-400 uppercase bg-purple-500/10 px-2.5 py-1 rounded-none border border-purple-500/20 inline-block">
                          {conn.service}
                        </span>
                      ) : (
                        <span className="text-[12px] font-bold text-slate-300 dark:text-slate-600">—</span>
                      )}
                    </td>
                    <td className="px-8 py-3.5">
                      <span className={`text-[14px]  leading-snug ${isEstablished ? 'text-emerald-600 dark:text-emerald-400' :
                        isRefused ? 'text-rose-600 dark:text-rose-400' :
                          isPending ? 'text-amber-600 dark:text-amber-400' :
                            'text-slate-500 dark:text-slate-400'
                        }`} title={stateDesc}>
                        {stateDesc || '—'}
                      </span>
                    </td>
                    <td className="px-8 py-3.5 text-left">
                      <span className="text-[14px] text-foreground">{formatBytes(conn.orig_bytes ?? conn.bytes ?? 0)}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Bottom Pagination */}
        {connectionsPagination && (() => {
          const total = connectionsPagination.total || 0;
          const tp = connectionsPagination.total_pages || Math.ceil(total / 100);
          if (tp <= 1 && total <= connectionsData?.length) return null;
          return (
            <div className="px-8 py-4 border-t border-theme bg-slate-500/[0.02] flex items-center justify-between">
              <span className="text-[10px] font-black ">
                Page <span className="text-foreground">{connectionsPage}</span> of <span className="text-foreground">{tp}</span>
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setConnectionsPage(1)}
                  disabled={connectionsPage === 1 || isLoadingConnections}
                  className="w-8 h-8 flex items-center justify-center text-[10px] font-black text-slate-400 hover:text-blue-600 disabled:opacity-20 transition-all border border-theme bg-card"
                >«</button>
                <button
                  onClick={() => setConnectionsPage(p => Math.max(1, p - 1))}
                  disabled={connectionsPage === 1 || isLoadingConnections}
                  className="w-8 h-8 flex items-center justify-center text-[10px] font-black text-slate-400 hover:text-blue-600 disabled:opacity-20 transition-all border border-theme bg-card"
                ><ChevronLeft size={14} /></button>

                {Array.from({ length: Math.min(5, tp) }, (_, i) => {
                  let pageNum;
                  if (tp <= 5) pageNum = i + 1;
                  else if (connectionsPage <= 3) pageNum = i + 1;
                  else if (connectionsPage >= tp - 2) pageNum = tp - 4 + i;
                  else pageNum = connectionsPage - 2 + i;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setConnectionsPage(pageNum)}
                      className={`w-8 h-8 flex items-center justify-center text-[10px] font-black transition-all border ${connectionsPage === pageNum
                        ? "bg-blue-600/10 text-blue-600 border-blue-600/50 shadow-lg shadow-blue-500/5"
                        : "text-slate-500 border-theme hover:border-blue-500/30 hover:bg-slate-500/10 bg-card"
                        }`}
                    >{pageNum}</button>
                  );
                })}

                <button
                  onClick={() => setConnectionsPage(p => Math.min(tp, p + 1))}
                  disabled={connectionsPage === tp || isLoadingConnections}
                  className="w-8 h-8 flex items-center justify-center text-[10px] font-black text-slate-400 hover:text-blue-600 disabled:opacity-20 transition-all border border-theme bg-card"
                ><ChevronRight size={14} /></button>
                <button
                  onClick={() => setConnectionsPage(tp)}
                  disabled={connectionsPage === tp || isLoadingConnections}
                  className="w-8 h-8 flex items-center justify-center text-[10px] font-black text-slate-400 hover:text-blue-600 disabled:opacity-20 transition-all border border-theme bg-card"
                >»</button>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

CaptureSummary.propTypes = {
  overviewData: PropTypes.shape({
    capture_summary: PropTypes.shape({
      bytes: PropTypes.number,
      connections: PropTypes.number,
      duration_seconds: PropTypes.number,
      end_time_utc: PropTypes.string,
      file_name: PropTypes.string,
      file_size: PropTypes.number,
      ftp_sessions_count: PropTypes.number,
      infected_host: PropTypes.string,
      pcap_packets: PropTypes.number,
      start_time_utc: PropTypes.string,
      internal_ip_count: PropTypes.number,
      external_ip_count: PropTypes.number,
    }),
  }),
  connectionsData: PropTypes.array,
  timelineData: PropTypes.array,
  connectionsPagination: PropTypes.object,
  connectionsPage: PropTypes.number,
  setConnectionsPage: PropTypes.func,
  timeFilter: PropTypes.string,
  setTimeFilter: PropTypes.func,
  isLoadingConnections: PropTypes.bool,
  onIpClick: PropTypes.func,
};
