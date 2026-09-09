import { Link } from "react-router-dom";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";
import NavList from "./NavList";
import DemoModeBadge from "./DemoModeBadge";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
// Desktop (lg+) persistent left sidebar. Supports an expanded mode (icons +
// labels, w-60) and a collapsed icon-rail mode (w-[68px] with native title
// tooltips). Active page is highlighted and unread notifications show a badge.
export default function Sidebar({ collapsed, onToggleCollapse }) {
  return (
    <aside
      className={cn(
        "hidden lg:flex h-screen sticky top-0 flex-col border-r border-border bg-sidebar transition-[width] duration-200",
        collapsed ? "w-[68px]" : "w-60"
      )}
    >
      <div className={cn("flex h-16 items-center border-b border-border", collapsed ? "justify-center px-2" : "px-5")}>
        <Link to="/" className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground font-display font-bold">iB</div>
          {!collapsed && (
            <div className="leading-tight">
              <div className="font-display font-bold text-[15px]">{BRAND.name}</div>
              <div className="text-[11px] text-muted-foreground">{BRAND.tagline}</div>
            </div>
          )}
        </Link>
      </div>
      <NavList collapsed={collapsed} />
      <div className="border-t border-border p-3">
        {!collapsed && <DemoModeBadge className="mb-2 w-full justify-center" />}
        <button
          onClick={onToggleCollapse}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
            collapsed && "justify-center"
          )}
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
