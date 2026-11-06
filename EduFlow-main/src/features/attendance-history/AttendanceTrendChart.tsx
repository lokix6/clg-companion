import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { OverallPoint } from "./analytics";

export function AttendanceTrendChart({ data }: { data: OverallPoint[] }) {
  const chartData = data.map((d) => ({
    ...d,
    label: new Date(`${d.date}T00:00:00`).toLocaleDateString([], {
      month: "short",
      day: "numeric",
    }),
  }));
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
          <defs>
            <linearGradient id="attendanceFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="label"
            stroke="var(--muted-foreground)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={[0, 100]}
            stroke="var(--muted-foreground)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(v: number | string) => [`${Number(v).toFixed(1)}%`, "Attendance"]}
            labelFormatter={(l) => `Up to ${l}`}
          />
          <ReferenceLine y={75} stroke="var(--destructive)" strokeDasharray="4 4" />
          <Area
            type="monotone"
            dataKey="percent"
            stroke="var(--primary)"
            strokeWidth={2.5}
            fill="url(#attendanceFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
