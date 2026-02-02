/**
 * Rendering pipeline - ScreenBuffer, cell model, border drawing, text writing
 */

import { RGBA, parseColor, fgColor, bgColor, RESET, styleCode, TextStyle, blendColors } from './colors';
import { LayoutNode, normalizeChildren, stripAnsi, parseSpacing, getBorderThickness, textWidth } from './layout';
import type { StyleProps } from './elements';

/**
 * A single cell in the screen buffer
 */
export interface Cell {
  char: string;
  fg: RGBA | null;
  bg: RGBA | null;
  bold: boolean;
  dim: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
  inverse: boolean;
}

/**
 * Create an empty cell
 */
function emptyCell(): Cell {
  return {
    char: ' ',
    fg: null,
    bg: null,
    bold: false,
    dim: false,
    italic: false,
    underline: false,
    strikethrough: false,
    inverse: false,
  };
}

/**
 * Clone a cell
 */
function cloneCell(cell: Cell): Cell {
  return { ...cell };
}

/**
 * Check if two cells are equal
 */
function cellsEqual(a: Cell, b: Cell): boolean {
  return (
    a.char === b.char &&
    colorEqual(a.fg, b.fg) &&
    colorEqual(a.bg, b.bg) &&
    a.bold === b.bold &&
    a.dim === b.dim &&
    a.italic === b.italic &&
    a.underline === b.underline &&
    a.strikethrough === b.strikethrough &&
    a.inverse === b.inverse
  );
}

/**
 * Check if two colors are equal
 */
function colorEqual(a: RGBA | null, b: RGBA | null): boolean {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  return a.r === b.r && a.g === b.g && a.b === b.b && a.a === b.a;
}

/**
 * Border characters for different styles
 */
const BORDER_CHARS = {
  single: {
    topLeft: '┌',
    topRight: '┐',
    bottomLeft: '└',
    bottomRight: '┘',
    horizontal: '─',
    vertical: '│',
    leftT: '├',
    rightT: '┤',
    topT: '┬',
    bottomT: '┴',
    cross: '┼',
  },
  double: {
    topLeft: '╔',
    topRight: '╗',
    bottomLeft: '╚',
    bottomRight: '╝',
    horizontal: '═',
    vertical: '║',
    leftT: '╠',
    rightT: '╣',
    topT: '╦',
    bottomT: '╩',
    cross: '╬',
  },
  rounded: {
    topLeft: '╭',
    topRight: '╮',
    bottomLeft: '╰',
    bottomRight: '╯',
    horizontal: '─',
    vertical: '│',
    leftT: '├',
    rightT: '┤',
    topT: '┬',
    bottomT: '┴',
    cross: '┼',
  },
  bold: {
    topLeft: '┏',
    topRight: '┓',
    bottomLeft: '┗',
    bottomRight: '┛',
    horizontal: '━',
    vertical: '┃',
    leftT: '┣',
    rightT: '┫',
    topT: '┳',
    bottomT: '┻',
    cross: '╋',
  },
  dashed: {
    topLeft: '┌',
    topRight: '┐',
    bottomLeft: '└',
    bottomRight: '┘',
    horizontal: '╌',
    vertical: '╎',
    leftT: '├',
    rightT: '┤',
    topT: '┬',
    bottomT: '┴',
    cross: '┼',
  },
};

type BorderStyle = keyof typeof BORDER_CHARS;
function sliceByColumns(text: string, startCol: number, maxCols: number): string {
  if (maxCols <= 0) return '';
  const chars = Array.from(text);
  let col = 0;
  let out = '';
  for (const ch of chars) {
    if (col < startCol) {
      col += 1;
      continue;
    }
    if (col - startCol >= maxCols) break;
    out += ch;
    col += 1;
  }
  return out;
}

function normalizeDimension(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

interface ClipRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function intersectClip(a: ClipRect | null | undefined, b: ClipRect | null | undefined): ClipRect | null {
  if (!a && !b) return null;
  if (!a) return b ?? null;
  if (!b) return a ?? null;
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.width, b.x + b.width);
  const bottom = Math.min(a.y + a.height, b.y + b.height);
  const width = right - x;
  const height = bottom - y;
  if (width <= 0 || height <= 0) return null;
  return { x, y, width, height };
}

function clipRect(rect: ClipRect, clip: ClipRect | null | undefined): ClipRect | null {
  return intersectClip(rect, clip);
}

function writeCharClipped(
  ctx: RenderContext,
  x: number,
  y: number,
  char: string,
  fg?: RGBA | null,
  bg?: RGBA | null,
  styles?: Partial<Record<TextStyle, boolean>>
): void {
  const clip = ctx.clip;
  if (clip) {
    if (x < clip.x || x >= clip.x + clip.width || y < clip.y || y >= clip.y + clip.height) {
      return;
    }
  }
  ctx.buffer.writeChar(x, y, char, fg, bg, styles);
}

