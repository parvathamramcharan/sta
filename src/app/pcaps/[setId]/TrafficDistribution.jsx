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

NoData.propTypes = {
  text: PropTypes.string,
};

function ChartContainer({ title, children }) {
  return (
    <div className="bg-card shadow-sm p-6 h-[320px] flex flex-col hover:shadow-md transition-all">
      <div className="flex items-center gap-3 mb-6 shrink-0">
        <div className="w-1.5 h-4 bg-blue-600" />
        <div className="font-bold text-foreground">{title}</div>
      </div>
      <div className="flex-1 w-full min-h-0">
        {children}
      </div>
    </div>
  );
}

ChartContainer.propTypes = {
  title: PropTypes.string,
  children: PropTypes.node,
};

function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card/95 backdrop-blur-sm p-3 rounded-none shadow-xl text-[12px] font-medium text-foreground z-50">
        <p className="text-foreground/60 text-[10px] uppercase mb-1.5 font-bold">
          {label || payload[0].name || payload[0].payload.label}
        </p>
        {payload.map((entry, index) => (
          <p
            key={index}
            className="flex items-center gap-2"
            style={{ color: entry.color || entry.fill || COLORS[index % COLORS.length] }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: entry.color || entry.fill || COLORS[index % COLORS.length] }}
            />
            {entry.name}: {entry.value.toLocaleString()}
          </p>
        ))}
      </div>
    );
  }
  return null;
}

CustomTooltip.propTypes = {
  active: PropTypes.bool,
  payload: PropTypes.array,
  label: PropTypes.string,
};

