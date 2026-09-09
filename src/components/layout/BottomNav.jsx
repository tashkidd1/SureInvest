import { Link, useLocation } from "react-router-dom";
import { MOBILE_TABS, MORE_PATHS } from "@/lib/navigation";
import { cn } from "@/lib/utils";
// Mobile-only bottom navigation: Dashboard, Markets, Portfolio, Goals, More.
// "More" opens the full More sheet (onMore). Respects safe-area spacing so it
// clears the home indicator. Hidden on md+ where the drawer/sidebar take over.
export default function BottomNav({ onMore }) {
  const location = useLocation();
  const isActive = (path) => (path === "/" ? location.pathname === "/" : location.pathname.startsWith(path));
  const moreActive = MORE_PATHS.some((p) => location.pathname.startsWith(p));
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-border bg-background/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
      <ul className="grid grid-cols-5">
        {MOBILE_TABS.map((item) => {
          const Icon = item.icon;
          const isMore = item.path === "__more__";
          const active = isMore ? moreActive : isActive(item.path);
          const cls = cn(
            "flex w-full flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors",
            active ? "text-primary" : "text-muted-foreground"
          );
          return (
            <li key={item.label}>
              {isMore ? (
                <button type="button" onClick={() => onMore?.()} className={cls}>
                  <Icon className="h-5 w-5" />
                  {item.label}
                </button>
              ) : (
                <Link to={item.path} className={cls}>
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
