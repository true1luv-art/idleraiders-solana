"use client";

import { useEffect, useRef, useState } from "react";
import { detectMobile } from "lib/utils/hooks/useIsMobile";

/**
 * MobileJoystick
 *
 * A fixed-position virtual joystick rendered over the Phaser canvas.
 * Only mounts on mobile devices (detectMobile()).
 *
 * On every pointer/touch move it writes to window.__mobileJoystickInput,
 * which InputSystem._getMobileMovement() reads each Phaser update tick.
 *
 * Shape:
 *   { active: boolean, normalizedX: number, normalizedY: number }
 *   normalizedX / normalizedY are in [-1, 1].
 */

const BASE_RADIUS = 52;   // outer ring radius px
const KNOB_RADIUS = 24;   // draggable knob radius px
const MAX_DRAG    = BASE_RADIUS - KNOB_RADIUS; // max knob travel from center

function writeJoystick(active: boolean, nx: number, ny: number) {
  (window as any).__mobileJoystickInput = { active, normalizedX: nx, normalizedY: ny };
}

export function MobileJoystick() {
  const [isMobile, setIsMobile] = useState(false);

  // Re-evaluate detectMobile() on resize so DevTools emulation and real
  // viewport changes are picked up after the initial render.
  useEffect(() => {
    const update = () => setIsMobile(detectMobile());
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const baseRef  = useRef<HTMLDivElement>(null);
  const knobRef  = useRef<HTMLDivElement>(null);
  const activePointerRef = useRef<number | null>(null);
  const centerRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!isMobile) return;

    writeJoystick(false, 0, 0);

    const base = baseRef.current;
    const knob = knobRef.current;
    if (!base || !knob) return;

    const getCenter = () => {
      const rect = base.getBoundingClientRect();
      centerRef.current = {
        x: rect.left + rect.width  / 2,
        y: rect.top  + rect.height / 2,
      };
    };

    const move = (clientX: number, clientY: number) => {
      const { x: cx, y: cy } = centerRef.current;
      let dx = clientX - cx;
      let dy = clientY - cy;
      const dist = Math.hypot(dx, dy);
      if (dist > MAX_DRAG) {
        dx = (dx / dist) * MAX_DRAG;
        dy = (dy / dist) * MAX_DRAG;
      }
      knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      const nx = MAX_DRAG > 0 ? dx / MAX_DRAG : 0;
      const ny = MAX_DRAG > 0 ? dy / MAX_DRAG : 0;
      writeJoystick(true, nx, ny);
    };

    const reset = () => {
      activePointerRef.current = null;
      knob.style.transform = "translate(-50%, -50%)";
      writeJoystick(false, 0, 0);
    };

    const onPointerDown = (e: PointerEvent) => {
      if (activePointerRef.current !== null) return;
      activePointerRef.current = e.pointerId;
      base.setPointerCapture(e.pointerId);
      getCenter();
      move(e.clientX, e.clientY);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerId !== activePointerRef.current) return;
      move(e.clientX, e.clientY);
    };

    const onPointerUp = (e: PointerEvent) => {
      if (e.pointerId !== activePointerRef.current) return;
      reset();
    };

    base.addEventListener("pointerdown", onPointerDown);
    base.addEventListener("pointermove", onPointerMove);
    base.addEventListener("pointerup",   onPointerUp);
    base.addEventListener("pointercancel", onPointerUp);

    return () => {
      base.removeEventListener("pointerdown", onPointerDown);
      base.removeEventListener("pointermove", onPointerMove);
      base.removeEventListener("pointerup",   onPointerUp);
      base.removeEventListener("pointercancel", onPointerUp);
      writeJoystick(false, 0, 0);
    };
  }, [isMobile]);

  if (!isMobile) return null;

  return (
    <div
      ref={baseRef}
      aria-label="Virtual joystick"
      style={{
        position:        "fixed",
        bottom:          "env(safe-area-inset-bottom, 0px)",
        left:            "env(safe-area-inset-left, 0px)",
        marginBottom:    28,
        marginLeft:      28,
        width:           BASE_RADIUS * 2,
        height:          BASE_RADIUS * 2,
        borderRadius:    "50%",
        background:      "rgba(255,255,255,0.12)",
        border:          "2px solid rgba(255,255,255,0.30)",
        zIndex:          50,
        touchAction:     "none",
        userSelect:      "none",
        WebkitUserSelect:"none",
      }}
    >
      {/* Knob */}
      <div
        ref={knobRef}
        style={{
          position:     "absolute",
          top:          "50%",
          left:         "50%",
          width:        KNOB_RADIUS * 2,
          height:       KNOB_RADIUS * 2,
          borderRadius: "50%",
          background:   "rgba(255,255,255,0.50)",
          border:       "2px solid rgba(255,255,255,0.70)",
          transform:    "translate(-50%, -50%)",
          pointerEvents:"none",
          willChange:   "transform",
        }}
      />
    </div>
  );
}
