import { FlaskConical, Landmark } from "lucide-react";
import { useAccount } from "@/lib/AccountContext";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
// Segmented Demo / Real account switcher. Switching changes the active
// account space everywhere — every financial view shows only that space's
// data, and trading/goal actions are disabled while Real is selected.
export default function AccountSwitcher({ className }) {
  const { accountType, isDemo, setAccountType } = useAccount();
  const { toast } = useToast();
  const pick = (type) => {
    if (type === accountType) return;
    setAccountType(type);
    if (type === "real") {
      toast({
        title: "Real account view",
        description: "You're viewing your real account space. Trading and goals aren't enabled here yet.",
      });
    }
  };
  const seg = (active, activeClasses) =>
    cn(
      "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors",
      active ? cn("cursor-default", activeClasses) : "cursor-pointer text-muted-foreground hover:text-foreground"
    );
  return (
    <div
      className={cn("inline-flex items-center rounded-full border border-border bg-card p-0.5", className)}
      role="tablist"
      aria-label="Active account"
    >
      <button
        type="button"
        role="tab"
        aria-selected={isDemo}
        onClick={() => pick("demo")}
        title="Virtual funds — simulated trading"
        className={seg(isDemo, isDemo ? "bg-warning/15 text-warning" : "")}
      >
        <FlaskConical className="h-3.5 w-3.5" />
        Demo
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={!isDemo}
        onClick={() => pick("real")}
        title="Real account — trading not yet enabled"
        className={seg(!isDemo, !isDemo ? "bg-accent/15 text-accent" : "")}
      >
        <Landmark className="h-3.5 w-3.5" />
        Real
      </button>
    </div>
  );
}
