import { AlertTriangle, CreditCard } from "lucide-react";
import { useClerk } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";

interface TrialWarningBannerProps {
    trialEndDate: number;
}

export function TrialWarningBanner({ trialEndDate }: TrialWarningBannerProps) {
    const { openUserProfile } = useClerk();

    const now = Date.now();
    const msUntilExpiry = trialEndDate - now;
    const hoursUntilExpiry = msUntilExpiry / (1000 * 60 * 60);

    // Only show if within 24 hours (1 day) of expiry
    if (hoursUntilExpiry > 24 || hoursUntilExpiry <= 0) {
        return null;
    }

    const formatTimeRemaining = () => {
        if (hoursUntilExpiry < 1) {
            const minutes = Math.ceil(msUntilExpiry / (1000 * 60));
            return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
        }
        const hours = Math.ceil(hoursUntilExpiry);
        return `${hours} hour${hours !== 1 ? 's' : ''}`;
    };

    return (
        <div className="fixed top-0 left-0 right-0 z-[9999] bg-yellow-500 text-yellow-950 px-4 py-2 flex items-center justify-center gap-3 shadow-lg">
            <AlertTriangle size={18} className="shrink-0" />
            <span className="text-sm font-medium">
                Your trial ends in <strong>{formatTimeRemaining()}</strong>. Subscribe now to keep your work!
            </span>
            <Button
                size="sm"
                variant="secondary"
                className="h-7 bg-yellow-950 text-yellow-100 hover:bg-yellow-900 hover:text-yellow-50"
                onClick={() => openUserProfile({
                    customPages: [{ url: "/billing", label: "Billing", mountIcon: () => null, unmountIcon: () => null }]
                })}
            >
                <CreditCard size={14} className="mr-1.5" />
                Subscribe
            </Button>
        </div>
    );
}
