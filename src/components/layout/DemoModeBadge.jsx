import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
export default function DemoModeBadge({ className, compact = false }) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-warning/30 bg-warning/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-warning",
        className
      )}
      title="This is a simulated prototype. No real money or securities are involved."
    >
      <ShieldCheck className="h-3.5 w-3.5" />
      {!compact && <span>Demo Mode</span>}
    </div>
  );
}
