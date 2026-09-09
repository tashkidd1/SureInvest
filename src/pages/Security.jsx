import { Link } from "react-router-dom";
import PageHeader from "@/components/common/PageHeader";
import Disclaimer from "@/components/common/Disclaimer";
import { Shield, KeyRound, Lock, LogOut, EyeOff, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/AuthContext";
export default function Security() {
  const { logout } = useAuth();
  return (
    <div className="space-y-6">
      <PageHeader title="Security" subtitle="Account security, privacy and data isolation." icon={Shield} />
      <Card className="divide-y divide-border shadow-card border-border/70">
        <Row icon={KeyRound} title="Change password" desc="Reset your password via the secure email flow.">
          <Link to="/forgot-password"><Button variant="outline" size="sm">Reset password</Button></Link>
        </Row>
        <Row icon={LogOut} title="Sign out" desc="End your current session on this device.">
          <Button variant="outline" size="sm" onClick={() => logout()}>Sign out</Button>
        </Row>
        <Row icon={Lock} title="Data isolation" desc="Your cash, holdings, transactions, goals, watchlist and notifications are private to your account. Other users cannot read or modify them.">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-3 py-1 text-xs font-medium text-success"><ShieldCheck className="h-3.5 w-3.5" /> Protected by RLS</span>
        </Row>
        <Row icon={EyeOff} title="Secrets" desc="API keys and service credentials are stored server-side only and never exposed to the app or the browser.">
          <span className="text-xs text-muted-foreground">Server-side only</span>
        </Row>
      </Card>
      <Disclaimer />
    </div>
  );
}
function Row({ icon: Icon, title, desc, children }) {
  return (
    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground"><Icon className="h-4 w-4" /></div>
        <div>
          <div className="text-sm font-medium">{title}</div>
          <div className="mt-0.5 max-w-md text-xs text-muted-foreground">{desc}</div>
        </div>
      </div>
      <div className="shrink-0 sm:pl-4">{children}</div>
    </div>
  );
}
