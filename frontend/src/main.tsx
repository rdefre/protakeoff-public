import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from './components/theme-provider'
import { initPlatform } from './utils/platformUrl'

import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { convex } from './lib/convex';
import { LicenseGuard } from './components/license/LicenseGuard';
import { installClerkFetchPatch } from './lib/clerkFetch';

// Install Clerk fetch adapter for Tauri CORS bypass
// See clerkFetch.ts for implementation details and security notes
installClerkFetchPatch();

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
if (!CLERK_PUBLISHABLE_KEY) {
  console.error("Missing VITE_CLERK_PUBLISHABLE_KEY in .env");
}

// Initialize platform detection before React renders
// This ensures buildProtocolUrl() works synchronously
initPlatform().then(() => {

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ClerkProvider
        publishableKey={CLERK_PUBLISHABLE_KEY}
        signInFallbackRedirectUrl="/"
        signUpFallbackRedirectUrl="/"
        signInForceRedirectUrl="/"
        signUpForceRedirectUrl="/"
      >
        <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <LicenseGuard>
              <App />
            </LicenseGuard>
          </ThemeProvider>
        </ConvexProviderWithClerk>
      </ClerkProvider>
    </StrictMode>,
  )
})

