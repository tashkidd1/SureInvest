import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/common/PageHeader";
import Disclaimer from "@/components/common/Disclaimer";
import { GraduationCap, BookOpen, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
const CATEGORY_TONE = {
  basics: "bg-primary-soft text-primary",
  strategies: "bg-accent-soft text-accent",
  markets: "bg-warning/15 text-warning",
  tools: "bg-muted text-muted-foreground",
  glossary: "bg-chart-5/15 text-chart-5",
};
export default function Learn() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(null);
  useEffect(() => {
    base44.entities.EducationalContent.list("-created_date", 100).then(setItems).finally(() => setLoading(false));
  }, []);
  return (
    <div className="space-y-6">
      <PageHeader title="Learn" subtitle="Build your investing knowledge, one short lesson at a time." icon={GraduationCap} />
      {open ? (
        <Card className="p-6 shadow-card border-border/70">
          <button onClick={() => setOpen(null)} className="text-sm font-medium text-primary hover:underline">← Back to library</button>
          <h2 className="mt-3 font-display text-2xl font-bold">{open.title}</h2>
          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="capitalize">{open.level}</span> · <span className="capitalize">{open.category}</span> · <span><Clock className="inline h-3 w-3" /> {open.read_time || 4} min</span>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground whitespace-pre-line">{open.content || open.summary}</p>
          <Disclaimer className="mt-6" />
        </Card>
      ) : loading ? (
        <div className="grid place-items-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" /></div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <button key={item.id} onClick={() => setOpen(item)} className="text-left">
              <Card className="h-full p-5 shadow-card border-border/70 hover:shadow-card-hover transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary"><BookOpen className="h-5 w-5" /></div>
                  <span className={cn("rounded px-2 py-0.5 text-[10px] font-semibold uppercase", CATEGORY_TONE[item.category] || CATEGORY_TONE.basics)}>{item.category}</span>
                </div>
                <h3 className="mt-3 font-display font-semibold leading-snug">{item.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{item.summary}</p>
                <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground"><Clock className="h-3 w-3" /> {item.read_time || 4} min · <span className="capitalize">{item.level}</span></div>
              </Card>
            </button>
          ))}
          {items.length === 0 && <Card className="p-8 text-center text-sm text-muted-foreground sm:col-span-2 lg:col-span-3">No lessons yet.</Card>}
        </div>
      )}
      <Disclaimer />
    </div>
  );
}
