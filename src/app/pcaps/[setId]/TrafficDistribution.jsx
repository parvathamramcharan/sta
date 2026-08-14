import {
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import PropTypes from 'prop-types';

const COLORS = ['#4834d4', '#22a6b3', '#f0932b', '#eb4d4b', '#be2edd', '#f9ca24', '#e056fd'];

const GRADIENTS = [
  ['#4834d4', '#686de0'],
  ['#22a6b3', '#7ed6df'],
  ['#f0932b', '#ffbe76'],
  ['#eb4d4b', '#ff7979'],
  ['#be2edd', '#e056fd']
];

const DIRECTION_COLORS = ['#f0932b', '#4834d4', '#22a6b3', '#eb4d4b'];

const formatAxisLabel = (value) => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return value;
};

function NoData({ text = "No Data Available" }) {
  return (
    <div className="flex items-center justify-center h-full w-full">
      <div className="text-center">
        <p className="text-sm text-slate-500">{text}</p>
      </div>
    </div>
  );
}

NoData.propTypes = { text: PropTypes.string };

function ChartContainer({ title, children }) {
  return (
    <div className="bg-card shadow-sm rounded-xl p-4 h-[300px] flex flex-col hover:shadow-md transition-all">
      <div className="flex items-center gap-2 mb-3 shrink-0">
        <div className="w-1.5 h-4 bg-blue-600 rounded-full" />
        <div className="font-bold text-foreground">{title}</div>
      </div>
      <div className="flex-1 w-full min-h-0">
        {children}
      </div>
    </div>
  );
}

ChartContainer.propTypes = { title: PropTypes.string, children: PropTypes.node };

function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-3 text-[12px] font-medium text-foreground z-50">
        <p className="text-foreground/60 text-[10px] mb-1.5 font-bold">
          {label || payload[0].name || payload[0].payload.label}
        </p>
        {payload.map((entry, index) => (
          <p key={index} className="flex items-center gap-2"
            style={{ color: entry.color || entry.fill || COLORS[index % COLORS.length] }}>
            <span className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: entry.color || entry.fill || COLORS[index % COLORS.length] }} />
            {entry.name}: {entry.value.toLocaleString()}
          </p>
        ))}
      </div>
    );
  }
  return null;
}

CustomTooltip.propTypes = { active: PropTypes.bool, payload: PropTypes.array, label: PropTypes.string };

