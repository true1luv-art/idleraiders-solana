import React from "react";

import progressEmpty from "assets/ui/progress/blue_empty.png";
import progressAlmost from "assets/ui/progress/blue_almost.png";
import progressHalf from "assets/ui/progress/blue_half.png";

interface Props {
  percentage: number;
}

export const HealthBar: React.FC<Props> = ({ percentage }) => {
  if (percentage >= 50) {
    return <img src={typeof progressHalf === "string" ? progressHalf : progressHalf?.src} className="w-10" />;
  }

  if (percentage >= 25) {
    return <img src={typeof progressAlmost === "string" ? progressAlmost : progressAlmost?.src} className="w-10" />;
  }

  return <img src={typeof progressEmpty === "string" ? progressEmpty : progressEmpty?.src} className="w-10" />;
};
