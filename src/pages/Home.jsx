import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useAccount } from "@/lib/AccountContext";
import PortfolioSummary from "@/components/portfolio/PortfolioSummary";
import GoalCard from "@/components/goals/GoalCard";
import InvestmentCard from "@/components/investments/InvestmentCard";
import Disclaimer from "@/components/common/Disclaimer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, TrendingUp, TrendingDown, Target, GraduationCap, Wallet, BarChart3, Plus, Repeat2 } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { BRAND } from "@/lib/brand";
import { useDisplayName } from "@/hooks/useEntityQueries";
import DemoModeBadge from "@/components/layout/DemoModeBadge";

export default function Home() {
  const portfolio = usePortfolio();
  const { isDemo } = useAccount();
  const displayName = useDisplayName();
  const [movers, setMovers] = useState([]);
  useEffect(() => {
    base44.entities.Investment.list("-daily_change_percent", 6).then(setMovers).catch(() => {});
  }, []);

  const recentTx = portfolio.transactions.slice(0, 4);
  const firstName = (displayName || "there").split(" ")[0];

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Welcome back, {firstName}</p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight sm:text-3xl">Your investment dashboard</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Track your portfolio, practise investing and work toward your goals with simulated Botswana and global markets.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isDemo && <DemoModeBadge compact />}
          <Link to="/markets"><Button size="sm"><BarChart3 className="mr-1.5 h-4 w-4" /> Explore markets</Button></Link>
        </div>
      </div>

      {portfolio.loading ? (
        <div className="grid place-items-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
        </div>
      ) : (
        <>
          <PortfolioSummary
            totalValue={portfolio.totalValue}
            invested={portfolio.invested}
            cash={portfolio.cash}
            pl={portfolio.pl}
            plPercent={portfolio.plPercent}
            history={portfolio.snapshots}
            isDemo={isDemo}
          />

          <div className="grid gap-3 sm:grid-cols-3">
            <Link to="/markets" className="group">
              <Card className="h-full border-border/70 p-4 transition-colors group-hover:border-primary/40 group-hover:bg-primary-soft/20">
                <div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-lg bg-primary-soft text-primary"><Plus className="h-4 w-4" /></div><div><p className="font-semibold">Invest</p><p className="text-xs text-muted-foreground">Explore and practise a trade</p></div></div>
              </Card>
            </Link>
            <Link to="/goals" className="group">
              <Card className="h-full border-border/70 p-4 transition-colors group-hover:border-primary/40 group-hover:bg-primary-soft/20">
                <div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-lg bg-accent-soft text-accent"><Target className="h-4 w-4" /></div><div><p className="font-semibold">Plan a goal</p><p className="text-xs text-muted-foreground">Turn a target into a plan</p></div></div>
              </Card>
            </Link>
            <Link to="/auto-invest" className="group">
              <Card className="h-full border-border/70 p-4 transition-colors group-hover:border-primary/40 group-hover:bg-primary-soft/20">
                <div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-lg bg-muted text-muted-foreground"><Repeat2 className="h-4 w-4" /></div><div><p className="font-semibold">Set up Auto-Invest</p><p className="text-xs text-muted-foreground">Automate your simulated contributions</p></div></div>
              </Card>
            </Link>
          </div>

          {portfolio.holdings.length === 0 && portfolio.transactions.length <= 1 && (
            <Card className="border-accent/30 bg-accent-soft/40 p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground"><Wallet className="h-5 w-5" /></div>
                <div className="flex-1">
                  <h2 className="font-display text-lg font-semibold">Start exploring {BRAND.name}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">You have virtual funds available to practise investing. Explore a market, learn the basics or create your first goal.</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link to="/markets?market=botswana"><Button size="sm">Explore Botswana markets <ArrowRight className="ml-1.5 h-4 w-4" /></Button></Link>
                    <Link to="/markets?market=global"><Button size="sm" variant="outline">Explore global markets</Button></Link>
                    <Link to="/learn"><Button size="sm" variant="ghost"><GraduationCap className="mr-1.5 h-4 w-4" /> Learn the basics</Button></Link>
                  </div>
                </div>
              </div>
            </Card>
          )}

          <div className="grid gap-6 lg:grid-cols-3">
            <section className="space-y-5 lg:col-span-2">
              <div>
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-lg font-semibold">Your goals</h2>
                  <Link to="/goals" className="text-sm font-medium text-primary hover:underline">View all</Link>
                </div>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  {portfolio.goals.slice(0, 4).map((g) => <GoalCard key={g.id} goal={g} />)}
                  {portfolio.goals.length === 0 && <Card className="p-6 text-sm text-muted-foreground sm:col-span-2">No goals yet. Create one to start planning toward a target.</Card>}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <div><h2 className="font-display text-lg font-semibold">Market movers</h2><p className="text-xs text-muted-foreground">Reference prices for simulated investing</p></div>
                  <Link to="/markets" className="text-sm font-medium text-primary hover:underline">Open markets</Link>
                </div>
                <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {movers.slice(0, 6).map((inv) => <InvestmentCard key={inv.id} investment={inv} />)}
                </div>
              </div>
            </section>

            <aside className="space-y-4">
              <Card className="border-border/70 p-5 shadow-card">
                <h3 className="font-display font-semibold">Recent activity</h3>
                <div className="mt-3 space-y-3">
                  {recentTx.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between gap-2 text-sm">
                      <div className="flex min-w-0 items-center gap-2">
                        <div className={`grid h-8 w-8 place-items-center rounded-full ${tx.type === "buy" ? "bg-success/12 text-success" : tx.type === "sell" ? "bg-destructive/12 text-destructive" : tx.type === "goal_contribution" ? "bg-accent/12 text-accent" : "bg-muted text-muted-foreground"}`}>
                          {tx.type === "buy" ? <TrendingUp className="h-4 w-4" /> : tx.type === "sell" ? <TrendingDown className="h-4 w-4" /> : tx.type === "goal_contribution" ? <Target className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                        </div>
                        <div className="min-w-0"><div className="truncate font-medium">{tx.type === "goal_contribution" ? "Goal contribution" : `${tx.type} ${tx.ticker || ""}`}</div><div className="text-xs text-muted-foreground">{formatDate(tx.created_date)}</div></div>
                      </div>
                      <span className="font-semibold tabular-nums">{formatCurrency(tx.amount)}</span>
                    </div>
                  ))}
                  {recentTx.length === 0 && <p className="text-sm text-muted-foreground">No transactions yet.</p>}
                </div>
                <Link to="/transactions" className="mt-4 block"><Button variant="outline" className="w-full">View all transactions</Button></Link>
              </Card>

              <Card className="border-border/70 bg-accent-soft/60 p-5">
                <div className="flex items-center gap-2"><GraduationCap className="h-5 w-5 text-accent" /><h3 className="font-display font-semibold">Keep learning</h3></div>
                <p className="mt-2 text-sm text-muted-foreground">Build your investing knowledge before putting any strategy into practice.</p>
                <Link to="/learn"><Button variant="outline" className="mt-3 w-full">Open Learn library</Button></Link>
              </Card>
              <Disclaimer />
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
