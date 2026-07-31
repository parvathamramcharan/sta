"use client";

import { useState } from "react";
import PropTypes from "prop-types";
import { motion } from "framer-motion";
import { Globe, MapPin, Server, Activity, Shield, ChevronLeft, ChevronRight, Zap, ChevronDown } from "lucide-react";

export function DashboardStats({ stats }) {
  return (
    <div className="space-y-12">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <StatTable
          title="Top 10 Active IPs"
          data={stats.top_active_ips}
          labelKey="ip"
          headerLabel="IP Address"
        />
        <StatTable
          title="Top 10 Countries"
          data={stats.top_countries}
          labelKey="name"
          headerLabel="Country"
        />
        <StatTable
          title="Top 10 Cities"
          data={stats.top_cities}
          labelKey="name"
          headerLabel="City"
        />
        <StatTable
          title="Top 10 ISP's"
          data={stats.top_isps}
          labelKey="name"
          headerLabel="Service Provider"
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
          <div>
            <h3 className="text-[16px] font-serif text-foreground "> Top Affected Hosts</h3>
          </div>
        </div>
        <div className="flex flex-row items-center gap-12">
          {totalPages > 1 && (
            <div className="text-[13px] font-serif">
              Page <span className="text-foreground">{currentPage}</span> of <span className="text-foreground">{totalPages}</span>
            </div>
          )}
          <div className="px-3 py-1 bg-rose-500/10 border border-rose-500/20 rounded-none text-[13px] font-serif text-rose-600">
            Total : {hosts.length}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-rose-500/10">
              <tr>
                <th className="w-24 px-8 py-2.5  font-serif text-[14px]  text-rose-600  ">S.No</th>
                <th className="px-8 py-2.5  font-serif  text-[14px] text-rose-600 ">Host IP Address</th>
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
                    <span className="text-[12px] font-serif text-foreground group-hover/row:text-rose-400 transition-colors">{startIndex + idx + 1}</span>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <span className="text-[14px]  text-foreground font-serif group-hover/row:text-rose-500 group-hover/row:translate-x-1 transition-all duration-300">
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
                  ? "font-serif  border-slate-100 cursor-not-allowed"
                  : "font-serif  border-theme hover:text-rose-600 hover:border-rose-600 hover:bg-rose-500/5"
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
                className={`w-9 h-9 flex items-center justify-center text-[11px] font-serif transition-all border rounded-none ${
                  currentPage === p
                    ? "bg-rose-50 font-serif text-rose-600 border-rose-600 shadow-[0_0_20px_rgba(225,29,72,0.15)] scale-110 z-10"
                    : "bg-card font-black  font-serif  border-theme hover:text-rose-600 hover:border-rose-600 hover:shadow-lg hover:shadow-rose-500/10"
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

function StatTable({ title, data = [], icon: Icon, labelKey, headerLabel }) {
  // Which metric currently drives the ranking / sort order AND the column shown
  const [metric, setMetric] = useState("packets");

  const sortedData = [...data].sort((a, b) => (b[metric] || 0) - (a[metric] || 0));

  const formatValue = (value) => {
    if (value === null || value === undefined) return "0";
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
    return value.toLocaleString();
  };

  const metricLabel = metric === "packets" ? "Packets" : "Connections";

  return (
    <div className="flex flex-col h-full group bg-card shadow-sm overflow-hidden hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-500">
      <div className="flex items-center justify-between gap-4 px-6 py-5 border-b border-theme bg-slate-500/[0.02]">
        <h3 className="text-[15px] font-serif text-foreground ">{title}</h3>

        {/* Metric dropdown — choose whether ranking/column shows packets or connections */}
        <div className="relative shrink-0">
          <select
            value={metric}
            onChange={(e) => setMetric(e.target.value)}
            className="appearance-none pl-3 pr-8 py-1.5 text-[15px] font-serif border  rounded-none bg-white dark:bg-slate-800 text-blue-900  dark:text-slate-100 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="packets">Packets</option>
            <option value="connections">Connections</option>
          </select>
          <ChevronDown
            size={14}
            className="pointer-events-none absolute  right-2.5 top-1/2 -translate-y-1/2 text-blue-600 dark:text-slate-100"
          />
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="font-serif bg-blue-500/10">
              <tr>
                <th className="w-16 px-6 py-2.5 text-[14px]  font-serif  text-blue-600">S.No</th>
                <th className="px-6 py-2.5 font-serif text-[14px]  text-blue-600">{headerLabel}</th>
                <th className="px-6 py-2.5 font-serif text-blue-600">
                  <div className="flex items-center text-[14px]  font-serif  gap-1.5">
                    {metricLabel}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="">
              {sortedData.length > 0 ? (
                sortedData.slice(0, 10).map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-500/5 transition-colors group/row">
                    <td className="px-6 py-2.5 ">
                     <span className="inline-flex items-center justify-center text-[11px] font-serif" >
                            {idx + 1}
                      </span>
                    </td>
                    <td className="px-6 py-2.5">
                      <div className="text-[14px] font-serif group-hover/row:text-purple-500 transition-colors  max-w-[160px]">
                        {item[labelKey]}
                      </div>
                    </td>
                    <td className="px-6 py-2.5 text-left">
                      <span className="text-[14px] font-serif tabular-nums text-orange-400">
                        {formatValue(item[metric])}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3" className="px-8 py-20 text-center text-slate-400 font-serif text-[10px] opacity-30">
                    Gathering records...
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
  headerLabel: PropTypes.string,
};