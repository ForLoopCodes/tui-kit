/**
 * Color parsing, conversion, and ANSI escape code generation
 * Supports: hex, rgb, rgba, hsl, hsla, named colors
 */

export interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

// Named colors (60+ CSS colors)
const NAMED_COLORS: Record<string, RGBA> = {
  // Basic
  black: { r: 0, g: 0, b: 0, a: 1 },
  white: { r: 255, g: 255, b: 255, a: 1 },
  red: { r: 255, g: 0, b: 0, a: 1 },
  green: { r: 0, g: 128, b: 0, a: 1 },
  blue: { r: 0, g: 0, b: 255, a: 1 },
  yellow: { r: 255, g: 255, b: 0, a: 1 },
  cyan: { r: 0, g: 255, b: 255, a: 1 },
  magenta: { r: 255, g: 0, b: 255, a: 1 },

  // Grays
  gray: { r: 128, g: 128, b: 128, a: 1 },
  grey: { r: 128, g: 128, b: 128, a: 1 },
  silver: { r: 192, g: 192, b: 192, a: 1 },
  charcoal: { r: 54, g: 69, b: 79, a: 1 },
  slate: { r: 112, g: 128, b: 144, a: 1 },

  // Bright variants
  brightred: { r: 255, g: 85, b: 85, a: 1 },
  brightgreen: { r: 85, g: 255, b: 85, a: 1 },
  brightyellow: { r: 255, g: 255, b: 85, a: 1 },
  brightblue: { r: 85, g: 85, b: 255, a: 1 },
  brightmagenta: { r: 255, g: 85, b: 255, a: 1 },
  brightcyan: { r: 85, g: 255, b: 255, a: 1 },
  brightwhite: { r: 255, g: 255, b: 255, a: 1 },

  // Extended colors
  orange: { r: 255, g: 165, b: 0, a: 1 },
  pink: { r: 255, g: 192, b: 203, a: 1 },
  purple: { r: 128, g: 0, b: 128, a: 1 },
  brown: { r: 165, g: 42, b: 42, a: 1 },
  lime: { r: 0, g: 255, b: 0, a: 1 },
  teal: { r: 0, g: 128, b: 128, a: 1 },
  navy: { r: 0, g: 0, b: 128, a: 1 },
  olive: { r: 128, g: 128, b: 0, a: 1 },
  maroon: { r: 128, g: 0, b: 0, a: 1 },
  aqua: { r: 0, g: 255, b: 255, a: 1 },
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

  // Special
  transparent: { r: 0, g: 0, b: 0, a: 0 },
};

/**
 * Parse a CSS-like color string into RGBA
 */
export function parseColor(color: string | RGBA | undefined): RGBA | null {
  if (!color) return null;

  if (typeof color === 'object') {
    return color;
  }

  const trimmed = color.trim().toLowerCase();

  // Named color
  if (NAMED_COLORS[trimmed]) {
    return { ...NAMED_COLORS[trimmed] };
  }

  // Hex color
  if (trimmed.startsWith('#')) {
    return parseHex(trimmed);
  }

  // RGB/RGBA
  if (trimmed.startsWith('rgb')) {
    return parseRgb(trimmed);
  }

  // HSL/HSLA
  if (trimmed.startsWith('hsl')) {
    return parseHsl(trimmed);
  }

  return null;
}

/**
 * Parse hex color (#rgb, #rrggbb, #rrggbbaa)
 */
function parseHex(hex: string): RGBA | null {
  const h = hex.slice(1);

  if (h.length === 3) {
    // #rgb -> #rrggbb
    return {
      r: parseInt(h[0] + h[0], 16),
      g: parseInt(h[1] + h[1], 16),
      b: parseInt(h[2] + h[2], 16),
      a: 1,
    };
  }

  if (h.length === 6) {
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
      a: 1,
    };
  }

  if (h.length === 8) {
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
      a: parseInt(h.slice(6, 8), 16) / 255,
    };
  }

  return null;
}

/**
 * Parse rgb()/rgba() color
 */
