import React, { useEffect, useRef, useState } from "react";

import { Button } from "components/ui/Button";
import { OuterPanel } from "components/ui/Panel";

import { useGameStore } from "features/game/store/useGameStore";

import mobileMenu from "assets/icons/hamburger_menu.png";
import timer from "assets/icons/timer.png";

/**
 * TODO:
 * create menu level parent mapping if more than 2 levels.
 * currently only 1 level deep so setMenuLevel("ROOT") satisfies
 */

export const Menu = () => {
  const dispatch = useGameStore((s) => s.dispatch);

  const [menuOpen, setMenuOpen] = useState(false);

  const ref = useRef<HTMLDivElement>(null);

  // In offline mode, we're always in "playing" state (never readonly or autosaving)
  const isAutosaving = false;
  const isReadonly = false;

  const handleMenuClick = () => {
    setMenuOpen(!menuOpen);
  };

  const handleClick = (e: Event) => {
    // inside click
    if (ref?.current?.contains(e.target as Node)) return;
    // outside click
    setMenuOpen(false);
  };

  const autosave = async () => {
    // Trigger Zustand persist - dispatch a no-op or save event
    // The Zustand store auto-persists, so this is mainly for user feedback
    dispatch({ type: "SAVE" });
  };

  // Handles closing the menu if someone clicks outside
  useEffect(() => {
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("touchstart", handleClick);

    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("touchstart", handleClick);
    };
  }, []);

  return (
    <div ref={ref} className="w-5/12 sm:w-60 fixed top-2 left-2 z-50 shadow-lg">
      <OuterPanel>
        <div className="flex justify-center p-1">
          <Button
            className="mr-2 bg-brown-200 active:bg-brown-200"
            onClick={handleMenuClick}
          >
            <img
              className="md:hidden w-6"
              src={typeof mobileMenu === "string" ? mobileMenu : mobileMenu?.src}
              alt="hamburger-menu"
            />
            <span className="hidden md:flex">Menu</span>
          </Button>
          {!isReadonly && (
            <Button
              onClick={autosave}
              disabled={isAutosaving}
            >
              {isAutosaving ? (
                <img src={typeof timer === "string" ? timer : timer?.src} className="animate-pulsate" alt="saving" />
              ) : (
                <span>Save</span>
              )}
            </Button>
          )}
        </div>
        <div
          className={`transition-all ease duration-200 ${
            menuOpen ? "max-h-100" : "max-h-0"
          }`}
        >
          <ul
            className={`list-none pt-1 transition-all ease duration-200 origin-top ${
              menuOpen ? "scale-y-1" : "scale-y-0"
            }`}
          >

          </ul>
        </div>
      </OuterPanel>

    </div>
  );
};
