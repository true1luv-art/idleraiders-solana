"use client";

import React, { useState } from "react";
import classNames from "classnames";
import { generateAvatarUrl } from "features/game/lib/avatar";
import { getImageSrc } from "lib/utils/getImageSrc";
import { Label } from "./Label";

import darkBorder from "assets/ui/panel/dark_border.png";

interface HeroAvatarProps {
  level?: number;
  name?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeConfig = {
  sm: { container: "w-10 h-10", fallbackText: "text-lg" },
  md: { container: "w-14 h-14", fallbackText: "text-xl" },
  lg: { container: "w-20 h-20", fallbackText: "text-3xl" },
};

export const HeroAvatar: React.FC<HeroAvatarProps> = ({
  level = 1,
  name = "Hero",
  size = "md",
  className,
}) => {
  const [imageError, setImageError] = useState(false);
  const avatarUrl = generateAvatarUrl(name);
  const config = sizeConfig[size];

  return (
    <div className={classNames("relative inline-block", className)}>
      {/* Avatar container with pixelated border matching game theme */}
      <div
        className={classNames(
          "bg-brown-600 flex items-center justify-center overflow-hidden",
          config.container
        )}
        style={{
          borderStyle: "solid",
          borderWidth: "4px",
          borderImage: `url(${getImageSrc(darkBorder)}) 30 stretch`,
          borderImageSlice: "25%",
          imageRendering: "pixelated",
          borderImageRepeat: "repeat",
          borderRadius: "8px",
        }}
      >
        {!imageError ? (
          <img
            src={avatarUrl}
            alt={name}
            className="w-full h-full object-cover"
            style={{ imageRendering: "auto" }}
            onError={() => setImageError(true)}
          />
        ) : (
          <span className={classNames("text-white text-shadow", config.fallbackText)}>
            ?
          </span>
        )}
      </div>

      {/* Level badge using game's Label component - bottom right */}
      <Label className="absolute -bottom-2 -right-2 px-1.5 py-0 min-w-[1.25rem] text-center">
        {level}
      </Label>
    </div>
  );
};

export default HeroAvatar;
