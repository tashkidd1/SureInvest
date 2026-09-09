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
export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0);
  const [experience, setExperience] = useState("");
  const [goal, setGoal] = useState("");
  const [firstName, setFirstName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(true);
  // Resume at the correct incomplete step if a partial profile already exists.
  // Once onboarding_completed is true, AppLayout never renders this component,
  // so this only runs for genuinely incomplete onboarding.
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
          if (prof.first_name) setFirstName(prof.first_name || "");
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setChecking(false); });
    return () => { cancelled = true; };
  }, []);
  const finish = async () => {
    if (loading) return; // double-submit guard
    setLoading(true);
    setError("");
    try {
      await base44.functions.invoke("onboardUser", {
        experience_level: experience,
        primary_goal: goal,
        first_name: firstName,
      });
      // Backend persisted onboarding_completed = true. Hard reload guarantees a
      // clean app re-init so the persisted profile is picked up and the user
      // lands on the dashboard — no stale state, no stuck onboarding screen.
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
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground font-display font-bold">iB</div>
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
                <div className="space-y-1.5 pt-1">
                  <Label htmlFor="first">Your first name (optional)</Label>
                  <Input id="first" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="e.g. Thabo" />
                </div>
                <div className="flex justify-between pt-2">
                  <Button variant="outline" onClick={() => setStep(0)} disabled={loading}><ArrowLeft className="mr-1.5 h-4 w-4" /> Back</Button>
                  <Button onClick={finish} disabled={!goal || loading}>
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
