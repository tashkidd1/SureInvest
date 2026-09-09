import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { MAIN_NAV, ACTIVITY_NAV, ACCOUNT_NAV } from "@/lib/navigation";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/AuthContext";
import { LogOut } from "lucide-react";
// The full application navigation (Main / Activity / Account + Sign out), with
// unread-notification badges. Shared by the desktop sidebar (expanded or
// collapsed), the tablet drawer and the mobile More sheet so the nav tree is
// defined in exactly one place. `collapsed` renders icons only (with native
// title tooltips); `onNavigate` closes any open drawer/sheet after a tap.
export default function NavList({ collapsed = false, onNavigate }) {
  const location = useLocation();
  const { logout } = useAuth();
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    base44.entities.Notification.list("-created_date", 50)
      .then((n) => setUnread(n.filter((x) => !x.read).length))
      .catch(() => {});
  }, [location.pathname]);
  const isActive = (path) => (path === "/" ? location.pathname === "/" : location.pathname.startsWith(path));
  const renderItem = (item) => {
    const Icon = item.icon;
    const active = isActive(item.path);
    const badge = item.badgeKey === "notifications" ? (unread > 0 ? unread : null) : item.badge;
    return (
      <Link
        to={item.path}
        onClick={onNavigate}
        title={collapsed ? item.label : undefined}
        className={cn(
          "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
          collapsed && "justify-center",
          active
            ? "bg-primary text-primary-foreground shadow-card"
            : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )}
      >
        <Icon className="h-[18px] w-[18px] shrink-0" />
        {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
        {!collapsed && badge && (
          <span className={cn("rounded px-1.5 py-0.5 text-[9px] font-bold uppercase", active ? "bg-primary-foreground/20 text-primary-foreground" : "bg-accent/15 text-accent")}>
            {badge}
          </span>
        )}
        {collapsed && badge && (
          <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[9px] font-bold text-accent-foreground">
            {badge}
          </span>
        )}
      </Link>
    );
  };
  const renderLabel = (text) =>
    collapsed ? <div className="mx-3 my-2 h-px bg-border" /> : <p className="px-3 pb-2 pt-5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{text}</p>;
  return (
    <nav className="flex-1 overflow-y-auto px-3 py-3 scrollbar-hide">
      {renderLabel("Main")}
      <ul className="space-y-0.5">{MAIN_NAV.map((item) => <li key={item.path}>{renderItem(item)}</li>)}</ul>
      {renderLabel("Activity")}
      <ul className="space-y-0.5">{ACTIVITY_NAV.map((item) => <li key={item.path}>{renderItem(item)}</li>)}</ul>
      {renderLabel("Account")}
      <ul className="space-y-0.5">{ACCOUNT_NAV.map((item) => <li key={item.path}>{renderItem(item)}</li>)}</ul>
      <div className="mt-4 border-t border-border pt-3">
        <button
          onClick={logout}
          title={collapsed ? "Sign out" : undefined}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
            collapsed && "justify-center"
          )}
        >
          <LogOut className="h-[18px] w-[18px] shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </nav>
  );
}
