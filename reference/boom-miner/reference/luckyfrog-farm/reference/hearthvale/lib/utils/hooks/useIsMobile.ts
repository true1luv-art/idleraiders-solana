import { useEffect, useState } from "react";

/**
 * Threshold below which we treat the viewport as a mobile-sized screen.
 * 900 px covers landscape phones (e.g. iPhone 14 Pro Max landscape = 932 px
 * is handled by touch detection; most Android landscape phones are <= 844 px).
 */
const MOBILE_WIDTH_THRESHOLD = 900;

export function detectMobile() {
  // 1. Explicit touch capability (real devices)
  if ("maxTouchPoints" in navigator && navigator.maxTouchPoints > 0) {
    return true;
  }

  // 2. CSS coarse-pointer media query (stylus / touch screens)
  const coarse = matchMedia("(pointer:coarse)");
  if (coarse?.matches) {
    return true;
  }

  // 3. Viewport width — treat narrow browser windows as mobile so the
  //    joystick and landscape gate activate in DevTools mobile emulation
  //    and on any small-screen device whose browser reports no touch.
  if (typeof window !== "undefined" && window.innerWidth <= MOBILE_WIDTH_THRESHOLD) {
    return true;
  }

  // 4. UA sniffing as last resort
  const UA = navigator.userAgent;
  return (
    /\b(BlackBerry|webOS|iPhone|IEMobile)\b/i.test(UA) ||
    /\b(Android|Windows Phone|iPad|iPod)\b/i.test(UA)
  );
}

export const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(detectMobile());
  }, []);

  return [isMobile];
};
