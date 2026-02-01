/**
 *   ▄████████  ▄██████▄     ▄████████  ▄█        ▄██████▄   ▄██████▄     ▄███████▄ 
 *  ███    ███ ███    ███   ███    ███ ███       ███    ███ ███    ███   ███    ███ 
 *  ███    █▀  ███    ███   ███    ███ ███       ███    ███ ███    ███   ███    ███ 
 * ▄███▄▄▄     ███    ███  ▄███▄▄▄▄██▀ ███       ███    ███ ███    ███   ███    ███ 
 *▀▀███▀▀▀     ███    ███ ▀▀███▀▀▀▀▀   ███       ███    ███ ███    ███ ▀█████████▀  
 *  ███        ███    ███ ▀███████████ ███       ███    ███ ███    ███   ███        
 *  ███        ███    ███   ███    ███ ███▌    ▄ ███    ███ ███    ███   ███        
 *  ███         ▀██████▀    ███    ███ █████▄▄██  ▀██████▀   ▀██████▀   ▄████▀      
 *                          ███    ███ ▀                                            
 *
 * Color parsing module supporting rgba rgb hex and named colors with transparency
 * Converts parsed colors to ansi escape sequences for true color terminal output
 */

export type RGBA = { r: number; g: number; b: number; a: number }

const namedColors: Record<string, RGBA> = {
  black: { r: 0, g: 0, b: 0, a: 1 },
  red: { r: 205, g: 49, b: 49, a: 1 },
  green: { r: 13, g: 188, b: 121, a: 1 },
  yellow: { r: 229, g: 229, b: 16, a: 1 },
  blue: { r: 36, g: 114, b: 200, a: 1 },
  magenta: { r: 188, g: 63, b: 188, a: 1 },
  cyan: { r: 17, g: 168, b: 205, a: 1 },
  white: { r: 229, g: 229, b: 229, a: 1 },
  gray: { r: 102, g: 102, b: 102, a: 1 },
  grey: { r: 102, g: 102, b: 102, a: 1 },
  brightblack: { r: 102, g: 102, b: 102, a: 1 },
  brightred: { r: 241, g: 76, b: 76, a: 1 },
  brightgreen: { r: 35, g: 209, b: 139, a: 1 },
  brightyellow: { r: 245, g: 245, b: 67, a: 1 },
  brightblue: { r: 59, g: 142, b: 234, a: 1 },
  brightmagenta: { r: 214, g: 112, b: 214, a: 1 },
  brightcyan: { r: 41, g: 184, b: 219, a: 1 },
  brightwhite: { r: 255, g: 255, b: 255, a: 1 },
  transparent: { r: 0, g: 0, b: 0, a: 0 },
  orange: { r: 255, g: 165, b: 0, a: 1 },
  pink: { r: 255, g: 192, b: 203, a: 1 },
  purple: { r: 128, g: 0, b: 128, a: 1 },
  brown: { r: 139, g: 69, b: 19, a: 1 },
  lime: { r: 0, g: 255, b: 0, a: 1 },
  teal: { r: 0, g: 128, b: 128, a: 1 },
  navy: { r: 0, g: 0, b: 128, a: 1 },
  olive: { r: 128, g: 128, b: 0, a: 1 },
  maroon: { r: 128, g: 0, b: 0, a: 1 },
  aqua: { r: 0, g: 255, b: 255, a: 1 },
  silver: { r: 192, g: 192, b: 192, a: 1 },
  gold: { r: 255, g: 215, b: 0, a: 1 },
  coral: { r: 255, g: 127, b: 80, a: 1 },
  salmon: { r: 250, g: 128, b: 114, a: 1 },
  violet: { r: 238, g: 130, b: 238, a: 1 },
  indigo: { r: 75, g: 0, b: 130, a: 1 },
  turquoise: { r: 64, g: 224, b: 208, a: 1 },
  crimson: { r: 220, g: 20, b: 60, a: 1 },
  khaki: { r: 240, g: 230, b: 140, a: 1 },
  plum: { r: 221, g: 160, b: 221, a: 1 },
  orchid: { r: 218, g: 112, b: 214, a: 1 },
  tan: { r: 210, g: 180, b: 140, a: 1 },
  beige: { r: 245, g: 245, b: 220, a: 1 },
  ivory: { r: 255, g: 255, b: 240, a: 1 },
  azure: { r: 240, g: 255, b: 255, a: 1 },
  lavender: { r: 230, g: 230, b: 250, a: 1 },
  mint: { r: 189, g: 252, b: 201, a: 1 },
  rose: { r: 255, g: 0, b: 127, a: 1 },
  slate: { r: 112, g: 128, b: 144, a: 1 },
  charcoal: { r: 54, g: 69, b: 79, a: 1 }
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))
const parseNum = (s: string) => clamp(parseInt(s.trim(), 10) || 0, 0, 255)
const parseAlpha = (s: string) => clamp(parseFloat(s.trim()) || 1, 0, 1)
const parsePercent = (s: string) => clamp(Math.round((parseFloat(s.trim()) / 100) * 255), 0, 255)

