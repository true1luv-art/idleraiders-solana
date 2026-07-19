/**
 * Utility to extract image source URL from various image import formats.
 * 
 * In Vite: import img from "./image.png" returns string URL
 * In Next.js: same import returns { src: string, width: number, height: number }
 * 
 * This utility normalizes both to a string URL.
 */

export type ImageImport = 
  | string 
  | { src: string; width?: number; height?: number }
  | { default: string | { src: string } }
  | null
  | undefined;

/**
 * Extract the URL string from an image import.
 * Handles Vite-style strings, Next.js-style objects, and CommonJS default exports.
 */
export function getImageSrc(image: ImageImport): string {
  if (!image) return "";
  
  // Already a string (Vite style or public path)
  if (typeof image === "string") return image;
  
  // Next.js StaticImageData style: { src, width, height }
  if (typeof image === "object" && "src" in image) {
    const src = image.src;
    // Handle nested { src: { src: string } } edge case
    if (typeof src === "object" && src && "src" in src) {
      return src.src;
    }
    return typeof src === "string" ? src : "";
  }
  
  // CommonJS default export: { default: string | { src: string } }
  if (typeof image === "object" && "default" in image) {
    const defaultExport = image.default;
    if (typeof defaultExport === "string") return defaultExport;
    if (typeof defaultExport === "object" && defaultExport && "src" in defaultExport) {
      return defaultExport.src;
    }
  }
  
  // Fallback: try to convert to string (will show [object Object] if truly broken)
  return String(image);
}

/**
 * Shorthand alias for getImageSrc - useful for inline usage.
 */
export const img = getImageSrc;

/**
 * Type guard to check if a value is a valid image source.
 */
export function isValidImageSrc(image: unknown): image is ImageImport {
  if (!image) return false;
  if (typeof image === "string") return true;
  if (typeof image === "object" && "src" in image) return true;
  if (typeof image === "object" && "default" in image) return true;
  return false;
}
