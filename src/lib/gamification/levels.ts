/**
 * Level curve: reaching level L requires 25·L·(L−1) total XP.
 * L1 = 0, L2 = 50, L3 = 150, L4 = 300, L5 = 500 … Each level asks for 50 XP more
 * than the previous one, so early levels come quickly and later ones mean more.
 */
export function xpForLevel(level: number): number {
  const l = Math.max(1, Math.floor(level));
  return 25 * l * (l - 1);
}

export interface LevelInfo {
  level: number;
  /** Total XP at which the current level started. */
  levelStartXp: number;
  /** Total XP needed for the next level. */
  nextLevelXp: number;
  /** XP earned inside the current level. */
  xpIntoLevel: number;
  /** XP still needed for the next level. */
  xpToNext: number;
  /** 0–1 progress through the current level. */
  progress: number;
}

export function getLevelInfo(totalXp: number): LevelInfo {
  const xp = Math.max(0, Math.floor(totalXp));
  // Invert 25·L·(L−1) ≤ xp, then correct for floating-point edges.
  let level = Math.max(1, Math.floor((1 + Math.sqrt(1 + (4 * xp) / 25)) / 2));
  while (xpForLevel(level + 1) <= xp) level += 1;
  while (level > 1 && xpForLevel(level) > xp) level -= 1;

  const levelStartXp = xpForLevel(level);
  const nextLevelXp = xpForLevel(level + 1);
  const span = nextLevelXp - levelStartXp;
  return {
    level,
    levelStartXp,
    nextLevelXp,
    xpIntoLevel: xp - levelStartXp,
    xpToNext: nextLevelXp - xp,
    progress: span === 0 ? 0 : (xp - levelStartXp) / span,
  };
}
