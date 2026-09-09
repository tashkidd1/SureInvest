import { Info } from "lucide-react";
import { DISCLAIMER } from "@/lib/brand";
import { cn } from "@/lib/utils";
export default function Disclaimer({ className, children }) {
  return (
    <div className={cn("flex gap-2.5 rounded-xl border border-border bg-muted/40 p-3.5 text-xs leading-relaxed text-muted-foreground", className)}>
      <Info className="h-4 w-4 shrink-0 mt-0.5 text-accent" />
      <p>{children || DISCLAIMER}</p>
    </div>
  );
}
