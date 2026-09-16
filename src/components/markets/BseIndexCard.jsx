import { Card } from "@/components/ui/card";
import { LineChart } from "@/components/charts/PriceChart";
import { useBseIndex } from "@/hooks/useEntityQueries";
import { formatDate } from "@/lib/format";
export default function BseIndexCard() {
  const { data: index, isLoading } = useBseIndex();
  if (isLoading || !index || !Array.isArray(index.points) || index.points.length < 2) return null;
  const values = index.points.map((p) => p.value);
  const first = values[0];
  const last = values[values.length - 1];
  const changePct = first ? ((last - first) / first) * 100 : 0;
  const tone = changePct >= 0 ? "positive" : "negative";
  return (
    <Card className="p-5 shadow-card border-border/70">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display font-semibold">{index.name || "BSE Domestic Companies Index"}</h3>
          <p className="text-xs text-muted-foreground">
            {index.points.length}-day history · as of {formatDate(index.last_updated)}
          </p>
        </div>
        <div className="text-right">
          <div className="font-semibold tabular-nums">{last.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
          <div className={tone === "positive" ? "text-xs font-medium text-success" : "text-xs font-medium text-destructive"}>
            {changePct >= 0 ? "+" : ""}{changePct.toFixed(2)}% over period
          </div>
        </div>
      </div>
      <div className="mt-3 h-40">
        <LineChart data={values} tone={tone} />
      </div>
    </Card>
  );
}