export function parseColor(value?: string): RGBA | null {
  if (!value) return null
  const v = value.trim().toLowerCase()
  if (namedColors[v]) return { ...namedColors[v] }
  
  if (v.startsWith("rgba(") && v.endsWith(")")) {
    const parts = v.slice(5, -1).split(",")
    if (parts.length >= 3) {
      return {
        r: parts[0].includes("%") ? parsePercent(parts[0]) : parseNum(parts[0]),
        g: parts[1].includes("%") ? parsePercent(parts[1]) : parseNum(parts[1]),
        b: parts[2].includes("%") ? parsePercent(parts[2]) : parseNum(parts[2]),
        a: parts[3] ? parseAlpha(parts[3]) : 1
      }
    }
  }
  
  if (v.startsWith("rgb(") && v.endsWith(")")) {
    const parts = v.slice(4, -1).split(",")
    if (parts.length >= 3) {
      return {
        r: parts[0].includes("%") ? parsePercent(parts[0]) : parseNum(parts[0]),
        g: parts[1].includes("%") ? parsePercent(parts[1]) : parseNum(parts[1]),
        b: parts[2].includes("%") ? parsePercent(parts[2]) : parseNum(parts[2]),
        a: 1
      }
    }
  }
  
  if (v.startsWith("#")) {
    const hex = v.slice(1)
    if (hex.length === 3) {
      return {
        r: parseInt(hex[0] + hex[0], 16),
        g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16),
        a: 1
      }
    }
    if (hex.length === 4) {
      return {
        r: parseInt(hex[0] + hex[0], 16),
        g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16),
        a: parseInt(hex[3] + hex[3], 16) / 255
      }
    }
    if (hex.length === 6) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
        a: 1
      }
    }
    if (hex.length === 8) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
        a: parseInt(hex.slice(6, 8), 16) / 255
      }
    }
  }
  
  return null
}

export function toAnsiFg(color: RGBA): string {
  if (color.a === 0) return ""
  return `\x1b[38;2;${color.r};${color.g};${color.b}m`
}

export function toAnsiBg(color: RGBA): string {
  if (color.a === 0) return ""
  return `\x1b[48;2;${color.r};${color.g};${color.b}m`
}

export function blendColors(fg: RGBA, bg: RGBA): RGBA {
  if (fg.a === 1) return fg
  if (fg.a === 0) return bg
  const a = fg.a + bg.a * (1 - fg.a)
  return {
    r: Math.round((fg.r * fg.a + bg.r * bg.a * (1 - fg.a)) / a),
    g: Math.round((fg.g * fg.a + bg.g * bg.a * (1 - fg.a)) / a),
    b: Math.round((fg.b * fg.a + bg.b * bg.a * (1 - fg.a)) / a),
    a
  }
}

export const reset = "\x1b[0m"
export const bold = "\x1b[1m"
export const dim = "\x1b[2m"
export const italic = "\x1b[3m"
export const underline = "\x1b[4m"
export const blink = "\x1b[5m"
export const inverse = "\x1b[7m"
export const hidden = "\x1b[8m"
export const strikethrough = "\x1b[9m"
