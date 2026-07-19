/**
 * Type declarations for image imports in Next.js
 * 
 * Next.js returns StaticImageData objects for image imports,
 * while Vite returns string URLs. The getImageSrc() utility
 * normalizes both formats to strings.
 */

declare module "*.png" {
  const content: import("next/image").StaticImageData;
  export default content;
}

declare module "*.jpg" {
  const content: import("next/image").StaticImageData;
  export default content;
}

declare module "*.jpeg" {
  const content: import("next/image").StaticImageData;
  export default content;
}

declare module "*.gif" {
  const content: import("next/image").StaticImageData;
  export default content;
}

declare module "*.webp" {
  const content: import("next/image").StaticImageData;
  export default content;
}

declare module "*.svg" {
  const content: import("next/image").StaticImageData;
  export default content;
}

declare module "*.ico" {
  const content: import("next/image").StaticImageData;
  export default content;
}

declare module "*.bmp" {
  const content: import("next/image").StaticImageData;
  export default content;
}
