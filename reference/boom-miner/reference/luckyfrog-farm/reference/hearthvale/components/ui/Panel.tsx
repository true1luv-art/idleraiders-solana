import React from "react";
import classNames from "classnames";
import { getImageSrc } from "lib/utils/getImageSrc";

import darkBorder from "assets/ui/panel/dark_border.png";
import lightBorder from "assets/ui/panel/light_border.png";

interface Props {
  className?: string;
  style?: { [key: string]: React.CSSProperties };
  onClick?: () => void;
}

/**
 * Default panel has the double layered pixel effect
 */
export const Panel: React.FC<Props> = ({ children, className, style }) => {
  return (
    <OuterPanel className={className} style={style}>
      <InnerPanel>{children}</InnerPanel>
    </OuterPanel>
  );
};

/**
 * Light panel with border effect
 */
export const InnerPanel: React.FC<Props> = ({ children, className, style, onClick }) => {
  return (
    <div
      className={classNames("bg-brown-300 p-1", className)}
      onClick={onClick}
      // Custom styles to get pixellated border effect
      style={{
        // border: "6px solid transparent",
        borderStyle: "solid",
        borderWidth: "6px",
        borderImage: `url(${getImageSrc(lightBorder)}) 30 stretch`,
        borderImageSlice: "25%",
        imageRendering: "pixelated",
        borderImageRepeat: "repeat",
        borderRadius: "20px",
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/**
 * A panel with a single layered pixel effect
 */
export const OuterPanel: React.FC<Props> = ({ children, className, style }) => {
  return (
    <div
      className={classNames(
        "bg-brown-600 p-0.5 text-white shadow-lg font-body text-shadow text-xs sm:text-sm",
        className
      )}
      // Custom styles to get pixellated border effect
      style={{
        // border: "6px solid transparent",
        borderStyle: "solid",
        borderWidth: "6px",
        borderImage: `url(${getImageSrc(darkBorder)}) 30 stretch`,
        borderImageSlice: "25%",
        imageRendering: "pixelated",
        borderImageRepeat: "repeat",
        borderRadius: "20px",
        ...style,
      }}
    >
      {children}
    </div>
  );
};
