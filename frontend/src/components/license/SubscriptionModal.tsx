
import { PricingTable, useClerk } from "@clerk/clerk-react";
import { LogOut } from "lucide-react";
import { Button } from "../ui/button";

export function SubscriptionModal() {
    const { signOut } = useClerk();

    return (
        // Render as a full page component instead of a fixed overlay. 
        // This avoids stacking context issues with Clerk's popups.
        <div className="min-h-screen w-full bg-background flex items-center justify-center p-4">
            {/* Constrained width to match Clerk's Checkout Modal (approx 480px) */}
            <div className="w-full max-w-[480px] bg-card border border-border text-card-foreground rounded-xl shadow-2xl relative flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="absolute top-4 right-4 z-10">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => signOut()}
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        title="Sign Out"
                    >
                        <LogOut size={16} />
                    </Button>
                </div>

                <div className="p-8 flex flex-col items-center text-center">
                    <div className="mb-6">
                        <h2 className="text-xl font-semibold tracking-tight mb-2">Subscribe to ProTakeoff</h2>
                        <p className="text-sm text-muted-foreground">Select the Standard plan to begin your<br />30-day free trial.</p>
                    </div>

                    <div className="w-full min-h-[300px] flex items-center justify-center">
                        <PricingTable />
                    </div>
                </div>
            </div>
        </div>
    );
}
