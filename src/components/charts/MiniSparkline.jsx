import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";
import { cn } from "@/lib/utils";
// Renders a tiny sparkline from an array of numbers.
export default function MiniSparkline({ data = [], tone = "primary", className, height = 36 }) {
  const chartData = data.map((v, i) => ({ i, v }));
  const stroke = tone === "positive" ? "hsl(var(--success))" : tone === "negative" ? "hsl(var(--destructive))" : "hsl(var(--muted-foreground))";
  const gradientId = `spark-${tone}`;
  return (
    <div className={cn("w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.25} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis domain={["dataMin", "dataMax"]} hide />
          <Line type="monotone" dataKey="v" stroke={stroke} strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
