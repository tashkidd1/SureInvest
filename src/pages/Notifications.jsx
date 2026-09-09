import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/common/PageHeader";
import Disclaimer from "@/components/common/Disclaimer";
import { Bell, CheckCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/hooks/useEntityQueries";
import { useAuth } from "@/lib/AuthContext";
export default function Notifications() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const q = useNotifications();
  const items = q.data || [];
  const loading = q.isLoading;
  const unread = items.filter((n) => !n.read).length;
  const markAll = async () => {
    await Promise.all(items.filter((n) => !n.read).map((n) => base44.entities.Notification.update(n.id, { read: true })));
    await qc.invalidateQueries({ queryKey: ["notifications", user?.id] });
  };
  return (
    <div className="space-y-6">
      <PageHeader title="Notifications" subtitle={`${unread} unread`} icon={Bell} />
      <div className="flex justify-end">
        <Button variant="outline" onClick={markAll} disabled={unread === 0}><CheckCheck className="mr-1.5 h-4 w-4" /> Mark all read</Button>
      </div>
      {loading ? (
        <div className="grid place-items-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" /></div>
      ) : items.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">You're all caught up.</Card>
      ) : (
        <Card className="divide-y divide-border shadow-card border-border/70">
          {items.map((n) => (
            <div key={n.id} className={cn("flex items-start gap-3 p-4", !n.read && "bg-primary-soft/40")}>
              <div className={cn("mt-0.5 grid h-9 w-9 place-items-center rounded-full", n.read ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground")}>
                <Bell className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">{n.title}</span>
                  {!n.read && <span className="h-2 w-2 rounded-full bg-accent" />}
                </div>
                <p className="text-sm text-muted-foreground">{n.body}</p>
                <p className="mt-1 text-xs text-muted-foreground">{formatDate(n.created_date, { withTime: true })}</p>
              </div>
            </div>
          ))}
        </Card>
      )}
      <Disclaimer />
    </div>
  );
}
