
import { useConvexAuth, useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { AuthModal } from "@/components/auth/AuthModal";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function LicenseGuard({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();
    const { has } = useAuth(); // Clerk Auth Helper


    const [machineId, setMachineId] = useState<string | null>(null);
    const [isBinding, setIsBinding] = useState(false);

    // Fetch Machine ID on mount
    useEffect(() => {
        async function fetchMachineId() {
            try {
                const id = await invoke<string>("get_machine_id");
                setMachineId(id);
            } catch (err) {
                console.error("Failed to get machine ID:", err);
            }
        }
        fetchMachineId();
    }, []);

    // Check License (only if auth & machineId)
    const licenseStatus = useQuery(
        api.licenses.checkLicense,
        isAuthenticated && machineId ? { machineId } : "skip"
    );

    const transferLicense = useMutation(api.licenses.requestTransfer);
    const bindLicense = useMutation(api.licenses.bindLicense);
    const hasStandardPlan = has?.({ plan: "standard" });

    // Auto-bind license for new users (first login after webhook created license)
    // This hook MUST be before any early returns to satisfy React hooks rules
    useEffect(() => {
        async function autoBind() {
            if (licenseStatus?.status === "needs_binding" && machineId && !isBinding) {
                setIsBinding(true);
                try {
                    await bindLicense({ machineId });
                    console.log("License auto-bound to this machine");
                } catch (err) {
                    console.error("Failed to auto-bind license:", err);
                }
                setIsBinding(false);
            }
        }
        autoBind();
    }, [licenseStatus?.status, machineId, isBinding, bindLicense]);

    // --- Early Returns (after all hooks) ---

    if (isAuthLoading) {
        return <div className="flex items-center justify-center h-screen">Loading authentication...</div>;
    }

    if (!isAuthenticated) {
        return <AuthModal />;
    }

    // 1. Check Subscription Status (Clerk)
    // If they are logged in but don't have the plan, show Pricing
    if (!hasStandardPlan) {
        return <SubscriptionModal />;
    }

    if (!machineId) {
        return <div className="flex items-center justify-center h-screen">Verifying device identity...</div>;
    }

    if (licenseStatus === undefined) {
        return <div className="flex items-center justify-center h-screen">Checking license status...</div>;
    }

    // Show loading while auto-binding
    if (licenseStatus?.status === "needs_binding" || isBinding) {
        return (
            <div className="flex flex-col items-center justify-center h-screen gap-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="text-muted-foreground">Activating your license...</p>
            </div>
        );
    }

    // If no license but we have the plan... wait for webhook.
    if (licenseStatus.status === "no_license") {
        return (
            <div className="flex flex-col items-center justify-center h-screen gap-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="text-muted-foreground">Setting up your account... (This may take a moment)</p>
                <Button variant="ghost" size="sm" onClick={() => window.location.reload()} className="mt-4">
                    Check Again
                </Button>
            </div>
        );
    }

    // Transfer Logic (Convex Binding)
    if (licenseStatus.status === "wrong_machine") {
        return (
            <TransferModal
                activeMachineId={licenseStatus.activeMachineId}
                remainingTransfers={licenseStatus.remainingTransfers}
                onTransfer={async () => {
                    if (!machineId) return;
                    await transferLicense({ newMachineId: machineId });
                }}
            />
        );
    }

    if (licenseStatus.status === "expired") {
        return <div className="flex items-center justify-center h-screen">License manually revoked. Contact support.</div>;
    }

    // Active License - show trial warning if applicable
    return (
        <>
            {licenseStatus.trialEndDate && (
                <TrialWarningBanner trialEndDate={licenseStatus.trialEndDate} />
            )}
            {children}
        </>
    );
}

import { AlertTriangle, Monitor, ArrowRightLeft } from "lucide-react";
import { useClerk, useAuth } from "@clerk/clerk-react";
import { useTheme } from "next-themes";
import { SubscriptionModal } from "./SubscriptionModal";
import { TrialWarningBanner } from "./TrialWarningBanner";

function TransferModal({ activeMachineId, remainingTransfers, onTransfer }: { activeMachineId?: string, remainingTransfers?: number, onTransfer: () => Promise<void> }) {
    const { signOut } = useClerk();
    const { resolvedTheme } = useTheme();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleTransfer = async () => {
        setLoading(true);
        setError(null);
        try {
            await onTransfer();
        } catch (err: any) {
            setError(err.message || "Failed to transfer license.");
            setLoading(false);
        }
    };

    return (
        <Dialog open={true}>
            <DialogContent className="sm:max-w-[425px] [&>button]:hidden" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
                <DialogHeader>
                    <div className="flex justify-center mb-6">
                        <img
                            src={resolvedTheme === 'dark' ? "/protakeoff-white.png" : "/protakeoff.png"}
                            alt="ProTakeoff"
                            className="h-8 object-contain"
                        />
                    </div>
                    <div className="mx-auto bg-yellow-100 p-3 rounded-full mb-4">
                        <AlertTriangle className="h-6 w-6 text-yellow-600" />
                    </div>
                    <DialogTitle className="text-center">License Active Elsewhere</DialogTitle>
                    <DialogDescription className="text-center">
                        Your license is currently active on another device.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="bg-muted/50 p-3 rounded-lg border text-sm">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-muted-foreground flex items-center gap-1"><Monitor size={12} /> Active Machine:</span>
                            <span className="font-mono bg-background px-1.5 rounded border">{activeMachineId?.slice(0, 8)}...</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                            Transferring will <strong>revoke access</strong> on the other device immediately.
                        </div>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800 text-sm text-blue-800 dark:text-blue-300">
                        <div className="font-medium flex items-center gap-2 mb-1">
                            <ArrowRightLeft size={14} /> Transfer Limit
                        </div>
                        You have <strong>{remainingTransfers}</strong> transfers remaining this year.
                    </div>

                    {error && (
                        <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded border border-red-200 dark:border-red-800 text-center">
                            {error}
                        </div>
                    )}
                </div>

                <div className="flex flex-col gap-2 mt-4">
                    <Button
                        size="lg"
                        onClick={handleTransfer}
                        disabled={loading || (remainingTransfers !== undefined && remainingTransfers <= 0)}
                    >
                        {loading ? "Transferring..." : "Transfer License to this Device"}
                    </Button>
                    <Button variant="outline" onClick={() => signOut()} disabled={loading}>
                        Sign Out
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}