function writeTextClipped(
  ctx: RenderContext,
  x: number,
  y: number,
  text: string,
  fg?: RGBA | null,
  bg?: RGBA | null,
  styles?: Partial<Record<TextStyle, boolean>>,
  maxWidth?: number
): void {
  const clip = ctx.clip;
  if (!clip) {
    ctx.buffer.writeText(x, y, text, fg, bg, styles, maxWidth);
    return;
  }

  if (!Number.isFinite(y)) return;
  const yi = Math.floor(y);
  if (yi < clip.y || yi >= clip.y + clip.height) return;

  const plain = stripAnsi(String(text ?? ''));
  let startX = Number.isFinite(x) ? Math.floor(x) : 0;
  let availableWidth =
    maxWidth !== undefined && Number.isFinite(maxWidth) ? Math.floor(maxWidth) : textWidth(plain);

  if (availableWidth <= 0) return;

  const clipStart = clip.x;
  const clipEnd = clip.x + clip.width;
  const drawStart = Math.max(startX, clipStart);
  const drawEnd = Math.min(startX + availableWidth, clipEnd);
  const visibleWidth = drawEnd - drawStart;
  if (visibleWidth <= 0) return;

  const startCol = Math.max(0, drawStart - startX);
  const clipped = sliceByColumns(plain, startCol, visibleWidth);
  if (!clipped) return;

  ctx.buffer.writeText(drawStart, yi, clipped, fg, bg, styles, visibleWidth);
}

function fillRectClipped(
  ctx: RenderContext,
  x: number,
  y: number,
  width: number,
  height: number,
  char: string = ' ',
  fg?: RGBA | null,
  bg?: RGBA | null
): void {
  const rect = clipRect({ x, y, width, height }, ctx.clip);
  if (!rect) return;
  ctx.buffer.fillRect(rect.x, rect.y, rect.width, rect.height, char, fg, bg);
}

function drawBorderClipped(
  ctx: RenderContext,
  x: number,
  y: number,
  width: number,
  height: number,
  style: BorderStyle = 'single',
  fg?: RGBA | null,
  bg?: RGBA | null
): void {
  if (width <= 0 || height <= 0) return;
  if (width < 2 || height < 2) {
    writeCharClipped(ctx, x, y, '┼', fg, bg);
    return;
  }

  const chars = BORDER_CHARS[style] || BORDER_CHARS.single;

  const x2 = x + width - 1;
  const y2 = y + height - 1;

  writeCharClipped(ctx, x, y, chars.topLeft, fg, bg);
  writeCharClipped(ctx, x2, y, chars.topRight, fg, bg);
  writeCharClipped(ctx, x, y2, chars.bottomLeft, fg, bg);
  writeCharClipped(ctx, x2, y2, chars.bottomRight, fg, bg);

  for (let dx = 1; dx < width - 1; dx++) {
    writeCharClipped(ctx, x + dx, y, chars.horizontal, fg, bg);
    writeCharClipped(ctx, x + dx, y2, chars.horizontal, fg, bg);
  }

  for (let dy = 1; dy < height - 1; dy++) {
    writeCharClipped(ctx, x, y + dy, chars.vertical, fg, bg);
    writeCharClipped(ctx, x2, y + dy, chars.vertical, fg, bg);
  }
}

function drawHLineClipped(
  ctx: RenderContext,
  x: number,
  y: number,
  length: number,
  char: string = '─',
  fg?: RGBA | null,
  bg?: RGBA | null
): void {
  for (let i = 0; i < length; i++) {
    writeCharClipped(ctx, x + i, y, char, fg, bg);
  }
}

/**
 * Screen buffer for double-buffered rendering
 */
export class ScreenBuffer {
  width: number;
  height: number;
  cells: Cell[][];
  prevCells: Cell[][] | null = null;

  constructor(width: number, height: number) {
    this.width = normalizeDimension(width);
    this.height = normalizeDimension(height);
    this.cells = this.createEmptyBuffer();
  }

  /**
   * Create an empty cell buffer
   */
  private createEmptyBuffer(): Cell[][] {
    const width = normalizeDimension(this.width);
    const height = normalizeDimension(this.height);
    const buffer: Cell[][] = [];
    for (let y = 0; y < height; y++) {
      const row: Cell[] = [];
      for (let x = 0; x < width; x++) {
        row.push(emptyCell());
      }
      buffer.push(row);
    }
    return buffer;
  }

  /**
   * Resize the buffer
   */
  resize(width: number, height: number): void {
    this.width = normalizeDimension(width);
    this.height = normalizeDimension(height);
    this.cells = this.createEmptyBuffer();
    this.prevCells = null;
  }

  /**
   * Clear the buffer
   */
  clear(): void {
    this.prevCells = this.cells;
    this.cells = this.createEmptyBuffer();
  }

