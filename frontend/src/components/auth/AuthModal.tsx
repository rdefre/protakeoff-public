import { useState } from "react";
import { SignIn, SignUp } from "@clerk/clerk-react";
import { useTheme } from "next-themes";
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from "@/components/ui/dialog";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";

type AuthMode = "sign-in" | "sign-up";

export function AuthModal() {
    const { resolvedTheme } = useTheme();
    const [mode, setMode] = useState<AuthMode>("sign-in");
    const isDark = resolvedTheme === "dark";

    const sharedAppearance = {
        elements: {
            // AGGRESSIVELY HIDE THE ENTIRE FOOTER SECTION
            footer: { display: "none" },
            footerAction: { display: "none" },
            footerPages: { display: "none" },
            internal_clerk_footer: { display: "none" },

            // REMOVE NATIVE CARD SHELL
            rootBox: {
                width: "100%",
                display: "flex",
                justifyContent: "center"
            },
            cardBox: {
                width: "100%",
                maxWidth: "460px",
                boxShadow: "none",
                borderRadius: "0",
                margin: "0 auto"
            },
            card: {
                width: "100%",
                boxShadow: "none",
                border: "none",
                background: "transparent",
                // Increase padding significantly to avoid corner clipping
                padding: "64px",
                paddingBottom: "32px",
                paddingTop: "48px"
            },

            // TYPOGRAPHY
            headerTitle: "text-2xl font-bold tracking-tight text-foreground",
            headerSubtitle: "text-[15px] text-muted-foreground",

            // FORM ELEMENTS
            formButtonPrimary: "bg-primary text-primary-foreground hover:opacity-90 transition-all rounded-lg h-11 text-sm font-bold mt-4 shadow-sm",
            formFieldLabel: "text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5",
            formFieldInput: "h-11 text-sm border-border bg-background shadow-xs focus:ring-2 focus:ring-ring rounded-lg w-full px-4",
            formFieldAction: "text-[11px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-all cursor-pointer",

            // SOCIAL BUTTONS
            socialButtonsBlockButton: "border-border hover:bg-accent hover:text-accent-foreground shadow-xs h-11 rounded-lg transition-colors mb-2 w-full",
            socialButtonsBlockButtonText: "text-xs font-semibold tracking-tight",

            // IDENTITY PREVIEW
            identityPreviewText: "text-sm font-medium text-foreground",
            identityPreviewEditButton: "text-primary hover:underline font-bold text-[10px] uppercase tracking-wider",
        },
        variables: {
            colorPrimary: isDark ? "#ffffff" : "#6C47FF", // Standard Clerk Purple/Blue
            borderRadius: "0.5rem",
            fontFamily: "system-ui, -apple-system, sans-serif",
        }
    };

    return (
        <Dialog open={true}>
            <DialogContent
                className="p-0 border-none bg-transparent shadow-none max-w-min [&>button]:hidden flex justify-center items-center"
                onInteractOutside={(e) => e.preventDefault()}
                onEscapeKeyDown={(e) => e.preventDefault()}
            >
                <VisuallyHidden.Root>
                    <DialogTitle>Authentication</DialogTitle>
                </VisuallyHidden.Root>

                {/* 
                   Premium Unified Card Container
                   We use a larger width (460px) and a generous radius (2rem).
                */}
                <div className="bg-card text-card-foreground border border-border shadow-[0_0_80px_rgba(0,0,0,0.2)] rounded-[2.5rem] overflow-hidden animate-in fade-in zoom-in-95 duration-300">

                    <div className="flex justify-center w-full min-w-[460px]">
                        {mode === "sign-in" ? (
                            <SignIn
                                forceRedirectUrl="/"
                                fallbackRedirectUrl="/"
                                routing="hash"
                                appearance={sharedAppearance}
                            />
                        ) : (
                            <SignUp
                                forceRedirectUrl="/"
                                fallbackRedirectUrl="/"
                                routing="hash"
                                appearance={sharedAppearance}
                            />
                        )}
                    </div>

                    {/* Highly Consistent Switch Footer */}
                    {/* Clerk-Matched Selection Footer */}
                    <div className="px-12 py-6 border-t border-border/50 bg-white dark:bg-[#1f1f1f] flex flex-col items-center">
                        <button
                            type="button"
                            onClick={() => setMode(mode === "sign-in" ? "sign-up" : "sign-in")}
                            className="text-[16px] font-normal text-[#212126] dark:text-[#E1E1E1] transition-all"
                            style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
                        >
                            {mode === "sign-in" ? (
                                <>Don't have an account? <span className="text-[#6C47FF] font-medium hover:underline">Sign up</span></>
                            ) : (
                                <>Already have an account? <span className="text-[#6C47FF] font-medium hover:underline">Login</span></>
                            )}
                        </button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
