import { Sheet, SheetContent } from "@/components/ui/sheet";
import { BRAND } from "@/lib/brand";
import NavList from "./NavList";
// Tablet (md → lg) slide-out navigation drawer, opened from the hamburger in
// the top bar. Exposes every page; the drawer closes after a tap (onNavigate).
export default function NavDrawer({ open, onOpenChange }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-72 max-w-[85vw] p-0">
        <div className="flex h-16 items-center gap-2.5 border-b border-border px-5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground font-display font-bold">iB</div>
          <div className="leading-tight">
            <div className="font-display font-bold text-[15px]">{BRAND.name}</div>
            <div className="text-[11px] text-muted-foreground">{BRAND.tagline}</div>
          </div>
        </div>
        <NavList onNavigate={() => onOpenChange(false)} />
      </SheetContent>
    </Sheet>
  );
}