  /**
   * Get a cell at position
   */
  getCell(x: number, y: number): Cell | null {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return null;
    }
    const row = this.cells[y];
    return row ? row[x] ?? null : null;
  }

  /**
   * Set a cell at position
   */
  setCell(x: number, y: number, cell: Partial<Cell>): void {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return;
    }
    const row = this.cells[y];
    if (!row || !row[x]) return;
    Object.assign(row[x], cell);
  }

  /**
   * Write a character at position
   */
  writeChar(
    x: number,
    y: number,
    char: string,
    fg?: RGBA | null,
    bg?: RGBA | null,
    styles?: Partial<Record<TextStyle, boolean>>
  ): void {
    // Validate coordinates (guard against NaN/Infinity and non-integers)
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    if (xi < 0 || xi >= this.width || yi < 0 || yi >= this.height) return;

    const row = this.cells[yi];
    if (!row) return;
    const cell = row[xi];
    if (!cell) return;

    // Use first code unit (emoji/combined grapheme handling is out of scope)
    const ch = (char && char.length > 0) ? char[0] : ' ';

    cell.char = ch;
    if (fg !== undefined) cell.fg = fg;
    if (bg !== undefined) cell.bg = bg;
    if (styles) {
      if (styles.bold !== undefined) cell.bold = styles.bold;
      if (styles.dim !== undefined) cell.dim = styles.dim;
      if (styles.italic !== undefined) cell.italic = styles.italic;
      if (styles.underline !== undefined) cell.underline = styles.underline;
      if (styles.strikethrough !== undefined) cell.strikethrough = styles.strikethrough;
      if (styles.inverse !== undefined) cell.inverse = styles.inverse;
    }
  }

  /**
   * Write text starting at position
   */
  writeText(
    x: number,
    y: number,
    text: string,
    fg?: RGBA | null,
    bg?: RGBA | null,
    styles?: Partial<Record<TextStyle, boolean>>,
    maxWidth?: number
  ): void {
    const plain = stripAnsi(String(text ?? ''));

    // Validate Y coordinate
    if (!Number.isFinite(y)) return;
    const yi = Math.floor(y);
    if (yi < 0 || yi >= this.height) return;

    // Determine starting X and available width
    let startX = Number.isFinite(x) ? Math.floor(x) : 0;
    let availableWidth = (maxWidth !== undefined && Number.isFinite(maxWidth)) ? Math.floor(maxWidth) : this.width - startX;

    // Clip if startX is negative
    let textStartIndex = 0;
    if (startX < 0) {
      textStartIndex = -startX;
      startX = 0;
      availableWidth = this.width;
    }

    if (availableWidth <= 0) return;

    // If startX already past buffer width, nothing to draw
    if (startX >= this.width) return;

    const maxChars = Math.min(availableWidth, this.width - startX);
    if (maxChars <= 0) return;
    const clipped = sliceByColumns(plain, textStartIndex, maxChars);
    const chars = Array.from(clipped);
    for (let i = 0; i < chars.length && startX + i < this.width; i++) {
      const ch = chars[i];
      this.writeChar(startX + i, yi, ch, fg, bg, styles);
    }
  }

  /**
   * Fill a rectangle with a character
   */
  fillRect(
    x: number,
    y: number,
    width: number,
    height: number,
    char: string = ' ',
    fg?: RGBA | null,
    bg?: RGBA | null
  ): void {
    for (let dy = 0; dy < height; dy++) {
      for (let dx = 0; dx < width; dx++) {
        this.writeChar(x + dx, y + dy, char, fg, bg);
      }
    }
  }

  /**
   * Draw a border around a rectangle
   */
  drawBorder(
    x: number,
    y: number,
    width: number,
    height: number,
    style: BorderStyle = 'single',
    fg?: RGBA | null,
    bg?: RGBA | null
  ): void {
    const chars = BORDER_CHARS[style] || BORDER_CHARS.single;

    // Corners
    this.writeChar(x, y, chars.topLeft, fg, bg);
    this.writeChar(x + width - 1, y, chars.topRight, fg, bg);
    this.writeChar(x, y + height - 1, chars.bottomLeft, fg, bg);
    this.writeChar(x + width - 1, y + height - 1, chars.bottomRight, fg, bg);

    // Top and bottom edges
    for (let dx = 1; dx < width - 1; dx++) {
      this.writeChar(x + dx, y, chars.horizontal, fg, bg);
      this.writeChar(x + dx, y + height - 1, chars.horizontal, fg, bg);
    }

    // Left and right edges
    for (let dy = 1; dy < height - 1; dy++) {
      this.writeChar(x, y + dy, chars.vertical, fg, bg);
      this.writeChar(x + width - 1, y + dy, chars.vertical, fg, bg);
    }
  }

  /**
   * Draw a horizontal line
   */
  drawHLine(
    x: number,
    y: number,
    length: number,
    char: string = '─',
    fg?: RGBA | null,
    bg?: RGBA | null
  ): void {
    for (let i = 0; i < length; i++) {
      this.writeChar(x + i, y, char, fg, bg);
    }
  }

  /**
   * Generate ANSI output string
   */
  render(): string {
    let output = '';
    let lastFg: RGBA | null = null;
    let lastBg: RGBA | null = null;
    let lastStyles = {
      bold: false,
      dim: false,
      italic: false,
      underline: false,
      strikethrough: false,
      inverse: false,
    };

    for (let y = 0; y < this.height; y++) {
      // Move cursor to line start
      output += `\x1b[${y + 1};1H`;

      for (let x = 0; x < this.width; x++) {
        const cell = this.cells[y][x];

        // Check if we need to change styles
        let needsReset = false;
        let styleChanges = '';

        // Check style changes
        const styles: Partial<Record<TextStyle, boolean>> = {};
        if (cell.bold !== lastStyles.bold) styles.bold = cell.bold;
        if (cell.dim !== lastStyles.dim) styles.dim = cell.dim;
        if (cell.italic !== lastStyles.italic) styles.italic = cell.italic;
        if (cell.underline !== lastStyles.underline) styles.underline = cell.underline;
        if (cell.strikethrough !== lastStyles.strikethrough) styles.strikethrough = cell.strikethrough;
        if (cell.inverse !== lastStyles.inverse) styles.inverse = cell.inverse;

        // Check if any style turned off (need reset)
        if (
          (lastStyles.bold && !cell.bold) ||
          (lastStyles.dim && !cell.dim) ||
          (lastStyles.italic && !cell.italic) ||
          (lastStyles.underline && !cell.underline) ||
          (lastStyles.strikethrough && !cell.strikethrough) ||
          (lastStyles.inverse && !cell.inverse)
        ) {
          needsReset = true;
        }

        if (needsReset) {
          output += RESET;
          lastFg = null;
          lastBg = null;
          lastStyles = {
            bold: false,
            dim: false,
            italic: false,
            underline: false,
            strikethrough: false,
            inverse: false,
          };
        }

        // Apply foreground color
        if (!colorEqual(cell.fg, lastFg)) {
          output += fgColor(cell.fg ?? undefined);
          lastFg = cell.fg;
        }

        // Apply background color
        if (!colorEqual(cell.bg, lastBg)) {
          output += bgColor(cell.bg ?? undefined);
          lastBg = cell.bg;
        }

        // Apply text styles
        output += styleCode({
          bold: cell.bold && !lastStyles.bold,
          dim: cell.dim && !lastStyles.dim,
          italic: cell.italic && !lastStyles.italic,
          underline: cell.underline && !lastStyles.underline,
          strikethrough: cell.strikethrough && !lastStyles.strikethrough,
          inverse: cell.inverse && !lastStyles.inverse,
        });

        lastStyles = {
          bold: cell.bold,
          dim: cell.dim,
          italic: cell.italic,
          underline: cell.underline,
          strikethrough: cell.strikethrough,
          inverse: cell.inverse,
        };

        output += cell.char;
      }
    }

    output += RESET;
    return output;
  }

  /**
   * Generate diff-based ANSI output (only changed cells)
   */
  renderDiff(): string {
    if (!this.prevCells) {
      return this.render();
    }

    let output = '';
    let lastFg: RGBA | null = null;
    let lastBg: RGBA | null = null;
    let lastStyles = {
      bold: false,
      dim: false,
      italic: false,
      underline: false,
      strikethrough: false,
      inverse: false,
    };

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const cell = this.cells[y][x];
        const prevCell = this.prevCells[y]?.[x];

        // Skip if cell unchanged
        if (prevCell && cellsEqual(cell, prevCell)) {
          continue;
        }

        // Move cursor
        output += `\x1b[${y + 1};${x + 1}H`;

        // Apply styles (simplified for diff rendering)
        output += RESET;
        if (cell.fg) output += fgColor(cell.fg);
        if (cell.bg) output += bgColor(cell.bg);
        output += styleCode({
          bold: cell.bold,
          dim: cell.dim,
          italic: cell.italic,
          underline: cell.underline,
          strikethrough: cell.strikethrough,
          inverse: cell.inverse,
        });

        output += cell.char;
      }
    }

    output += RESET;
    return output;
  }
}

