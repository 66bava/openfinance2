import { Navigate } from "react-router"
import { Toaster } from "sonner"
import { useAuth } from "../../lib/auth-context"

import Navbar from "../components/landing/Navbar"
import Hero from "../components/landing/Hero"
import SocialProof from "../components/landing/SocialProof"
import Features from "../components/landing/Features"
import ScoreSection from "../components/landing/ScoreSection"
import Dashboard from "../components/landing/Dashboard"
import Pricing from "../components/landing/Pricing"
import FAQ from "../components/landing/FAQ"
import CTA from "../components/landing/CTA"
import Footer from "../components/landing/Footer"

export default function LandingPage() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#FFFFFF",
      }}>
        <div style={{
          width: 28,
          height: 28,
          border: "2.5px solid #0A0A0A",
          borderTopColor: "transparent",
          borderRadius: "50%",
          animation: "spin 0.7s linear infinite",
        }} />
      </div>
    )
  }

  if (user) return <Navigate to="/app" replace />

  return (
    <div style={{
      fontFamily: "var(--font-body)",
      WebkitFontSmoothing: "antialiased",
      MozOsxFontSmoothing: "grayscale",
      backgroundColor: "#FFFFFF",
      color: "#0A0A0A",
      overflowX: "hidden",
    }}>
      <Toaster richColors position="top-center" />
      <Navbar />

      {/* Espaçador para header fixo */}
      <div style={{ height: 64 }} />

      <main>
        <Hero />
        <SocialProof />
        <Features />
        <ScoreSection />
        <Dashboard />
        <Pricing />
        <FAQ />
        <CTA />
      </main>

      <Footer />
    </div>
  )
}
