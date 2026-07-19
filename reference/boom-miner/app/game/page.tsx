'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DynamicGameShell } from "@/features/game-components/shell/DynamicGameShell";
import { DynamicPhaserGame } from "@/phaser/DynamicPhaserGame";
import { GameModals } from "@/features/game-components/GameModals";
import { loaderEvents } from "@/phaser/loaderEvents";
import { useGameStore, type BootstrapPayload, type SyncStageMap } from "@/features/store/gameStore";

export default function GamePage() {
  const [progress, setProgress] = useState(0);
  const [fileKey, setFileKey] = useState("");
  const [ready, setReady] = useState(false);

  const hydrate      = useGameStore((s) => s.hydrate);
  const bootstrapped = useGameStore((s) => s.bootstrapped);
  const router       = useRouter();

  // Single bootstrap round-trip — populates store before Phaser boots.
  useEffect(() => {
    const token = localStorage.getItem("bm_token");
    if (!token) {
      router.replace("/login");
      return;
    }

    fetch("/api/bootstrap", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        // Expired or invalid token — clear it and send the player to login.
        if (res.status === 401) {
          localStorage.removeItem("bm_token");
          router.replace("/login");
          return null;
        }
        return res.json() as Promise<{
          success?: boolean;
          player?: BootstrapPayload["player"];
          heroes?: BootstrapPayload["heroes"];
          stageMap?: SyncStageMap;
        }>;
      })
      .then((data) => {
        if (!data) return;
        if (data.success && data.player) {
          hydrate({
            player: data.player,
            heroes: data.heroes ?? [],
            stageMap: data.stageMap,
          });
        }
      })
      .catch(() => {
        // Network failure — game still renders with local defaults.
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const offP = loaderEvents.onProgress((p, f) => {
      setProgress(p);
      if (f) setFileKey(f);
    });
    const offC = loaderEvents.onComplete(() => setReady(true));
    return () => {
      offP();
      offC();
    };
  }, []);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0a0a0a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        overflow: "hidden",
        position: "relative",
      }}
    >
      <DynamicGameShell>
        {bootstrapped ? <DynamicPhaserGame /> : null}
      </DynamicGameShell>
      <GameModals />

      {!ready && <FullPageLoader progress={progress} fileKey={fileKey} />}
    </main>
  );
}

function FullPageLoader({ progress, fileKey }: { progress: number; fileKey: string }) {
  const pct = Math.round(progress * 100);
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "radial-gradient(circle at 50% 30%, #1a2b1a 0%, #050505 70%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        fontFamily: "'Press Start 2P', monospace",
        color: "#f5e9c4",
        pointerEvents: "all",
      }}
    >
      <img
        src="/assets/brand_logo.png"
        alt="Boom Miner"
        style={{ width: 420, maxWidth: "70vw", height: "auto", imageRendering: "pixelated", marginBottom: 12 }}
      />
      <p style={{ marginTop: 16, fontFamily: "'VT323', monospace", fontSize: 18, opacity: 0.85 }}>
        Loading the mines...
      </p>
      <div
        style={{
          marginTop: 32,
          width: 480,
          maxWidth: "80vw",
          height: 28,
          background: "#111",
          border: "4px solid #facc15",
          padding: 2,
          boxShadow: "6px 6px 0 #000",
        }}
      >
        <div style={{ width: `${pct}%`, height: "100%", background: "#facc15", transition: "width 120ms linear" }} />
      </div>
      <div style={{ marginTop: 16, fontSize: 14, color: "#facc15" }}>{pct}%</div>
      <div style={{ marginTop: 8, fontFamily: "'VT323', monospace", fontSize: 16, color: "#888", minHeight: 20 }}>
        {fileKey || "\u00a0"}
      </div>
    </div>
  );
}