/**
 * Render context passed through the tree
 */
interface RenderContext {
  buffer: ScreenBuffer;
  focusedId: string | null;
  fg: RGBA | null;
  bg: RGBA | null;
  clip: ClipRect | null;
}

/**
 * Render a layout tree to a screen buffer
 */
export function renderLayout(
  layout: LayoutNode,
  buffer: ScreenBuffer,
  focusedId: string | null = null
): void {
  const ctx: RenderContext = { buffer, focusedId, fg: null, bg: null, clip: null };
  renderNode(layout, ctx);
}

/**
 * Render a single node
 */
function renderNode(layoutNode: LayoutNode, ctx: RenderContext, offsetX: number = 0, offsetY: number = 0): void {
  const { node, children } = layoutNode;
  const rect = {
    x: layoutNode.rect.x + offsetX,
    y: layoutNode.rect.y + offsetY,
    width: layoutNode.rect.width,
    height: layoutNode.rect.height,
  };
  const effectiveNode: LayoutNode = { ...layoutNode, rect };
  const props = node.props as StyleProps;

  // Parse colors
  const ownFg = parseColor(props.color);
  const ownBg = parseColor(props.bg);
  const fg = ownFg ?? ctx.fg;
  const bg = ownBg ?? ctx.bg;
  const borderColor = parseColor(props.borderColor) ?? fg ?? parseColor('#888888');

  // Parse spacing
  const padding = parseSpacing(props.padding);
  const borderSize = getBorderThickness(props.border);

  // Check if focused
  const isFocused = props.id === ctx.focusedId;
  const focusBg = isFocused && props.focusBg ? parseColor(props.focusBg) : null;
  const effectiveBg = focusBg ?? bg;

  // Fill background
  if (effectiveBg) {
    fillRectClipped(ctx, rect.x, rect.y, rect.width, rect.height, ' ', null, effectiveBg);
  }

  // Draw border
  if (props.border && props.border !== 'none') {
    drawBorderClipped(
      ctx,
      rect.x,
      rect.y,
      rect.width,
      rect.height,
      props.border as BorderStyle,
      borderColor,
      effectiveBg
    );
  }

  // Handle specific element types
  const type = node.type;

  if (type === 'text' || type === 'box') {
    // Render text children
    renderTextContent(effectiveNode, ctx, fg, effectiveBg, props);
  } else if (type === 'input' || type === 'textbox') {
    renderInput(effectiveNode, ctx, isFocused, fg, bg);
  } else if (type === 'button') {
    renderButton(effectiveNode, ctx, isFocused, fg, bg);
  } else if (type === 'checkbox') {
    renderCheckbox(effectiveNode, ctx, isFocused, fg, bg);
  } else if (type === 'select') {
    renderSelect(effectiveNode, ctx, isFocused, fg, bg);
  } else if (type === 'hr') {
    renderHr(effectiveNode, ctx, fg);
  } else if (type === 'ul' || type === 'ol') {
    renderList(effectiveNode, ctx, fg, bg);
  } else if (type === 'table') {
    renderTable(effectiveNode, ctx, fg, bg);
  }

  // Render children (for container elements)
  const skipChildren =
    type === 'text' ||
    type === 'input' ||
    type === 'textbox' ||
    type === 'button' ||
    type === 'checkbox' ||
    type === 'select' ||
    type === 'hr';

  if (!skipChildren) {
    let childCtx: RenderContext = { ...ctx, fg, bg };
    let childOffsetX = offsetX;
    let childOffsetY = offsetY;

    if (props.overflow === 'scroll' || props.overflow === 'hidden') {
      const clip = {
        x: rect.x + padding.left + borderSize,
        y: rect.y + padding.top + borderSize,
        width: Math.max(0, rect.width - padding.left - padding.right - borderSize * 2),
        height: Math.max(0, rect.height - padding.top - padding.bottom - borderSize * 2),
      };
      childCtx = { ...childCtx, clip: intersectClip(ctx.clip, clip) };
      childOffsetX -= layoutNode.scrollX;
      childOffsetY -= layoutNode.scrollY;
    }

    for (const child of children) {
      renderNode(child, childCtx, childOffsetX, childOffsetY);
    }
  }

  // Draw focus indicator
  if (isFocused && props.border && props.border !== 'none') {
    const focusBorderColor = parseColor(props.borderColor) ?? borderColor;
    drawBorderClipped(
      ctx,
      rect.x,
      rect.y,
      rect.width,
      rect.height,
      props.border as BorderStyle,
      focusBorderColor,
      effectiveBg
    );
  }

  if (props.overflow === 'scroll') {
    renderScrollbars(effectiveNode, ctx, fg, effectiveBg, padding, borderSize);
  }
}

