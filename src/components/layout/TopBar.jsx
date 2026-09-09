import { Link, useLocation } from "react-router-dom";
import { BRAND } from "@/lib/brand";
import AccountSwitcher from "./AccountSwitcher";
import { Bell, Menu } from "lucide-react";
import { useDisplayName, useNotifications } from "@/hooks/useEntityQueries";
// Top bar shown on every breakpoint. Uses the shared display-name resolution
// (Profile.display_name → User.full_name → email) and the cached notifications
// query so the unread badge stays fresh after mutations.
export default function TopBar({ onOpenMenu }) {
  const location = useLocation();
  const displayName = useDisplayName();
  const notifQ = useNotifications();
  const items = notifQ.data || [];
  const unread = items.filter((n) => !n.read).length;
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md lg:px-6">
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="Open menu"
        className="hidden md:flex lg:hidden h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <Menu className="h-5 w-5" />
      </button>
      <Link to="/" className="flex items-center gap-2 lg:hidden">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground font-display font-bold text-sm">iB</div>
        <span className="font-display font-bold text-[15px]">{BRAND.name}</span>
      </Link>
      <div className="ml-auto flex items-center gap-2">
        <AccountSwitcher className="hidden sm:inline-flex" />
        <Link to="/notifications" className="relative grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Notifications">
          <Bell className="h-[18px] w-[18px]" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[9px] font-bold text-accent-foreground">{unread}</span>
          )}
        </Link>
        <Link to="/profile" className="flex items-center gap-2 rounded-full border border-border bg-card pl-1 pr-3 py-1 hover:shadow-card">
          <div className="grid h-7 w-7 place-items-center rounded-full bg-primary-soft text-primary font-semibold text-xs">
            {(displayName || "I").slice(0, 1).toUpperCase()}
          </div>
          <span className="hidden sm:block text-sm font-medium">{displayName || "Investor"}</span>
        </Link>
      </div>
    </header>
  );
}
