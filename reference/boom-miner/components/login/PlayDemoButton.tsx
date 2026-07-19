'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGameStore } from '@/features/store/gameStore';
import type { BootstrapPayload } from '@/features/store/gameStore';

const gold      = '#facc15';
const cream     = '#f5e9c4';
const pixelFont = "'Press Start 2P', monospace";
const bodyFont  = "'VT323', monospace";

interface DemoResponse {
  success?: boolean;
  error?:   string;
  player?:  BootstrapPayload['player'];
  heroes?:  BootstrapPayload['heroes'];
  token?:   string;
}

export function PlayDemoButton() {
  const router  = useRouter();
  const hydrate = useGameStore((s) => s.hydrate);
  const [busy,  setBusy]  = useState(false);
  const [error, setError] = useState('');

  async function startDemo() {
    setError('');
    setBusy(true);
    try {
      const res  = await fetch('/api/demo/start', { method: 'POST' });
      const data = await res.json() as DemoResponse;

      if (!res.ok) {
        setError(data.error ?? 'Could not start demo. Try again.');
        return;
      }

      if (data.token)  localStorage.setItem('bm_token', data.token);
      if (data.player) hydrate({ player: data.player, heroes: data.heroes ?? [] });

      router.push('/game');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ marginTop: 40 }}>
      {/* Divider */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        marginBottom: 20,
      }}>
        <div style={{ flex: 1, height: 1, background: 'rgba(245,233,196,0.12)' }} />
        <span style={{ fontFamily: pixelFont, fontSize: 7, color: cream, opacity: 0.4, letterSpacing: 2, whiteSpace: 'nowrap' }}>
          OR
        </span>
        <div style={{ flex: 1, height: 1, background: 'rgba(245,233,196,0.12)' }} />
      </div>

      {/* Demo button */}
      <button
        type="button"
        onClick={startDemo}
        disabled={busy}
        style={{
          width: '100%',
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          background: busy
            ? 'rgba(250,204,21,0.06)'
            : 'rgba(250,204,21,0.08)',
          border: `2px solid ${busy ? 'rgba(250,204,21,0.3)' : gold}`,
          cursor: busy ? 'not-allowed' : 'pointer',
          transition: 'background 0.15s, border-color 0.15s',
          outline: 'none',
        }}
        onMouseEnter={(e) => {
          if (!busy) e.currentTarget.style.background = 'rgba(250,204,21,0.15)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = busy
            ? 'rgba(250,204,21,0.06)'
            : 'rgba(250,204,21,0.08)';
        }}
      >
        {/* Pixel pickaxe icon */}
        {!busy && (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <rect x="1" y="9" width="2" height="2" fill={gold} />
            <rect x="3" y="7" width="2" height="2" fill={gold} />
            <rect x="5" y="5" width="2" height="2" fill={gold} />
            <rect x="7" y="3" width="2" height="2" fill={gold} />
            <rect x="9" y="1" width="4" height="2" fill={gold} />
            <rect x="13" y="3" width="2" height="2" fill={gold} />
            <rect x="15" y="5" width="2" height="2" fill={gold} />
            <rect x="13" y="7" width="2" height="2" fill={gold} />
            <rect x="11" y="5" width="2" height="2" fill={gold} />
            <rect x="7" y="9" width="2" height="2" fill={gold} />
            <rect x="5" y="11" width="2" height="2" fill={gold} />
            <rect x="3" y="13" width="2" height="2" fill={gold} />
            <rect x="1" y="15" width="2" height="2" fill={gold} />
          </svg>
        )}

        {busy && (
          <span style={{
            width: 16, height: 16, border: `2px solid ${gold}`,
            borderTopColor: 'transparent',
            borderRadius: '50%',
            display: 'inline-block',
            animation: 'spin 0.7s linear infinite',
          }} />
        )}

        <span style={{ fontFamily: pixelFont, fontSize: 10, color: gold, letterSpacing: 2 }}>
          {busy ? 'LOADING...' : 'PLAY DEMO'}
        </span>
      </button>

      {/* Badge */}
      <p style={{
        fontFamily: bodyFont, fontSize: 15, color: cream, opacity: 0.45,
        textAlign: 'center', marginTop: 10, marginBottom: 0,
      }}>
        No wallet required &mdash; starts with 100M $BMCOIN &amp; 3 heroes
      </p>

      {error && (
        <p style={{ fontFamily: bodyFont, fontSize: 18, color: '#ef4444', marginTop: 12, marginBottom: 0, textAlign: 'center' }}>
          {error}
        </p>
      )}

      {/* Spinner keyframe */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
