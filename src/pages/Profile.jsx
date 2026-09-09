import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/common/PageHeader";
import Disclaimer from "@/components/common/Disclaimer";
import { User, Mail, Globe, Shield, LogOut, Save, Loader2, Target } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/AuthContext";
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
  const { toast } = useToast();
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ display_name: "", risk_tolerance: "moderate", experience_level: "beginner" });
  const load = () => base44.entities.Profile.list("-created_date", 1).then((p) => { setProfile(p[0] || null); setForm({ display_name: p[0]?.display_name || "", risk_tolerance: p[0]?.risk_tolerance || "moderate", experience_level: p[0]?.experience_level || "beginner" }); });
  useEffect(() => { load(); }, []);
  const save = () => {
    if (!profile) return;
    setSaving(true);
    base44.entities.Profile.update(profile.id, {
      display_name: form.display_name,
      risk_tolerance: form.risk_tolerance,
      experience_level: form.experience_level,
    })
      .then(() => { toast({ title: "Profile updated" }); setEditing(false); load(); })
      .catch(() => toast({ title: "Could not update profile", variant: "destructive" }))
      .finally(() => setSaving(false));
  };
  const rows = [
    { icon: Mail, label: "Email", value: user?.email || "—" },
    { icon: Globe, label: "Region", value: profile?.country || "Botswana" },
    { icon: Shield, label: "Risk tolerance", value: profile?.risk_tolerance || "Moderate" },
    { icon: User, label: "Experience", value: profile?.experience_level || "Beginner" },
    { icon: Target, label: "Primary goal", value: profile?.primary_goal || "General" },
  ];
  return (
    <div className="space-y-6">
      <PageHeader title="Profile" subtitle="Your account, preferences and onboarding information." icon={User} />
      <Card className="p-6 shadow-card border-border/70">
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-primary text-primary-foreground font-display text-xl font-bold">
            {(user?.full_name || user?.email || "D").slice(0, 1).toUpperCase()}
          </div>
          <div>
            <div className="font-display text-lg font-bold">{profile?.display_name || user?.full_name || "Demo Investor"}</div>
            <div className="text-sm text-muted-foreground">{user?.email || ""}</div>
            <div className="mt-1.5"><DemoModeBadge /></div>
          </div>
        </div>
      </Card>
      {editing ? (
        <Card className="p-6 space-y-4 shadow-card border-border/70">
          <div className="space-y-1.5">
            <Label htmlFor="dn">Display name</Label>
            <Input id="dn" value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Risk tolerance</Label>
            <div className="flex gap-2">
              {RISK.map((r) => (
                <button key={r.key} onClick={() => setForm({ ...form, risk_tolerance: r.key })} className={cn("flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors", form.risk_tolerance === r.key ? "border-primary bg-primary-soft/60 text-primary" : "border-border hover:border-primary/40")}>
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
          <div className="flex gap-2">
            <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />} Save changes</Button>
            <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </Card>
      ) : (
        <Card className="divide-y divide-border shadow-card border-border/70">
          {rows.map((r) => {
            const Icon = r.icon;
            return (
              <div key={r.label} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-lg bg-muted text-muted-foreground"><Icon className="h-4 w-4" /></div>
                  <span className="text-sm font-medium">{r.label}</span>
                </div>
                <span className="text-sm text-muted-foreground capitalize">{r.value}</span>
              </div>
            );
          })}
        </Card>
      )}
      <div className="flex gap-2">
        {!editing && <Button variant="outline" onClick={() => setEditing(true)}>Edit profile</Button>}
        <Button variant="outline" className="text-destructive hover:text-destructive" onClick={() => logout()}><LogOut className="mr-1.5 h-4 w-4" /> Sign out</Button>
      </div>
      <Disclaimer />
    </div>
  );
}
