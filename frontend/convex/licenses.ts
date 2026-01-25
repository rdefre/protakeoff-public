
import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";

// 30 days in milliseconds
// 30 days in milliseconds

// 1 year in milliseconds
const YEAR_MS = 365 * 24 * 60 * 60 * 1000;
const MAX_TRANSFERS_PER_YEAR = 3;

export const checkLicense = query({
    args: { machineId: v.string() },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            return { status: "unauthenticated" };
        }

        const userId = identity.subject;

        // Check for any existing license for this user (Global Check)
        const license = await ctx.db
            .query("licenses")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .first();

        if (!license) {
            return { status: "no_license" };
        }

        const now = Date.now();
        if (license.expiryDate < now) {
            return { status: "expired", expiryDate: license.expiryDate };
        }

        // Check if the license is bound to the current machine
        // Fallback: If currentMachineId is missing (legacy), assume it matches the first machineId or requires migration
        const activeMachine = license.currentMachineId || license.machineId;

        // Special case: New user whose license was created by webhook before they logged in
        // Auto-bind to this machine instead of showing transfer modal
        if (activeMachine === "pending_first_login") {
            return {
                status: "needs_binding",
                licenseId: license._id
            };
        }

        if (activeMachine !== args.machineId) {
            // Calculate remaining transfers
            const lastReset = license.lastTransferReset || 0;
            let currentCount = license.transferCount || 0;

            // If year has passed, count would be reset on next transfer, so effectively 0
            if (now > lastReset + YEAR_MS) {
                currentCount = 0;
            }

            const remainingTransfers = Math.max(0, MAX_TRANSFERS_PER_YEAR - currentCount);

            return {
                status: "wrong_machine",
                activeMachineId: activeMachine,
                remainingTransfers
            };
        }

        // Return trial info for warning banner
        return {
            status: license.status === "trial" ? "trial" : "active",
            expiryDate: license.expiryDate,
            trialEndDate: license.trialEndDate
        };
    },
});

export const requestTransfer = mutation({
    args: { newMachineId: v.string() },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthenticated");

        const userId = identity.subject;
        const license = await ctx.db
            .query("licenses")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .first();

        if (!license) throw new Error("No license found");

        const now = Date.now();
        let transferCount = license.transferCount || 0;
        let lastReset = license.lastTransferReset || now; // Initialize if missing

        // Reset logic if > 1 year
        if (now > lastReset + YEAR_MS) {
            transferCount = 0;
            lastReset = now;
        }

        if (transferCount >= MAX_TRANSFERS_PER_YEAR) {
            throw new Error(`Transfer limit reached (${MAX_TRANSFERS_PER_YEAR}/year). Please contact support.`);
        }

        // Perform Transfer
        await ctx.db.patch(license._id, {
            currentMachineId: args.newMachineId,
            transferCount: transferCount + 1,
            lastTransferReset: lastReset
        });

        return { success: true, remaining: MAX_TRANSFERS_PER_YEAR - (transferCount + 1) };
    }
});

// First-time machine binding for new users (does NOT count as a transfer)
export const bindLicense = mutation({
    args: { machineId: v.string() },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthenticated");

        const userId = identity.subject;
        const license = await ctx.db
            .query("licenses")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .first();

        if (!license) throw new Error("No license found");

        // Only allow binding if machine is pending
        const activeMachine = license.currentMachineId || license.machineId;
        if (activeMachine !== "pending_first_login") {
            throw new Error("License already bound to a machine");
        }

        // Bind to this machine (doesn't count as a transfer)
        await ctx.db.patch(license._id, {
            machineId: args.machineId,
            currentMachineId: args.machineId
        });

        return { success: true };
    }
});

export const provisionLicense = internalMutation({
    args: {
        userId: v.string(), // Passed from webhook
        machineId: v.optional(v.string()) // Optional, from metadata if available
    },
    handler: async (ctx, args) => {
        // Internal mutation - no auth check needed (trusted caller)

        const userId = args.userId;

        // Check global license existence
        const existing = await ctx.db
            .query("licenses")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .first();

        if (existing) {
            // Idempotency: If already exists, just return it. 
            return { status: "exists", license: existing };
        }

        const now = Date.now();
        // Set expiry to far future. We rely on the billing system (Clerk) to manage subscription access.
        const expiryDate = now + (100 * YEAR_MS);

        // Use provided machineId or placeholder
        const machId = args.machineId || "pending_first_login";

        const licenseId = await ctx.db.insert("licenses", {
            userId: userId,
            machineId: machId,
            currentMachineId: args.machineId, // Might be undefined if webhook created it
            status: "active",
            trialStartDate: now,
            expiryDate: expiryDate,
            transferCount: 0,
            lastTransferReset: now,
        });

        return { status: "created", licenseId, expiryDate };
    },
});


export const updateSubscriptionStatus = internalMutation({
    args: {
        userId: v.string(),
        status: v.union(v.literal("active"), v.literal("expired"), v.literal("trial")),
        trialEndDate: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("licenses")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .first();

        const now = Date.now();
        // If active or trial, give it 100 years. If expired, expire now.
        const expiryDate = args.status !== "expired" ? now + (100 * YEAR_MS) : now;

        if (existing) {
            await ctx.db.patch(existing._id, {
                status: args.status,
                expiryDate: expiryDate,
                ...(args.trialEndDate && { trialEndDate: args.trialEndDate }),
            });
        } else {
            // New user signed up directly to paid plan before visiting app?
            // Or webhook beat the client?
            if (args.status !== "expired") {
                await ctx.db.insert("licenses", {
                    userId: args.userId,
                    machineId: "pending_first_login", // Placeholder until they log in
                    currentMachineId: undefined,
                    status: args.status,
                    trialStartDate: now,
                    trialEndDate: args.trialEndDate,
                    expiryDate: expiryDate,
                    transferCount: 0,
                    lastTransferReset: now,
                });
            }
        }
    }
});
