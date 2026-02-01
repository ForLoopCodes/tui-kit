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
 * Layout engine for tui kit providing unit parsing padding resolution and borders
 * Implements flexbox and grid positioning algorithms for terminal element rendering
 */

export type Display = "block" | "flex" | "grid" | "none"
export type Overflow = "visible" | "hidden" | "scroll"
export type TextAlign = "left" | "center" | "right"
export type BorderStyle = "none" | "single" | "double" | "rounded" | "bold" | "dashed"

export interface LayoutProps {
  width?: string | number
  height?: string | number
  minWidth?: number
  maxWidth?: number
  minHeight?: number
  maxHeight?: number
  padding?: number | [number, number] | [number, number, number, number]
  margin?: number | [number, number] | [number, number, number, number]
  position?: "relative" | "absolute" | "fixed"
  top?: number
  left?: number
  right?: number
  bottom?: number
  display?: Display
  flexDirection?: "row" | "column" | "row-reverse" | "column-reverse"
  flexWrap?: "nowrap" | "wrap" | "wrap-reverse"
  justifyContent?: "flex-start" | "flex-end" | "center" | "space-between" | "space-around" | "space-evenly"
  alignItems?: "flex-start" | "flex-end" | "center" | "stretch" | "baseline"
  gap?: number
  gridTemplateColumns?: string
  gridTemplateRows?: string
  gridGap?: number
  textAlign?: TextAlign
  overflow?: Overflow
  border?: BorderStyle
  borderColor?: string
  zIndex?: number
}

export type Unit = { value: number; unit: "px" | "%" | "auto" | "ch" }

export function parseUnit(value: string | number | undefined): Unit {
  if (value === undefined || value === "auto") return { value: 0, unit: "auto" }
  if (typeof value === "number") return { value, unit: "ch" }
  if (value.endsWith("%")) return { value: parseFloat(value.slice(0, -1)), unit: "%" }
  if (value.endsWith("ch")) return { value: parseFloat(value.slice(0, -2)), unit: "ch" }
  if (value.endsWith("px")) return { value: parseFloat(value.slice(0, -2)), unit: "ch" }
  return { value: parseFloat(value) || 0, unit: "ch" }
}

export function resolveUnit(unit: Unit, total: number): number {
  if (unit.unit === "auto") return 0
  if (unit.unit === "%") return Math.floor((unit.value / 100) * total)
  return Math.floor(unit.value)
}

export function parsePadding(padding: LayoutProps["padding"]): [number, number, number, number] {
  if (padding === undefined) return [0, 0, 0, 0]
  if (typeof padding === "number") return [padding, padding, padding, padding]
  if (Array.isArray(padding)) {
    if (padding.length === 2) return [padding[0], padding[1], padding[0], padding[1]]
    if (padding.length === 4) return padding as [number, number, number, number]
  }
  return [0, 0, 0, 0]
}

export function getBorderChars(style: BorderStyle): { tl: string; tr: string; bl: string; br: string; h: string; v: string } {
  const table = {
    none: { tl: " ", tr: " ", bl: " ", br: " ", h: " ", v: " " },
    single: { tl: "┌", tr: "┐", bl: "└", br: "┘", h: "─", v: "│" },
    double: { tl: "╔", tr: "╗", bl: "╚", br: "╝", h: "═", v: "║" },
    rounded: { tl: "╭", tr: "╮", bl: "╰", br: "╯", h: "─", v: "│" },
    bold: { tl: "┏", tr: "┓", bl: "┗", br: "┛", h: "━", v: "┃" },
    dashed: { tl: "┌", tr: "┐", bl: "└", br: "┘", h: "╌", v: "┆" }
  }
  return table[style] || table.single
}

export interface ComputedLayout {
  x: number
  y: number
  width: number
  height: number
  innerX: number
  innerY: number
  innerWidth: number
  innerHeight: number
  scrollX: number
  scrollY: number
  contentWidth: number
  contentHeight: number
}

