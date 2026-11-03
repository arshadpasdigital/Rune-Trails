import { Element } from "../engine/types";

export type GlowTier = "full" | "reduced";

export interface GlowTierSettings {
  halo: boolean;
  bloom: boolean;
  particleCap: number;
}

/**
 * Blur/bloom is the expensive part of the glow on low-end Android. Devices with
 * a small memory envelope get the reduced tier: halo only, no bloom, fewer
 * particles. The thresholds are the documented starting point and should be
 * confirmed on the lowest target device (see design.md).
 */
export function selectGlowTier(totalMemoryMb: number): GlowTier {
  return totalMemoryMb > 0 && totalMemoryMb < 4096 ? "reduced" : "full";
}

export function glowSettings(tier: GlowTier): GlowTierSettings {
  return tier === "full"
    ? { halo: true, bloom: true, particleCap: 120 }
    : { halo: true, bloom: false, particleCap: 32 };
}

export interface ElementPalette {
  core: string;
  bloom: string;
  halo: string;
  rune: string;
}

export const ELEMENT_PALETTE: Record<Element, ElementPalette> = {
  fire: { core: "#FF7A3D", bloom: "#FF9F5A", halo: "#FF3D00", rune: "#FFB27A" },
  water: { core: "#3DA9FF", bloom: "#6FC3FF", halo: "#0066FF", rune: "#8FD4FF" },
  earth: { core: "#7BC96F", bloom: "#9EDB94", halo: "#2E7D32", rune: "#B4E3AC" },
  air: { core: "#D9D4FF", bloom: "#EEEBFF", halo: "#8E86FF", rune: "#F2F0FF" },
};

export const TERRAIN_COLORS = {
  pit: "#1B1B24",
  lava: "#D9461E",
  thorn: "#5C4B2E",
  stone: "#565B66",
  covered: "#0E1B2A",
  free: "#0B1220",
  grid: "#1C2740",
} as const;
