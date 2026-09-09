import { useState } from "react";
import PageHeader from "@/components/common/PageHeader";
import Disclaimer from "@/components/common/Disclaimer";
import { LifeBuoy, ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
const FAQ = [
  { q: "What is InvestBW?", a: "InvestBW is a Botswana-focused simulated investment platform. It helps you learn, explore and practise investing through virtual portfolios across Botswana and selected global markets. It is an educational and product-development tool today." },
  { q: "Is this real money?", a: "No. InvestBW is currently a simulated environment. No real money is accepted, no real securities are purchased, and no real trades are executed. You start with P10,000 in virtual cash." },
  { q: "How does simulated investing work?", a: "You browse a curated catalogue of Botswana and global securities, buy and sell with your virtual cash, and track a simulated portfolio. Prices, holdings and transactions persist to your account so you can return later and pick up where you left off." },
  { q: "How is portfolio value calculated?", a: "Your portfolio value is the sum of your virtual cash plus the market value of your holdings (units × latest cached price). Profit/loss is the difference between current value and what you invested." },
  { q: "What are the different asset types?", a: "Stocks (equities) are shares in a company. ETFs hold a basket of many securities. REITs give exposure to real estate. Bonds are loans that pay fixed interest. Digital assets (like Bitcoin) are decentralised and highly volatile." },
  { q: "How do I buy or sell?", a: "Open any investment from the Markets page, enter the number of units, and confirm. Selling works the same way from an investment you already own, or from your portfolio. All trades are validated server-side — you can't spend more cash than you have or sell more than you own." },
  { q: "How do I create a goal?", a: "Go to Goals, set a target amount and date, and contribute virtual cash toward it over time. Contributions come out of your cash account and are tracked separately." },
  { q: "How does Auto-Invest work?", a: "Auto-Invest lets you schedule recurring simulated investments into a chosen instrument. For now the schedule is modelled — no automatic transactions run — but the architecture is ready to enable scheduled execution later." },
  { q: "Is my data private?", a: "Yes. Every user's cash, holdings, transactions, goals, watchlist, notifications and profile are isolated to their account. One user cannot see another user's data." },
];
export default function Help() {
  const [open, setOpen] = useState(0);
  return (
    <div className="space-y-6">
      <PageHeader title="Help" subtitle="Answers to common questions about InvestBW and investing basics." icon={LifeBuoy} />
      <div className="space-y-2.5">
        {FAQ.map((item, i) => (
          <Card key={i} className="overflow-hidden shadow-card border-border/70">
            <button onClick={() => setOpen(open === i ? -1 : i)} className="flex w-full items-center justify-between p-4 text-left">
              <span className="text-sm font-medium">{item.q}</span>
              <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open === i && "rotate-180")} />
            </button>
            {open === i && <div className="px-4 pb-4 text-sm text-muted-foreground">{item.a}</div>}
          </Card>
        ))}
      </div>
      <Disclaimer />
    </div>
  );
}