/**
 * Render text content
 */
function renderTextContent(
  layoutNode: LayoutNode,
  ctx: RenderContext,
  fg: RGBA | null,
  bg: RGBA | null,
  props: StyleProps
): void {
  const { node, rect } = layoutNode;
  const padding = parseSpacing(props.padding);
  const borderSize = getBorderThickness(props.border);

  const styles: Partial<Record<TextStyle, boolean>> = {
    bold: props.bold,
    dim: props.dim,
    italic: props.italic,
    underline: props.underline,
    strikethrough: props.strikethrough,
  };

  const innerX = rect.x + padding.left + borderSize;
  const innerY = rect.y + padding.top + borderSize;
  const innerWidth = Math.max(0, rect.width - padding.left - padding.right - borderSize * 2);
  const innerHeight = Math.max(0, rect.height - padding.top - padding.bottom - borderSize * 2);
  if (innerWidth <= 0 || innerHeight <= 0) return;

  // Get text content from direct children (avoid rendering nested element text twice)
  const text = getDirectTextContent(node.children);
  if (!text) return;
  const lines = text.split('\n');

  // Apply text alignment
  const textAlign = props.textAlign || 'left';

  for (let i = 0; i < lines.length && i < innerHeight; i++) {
    let line = lines[i];
    if (textWidth(line) > innerWidth) {
      line = sliceByColumns(line, 0, innerWidth);
    }
    const lineWidth = textWidth(line);

    let x = innerX;
    if (textAlign === 'center') {
      x = innerX + Math.floor((innerWidth - lineWidth) / 2);
    } else if (textAlign === 'right') {
      x = innerX + innerWidth - lineWidth;
    }

    writeTextClipped(ctx, x, innerY + i, line, fg, bg, styles, innerWidth);
  }
}

