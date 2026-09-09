import PageHeader from "@/components/common/PageHeader";
import Disclaimer from "@/components/common/Disclaimer";
import { Card } from "@/components/ui/card";
import { Construction } from "lucide-react";
// Used for screens that are part of the foundation but not yet built out.
export default function ScaffoldPage({ title, subtitle, icon: Icon, description }) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} subtitle={subtitle} icon={Icon} />
      <Card className="flex flex-col items-center justify-center gap-3 p-12 text-center shadow-card border-border/70">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary-soft text-primary">
          <Construction className="h-6 w-6" />
        </div>
        <h2 className="font-display text-lg font-semibold">{title} is scaffolded</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          {description || "This screen is part of the InvestBW foundation and will be built out in the next phase. The routing, layout and design system are all live."}
        </p>
      </Card>
      <Disclaimer />
    </div>
  );
}
