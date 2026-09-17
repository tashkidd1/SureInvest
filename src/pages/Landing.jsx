import { Link } from "react-router-dom";
import { BRAND, DISCLAIMER } from "@/lib/brand";
import { Button } from "@/components/ui/button";
import {
  LineChart,
  Target,
  GraduationCap,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Wallet,
} from "lucide-react";

const FEATURES = [
  {
    icon: LineChart,
    title: "Botswana & global markets",
    body: "Explore BSE-listed names alongside major global equities and ETFs — all in one practice portfolio.",
  },
  {
    icon: Wallet,
    title: "Virtual cash, real habits",
    body: "Start with simulated Pula. Buy, sell, and top up demo funds without risking real money.",
  },
  {
    icon: Target,
    title: "Goals & Auto-Invest",
    body: "Set targets and schedule recurring investments so you can learn steady, long-term behaviour.",
  },
  {
    icon: GraduationCap,
    title: "Learn as you go",
    body: "Short lessons on stocks, dividends, diversification, and the BSE — written for everyday investors.",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/80 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-sm font-bold text-primary-foreground font-display">
              {BRAND.initials}
            </div>
            <div className="leading-tight">
              <div className="font-display text-[15px] font-bold">{BRAND.name}</div>
              <div className="text-[11px] text-muted-foreground">{BRAND.tagline}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/login">
              <Button variant="ghost" size="sm">
                Log in
              </Button>
            </Link>
            <Link to="/register">
              <Button size="sm">
                Get started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-border/60 bg-grid">
          <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
            <div className="max-w-2xl">
              <p className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                Practice investing for Botswana
              </p>
              <h1 className="mt-4 font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
                Learn to invest with confidence — before you risk a pula.
              </h1>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
                {BRAND.description} Trade on simulated BSE and global markets, track a portfolio, and build habits with goals and Auto-Invest.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/register">
                  <Button size="lg" className="h-12 px-6">
                    Create free account
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/login">
                  <Button size="lg" variant="outline" className="h-12 px-6">
                    Log in
                  </Button>
                </Link>
              </div>
              <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-success" />
                Simulated funds only · No real brokerage · Educational use
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
          <h2 className="font-display text-2xl font-bold tracking-tight">Everything you need to practise</h2>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Built around a clear demo experience so you can focus on learning markets — not paperwork.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="rounded-2xl border border-border/70 bg-card p-5 shadow-card"
              >
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-3 font-display text-base font-semibold">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-y border-border/60 bg-muted/30">
          <div className="mx-auto flex max-w-5xl flex-col items-start gap-4 px-4 py-12 sm:flex-row sm:itemss-center sm:justify-between sm:px-6">
            <div>
              <h2 className="font-display text-xl font-bold">Ready to open a demo account?</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Registration is free. You start with virtual cash and can explore immediately.
              </p>
            </div>
            <Link to="/register">
              <Button size="lg" className="h-11 shrink-0">
                Get started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <p className="text-xs leading-relaxed text-muted-foreground">{DISCLAIMER}</p>
        <p className="mt-4 text-xs text-muted-foreground">
          © {new Date().getFullYear()} {BRAND.name}
        </p>
      </footer>
    </div>
  );
}
