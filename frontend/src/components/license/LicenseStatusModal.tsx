
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useUser, useClerk } from "@clerk/clerk-react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { CreditCard, LogOut, Monitor, User } from "lucide-react";
import { useTheme } from "next-themes";

interface LicenseStatusModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function LicenseStatusModal({ open, onOpenChange }: LicenseStatusModalProps) {
    const { user } = useUser();
    const { signOut } = useClerk();
    const { resolvedTheme } = useTheme();
    const [machineId, setMachineId] = useState<string | null>(null);

    useEffect(() => {
        if (open) {
            invoke<string>("get_machine_id").then(setMachineId).catch(console.error);
        }
    }, [open]);

    const license = useQuery(api.licenses.checkLicense, machineId ? { machineId } : "skip");

    const formatDate = (ts?: number) => {
        if (!ts) return "N/A";
        return new Date(ts).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const daysLeft = license?.expiryDate
        ? Math.max(0, Math.ceil((license.expiryDate - Date.now()) / (1000 * 60 * 60 * 24)))
        : 0;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <div className="flex justify-center mb-6">
                        <img
                            src={resolvedTheme === 'dark' ? "/protakeoff-white.png" : "/protakeoff.png"}
                            alt="ProTakeoff"
                            className="h-8 object-contain"
                        />
                    </div>
                    <DialogTitle>Account & License</DialogTitle>
                    <DialogDescription>
                        Manage your user profile and subscription status.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* User Info */}
                    <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 border border-border">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            <User size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium leading-none truncate">
                                {user?.fullName || "User"}
                            </p>
                            <p className="text-sm text-muted-foreground truncate mt-1">
                                {user?.primaryEmailAddress?.emailAddress}
                            </p>
                        </div>
                    </div>

                    {/* License Status */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-heading font-medium flex items-center gap-2">
                            <CreditCard size={16} /> Subscription
                        </h4>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 rounded-md border bg-card">
                                <span className="text-xs text-muted-foreground block mb-1">Status</span>
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${license?.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`} />
                                    <span className="font-medium capitalize">{license?.status || "Unknown"}</span>
                                </div>
                            </div>
                            <div className="p-3 rounded-md border bg-card">
                                <span className="text-xs text-muted-foreground block mb-1">Time Remaining</span>
                                <span className="font-medium">{daysLeft} Days</span>
                            </div>
                        </div>

                        {license?.expiryDate && (
                            <div className="text-xs text-muted-foreground text-center">
                                Expires on {formatDate(license.expiryDate)}
                            </div>
                        )}
                    </div>

                    {/* Machine ID */}
                    <div className="pt-2 border-t">
                        <div className="flex justify-between items-center text-xs text-muted-foreground mt-2">
                            <span className="flex items-center gap-1"><Monitor size={12} /> Machine ID</span>
                            <span className="font-mono bg-muted px-1.5 py-0.5 rounded">{machineId}</span>
                        </div>
                    </div>
                </div>

                <DialogFooter className="sm:justify-between gap-2">
                    <Button variant="outline" className="w-full flex-1" onClick={() => signOut()}>
                        <LogOut size={16} className="mr-2" />
                        Sign Out
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
