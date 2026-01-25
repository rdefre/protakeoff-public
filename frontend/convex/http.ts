import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Webhook } from "svix";

const http = httpRouter();

http.route({
    path: "/clerk-billing-webhook",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
        if (!WEBHOOK_SECRET) {
            console.error("Missing CLERK_WEBHOOK_SECRET");
            return new Response("Configuration Error", { status: 500 });
        }

        // Get the headers
        const svix_id = request.headers.get("svix-id");
        const svix_timestamp = request.headers.get("svix-timestamp");
        const svix_signature = request.headers.get("svix-signature");

        // If there are no headers, error out
        if (!svix_id || !svix_timestamp || !svix_signature) {
            return new Response("Error occured -- no svix headers", {
                status: 400,
            });
        }

        // Get the body
        const payload = await request.text();
        const body = payload;

        // Create a new (Svix) Webhook instance with your secret.
        const wh = new Webhook(WEBHOOK_SECRET);

        let evt: any;

        try {
            // Verify the payload using the headers
            evt = wh.verify(body, {
                "svix-id": svix_id,
                "svix-timestamp": svix_timestamp,
                "svix-signature": svix_signature,
            });
        } catch (err) {
            console.error("Error verifying webhook:", err);
            return new Response("Error occured", {
                status: 400,
            });
        }

        const { type, data } = evt;
        console.log(`[Clerk Webhook] Received ${type}`);

        // Handle Subscription Events
        // We care about created, active, updated (if dates change??)
        const handledEvents = [
            "subscription.created",
            "subscription.active",
            "subscriptionItem.updated",
            "subscriptionItem.freeTrialEnding"
        ];

        if (handledEvents.includes(type) || type.startsWith("subscription.")) {

            // Extract User ID. 
            // Note: Clerk payloads put user ID in `data.user_id` sometimes, but for Subscription events 
            // it might be under `data.user_id` logic. 
            // Based on schema provided: `subscription.created` has `data` which is `SubscriptionEventPayload`.
            // BUT SubscriptionEventPayload usually doesn't have `user_id` directly if it's organization based?
            // Wait, for User subscriptions, usually it's tied to a user.
            // Let's assume standard Clerk User Subscription. If it's stripe, `data.customer` maps to stripe customer.
            // HOWEVER, the `SubscriptionEventPayload` provided in the prompt didn't strictly show `user_id`.
            // It has `payer.payer_id` (this seems to be the one!).

            // Extract User ID from Clerk's subscription payload
            // The user ID is in `payer.user_id`, NOT `payer.payer_id`
            // `payer_id` is the commerce payer ID (cpayer_xxx), not the Clerk user ID
            const userId = data.payer?.user_id;

            if (!userId) {
                console.error("No user_id found in subscription event. Payload:", JSON.stringify(data.payer));
                return new Response("No user_id found in payer", { status: 200 }); // Return 200 to acknowledge but ignore
            }

            console.log(`[Clerk Webhook] Processing ${type} for user: ${userId}`);

            // Determine status and trial end date
            let status: "active" | "expired" | "trial" = "active";
            let trialEndDate: number | undefined = undefined;

            // Check if this is a trial subscription
            const isTrial = data.free_trial === true || data.status === "trialing";
            const periodEnd = data.period_end || data.current_period_end;

            if (isTrial && periodEnd) {
                status = "trial";
                // Clerk sends period_end as Unix timestamp (seconds) - convert to ms
                trialEndDate = typeof periodEnd === "number"
                    ? (periodEnd > 1e12 ? periodEnd : periodEnd * 1000)
                    : new Date(periodEnd).getTime();
            }

            if (type === "subscription.past_due" || type === "subscription.unpaid") status = "expired";
            if (type === "subscription.canceled") status = "expired";

            // If it's a new subscription, ensure license record exists
            if (type === "subscription.created") {
                // Try to extract machineId from metadata if present
                // Clerk 'subscription.created' payload has `data.metadata`? 
                // Often passed from checkout session. Let's try to grab it safely.
                // If not present, `provisionLicense` handles it safely.
                const machineId = (data as any).metadata?.machineId;

                await ctx.runMutation(internal.licenses.provisionLicense, {
                    userId: userId,
                    machineId: typeof machineId === 'string' ? machineId : undefined
                });
            }

            await ctx.runMutation(internal.licenses.updateSubscriptionStatus, {
                userId: userId,
                status: status,
                trialEndDate: trialEndDate,
            });
        }


        return new Response("Webhook processed", { status: 200 });
    }),
});

export default http;
