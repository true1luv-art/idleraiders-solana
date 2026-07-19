// Simple placeholder image generator using data URLs
// Returns a colored square as a placeholder for missing images

type PlaceholderCategory = 
  | "food" 
  | "crop" 
  | "seed" 
  | "tool" 
  | "resource" 
  | "skill" 
  | "default";

const CATEGORY_COLORS: Record<PlaceholderCategory, string> = {
  food: "#f97316",     // orange for food
  crop: "#22c55e",     // green for crops
  seed: "#84cc16",     // lime for seeds
  tool: "#6b7280",     // gray for tools
  resource: "#a78bfa", // purple for resources
  skill: "#3b82f6",    // blue for skills
  default: "#9ca3af",  // gray default
};

/**
 * Creates a simple colored placeholder image as a data URL
 */
export function createPlaceholder(
  label: string, 
  category: PlaceholderCategory = "default",
  size: number = 64
): string {
  const color = CATEGORY_COLORS[category];
  const shortLabel = label.substring(0, 3).toUpperCase();
  
  // Create a simple SVG placeholder
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <rect width="${size}" height="${size}" fill="${color}" rx="8"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" 
            font-family="Arial, sans-serif" font-size="${size / 4}" font-weight="bold" fill="white">
        ${shortLabel}
      </text>
    </svg>
  `.trim();
  
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

// Pre-generated food placeholders
export const FOOD_PLACEHOLDERS = {
  pumpkinSoup: createPlaceholder("Pumpkin Soup", "food"),
  sauerkraut: createPlaceholder("Sauerkraut", "food"),
  roastedCauliflower: createPlaceholder("Roasted Cauliflower", "food"),
  radishPie: createPlaceholder("Radish Pie", "food"),
} as const;
