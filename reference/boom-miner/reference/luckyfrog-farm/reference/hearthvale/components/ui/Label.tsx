import React from "react";
import classnames from "classnames";
import { getImageSrc } from "lib/utils/getImageSrc";
import border from "assets/ui/panel/white_border.png";

interface Props {
  className?: string;
}
export const Label: React.FC<Props> = ({ children, className }) => {
  return (
    <div
      className={classnames(
        "bg-silver-300 text-white text-shadow text-xs object-contain justify-center items-center flex ",
        className
      )}
      // Custom styles to get pixellated border effect
      style={{
        // border: "5px solid transparent",
        borderStyle: "solid",
        borderWidth: "5px",
        borderImage: `url(${getImageSrc(border)}) 30 stretch`,
        borderImageSlice: "25%",
        imageRendering: "pixelated",
        borderImageRepeat: "repeat",
        borderRadius: "15px",
      }}
    >
      {children}
    </div>
  );
};
