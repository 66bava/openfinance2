import posthog from "posthog-js"
import { PostHogProvider as PHProvider } from "posthog-js/react"
import { createBrowserRouter } from "react-router"

type Router = ReturnType<typeof createBrowserRouter>

export function initPostHog(router: Router) {
  if (typeof window === "undefined") return

  posthog.init(import.meta.env.VITE_PUBLIC_POSTHOG_KEY, {
    api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
    capture_pageview: false,
    capture_pageleave: true,
  })

  // Track pageviews on every navigation
  router.subscribe(() => {
    posthog.capture("$pageview", { $current_url: window.location.href })
  })
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  return <PHProvider client={posthog}>{children}</PHProvider>
}