export function calculateLayout(props: LayoutProps, totalW: number, totalH: number, contentW: number, contentH: number): ComputedLayout {
  const w = resolveUnit(parseUnit(props.width), totalW) || contentW
  const h = resolveUnit(parseUnit(props.height), totalH) || contentH
  const [pt, pr, pb, pl] = parsePadding(props.padding)
  const borderSize = props.border && props.border !== "none" ? 1 : 0

  return {
    x: props.left || 0,
    y: props.top || 0,
    width: w,
    height: h,
    innerX: borderSize + pl,
    innerY: borderSize + pt,
    innerWidth: Math.max(0, w - borderSize * 2 - pl - pr),
    innerHeight: Math.max(0, h - borderSize * 2 - pt - pb),
    scrollX: 0,
    scrollY: 0,
    contentWidth: contentW,
    contentHeight: contentH
  }
}

export function layoutFlexChildren(children: ComputedLayout[], containerW: number, containerH: number, props: LayoutProps, childProps?: Record<string, any>[]): void {
  const dir = props.flexDirection || "row"
  const justify = props.justifyContent || "flex-start"
  const align = props.alignItems || "flex-start"
  const gap = props.gap || 0
  const isRow = dir === "row" || dir === "row-reverse"

  let totalFixed = 0
  let totalFlex = 0
  children.forEach((c, i) => {
    const flex = childProps?.[i]?.flex || 0
    if (flex > 0) {
      totalFlex += flex
    } else {
      totalFixed += (isRow ? c.width : c.height)
    }
  })
  totalFixed += (children.length - 1) * gap

  const mainSize = isRow ? containerW : containerH
  const freeSpace = Math.max(0, mainSize - totalFixed)
  const flexUnit = totalFlex > 0 ? freeSpace / totalFlex : 0

  children.forEach((c, i) => {
    const flex = childProps?.[i]?.flex || 0
    if (flex > 0) {
      if (isRow) c.width = Math.floor(flexUnit * flex)
      else c.height = Math.floor(flexUnit * flex)
    }
  })

  let totalMain = 0
  children.forEach((c, i) => {
    totalMain += (isRow ? c.width : c.height) + (i > 0 ? gap : 0)
  })

  let mainOffset = 0
  let spacer = 0
  if (justify === "center") mainOffset = Math.max(0, (mainSize - totalMain) / 2)
  else if (justify === "flex-end") mainOffset = Math.max(0, mainSize - totalMain)
  else if (justify === "space-between" && children.length > 1) {
    spacer = Math.max(0, (mainSize - totalMain + (children.length - 1) * gap) / (children.length - 1))
  } else if (justify === "space-around" && children.length > 0) {
    spacer = Math.max(0, (mainSize - totalMain + (children.length - 1) * gap) / children.length)
    mainOffset = spacer / 2
  } else if (justify === "space-evenly" && children.length > 0) {
    spacer = Math.max(0, (mainSize - totalMain + (children.length - 1) * gap) / (children.length + 1))
    mainOffset = spacer
  }

  const crossSize = isRow ? containerH : containerW

  children.forEach((c, i) => {
    if (isRow) {
      c.x = Math.floor(mainOffset)
      if (align === "center") c.y = Math.floor((crossSize - c.height) / 2)
      else if (align === "flex-end") c.y = crossSize - c.height
      else if (align === "stretch") { c.y = 0; c.height = crossSize }
      else c.y = 0
      mainOffset += c.width + (spacer || gap)
    } else {
      c.y = Math.floor(mainOffset)
      if (align === "center") c.x = Math.floor((crossSize - c.width) / 2)
      else if (align === "flex-end") c.x = crossSize - c.width
      else if (align === "stretch") { c.x = 0; c.width = crossSize }
      else c.x = 0
      mainOffset += c.height + (spacer || gap)
    }
  })
}

export function layoutGridChildren(children: ComputedLayout[], containerW: number, containerH: number, props: LayoutProps): void {
  const cols = props.gridTemplateColumns ? props.gridTemplateColumns.split(/\s+/).length : 1
  const gap = props.gridGap || props.gap || 0
  const colW = Math.floor((containerW - (cols - 1) * gap) / cols)

  const numRows = Math.ceil(children.length / cols)
  const rowHeights: number[] = []
  for (let r = 0; r < numRows; r++) {
    let maxH = 1
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c
      if (idx < children.length) maxH = Math.max(maxH, children[idx].height || 1)
    }
    rowHeights.push(maxH)
  }

  let yOffset = 0
  children.forEach((c, i) => {
    const row = Math.floor(i / cols)
    const col = i % cols
    if (col === 0 && row > 0) yOffset += rowHeights[row - 1] + gap
    c.x = col * (colW + gap)
    c.y = yOffset
    c.width = colW
  })
}
