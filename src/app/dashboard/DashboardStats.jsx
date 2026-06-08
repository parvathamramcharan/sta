"use client";

import { useState } from "react";
import PropTypes from "prop-types";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, MapPin, Server, Activity, ArrowRight, Shield, ChevronLeft, ChevronRight } from "lucide-react";

export function DashboardStats({ stats }) {
  return (
    <div className="space-y-12">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <StatTable
          title="Top 5 Active IPs"
          data={stats.top_active_ips}
          icon={Activity}
          labelKey="ip"
          valueKey="packets"
          headerLabel="IP Address"
          accentColor="blue"
        />
        <StatTable
          title="Top 5 Countries"
          data={stats.top_countries}
          icon={Globe}
          labelKey="name"
          valueKey="packets"
          headerLabel="Country"
          accentColor="blue"
        />
        <StatTable
          title="Top 5 Cities"
          data={stats.top_cities}
          icon={MapPin}
          labelKey="name"
          valueKey="packets"
          headerLabel="City"
          accentColor="blue"
        />
        <StatTable
          title="Top 5 ISP's"
          data={stats.top_isps}
          icon={Server}
          labelKey="name"
          valueKey="packets"
          headerLabel="Service Provider"
          accentColor="blue"
        />
      </div>

      <InfectedHostsTable hosts={stats.infected_hosts} />
    </div>
  );
}

function InfectedHostsTable({ hosts = [] }) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const totalPages = Math.ceil(hosts.length / itemsPerPage);
  
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentHosts = hosts.slice(startIndex, startIndex + itemsPerPage);
  const pages = Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
    if (totalPages <= 5) return i + 1;
    if (currentPage <= 3) return i + 1;
    if (currentPage >= totalPages - 2) return totalPages - 4 + i;
    return currentPage - 2 + i;
  });

  return (
    <div className="flex flex-col h-full group bg-card shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-8 py-6 border-b border-theme bg-slate-500/[0.02]">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-rose-600/10 text-rose-600 flex items-center justify-center border border-rose-600/20">
            <Shield size={24} />
          </div>
          <div>
            <h3 className="text-[16px] font-black text-foreground tracking-tight"> Top Affected Hosts</h3>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="px-3 py-1 bg-rose-500/10 border border-rose-500/20 rounded-none text-[10px] font-black text-rose-600">
            Total : {hosts.length}
          </div>
          {totalPages > 1 && (
            <div className="text-[10px] font-black text-slate-600">
              Page <span className="text-foreground">{currentPage}</span> of <span className="text-foreground">{totalPages}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-rose-500/10">
              <tr>
                <th className="w-24 px-8 py-5  font-semibold font-black text-rose-600  ">S.No</th>
                <th className="px-8 py-5  font-semibold font-black text-rose-600 ">Host IP Address</th>
              </tr>
            </thead>
            <tbody className="">
              {currentHosts.map((ip, idx) => (
                <motion.tr 
                  key={ip} 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="hover:bg-rose-500/[0.03] transition-colors group/row cursor-default"
                >
                  <td className="px-8 py-5">
                    <span className="text-[12px]  group-hover/row:text-rose-400 transition-colors">{startIndex + idx + 1}</span>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 rounded-none bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)] opacity-0 group-hover/row:opacity-100 transition-all scale-0 group-hover/row:scale-100" />
                      <span className="text-[14px]  text-foreground tracking-tight group-hover/row:text-rose-500 group-hover/row:translate-x-1 transition-all duration-300">
                        {ip}
                      </span>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="mt-auto p-6 border-t border-theme bg-slate-500/[0.01] flex items-center justify-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className={`w-10 h-10 flex items-center justify-center rounded-none border transition-all ${
                currentPage === 1 
                  ? "text-slate-300 border-slate-100 cursor-not-allowed" 
                  : "text-slate-500 border-theme hover:text-rose-600 hover:border-rose-600 hover:bg-rose-500/5"
              }`}
            >
              <ChevronLeft size={18} />
            </button>

            {pages.map((p) => (
              <motion.button 
                key={p}
                whileHover={{ scale: 1.1, y: -2 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setCurrentPage(p)}
                className={`w-9 h-9 flex items-center justify-center text-[11px] font-black transition-all border rounded-none ${
                  currentPage === p 
                    ? "bg-rose-50 text-rose-600 border-rose-600 shadow-[0_0_20px_rgba(225,29,72,0.15)] scale-110 z-10" 
                    : "bg-card text-slate-500 border-theme hover:text-rose-600 hover:border-rose-600 hover:shadow-lg hover:shadow-rose-500/10"
                }`}
              >
                {p}
              </motion.button>
            ))}

            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className={`w-10 h-10 flex items-center justify-center rounded-none border transition-all ${
                currentPage === totalPages 
                  ? "text-slate-300 border-slate-100 cursor-not-allowed" 
                  : "text-slate-500 border-theme hover:text-rose-600 hover:border-rose-600 hover:bg-rose-500/5"
              }`}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function StatTable({ title, data = [], icon: Icon, labelKey, valueKey, headerLabel, accentColor }) {
  const sortedData = [...data].sort((a, b) => (b[valueKey] || 0) - (a[valueKey] || 0));
  
  const formatValue = (value) => {
    if (value === null || value === undefined) return "0";
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
    return value.toLocaleString();
  };

  return (
    <div className="flex flex-col h-full group bg-card shadow-sm overflow-hidden hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-500">
      <div className="flex items-center justify-center px-6 py-5 border-b border-theme bg-slate-500/[0.02]">
        <div className="flex items-center gap-4 justify-center">
          <div>
            <h3 className="text-[14px] font-black text-foreground tracking-tight">{title}</h3>
          </div>
        </div>
        
      </div>

      <div className="flex-1 flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-blue-500/10">
              <tr>
                <th className="w-20 px-8 py-5 font-semibold font-black text-blue-600  ">S.No</th>
                <th className="px-8 py-5 font-semibold font-black text-blue-600  ">{headerLabel}</th>
                <th className="px-8 py-5 font-semibold  font-black text-blue-600   text-left">Packets</th>
              </tr>
            </thead>
            <tbody className="">
              {sortedData.length > 0 ? (
                sortedData.slice(0, 5).map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-500/5 transition-colors group/row">
                    <td className="px-8 py-5">
                      <span className="text-[12px]  ">{idx + 1}</span>
                    </td>
                    <td className="px-8 py-5">
                      <div className="text-[14px]  tracking-tight group-hover/row:text-purple-500 transition-colors truncate">
                        {item[labelKey]}
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex flex-col items-start">
                        <div className="text-[14px] font-black text-orange-400 tabular-nums tracking-tighter">
                          {formatValue(item[valueKey] ?? item.packets ?? item.count ?? item.value)}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3" className="px-8 py-20 text-center text-slate-400 font-bold text-[10px] uppercase tracking-widest opacity-30">
                    Gathering intelligence records...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

DashboardStats.propTypes = {
  stats: PropTypes.shape({
    top_active_ips: PropTypes.array,
    top_countries: PropTypes.array,
    top_cities: PropTypes.array,
    top_isps: PropTypes.array,
    infected_hosts: PropTypes.array,
  }),
};

InfectedHostsTable.propTypes = {
  hosts: PropTypes.array,
};

StatTable.propTypes = {
  title: PropTypes.string,
  data: PropTypes.array,
  icon: PropTypes.elementType,
  labelKey: PropTypes.string,
  valueKey: PropTypes.string,
  headerLabel: PropTypes.string,
  accentColor: PropTypes.string,
};
