import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { prettyDateShort } from '../../utils/date';

export interface MetricPoint {
  date: string;
  value: number;
}

export function MetricChart({
  data,
  color = '#4f46e5',
  unit = '',
}: {
  data: MetricPoint[];
  color?: string;
  unit?: string;
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-slate-400">
        No data yet
      </div>
    );
  }

  const chartData = data.map((d) => ({ ...d, label: prettyDateShort(d.date) }));

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            tickLine={false}
            axisLine={false}
            domain={['auto', 'auto']}
            width={40}
          />
          <Tooltip
            formatter={(v: number) => [`${v}${unit ? ' ' + unit : ''}`, '']}
            labelStyle={{ color: '#0f172a', fontWeight: 600 }}
            contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2.5}
            dot={{ r: 3, fill: color }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
