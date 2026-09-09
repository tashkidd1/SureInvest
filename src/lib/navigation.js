// Navigation configuration — single source of truth. Defines the three desktop
// sections (Main / Activity / Account) and the mobile bottom tabs. "More" on
// mobile is a special action (path "__more__") that opens a sheet with the full
// menu, so nothing is inaccessible on a small screen.
import {
  LayoutDashboard,
  LineChart,
  Briefcase,
  Target,
  Repeat,
  Star,
  GraduationCap,
  Sparkles,
  Wallet,
  Receipt,
  Bell,
  User,
  Shield,
  LifeBuoy,
  MoreHorizontal,
} from "lucide-react";
// Primary investing experience.
export const MAIN_NAV = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard },
  { label: "Markets", path: "/markets", icon: LineChart },
  { label: "Portfolio", path: "/portfolio", icon: Briefcase },
  { label: "Goals", path: "/goals", icon: Target },
  { label: "Auto-Invest", path: "/auto-invest", icon: Repeat },
  { label: "Watchlist", path: "/watchlist", icon: Star },
  { label: "Learn", path: "/learn", icon: GraduationCap },
  { label: "Invest Assistant", path: "/assistant", icon: Sparkles, badge: "AI" },
];
// Account / activity section.
export const ACTIVITY_NAV = [
  { label: "Cash", path: "/cash", icon: Wallet },
  { label: "Transactions", path: "/transactions", icon: Receipt },
  { label: "Notifications", path: "/notifications", icon: Bell, badgeKey: "notifications" },
];
// Account settings section.
export const ACCOUNT_NAV = [
  { label: "Profile", path: "/profile", icon: User },
  { label: "Security", path: "/security", icon: Shield },
  { label: "Help", path: "/help", icon: LifeBuoy },
];
// Mobile bottom tabs (max 5). "More" opens the full sheet — not a route.
export const MOBILE_TABS = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard },
  { label: "Markets", path: "/markets", icon: LineChart },
  { label: "Portfolio", path: "/portfolio", icon: Briefcase },
  { label: "Goals", path: "/goals", icon: Target },
  { label: "More", path: "__more__", icon: MoreHorizontal },
];
// Routes that live behind the "More" menu — used to highlight the More tab when
// the user is on one of these pages.
export const MORE_PATHS = [
  "/auto-invest", "/watchlist", "/learn", "/assistant",
  "/cash", "/transactions", "/notifications",
  "/profile", "/security", "/help",
];
// Backward-compat aliases for any code that still imports the older names.
export const PRIMARY_NAV = MAIN_NAV;
export const MOBILE_NAV = MOBILE_TABS;