/**
 * Get text content from children
 */
function getTextContentFromChildren(children: any): string {
  if (!children) return '';
  if (typeof children === 'string') return children;
  if (typeof children === 'number') return String(children);
  if (Array.isArray(children)) {
    return children.map(getTextContentFromChildren).join('');
  }
  if (children.children) {
    return getTextContentFromChildren(children.children);
  }
  return '';
}

/**
 * Get only direct text content (ignore nested elements)
 */
function getDirectTextContent(children: any): string {
  if (children == null) return '';
  if (typeof children === 'string') return children;
  if (typeof children === 'number') return String(children);
  if (Array.isArray(children)) {
    return children.map(getDirectTextContent).join('');
  }
  return '';
}

/**
 * Render input field
 */
function renderInput(
  layoutNode: LayoutNode,
  ctx: RenderContext,
  isFocused: boolean,
  inheritedFg: RGBA | null,
  inheritedBg: RGBA | null
): void {
  const { node, rect } = layoutNode;
  const props = node.props as StyleProps & {
    value?: string;
    placeholder?: string;
    type?: string;
  };

  const fg = parseColor(props.color) ?? inheritedFg ?? { r: 255, g: 255, b: 255, a: 1 };
  const bg = parseColor(props.bg) ?? inheritedBg ?? { r: 40, g: 40, b: 40, a: 1 };
  const focusBg = isFocused ? parseColor('#1a1a4e') ?? bg : bg;
  const hasBorder = props.border !== undefined && props.border !== 'none';
  const borderStyle = (props.border as BorderStyle) || 'single';
  const canDrawBorder = rect.width >= 2 && rect.height >= 2;
  const borderSize = canDrawBorder && (hasBorder || isFocused)
    ? getBorderThickness(hasBorder ? props.border : borderStyle)
    : 0;
  const focusBorderColor = parseColor('#00aaff');

  // Fill background
  fillRectClipped(ctx, rect.x, rect.y, rect.width, rect.height, ' ', null, focusBg);

  // Draw border (always show a border for input visibility)
  if (canDrawBorder) {
    const borderColor = isFocused ? focusBorderColor : parseColor('#4a7c8a');
    drawBorderClipped(ctx, rect.x, rect.y, rect.width, rect.height, 'single', borderColor, focusBg);
  }

  // Get display text
  let displayText = props.value || '';
  if (!displayText && props.placeholder && !isFocused) {
    displayText = props.placeholder;
  }

  // Mask password
  if (props.type === 'password' && props.value) {
    displayText = '•'.repeat(props.value.length);
  }

  const innerX = rect.x + borderSize;
  const innerY = rect.y + borderSize;
  const innerWidth = Math.max(0, rect.width - borderSize * 2);
  const innerHeight = Math.max(0, rect.height - borderSize * 2);
  if (innerWidth <= 0 || innerHeight <= 0) return;

  // Truncate if needed
  if (textWidth(displayText) > innerWidth) {
    const totalWidth = textWidth(displayText);
    const startCol = Math.max(0, totalWidth - innerWidth);
    displayText = sliceByColumns(displayText, startCol, innerWidth);
  }

  // Draw text
  const textFg = !props.value && props.placeholder ? parseColor('#888888') : fg;
  const textY = innerY + Math.floor(innerHeight / 2);
  writeTextClipped(ctx, innerX, textY, displayText, textFg, focusBg, undefined, innerWidth);

  // Draw cursor
  if (isFocused) {
    const cursorX = innerX + textWidth(displayText);
    const maxCursorX = innerX + innerWidth - 1;
    if (cursorX <= maxCursorX) {
      writeCharClipped(ctx, cursorX, textY, '▌', focusBorderColor, focusBg);
    }
  }
}

/**
 * Render button
 */