function parseRgb(rgb: string): RGBA | null {
  const match = rgb.match(/rgba?\s*\(\s*([^)]+)\s*\)/);
  if (!match) return null;

  const parts = match[1].split(/[\s,]+/).map((p) => {
    if (p.endsWith('%')) {
      return (parseFloat(p) / 100) * 255;
    }
    return parseFloat(p);
  });

  return {
    r: Math.round(clamp(parts[0] || 0, 0, 255)),
    g: Math.round(clamp(parts[1] || 0, 0, 255)),
    b: Math.round(clamp(parts[2] || 0, 0, 255)),
    a: parts.length > 3 ? clamp(parts[3], 0, 1) : 1,
  };
}

/**
 * Parse hsl()/hsla() color
 */
function parseHsl(hsl: string): RGBA | null {
  const match = hsl.match(/hsla?\s*\(\s*([^)]+)\s*\)/);
  if (!match) return null;

  const parts = match[1].split(/[\s,]+/).map((p, i) => {
    if (p.endsWith('%')) {
      return parseFloat(p) / 100;
    }
    // Hue is in degrees
    if (i === 0) return parseFloat(p);
    return parseFloat(p);
  });

  const h = (parts[0] || 0) / 360;
  const s = parts[1] || 0;
  const l = parts[2] || 0;
  const a = parts.length > 3 ? parts[3] : 1;

  const rgb = hslToRgb(h, s, l);

  return {
    r: Math.round(rgb.r),
    g: Math.round(rgb.g),
    b: Math.round(rgb.b),
    a: clamp(a, 0, 1),
  };
}

/**
 * Convert HSL to RGB
 */
function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l * 255;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3) * 255;
    g = hue2rgb(p, q, h) * 255;
    b = hue2rgb(p, q, h - 1 / 3) * 255;
  }

  return { r, g, b };
}

/**
 * Blend two colors with alpha compositing
 */
export function blendColors(fg: RGBA, bg: RGBA): RGBA {
  const alpha = fg.a + bg.a * (1 - fg.a);

  if (alpha === 0) {
    return { r: 0, g: 0, b: 0, a: 0 };
  }

  return {
    r: Math.round((fg.r * fg.a + bg.r * bg.a * (1 - fg.a)) / alpha),
    g: Math.round((fg.g * fg.a + bg.g * bg.a * (1 - fg.a)) / alpha),
    b: Math.round((fg.b * fg.a + bg.b * bg.a * (1 - fg.a)) / alpha),
    a: alpha,
  };
}

/**
 * Generate ANSI truecolor foreground escape code
 */
export function fgColor(color: RGBA | string | undefined): string {
  const rgba = typeof color === 'string' ? parseColor(color) : color;
  if (!rgba || rgba.a === 0) return '';
  return `\x1b[38;2;${rgba.r};${rgba.g};${rgba.b}m`;
}

/**
 * Generate ANSI truecolor background escape code
 */
export function bgColor(color: RGBA | string | undefined): string {
  const rgba = typeof color === 'string' ? parseColor(color) : color;
  if (!rgba || rgba.a === 0) return '';
  return `\x1b[48;2;${rgba.r};${rgba.g};${rgba.b}m`;
}

/**
 * Reset all styles
 */
export const RESET = '\x1b[0m';

/**
 * Text style codes
 */
export const STYLES = {
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',
  underline: '\x1b[4m',
  blink: '\x1b[5m',
  inverse: '\x1b[7m',
  hidden: '\x1b[8m',
  strikethrough: '\x1b[9m',
} as const;

export type TextStyle = keyof typeof STYLES;

/**
 * Generate style escape codes
 */
export function styleCode(styles: Partial<Record<TextStyle, boolean>>): string {
  let code = '';
  for (const [style, enabled] of Object.entries(styles)) {
    if (enabled && style in STYLES) {
      code += STYLES[style as TextStyle];
    }
  }
  return code;
}

/**
 * Clamp a number between min and max
 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Convert RGBA to hex string
 */
export function rgbaToHex(color: RGBA): string {
  const r = color.r.toString(16).padStart(2, '0');
  const g = color.g.toString(16).padStart(2, '0');
  const b = color.b.toString(16).padStart(2, '0');
  if (color.a < 1) {
    const a = Math.round(color.a * 255).toString(16).padStart(2, '0');
    return `#${r}${g}${b}${a}`;
  }
  return `#${r}${g}${b}`;
}