export default function TrafficDistribution({ data }) {
  const {
    application = [], direction = [], dns_domains = [],
    top_ssl_domains = [], transport = [], url_domains = []
  } = data || {};

  const process = (arr, nameKey, valKey) => {
    if (!arr || arr.length === 0) return [];
    return arr.map(item => ({
      label: item.label || item[nameKey] || "Unknown",
      value: item.value || item[valKey] || 0
    }));
  };

  const appData       = process(application,    "label",  "value");
  const dnsData       = process(dns_domains,    "domain", "count");
  const urlData       = process(url_domains,    "domain", "count");
  const sslData       = process(top_ssl_domains,"label",  "value");
  const transData     = process(transport,      "label",  "value");
  const directionData = process(direction,      "label",  "value");

  return (
    <div className="mx-6 my-4">
      <div className="rounded-2xl border border-theme bg-card shadow-sm p-4">

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Transport Layer */}
          <ChartContainer title="Transport Layer">
            {transData.length === 0 ? <NoData /> : (
              <div className="flex h-full items-center">
                <div className="w-1/2 h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={transData} cx="50%" cy="50%" innerRadius={60} outerRadius={85}
                        paddingAngle={4} dataKey="value" nameKey="label" stroke="none">
                        {transData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-1/2 flex flex-col gap-1.5 pl-4">
                  {transData.map((entry, index) => {
                    const total = transData.reduce((sum, item) => sum + item.value, 0);
                    const percent = total ? ((entry.value / total) * 100).toFixed(2) : '0.00';
                    return (
                      <div key={index} className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-sm shrink-0"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        <span className="text-[12px] font-medium text-foreground truncate">{entry.label}</span>
                        <span className="text-[11px] text-slate-500 ml-auto tabular-nums shrink-0">{percent}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </ChartContainer>

          {/* Application Protocols */}
          <ChartContainer title="Application Protocols (Top 5)">
            {appData.length === 0 ? <NoData /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={appData.slice(0, 5)} layout="vertical"
                  margin={{ top: 4, right: 40, left: 8, bottom: 24 }} barCategoryGap="40%">
                  <defs>
                    {appData.slice(0, 5).map((_, i) => (
                      <linearGradient key={`grad-${i}`} id={`colorApp${i}`} x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor={GRADIENTS[i % GRADIENTS.length][0]} />
                        <stop offset="100%" stopColor={GRADIENTS[i % GRADIENTS.length][1]} />
                      </linearGradient>
                    ))}
                  </defs>
                  <XAxis type="number" domain={[0, 'dataMax * 1.16']} tick={{ fontSize: 10, fill: '#000000', fontWeight: 'normal' }}
                    tickFormatter={formatAxisLabel} axisLine={false} tickLine={false}
                    label={{ value: 'Packets', position: 'bottom', offset: 8, fontSize: 10, fill: '#000000' }} />
                  <YAxis dataKey="label" type="category" width={110}
                    tick={{ fontSize: 11, fill: '#000000', fontWeight: 'normal' }}
                    axisLine={false} tickLine={false} />
                  <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--foreground) / 0.05)' }} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={10}>
                    {appData.slice(0, 5).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={`url(#colorApp${index})`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartContainer>

          {/* URLs */}
          <ChartContainer title="URLs (Top 5)">
            {urlData.length === 0 ? <NoData /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={urlData.slice(0, 5)} margin={{ top: 8, right: 8, left: 20, bottom: 58 }}>
                  <defs>
                    <linearGradient id="colorUri" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#48dbfb" />
                      <stop offset="100%" stopColor="#54a0ff" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" height={58} interval={0} axisLine={false} tickLine={false}
                    tick={({ x, y, payload }) => {
                      const text = payload.value?.length > 18 ? payload.value.slice(0, 18) + '…' : payload.value;
                      return (
                        <g transform={`translate(${x},${y})`}>
                          <text x={0} y={0} dy={4} textAnchor="end" transform="rotate(-42)"
                            fontSize={10} fill="#000000" fontFamily="sans-serif" fontWeight="normal">{text}</text>
                        </g>
                      );
                    }}
                  />
                  <YAxis tick={{ fontSize: 10, fill: '#000000', fontWeight: 'normal' }}
                    domain={[0, 'dataMax * 1.08']} tickFormatter={formatAxisLabel} axisLine={false} tickLine={false}
                    label={{ value: 'Packets', angle: -90, position: 'insideLeft', offset: -10, fontSize: 10, fill: '#000000' }} />
                  <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--foreground) / 0.05)' }} />
                  <Bar dataKey="value" fill="url(#colorUri)" radius={[4, 4, 0, 0]} barSize={12} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartContainer>

          {/* DNS Queries */}
          <ChartContainer title="Queried Domains (Top 5)">
            {dnsData.length === 0 ? <NoData /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dnsData.slice(0, 5)} layout="vertical"
                  margin={{ top: 4, right: 52, left: 8, bottom: 26 }} barCategoryGap="45%">
                  <defs>
                    {dnsData.slice(0, 5).map((_, i) => (
                      <linearGradient key={`gradDns-${i}`} id={`colorDns${i}`} x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor={GRADIENTS[i % GRADIENTS.length][0]} />
                        <stop offset="100%" stopColor={GRADIENTS[i % GRADIENTS.length][1]} />
                      </linearGradient>
                    ))}
                  </defs>
                  <XAxis type="number" domain={[0, 'dataMax * 1.18']} tick={{ fontSize: 10, fill: '#000000', fontWeight: 'normal' }}
                    tickFormatter={formatAxisLabel} axisLine={false} tickLine={false}
                    label={{ value: 'Packets', position: 'bottom', offset: 10, fontSize: 10, fill: '#000000' }} />
                  <YAxis dataKey="label" type="category" width={140}
                    tick={{ fontSize: 10, fill: '#000000', fontWeight: 'normal' }}
                    axisLine={false} tickLine={false} />
                  <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--foreground) / 0.05)' }} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={10}>
                    {dnsData.slice(0, 5).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={`url(#colorDns${index})`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartContainer>

          {/* Direction — left */}
          <ChartContainer title="Direction">
            {directionData.length === 0 ? <NoData /> : (
              <div className="flex h-full items-center">
                <div className="w-1/2 h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={directionData} cx="50%" cy="50%" innerRadius={60} outerRadius={85}
                        paddingAngle={4} dataKey="value" nameKey="label" stroke="none">
                        {directionData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={DIRECTION_COLORS[index % DIRECTION_COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-1/2 flex flex-col gap-1.5 pl-4">
                  {directionData.map((entry, index) => {
                    const total = directionData.reduce((sum, item) => sum + item.value, 0);
                    const percent = total ? ((entry.value / total) * 100).toFixed(2) : '0.00';
                    return (
                      <div key={index} className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-sm shrink-0"
                          style={{ backgroundColor: DIRECTION_COLORS[index % DIRECTION_COLORS.length] }} />
                        <span className="text-[12px] font-medium text-foreground truncate">{entry.label}</span>
                        <span className="text-[11px] text-foreground/50 ml-auto tabular-nums shrink-0">{percent}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </ChartContainer>

          {/* SSL Server Domains  */}
          <ChartContainer title="SSL Server Domains (Top 5)">
            {sslData.length === 0 ? <NoData /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sslData.slice(0, 5)} layout="vertical"
                  margin={{ top: 4, right: 48, left: 8, bottom: 24 }} barCategoryGap="42%">
                  <defs>
                    {sslData.slice(0, 5).map((_, i) => (
                      <linearGradient key={`gradSsl-${i}`} id={`colorSsl${i}`} x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor={GRADIENTS[(i + 2) % GRADIENTS.length][0]} />
                        <stop offset="100%" stopColor={GRADIENTS[(i + 2) % GRADIENTS.length][1]} />
                      </linearGradient>
                    ))}
                  </defs>
                  <XAxis type="number" domain={[0, 'dataMax * 1.18']} tick={{ fontSize: 10, fill: '#000000', fontWeight: 'normal' }}
                    tickFormatter={formatAxisLabel} axisLine={false} tickLine={false}
                    label={{ value: 'Packets', position: 'bottom', offset: 8, fontSize: 10, fill: '#000000' }} />
                  <YAxis dataKey="label" type="category" width={140}
                    tick={{ fontSize: 10, fill: '#000000', fontWeight: 'normal' }}
                    axisLine={false} tickLine={false} />
                  <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--foreground) / 0.05)' }} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={10}>
                    {sslData.slice(0, 5).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={`url(#colorSsl${index})`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartContainer>

        </div>
      </div>
    </div>
  );
}

TrafficDistribution.propTypes = { data: PropTypes.object };