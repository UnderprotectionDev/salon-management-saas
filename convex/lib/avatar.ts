export function generateAvatarUrl(seed: string): string {
  return `https://api.dicebear.com/9.x/lorelei/png?seed=${encodeURIComponent(seed)}`;
}
