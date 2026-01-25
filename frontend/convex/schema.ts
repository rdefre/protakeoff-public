
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    licenses: defineTable({
        userId: v.string(), // Clerk User ID (Subject)
        machineId: v.string(), // Original machine ID (or current) - kept for legacy/ref
        currentMachineId: v.optional(v.string()), // The currently active machine
        status: v.union(v.literal("active"), v.literal("expired"), v.literal("trial")),
        trialStartDate: v.number(),
        trialEndDate: v.optional(v.number()), // When trial expires (for warning banner)
        expiryDate: v.number(),
        transferCount: v.optional(v.number()),
        lastTransferReset: v.optional(v.number()),
    })
        .index("by_user", ["userId"])
        .index("by_machine", ["machineId"]) // Legacy index, might not be needed for check
        .index("by_user_machine", ["userId", "machineId"]), // Legacy index

    // Replicating templates table from Supabase for templateService
    templates: defineTable({
        name: v.string(),
        description: v.optional(v.string()),
        is_active: v.boolean(),
        category: v.optional(v.string()),
        template_data: v.any(), // Storing JSON blob as any or generic object
        created_at: v.number(),
    }).index("by_active", ["is_active"]),
});
