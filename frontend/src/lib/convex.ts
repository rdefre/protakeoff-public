
import { ConvexReactClient } from "convex/react";

// Read from env or default to empty string to prevent crash, user must set this
const convexUrl = import.meta.env.VITE_CONVEX_URL || "";

export const convex = new ConvexReactClient(convexUrl);