function renderButton(
  layoutNode: LayoutNode,
  ctx: RenderContext,
  isFocused: boolean,
  inheritedFg: RGBA | null,
  inheritedBg: RGBA | null
): void {
  const { node, rect } = layoutNode;
  const props = node.props as StyleProps;

  const fg = parseColor(props.color) ?? inheritedFg ?? { r: 255, g: 255, b: 255, a: 1 };
  const normalBg = parseColor(props.bg) ?? inheritedBg ?? { r: 60, g: 60, b: 180, a: 1 };
  const focusBgColor = parseColor(props.focusBg) ?? parseColor('#3b82f6');
  const bg = isFocused ? focusBgColor : normalBg;
  const hasBorder = props.border !== undefined && props.border !== 'none';
  const borderStyle = (props.border as BorderStyle) || 'rounded';
  const borderSize = hasBorder ? getBorderThickness(props.border) : 0;
  const normalBorderColor = parseColor(props.borderColor) ?? fg ?? parseColor('#888888');
  const focusBorderColor = parseColor('#ffffff');
  const borderColor = isFocused ? (focusBorderColor ?? normalBorderColor) : normalBorderColor;

  // Fill background
  fillRectClipped(ctx, rect.x, rect.y, rect.width, rect.height, ' ', null, bg);

  // Draw border
  if (hasBorder && rect.width >= 2 && rect.height >= 2) {
    drawBorderClipped(
      ctx,
      rect.x,
      rect.y,
      rect.width,
      rect.height,
      borderStyle,
      borderColor,
      bg
    );
  }

  // Get button text
  const text = getTextContentFromChildren(node.children);
  const innerWidth = Math.max(0, rect.width - borderSize * 2);
  const truncatedText = textWidth(text) > innerWidth ? sliceByColumns(text, 0, innerWidth) : text;
  const textW = textWidth(truncatedText);

  // Center text
  const innerX = rect.x + borderSize;
  const innerY = rect.y + borderSize;
  const innerHeight = Math.max(0, rect.height - borderSize * 2);
  const x = innerX + Math.floor((innerWidth - textW) / 2);
  const y = innerY + Math.floor(innerHeight / 2);

  writeTextClipped(ctx, x, y, truncatedText, fg, bg, { bold: true });

  // Draw a subtle focus outline even if no border is set
  if (!hasBorder && isFocused && rect.width >= 2 && rect.height >= 2) {
    drawBorderClipped(ctx, rect.x, rect.y, rect.width, rect.height, 'single', focusBorderColor, bg);
  }
}

/**
 * Render checkbox
 */
function renderCheckbox(
  layoutNode: LayoutNode,
  ctx: RenderContext,
  isFocused: boolean,
  inheritedFg: RGBA | null,
  inheritedBg: RGBA | null
): void {
  const { node, rect } = layoutNode;
  const props = node.props as StyleProps & { checked?: boolean; label?: string };

  const fg = parseColor(props.color) ?? inheritedFg ?? { r: 255, g: 255, b: 255, a: 1 };
  const bg = parseColor(props.bg) ?? inheritedBg;

  // Draw checkbox
  const checkChar = props.checked ? '☑' : '☐';
  const focusColor = isFocused ? parseColor('#00ff00') : fg;

  writeCharClipped(ctx, rect.x, rect.y, checkChar, focusColor, bg);

  // Draw label
  if (props.label) {
    writeTextClipped(ctx, rect.x + 2, rect.y, props.label, fg, bg);
  }
}

/**
 * Render select dropdown
 */
function renderSelect(
  layoutNode: LayoutNode,
  ctx: RenderContext,
  isFocused: boolean,
  inheritedFg: RGBA | null,
  inheritedBg: RGBA | null
): void {
  const { node, rect } = layoutNode;
  const props = node.props as StyleProps & { value?: string };

  const fg = parseColor(props.color) ?? inheritedFg ?? { r: 255, g: 255, b: 255, a: 1 };
  const bg = parseColor(props.bg) ?? inheritedBg ?? { r: 40, g: 40, b: 40, a: 1 };
  const focusBg = isFocused ? parseColor('#1a1a4e') ?? bg : bg;

  // Fill background
  fillRectClipped(ctx, rect.x, rect.y, rect.width, rect.height, ' ', null, focusBg);

  // Draw border
  drawBorderClipped(
    ctx,
    rect.x,
    rect.y,
    rect.width,
    rect.height,
    'single',
    isFocused ? parseColor('#00aaff') : parseColor('#888888'),
    focusBg
  );

  // Draw value
  const displayValue = props.value || 'Select...';
  const innerWidth = Math.max(0, rect.width - 4); // Leave room for arrow
  const truncated = textWidth(displayValue) > innerWidth ? sliceByColumns(displayValue, 0, innerWidth) : displayValue;

  writeTextClipped(ctx, rect.x + 1, rect.y + Math.floor(rect.height / 2), truncated, fg, focusBg);

  // Draw dropdown arrow
  writeCharClipped(ctx, rect.x + rect.width - 2, rect.y + Math.floor(rect.height / 2), '▼', fg, focusBg);
}

/**
 * Render horizontal rule
 */
function renderHr(layoutNode: LayoutNode, ctx: RenderContext, inheritedFg: RGBA | null): void {
  const { node, rect } = layoutNode;
  const props = node.props as StyleProps & { char?: string };

  const fg = parseColor(props.color) ?? inheritedFg ?? { r: 128, g: 128, b: 128, a: 1 };
  const char = props.char || '─';

  drawHLineClipped(ctx, rect.x, rect.y, rect.width, char, fg, null);
}

/**
 * Render list (ul/ol)
 */
function renderList(layoutNode: LayoutNode, ctx: RenderContext, inheritedFg: RGBA | null, inheritedBg: RGBA | null): void {
  const { node, rect, children } = layoutNode;
  const props = node.props as StyleProps;
  const isOrdered = node.type === 'ol';

  const fg = parseColor(props.color) ?? inheritedFg ?? { r: 255, g: 255, b: 255, a: 1 };
  const bg = parseColor(props.bg) ?? inheritedBg;

  let y = rect.y;

  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    const bullet = isOrdered ? `${i + 1}. ` : '• ';
    const text = getTextContentFromChildren(child.node.children);

    writeTextClipped(ctx, rect.x, y, bullet + text, fg, bg);
    y++;
  }
}

