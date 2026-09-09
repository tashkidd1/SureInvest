import { Sheet, SheetContent } from "@/components/ui/sheet";
import NavList from "./NavList";
// Mobile "More" sheet — opened from the 5th bottom-nav tab. Scrolls if needed
// and respects the safe area so content clears the home indicator. Exposes the
// full nav tree so no page is inaccessible on mobile.
export default function MoreSheet({ open, onOpenChange }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="flex max-h-[85vh] flex-col p-0">
        <div className="px-5 pt-5 pb-2">
          <p className="font-display font-semibold">More</p>
          <p className="text-xs text-muted-foreground">All pages</p>
        </div>
        <div className="overflow-y-auto pb-[max(1rem,env(safe-area-inset-bottom))]">
          <NavList onNavigate={() => onOpenChange(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
