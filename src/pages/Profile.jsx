import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/common/PageHeader";
import Disclaimer from "@/components/common/Disclaimer";
import { User, Mail, Globe, Shield, LogOut, Save, Loader2, Target, Pencil, ChevronRight, FlaskConical } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/AuthContext";
import { useAccount } from "@/lib/AccountContext";
import { useToast } from "@/components/ui/use-toast";
import DemoModeBadge from "@/components/layout/DemoModeBadge";
import { cn } from "@/lib/utils";

const RISK = [
  { key: "conservative", label: "Conservative" },
  { key: "moderate", label: "Moderate" },
  { key: "aggressive", label: "Aggressive" },
];

export default function Profile() {
  const { user, logout } = useAuth();
  const { isDemo } = useAccount();
  const { toast } = useToast();
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ display_name: "", risk_tolerance: "moderate", experience_level: "beginner" });

  const load = () =>
    base44.entities.Profile.list("-created_date", 1).then((p) => {
      setProfile(p[0] || null);
      setForm({
        display_name: p[0]?.display_name || "",
        risk_tolerance: p[0]?.risk_tolerance || "moderate",
        experience_level: p[0]?.experience_level || "beginner",
      });
    });

  useEffect(() => { load(); }, []);

  const save = () => {
    if (!profile) return;
    setSaving(true);
    base44.entities.Profile.update(profile.id, {
      display_name: form.display_name.trim(),
      risk_tolerance: form.risk_tolerance,
      experience_level: form.experience_level,
    })
      .then(() => { toast({ title: "Profile updated" }); setEditing(false); load(); })
      .catch(() => toast({ title: "Could not update profile", variant: "destructive" }))
      .finally(() => setSaving(false));
  };

  const displayName = profile?.display_name || user?.full_name || "Investor";
  const initials = displayName.slice(0, 1).toUpperCase();

  return (
    <div className="space-y-6">
      <PageHeader title="Profile" subtitle="Manage your personal details, investing preferences and account settings." icon={User} />

      <Card className="overflow-hidden border-border/70 shadow-card">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-primary text-xl font-bold text-primary-foreground font-display">{initials}</div>
            <div className="min-w-0">
              <div className="truncate font-display text-lg font-bold">{displayName}</div>
              <div className="truncate text-sm text-muted-foreground">{user?.email || ""}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {isDemo && <DemoModeBadge />}
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"><FlaskConical className="h-3 w-3" /> Simulated account</span>
              </div>
            </div>
          </div>
          {!editing && <Button variant="outline" onClick={() => setEditing(true)}><Pencil className="mr-1.5 h-4 w-4" /> Edit profile</Button>}
        </div>
      </Card>

      {editing ? (
        <Card className="space-y-5 border-border/70 p-5 shadow-card sm:p-6">
          <div>
            <h2 className="font-display font-semibold">Personal preferences</h2>
            <p className="mt-1 text-sm text-muted-foreground">These preferences help tailor the learning and investing experience.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dn">Display name</Label>
            <Input id="dn" value={form.display_name} maxLength={80} onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Risk tolerance</Label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {RISK.map((r) => (
                <button key={r.key} type="button" onClick={() => setForm({ ...form, risk_tolerance: r.key })} className={cn("rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors", form.risk_tolerance === r.key ? "border-primary bg-primary-soft/60 text-primary" : "border-border hover:border-primary/40")}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Investment experience</Label>
            <select className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm" value={form.experience_level} onChange={(e) => setForm({ ...form, experience_level: e.target.value })}>
              <option value="beginner">Beginner</option>
              <option value="some">Some experience</option>
              <option value="experienced">Experienced</option>
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={save} disabled={saving || !profile}>{saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />} Save changes</Button>
            <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-border/70 shadow-card">
            <div className="border-b border-border p-5"><h2 className="font-display font-semibold">Personal information</h2><p className="mt-1 text-xs text-muted-foreground">Information associated with your account.</p></div>
            <div className="divide-y divide-border">
              <InfoRow icon={Mail} label="Email" value={user?.email || "—"} />
              <InfoRow icon={Globe} label="Region" value={profile?.country || "Botswana"} />
            </div>
          </Card>
          <Card className="border-border/70 shadow-card">
            <div className="border-b border-border p-5"><h2 className="font-display font-semibold">Investment profile</h2><p className="mt-1 text-xs text-muted-foreground">Your current learning and investing preferences.</p></div>
            <div className="divide-y divide-border">
              <InfoRow icon={Shield} label="Risk tolerance" value={profile?.risk_tolerance || "Moderate"} />
              <InfoRow icon={User} label="Experience" value={profile?.experience_level || "Beginner"} />
              <InfoRow icon={Target} label="Primary goal" value={profile?.primary_goal || "General"} />
            </div>
          </Card>
        </div>
      )}

      <Card className="border-border/70 shadow-card">
        <div className="border-b border-border p-5"><h2 className="font-display font-semibold">Account & security</h2><p className="mt-1 text-xs text-muted-foreground">Manage access and understand the current account state.</p></div>
        <div className="divide-y divide-border">
          <Link to="/security" className="flex items-center justify-between gap-4 p-4 transition-colors hover:bg-muted/40 sm:p-5">
            <div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-lg bg-muted text-muted-foreground"><Shield className="h-4 w-4" /></div><div><div className="text-sm font-medium">Security settings</div><div className="mt-0.5 text-xs text-muted-foreground">Password reset, session controls and account protection.</div></div></div><ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
          <div className="flex items-center justify-between gap-4 p-4 sm:p-5"><div><div className="text-sm font-medium">Account status</div><div className="mt-0.5 text-xs text-muted-foreground">Real-money investing is not enabled; activity is simulated.</div></div><span className="rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">Active</span></div>
        </div>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" className="text-destructive hover:text-destructive" onClick={() => logout()}><LogOut className="mr-1.5 h-4 w-4" /> Sign out</Button>
      </div>
      <Disclaimer />
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 p-4 sm:p-5">
      <div className="flex min-w-0 items-center gap-3"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground"><Icon className="h-4 w-4" /></div><span className="text-sm font-medium">{label}</span></div>
      <span className="max-w-[55%] truncate text-right text-sm capitalize text-muted-foreground">{value}</span>
    </div>
  );
}
