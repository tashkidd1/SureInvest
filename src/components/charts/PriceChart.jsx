import { ResponsiveContainer, AreaChart, Area, YAxis, Tooltip, CartesianGrid } from "recharts";
import { formatCurrency } from "@/lib/format";
// Inline price chart for an investment's historical_prices array.
export function LineChart({ data = [], tone = "positive", height }) {
  const color = tone === "positive" ? "hsl(var(--success))" : tone === "negative" ? "hsl(var(--destructive))" : "hsl(var(--muted-foreground))";
  const id = `pc-${tone}`;
  const points = data.map((p, i) => ({ i, v: p }));
  return (
    <div className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
          <YAxis domain={["auto", "auto"]} hide />
          <Tooltip
            contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12 }}
            formatter={(v) => [formatCurrency(v), "Price"]}
            labelFormatter={() => ""}
          />
          <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2} fill={`url(#${id})`} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
