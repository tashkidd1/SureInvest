import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import BottomNav from "./BottomNav";
import NavDrawer from "./NavDrawer";
import MoreSheet from "./MoreSheet";
import Onboarding from "@/pages/Onboarding";
const COLLAPSE_KEY = "investbw.sidebar.collapsed";
// Wraps every authenticated page and provides the responsive navigation shell:
//   - lg+   : persistent left sidebar (expand/collapse, remembered)
//   - md→lg : hamburger in the top bar opens a slide-out drawer
//   - <md   : 5-tab bottom nav; "More" opens a sheet with the full menu
// Gates the app behind onboarding — a user with no Profile (or an incomplete
// one) sees Onboarding, which creates their account + P10,000 cash once.
export default function AppLayout() {
  const [profile, setProfile] = useState(null);
  const [checking, setChecking] = useState(true);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSE_KEY) === "1");
  const [menuOpen, setMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const loadProfile = () =>
    base44.entities.Profile.list("-created_date", 1)
      .then((p) => setProfile(p[0] || null))
      .catch(() => setProfile(null))
      .finally(() => setChecking(false));
  useEffect(() => { loadProfile(); }, []);
  if (checking) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    );
  }
  if (!profile || !profile.onboarding_completed) {
    return <Onboarding onComplete={loadProfile} />;
  }
  const toggleCollapse = () =>
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      return next;
    });
  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <Sidebar collapsed={collapsed} onToggleCollapse={toggleCollapse} />
        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <TopBar onOpenMenu={() => setMenuOpen(true)} />
          <main className="flex-1 px-4 pb-24 pt-6 md:pb-10 lg:px-8">
            <div className="mx-auto w-full max-w-6xl animate-fade-in">
              <Outlet />
            </div>
          </main>
          <BottomNav onMore={() => setMoreOpen(true)} />
        </div>
      </div>
      <NavDrawer open={menuOpen} onOpenChange={setMenuOpen} />
      <MoreSheet open={moreOpen} onOpenChange={setMoreOpen} />
    </div>
  );
}