/**
 * Render table
 */
function renderTable(layoutNode: LayoutNode, ctx: RenderContext, inheritedFg: RGBA | null, inheritedBg: RGBA | null): void {
  const { node, rect } = layoutNode;
  const props = node.props as StyleProps;

  const fg = parseColor(props.color) ?? inheritedFg ?? { r: 255, g: 255, b: 255, a: 1 };
  const bg = parseColor(props.bg) ?? inheritedBg;
  const borderColor = parseColor(props.borderColor) ?? fg ?? parseColor('#888888');

  // For now, just render a simple bordered table
  // Full table implementation would need to calculate column widths
  fillRectClipped(ctx, rect.x, rect.y, rect.width, rect.height, ' ', fg, bg);

  if (props.border && props.border !== 'none') {
    drawBorderClipped(ctx, rect.x, rect.y, rect.width, rect.height, props.border as BorderStyle, borderColor, bg);
  }
}

/**
 * Render scrollbars for scrollable containers
 */
function renderScrollbars(
  layoutNode: LayoutNode,
  ctx: RenderContext,
  inheritedFg: RGBA | null,
  inheritedBg: RGBA | null,
  padding: { top: number; right: number; bottom: number; left: number },
  borderSize: number
): void {
  const props = layoutNode.node.props as StyleProps;
  const rect = layoutNode.rect;

  const innerX = rect.x + padding.left + borderSize;
  const innerY = rect.y + padding.top + borderSize;
  const innerWidth = Math.max(0, rect.width - padding.left - padding.right - borderSize * 2);
  const innerHeight = Math.max(0, rect.height - padding.top - padding.bottom - borderSize * 2);
  if (innerWidth <= 0 || innerHeight <= 0) return;

  const totalHeight = Math.max(1, layoutNode.contentHeight);
  const totalWidth = Math.max(1, layoutNode.contentWidth);
  const showV = totalHeight > innerHeight;
  const showH = totalWidth > innerWidth;

  if (!showV && !showH) return;

  const thumbColor = parseColor(props.scrollbarColor) ?? parseColor('#16c79a') ?? inheritedFg ?? parseColor('#ffffff');
  const trackColor = parseColor(props.scrollbarTrackColor) ?? parseColor('#20263a') ?? inheritedBg ?? parseColor('#111827');

  if (showV) {
    const trackX = innerX + innerWidth - 1;
    for (let i = 0; i < innerHeight; i++) {
      writeCharClipped(ctx, trackX, innerY + i, '│', trackColor, null);
    }

    const maxScroll = Math.max(0, totalHeight - innerHeight);
    const thumbSize = Math.max(1, Math.floor((innerHeight * innerHeight) / totalHeight));
    const maxThumbPos = Math.max(0, innerHeight - thumbSize);
    const thumbPos = maxScroll === 0 ? 0 : Math.round((layoutNode.scrollY / maxScroll) * maxThumbPos);

    for (let i = 0; i < thumbSize; i++) {
      writeCharClipped(ctx, trackX, innerY + thumbPos + i, '█', thumbColor, null);
    }
  }

  if (showH) {
    const trackY = innerY + innerHeight - 1;
    for (let i = 0; i < innerWidth; i++) {
      writeCharClipped(ctx, innerX + i, trackY, '─', trackColor, null);
    }

    const maxScroll = Math.max(0, totalWidth - innerWidth);
    const thumbSize = Math.max(1, Math.floor((innerWidth * innerWidth) / totalWidth));
    const maxThumbPos = Math.max(0, innerWidth - thumbSize);
    const thumbPos = maxScroll === 0 ? 0 : Math.round((layoutNode.scrollX / maxScroll) * maxThumbPos);

    for (let i = 0; i < thumbSize; i++) {
      writeCharClipped(ctx, innerX + thumbPos + i, trackY, '█', thumbColor, null);
    }
  }

  if (showV && showH) {
    writeCharClipped(ctx, innerX + innerWidth - 1, innerY + innerHeight - 1, '■', thumbColor, null);
  }
}

/**
 * ANSI escape sequences for terminal control
 */
export const Terminal = {
  // Screen
  clearScreen: '\x1b[2J',
  clearLine: '\x1b[2K',

  // Cursor
  hideCursor: '\x1b[?25l',
  showCursor: '\x1b[?25h',
  moveCursor: (x: number, y: number) => `\x1b[${y + 1};${x + 1}H`,
  cursorHome: '\x1b[H',

  // Alternate screen buffer
  enterAltScreen: '\x1b[?1049h',
  exitAltScreen: '\x1b[?1049l',

  // Mouse
  enableMouse: '\x1b[?1000h\x1b[?1002h\x1b[?1006h',
  disableMouse: '\x1b[?1000l\x1b[?1002l\x1b[?1006l',

  // Reset
  reset: RESET,
};
