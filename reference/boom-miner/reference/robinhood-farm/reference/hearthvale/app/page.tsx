"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { OuterPanel } from "components/ui/Panel";
import { useGameStore } from "features/game/store/useGameStore";

function HeroSection() {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const setUsernameInStore = useGameStore((s) => s.setUsername);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim()) {
      setError("Please enter a username");
      return;
    }

    setError("");
    setLoading(true);

    try {
      setUsernameInStore(username.trim());
      router.push("/phaser");
    } catch (err) {
      console.error("[HeroSection] Login error:", err);
      setError("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="relative min-h-screen flex flex-col">
      {/* Full-width background image */}
      <div className="absolute inset-0 z-0">
        <img
          src="/assets/land/hearthvale-landing.png"
          alt="Hearthvale game world"
          className="w-full h-full object-cover"
        />
        {/* Overlay for text readability */}
        <div className="absolute inset-0 bg-black/60" />
      </div>

      {/* Hero content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6">
        <div className="max-w-xl mx-auto text-center">
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/hearthvale%20logo-Photoroom-ylN6XiXmSMmUrD7zhBkqAMGAITwC3m.png"
            alt="Hearthvale"
            className="w-full max-w-2xl mx-auto drop-shadow-lg"
          />
          <p className="mt-6 text-lg md:text-xl text-white/90 max-w-2xl mx-auto leading-relaxed text-pretty drop-shadow-md">
            A relaxing blockchain farming game where you truly own your land, crops, and progress. Built on Hive.
          </p>

          {/* Inline login form */}
          <form onSubmit={handleLogin} className="mt-10 flex flex-col items-center gap-3 w-full">
            <input
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError("");
              }}
              className="w-full px-4 py-3 rounded-lg bg-brown-300/80 text-white text-sm border-2 border-brown-700 focus:outline-none focus:ring-2 focus:ring-white/30 transition placeholder:text-white/50 backdrop-blur-sm"
              disabled={loading}
            />

            {error && (
              <div className="w-full px-4 py-3 rounded-lg bg-red-900/60 border border-red-700 text-red-100 text-sm">
                {error}
              </div>
            )}

            <button type="submit" className="group w-full">
              <OuterPanel className="flex items-center justify-center gap-2 w-full px-8 py-2.5 text-base font-medium text-white hover:scale-[1.02] transition-transform">
                {loading ? "Signing in..." : "Start Farming"}
                {!loading && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
              </OuterPanel>
            </button>

            {/* Terms disclaimer */}
            <p className="text-xs text-white/70 text-center leading-relaxed mt-1">
              By signing in, you agree to our{" "}
              <Link href="/terms" className="text-white hover:underline font-medium">
                Terms &amp; Conditions
              </Link>
              {" "}and{" "}
              <Link href="/privacy" className="text-white hover:underline font-medium">
                Privacy Policy
              </Link>
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      <HeroSection />
    </main>
  );
}
