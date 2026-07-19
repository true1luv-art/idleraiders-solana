"use client";

import dynamic from "next/dynamic";

/**
 * /phaser page
 * Standalone Phaser engine prototype — completely isolated from /game.
 * Must be a Client Component because next/dynamic with { ssr: false } is
 * not allowed in Server Components (Next.js 13+).
 */
const PhaserCanvas = dynamic(
  () => import("phaser/PhaserCanvas"),
  { ssr: false }
);

export default function PhaserPage() {
  return (
    <main className="h-full w-full">
      <PhaserCanvas />
    </main>
  );
}
