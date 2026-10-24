/** Color contrast utilities for WCAG 2.1 AAA compliance. */

export function getContrastRatio(foreground: string, background: string): number {
  const fg = parseColor(foreground)
  const bg = parseColor(background)

  const l1 = getRelativeLuminance(fg)
  const l2 = getRelativeLuminance(bg)

  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)

  return (lighter + 0.05) / (darker + 0.05)
}

/** Parses a hex color string into its RGB components. */
export function parseColor(color: string): { r: number; g: number; b: number } {
  if (color.startsWith('#')) {
    const hex = color.slice(1)
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16)
    }
  }
  return { r: 255, g: 255, b: 255 }
}

/** Computes the relative luminance of an RGB color per WCAG 2.1. */
export function getRelativeLuminance({ r, g, b }: { r: number; g: number; b: number }): number {
  const sRGB = [r, g, b].map(c => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2]
}

/** Checks whether a contrast ratio meets WCAG AAA thresholds (7:1 normal, 4.5:1 large text). */
export function meetsWCAGAAA(contrast: number, isLargeText: boolean = false): boolean {
  return isLargeText ? contrast >= 4.5 : contrast >= 7
}
