import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { usePortfolio } from "@/hooks/usePortfolio";
import PortfolioSummary from "@/components/portfolio/PortfolioSummary";
import GoalCard from "@/components/goals/GoalCard";
import InvestmentCard from "@/components/investments/InvestmentCard";
import StatCard from "@/components/common/StatCard";
import Disclaimer from "@/components/common/Disclaimer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, TrendingUp, TrendingDown, Target, Sparkles, GraduationCap, Wallet } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { BRAND } from "@/lib/brand";
import { useDisplayName } from "@/hooks/useEntityQueries";
export default function Home() {
  const portfolio = usePortfolio();
  const displayName = useDisplayName();
  const [movers, setMovers] = useState([]);
  useEffect(() => {
    base44.entities.Investment.list("-daily_change_percent", 6).then(setMovers).catch(() => {});
  }, []);
  const recentTx = portfolio.transactions.slice(0, 4);
  const firstName = (displayName || "there").split(" ")[0];
  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-primary p-6 text-primary-foreground shadow-pop sm:p-8">
        <div className="absolute inset-0 bg-grid opacity-30" />
        <div className="relative">
          <p className="text-sm text-primary-foreground/80">Welcome back, {firstName}</p>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Your money, growing with intention
          </h1>
          <p className="mt-2 max-w-lg text-sm text-primary-foreground/80">
            Practise investing with simulated Botswana and global securities. Learn the ropes, build a portfolio, and reach your goals — no real money involved.
          </p>
          <div className="mt-5 flex flex-wrap gap-2.5">
            <Link to="/markets">
              <Button className="bg-primary-foreground text-primary hover:bg-primary-foreground/90">
                Start investing <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/assistant">
              <Button variant="outline" className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10">
                <Sparkles className="mr-1.5 h-4 w-4" /> Ask the Assistant
              </Button>
            </Link>
          </div>
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
          />
          {portfolio.holdings.length === 0 && portfolio.transactions.length <= 1 && (
            <div className="rounded-2xl border border-accent/30 bg-accent-soft/40 p-6">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground"><Wallet className="h-5 w-5" /></div>
                <div className="flex-1">
                  <h2 className="font-display text-lg font-semibold">Welcome to {BRAND.name}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">You have <strong>P10,000</strong> in virtual funds to explore simulated investing. Here's how to get started — no real money is involved.</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link to="/markets?market=botswana"><Button size="sm">Explore Botswana Markets <ArrowRight className="ml-1.5 h-4 w-4" /></Button></Link>
                    <Link to="/markets?market=global"><Button size="sm" variant="outline">Explore Global Markets</Button></Link>
                    <Link to="/learn"><Button size="sm" variant="ghost"><GraduationCap className="mr-1.5 h-4 w-4" /> Learn the basics</Button></Link>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Goals */}
            <section className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold">Your goals</h2>
                <Link to="/goals" className="text-sm font-medium text-primary hover:underline">View all</Link>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {portfolio.goals.slice(0, 4).map((g) => (
                  <GoalCard key={g.id} goal={g} />
                ))}
                {portfolio.goals.length === 0 && (
                  <Card className="p-6 text-sm text-muted-foreground sm:col-span-2">No goals yet — create one to start goal-based investing.</Card>
                )}
              </div>
              <div className="flex items-center justify-between pt-2">
                <h2 className="font-display text-lg font-semibold">Market movers</h2>
                <Link to="/markets" className="text-sm font-medium text-primary hover:underline">Open markets</Link>
              </div>
              <p className="-mt-2 text-xs text-muted-foreground">Demo market data — simulated prices, not live BSE quotes.</p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {movers.slice(0, 6).map((inv) => (
                  <InvestmentCard key={inv.id} investment={inv} />
                ))}
              </div>
            </section>
            {/* Right rail */}
            <aside className="space-y-4">
              <Card className="p-5 shadow-card border-border/70">
                <h3 className="font-display font-semibold">Recent activity</h3>
                <div className="mt-3 space-y-3">
                  {recentTx.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between gap-2 text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`grid h-8 w-8 place-items-center rounded-full ${tx.type === "buy" ? "bg-success/12 text-success" : tx.type === "sell" ? "bg-destructive/12 text-destructive" : tx.type === "goal_contribution" ? "bg-accent/12 text-accent" : "bg-muted text-muted-foreground"}`}>
                          {tx.type === "buy" ? <TrendingUp className="h-4 w-4" /> : tx.type === "sell" ? <TrendingDown className="h-4 w-4" /> : tx.type === "goal_contribution" ? <Target className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium truncate">{tx.type === "goal_contribution" ? "Goal Contribution" : `${tx.type} ${tx.ticker || ""}`}</div>
                          <div className="text-xs text-muted-foreground">{formatDate(tx.created_date)}</div>
                        </div>
                      </div>
                      <span className="font-semibold tabular-nums">{formatCurrency(tx.amount)}</span>
                    </div>
                  ))}
                  {recentTx.length === 0 && <p className="text-sm text-muted-foreground">No transactions yet.</p>}
                </div>
                <Link to="/transactions" className="mt-4 block">
                  <Button variant="outline" className="w-full">View all transactions</Button>
                </Link>
              </Card>
              <Card className="p-5 shadow-card border-border/70 bg-accent-soft/60">
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-accent" />
                  <h3 className="font-display font-semibold">Learn something new</h3>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">Start with “What is a stock?” — a 4-minute read for complete beginners.</p>
                <Link to="/learn">
                  <Button variant="outline" className="mt-3 w-full">Open Learn library</Button>
                </Link>
              </Card>
              <Disclaimer />
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
