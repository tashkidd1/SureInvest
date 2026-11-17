import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BRAND } from "@/lib/brand";
import { Loader2, Sparkles, ShieldCheck, ArrowRight, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

const EXPERIENCE = [
  { key: "beginner", label: "Beginner", desc: "New to investing" },
  { key: "some", label: "Some experience", desc: "I know the basics" },
  { key: "experienced", label: "Experienced", desc: "I invest regularly" },
];
const GOALS = [
  { key: "wealth", label: "Build wealth" },
  { key: "retirement", label: "Retirement" },
  { key: "education", label: "Education" },
  { key: "home", label: "Buying a home" },
  { key: "emergency", label: "Emergency fund" },
  { key: "general", label: "General investing" },
];
const RISK = [
  { key: "conservative", label: "Conservative", desc: "Prefer stability over growth" },
  { key: "moderate", label: "Moderate", desc: "Balanced risk and return" },
  { key: "aggressive", label: "Aggressive", desc: "Comfortable with larger swings" },
];

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0);
  const [experience, setExperience] = useState("");
  const [goal, setGoal] = useState("");
  const [risk, setRisk] = useState("");
  const [firstName, setFirstName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    base44.entities.Profile.list("-created_date", 1)
      .then((p) => {
        if (cancelled) return;
        const prof = p[0];
        if (prof && !prof.onboarding_completed) {
          if (prof.experience_level) {
            setExperience(prof.experience_level);
            setStep(1);
          }
          if (prof.primary_goal && prof.primary_goal !== "general") {
            setGoal(prof.primary_goal);
          }
          if (prof.risk_tolerance) setRisk(prof.risk_tolerance);
          if (prof.first_name) setFirstName(prof.first_name || "");
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setChecking(false); });
    return () => { cancelled = true; };
  }, []);

  const finish = async () => {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      await base44.functions.invoke("onboardUser", {
        experience_level: experience,
        primary_goal: goal,
        risk_tolerance: risk || "moderate",
        first_name: firstName,
      });
      if (typeof onComplete === "function") {
        try { await onComplete(); } catch {}
      }
      window.location.href = "/";
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || "We couldn't complete setup. Please try again.");
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center px-4 py-10">
        <div className="mb-8 flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground font-display font-bold text-sm">{BRAND.initials}</div>
          <span className="font-display text-lg font-bold">{BRAND.name}</span>
        </div>
        <Card className="overflow-hidden shadow-pop border-border/70">
          <div className="bg-primary p-6 text-primary-foreground">
            <div className="flex items-center gap-2 text-sm text-primary-foreground/80">
              <Sparkles className="h-4 w-4" /> Welcome to {BRAND.name}
            </div>
            <h1 className="mt-2 font-display text-2xl font-bold">Let's set up your demo account</h1>
            <p className="mt-1 text-sm text-primary-foreground/80">
              You'll start with <strong>P10,000</strong> in virtual cash to explore and practise — no real money involved.
            </p>
            <div className="mt-4 flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={cn(
                    "h-1 flex-1 rounded-full",
                    i <= step ? "bg-primary-foreground" : "bg-primary-foreground/30"
                  )}
                />
              ))}
            </div>
          </div>
          <div className="p-6">
            {error && (
              <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                <p className="font-medium">Couldn't finish setup</p>
                <p className="mt-0.5 text-destructive/90">{error}</p>
              </div>
            )}
            {step === 0 && (
              <div className="space-y-4">
                <div>
                  <h2 className="font-display text-lg font-semibold">What's your investing experience?</h2>
                  <p className="text-sm text-muted-foreground">This helps us tailor the content you see.</p>
                </div>
                <div className="space-y-2.5">
                  {EXPERIENCE.map((e) => (
                    <button
                      key={e.key}
                      type="button"
                      onClick={() => setExperience(e.key)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-xl border p-4 text-left transition-colors",
                        experience === e.key ? "border-primary bg-primary-soft/60" : "border-border hover:border-primary/40"
                      )}
                    >
                      <div>
                        <div className="font-medium text-sm">{e.label}</div>
                        <div className="text-xs text-muted-foreground">{e.desc}</div>
                      </div>
                      <div className={cn("grid h-5 w-5 place-items-center rounded-full border", experience === e.key ? "border-primary bg-primary text-primary-foreground" : "border-border")}>
                        {experience === e.key && <ShieldCheck className="h-3 w-3" />}
                      </div>
                    </button>
                  ))}
                </div>
                <div className="flex justify-end pt-2">
                  <Button onClick={() => setStep(1)} disabled={!experience}>Continue <ArrowRight className="ml-1.5 h-4 w-4" /></Button>
                </div>
              </div>
            )}
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <h2 className="font-display text-lg font-semibold">What's your primary goal?</h2>
                  <p className="text-sm text-muted-foreground">Pick the one that matters most to you right now.</p>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  {GOALS.map((g) => (
                    <button
                      key={g.key}
                      type="button"
                      onClick={() => setGoal(g.key)}
                      className={cn(
                        "rounded-xl border p-4 text-left text-sm font-medium transition-colors",
                        goal === g.key ? "border-primary bg-primary-soft/60 text-primary" : "border-border hover:border-primary/40"
                      )}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
                <div className="flex justify-between pt-2">
                  <Button variant="outline" onClick={() => setStep(0)}><ArrowLeft className="mr-1.5 h-4 w-4" /> Back</Button>
                  <Button onClick={() => setStep(2)} disabled={!goal}>Continue <ArrowRight className="ml-1.5 h-4 w-4" /></Button>
                </div>
              </div>
            )}
            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <h2 className="font-display text-lg font-semibold">How do you feel about risk?</h2>
                  <p className="text-sm text-muted-foreground">Used only to personalise educational tips — not for advice.</p>
                </div>
                <div className="space-y-2.5">
                  {RISK.map((r) => (
                    <button
                      key={r.key}
                      type="button"
                      onClick={() => setRisk(r.key)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-xl border p-4 text-left transition-colors",
                        risk === r.key ? "border-primary bg-primary-soft/60" : "border-border hover:border-primary/40"
                      )}
                    >
                      <div>
                        <div className="font-medium text-sm">{r.label}</div>
                        <div className="text-xs text-muted-foreground">{r.desc}</div>
                      </div>
                      <div className={cn("grid h-5 w-5 place-items-center rounded-full border", risk === r.key ? "border-primary bg-primary text-primary-foreground" : "border-border")}>
                        {risk === r.key && <ShieldCheck className="h-3 w-3" />}
                      </div>
                    </button>
                  ))}
                </div>
                <div className="space-y-1.5 pt-1">
                  <Label htmlFor="first">Your first name (optional)</Label>
                  <Input id="first" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="e.g. Thabo" />
                </div>
                <div className="flex justify-between pt-2">
                  <Button variant="outline" onClick={() => setStep(1)} disabled={loading}><ArrowLeft className="mr-1.5 h-4 w-4" /> Back</Button>
                  <Button onClick={finish} disabled={!risk || loading}>
                    {loading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
                    Open my account
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          {BRAND.name} is a simulated investment platform for education. No real money is accepted or traded.
        </p>
      </div>
    </div>
  );
}
