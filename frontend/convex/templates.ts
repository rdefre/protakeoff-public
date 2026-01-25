import { mutation, query } from "./_generated/server";
import { DEFAULT_TEMPLATES } from "./seed_templates_data";

export const getActiveTemplates = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db
            .query("templates")
            .withIndex("by_active", (q) => q.eq("is_active", true))
            .order("desc")
            .collect();
    },
});

export const seedDefaults = mutation({
    args: {},
    handler: async (ctx) => {
        let inserted = 0;
        for (const template of DEFAULT_TEMPLATES) {
            // Check existence by name to avoid duplicates
            const existing = await ctx.db
                .query("templates")
                .filter((q) => q.eq(q.field("name"), template.name))
                .first();

            if (!existing) {
                await ctx.db.insert("templates", {
                    name: template.name,
                    description: template.description || "",
                    is_active: template.is_active,
                    category: template.category || "General",
                    template_data: template.template_data,
                    created_at: template.created_at,
                });
                inserted++;
            }
        }
        return { status: "success", inserted };
    },
});