export default function TrafficDistribution({ data }) {
  const {
    application = [],
    direction = [],
    dns_domains = [],
    top_ssl_domains = [],
    transport = [],
    url_domains = []
  } = data || {};

  const process = (arr, nameKey, valKey) => {
    if (!arr || arr.length === 0) return [];

    return arr.map(item => ({
      label: item.label || item[nameKey] || "Unknown",
      value: item.value || item[valKey] || 0
    }));
  };

  const appData = process(application, "label", "value");
  const dnsData = process(dns_domains, "domain", "count");
  const urlData = process(url_domains, "domain", "count");
  const sslData = process(top_ssl_domains, "label", "value");
  const transData = process(transport, "label", "value");
  const directionData = process(direction, "label", "value");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pb-6">

      {/* Transport Layer */}
      <ChartContainer title="Transport Layer">
        {transData.length === 0 ? (
          <NoData text="No Data Available" />
        ) : (
          <div className="flex h-full items-center">
            <div className="w-1/2 h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={transData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                    nameKey="label"
                    stroke="none"
                  >
                    {transData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>

                  <RechartsTooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="w-1/2 flex flex-col gap-3 pl-6 justify-center">
              {transData.map((entry, index) => {
                const total = transData.reduce(
                  (sum, item) => sum + item.value,
                  0
                );

                const percent = total
                  ? ((entry.value / total) * 100).toFixed(2)
                  : '0.00';

                return (
                  <div key={index} className="flex items-center gap-3">
                    <div
                      className="w-3.5 h-3.5 rounded-none"
                      style={{
                        backgroundColor:
                          COLORS[index % COLORS.length]
                      }}
                    />

                    <span className="text-[13px] font-bold text-foreground uppercase">
                      {entry.label}
                    </span>

                    <span className="text-[12px] text-slate-500 font-medium ml-auto">
                      {percent}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </ChartContainer>

      {/* Application Protocols */}
      <ChartContainer title="Application Protocols (Top 5)">
        {appData.length === 0 ? (
          <NoData text="No Data Available" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={appData.slice(0, 5)}
              layout="vertical"
              margin={{ top: 25, right: 20, left: 10, bottom: 20 }}
            >
              <defs>
                {appData.slice(0, 5).map((_, i) => (
                  <linearGradient
                    key={`grad-${i}`}
                    id={`colorApp${i}`}
                    x1="0"
                    y1="0"
                    x2="1"
                    y2="0"
                  >
                    <stop
                      offset="0%"
                      stopColor={GRADIENTS[i % GRADIENTS.length][0]}
                    />
                    <stop
                      offset="100%"
                      stopColor={GRADIENTS[i % GRADIENTS.length][1]}
                    />
                  </linearGradient>
                ))}
              </defs>

              <CartesianGrid
                horizontal={true}
                vertical={false}
                stroke="hsl(var(--border))"
                strokeDasharray="3 3"
              />

              <XAxis
                type="number"
                tick={{
                  fontSize: 10,
                  fill: '#475569',
                  fontWeight: 'bold'
                }}
                tickFormatter={formatAxisLabel}
                axisLine={false}
                tickLine={false}
              />

              <YAxis
                dataKey="label"
                type="category"
                width={80}
                tick={{
                  fontSize: 11,
                  fill: '#334155',
                  fontWeight: 'bold'
                }}
                axisLine={false}
                tickLine={false}
              />

              <RechartsTooltip
                content={<CustomTooltip />}
                cursor={{ fill: 'hsl(var(--foreground) / 0.05)' }}
              />

              <Bar
                dataKey="value"
                radius={[0, 0, 0, 0]}
                barSize={14}
              >
                {appData.slice(0, 5).map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={`url(#colorApp${index})`}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartContainer>

      {/* URLs */}
      <ChartContainer title="URL's (Top 5)">
        {urlData.length === 0 ? (
          <NoData text="No Data Available" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={urlData.slice(0, 5)}
              margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
            >
              <defs>
                <linearGradient
                  id="colorUri"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor="#48dbfb" />
                  <stop offset="100%" stopColor="#54a0ff" />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="hsl(var(--border))"
              />

              <XAxis
                dataKey="label"
                tick={{
                  fontSize: 10,
                  fill: 'hsl(var(--foreground) / 0.6)',
                  fontWeight: 'bold'
                }}
                axisLine={false}
                tickLine={false}
              />

              <YAxis
                tick={{
                  fontSize: 10,
                  fill: 'hsl(var(--foreground) / 0.6)',
                  fontWeight: 'bold'
                }}
                tickFormatter={formatAxisLabel}
                axisLine={false}
                tickLine={false}
              />

              <RechartsTooltip
                content={<CustomTooltip />}
                cursor={{ fill: 'hsl(var(--foreground) / 0.05)' }}
              />

              <Bar
                dataKey="value"
                fill="url(#colorUri)"
                radius={[0, 0, 0, 0]}
                barSize={24}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartContainer>

      {/* DNS Queries */}
      <ChartContainer title="Top 5 Queried Domains">
        {dnsData.length === 0 ? (
          <NoData text="No  Data Available" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={dnsData.slice(0, 5)}
              layout="vertical"
              margin={{ top: 25, right: 20, left: 10, bottom: 20 }}
            >
              <defs>
                {dnsData.slice(0, 5).map((_, i) => (
                  <linearGradient
                    key={`gradDns-${i}`}
                    id={`colorDns${i}`}
                    x1="0"
                    y1="0"
                    x2="1"
                    y2="0"
                  >
                    <stop
                      offset="0%"
                      stopColor={GRADIENTS[i % GRADIENTS.length][0]}
                    />

                    <stop
                      offset="100%"
                      stopColor={GRADIENTS[i % GRADIENTS.length][1]}
                    />
                  </linearGradient>
                ))}
              </defs>

              <CartesianGrid
                horizontal={true}
                vertical={false}
                stroke="hsl(var(--border))"
                strokeDasharray="3 3"
              />

              <XAxis
                type="number"
                tick={{
                  fontSize: 10,
                  fill: 'hsl(var(--foreground) / 0.6)',
                  fontWeight: 'bold'
                }}
                tickFormatter={formatAxisLabel}
                axisLine={false}
                tickLine={false}
              />

              <YAxis
                dataKey="label"
                type="category"
                width={130}
                tick={{
                  fontSize: 10,
                  fill: 'hsl(var(--foreground) / 0.8)',
                  fontWeight: 'bold'
                }}
                axisLine={false}
                tickLine={false}
              />

              <RechartsTooltip
                content={<CustomTooltip />}
                cursor={{ fill: 'hsl(var(--foreground) / 0.05)' }}
              />

              <Bar
                dataKey="value"
                radius={[0, 0, 0, 0]}
                barSize={12}
              >
                {dnsData.slice(0, 5).map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={`url(#colorDns${index})`}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartContainer>

      {/* Direction */}
      <ChartContainer title="Direction">
        {directionData.length === 0 ? (
          <NoData text="No  Data Available" />
        ) : (
          <div className="flex h-full items-center">
            <div className="w-1/2 h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={directionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                    nameKey="label"
                    stroke="none"
                  >
                    {directionData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          DIRECTION_COLORS[
                            index % DIRECTION_COLORS.length
                          ]
                        }
                      />
                    ))}
                  </Pie>

                  <RechartsTooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="w-1/2 flex flex-col gap-3 pl-6 justify-center">
              {directionData.map((entry, index) => {
                const total = directionData.reduce(
                  (sum, item) => sum + item.value,
                  0
                );

                const percent = total
                  ? ((entry.value / total) * 100).toFixed(2)
                  : '0.00';

                return (
                  <div key={index} className="flex items-center gap-3">
                    <div
                      className="w-3.5 h-3.5 rounded-none"
                      style={{
                        backgroundColor:
                          DIRECTION_COLORS[
                            index % DIRECTION_COLORS.length
                          ]
                      }}
                    />

                    <span className="text-[13px] font-bold text-foreground uppercase">
                      {entry.label}
                    </span>

                    <span className="text-[12px] text-foreground/50 font-medium ml-auto">
                      {percent}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </ChartContainer>

      {/* Server Domains */}
      <ChartContainer title="Top 5 SSL Server Domains">
        {sslData.length === 0 ? (
          <NoData text="No Data Available" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={sslData.slice(0, 5)}
              layout="vertical"
              margin={{ top: 25, right: 20, left: 10, bottom: 20 }}
            >
              <defs>
                {sslData.slice(0, 5).map((_, i) => (
                  <linearGradient
                    key={`gradSsl-${i}`}
                    id={`colorSsl${i}`}
                    x1="0"
                    y1="0"
                    x2="1"
                    y2="0"
                  >
                    <stop
                      offset="0%"
                      stopColor={
                        GRADIENTS[
                          (i + 2) % GRADIENTS.length
                        ][0]
                      }
                    />

                    <stop
                      offset="100%"
                      stopColor={
                        GRADIENTS[
                          (i + 2) % GRADIENTS.length
                        ][1]
                      }
                    />
                  </linearGradient>
                ))}
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                horizontal={true}
                vertical={false}
                stroke="hsl(var(--border))"
              />

              <XAxis
                type="number"
                tick={{
                  fontSize: 10,
                  fill: '#475569',
                  fontWeight: 'bold'
                }}
                tickFormatter={formatAxisLabel}
                axisLine={false}
                tickLine={false}
              />

              <YAxis
                dataKey="label"
                type="category"
                width={130}
                tick={{
                  fontSize: 10,
                  fill: '#334155',
                  fontWeight: 'bold'
                }}
                axisLine={false}
                tickLine={false}
              />

              <RechartsTooltip
                content={<CustomTooltip />}
                cursor={{ fill: 'hsl(var(--foreground) / 0.05)' }}
              />

              <Bar
                dataKey="value"
                radius={[0, 0, 0, 0]}
                barSize={12}
              >
                {sslData.slice(0, 5).map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={`url(#colorSsl${index})`}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartContainer>

    </div>
  );
}

TrafficDistribution.propTypes = {
  data: PropTypes.object,
};
