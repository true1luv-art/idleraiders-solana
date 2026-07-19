/**
 * Generates avatar URL based on username using Hive blockchain avatar service
 * This is the same approach used by Hearthvale frontend
 */
export function generateAvatarUrl(username: string): string {
  const cleanName = username.toLowerCase().trim();
  return `https://images.hive.blog/u/${cleanName}/avatar`;
}
