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
 * Core virtual terminal rendering with css like styling and interactive elements
 * Manages screen buffer focus navigation mouse events and component tree rendering
 */

import { parseColor, toAnsiFg, toAnsiBg, reset, bold, dim, italic, underline, strikethrough, type RGBA } from "./colors"
import { parseUnit, resolveUnit, parsePadding, getBorderChars, calculateLayout, layoutFlexChildren, layoutGridChildren, type LayoutProps, type BorderStyle, type Display, type Overflow, type TextAlign } from "./layout"
import { enableMouse, disableMouse, parseMouseEvent, processMouseEvent, registerRegion, clearRegions, getHoveredId, findRegionAt } from "./mouse"
import { parseKey, processKeyInput, setFocusedElement, isResizeMode, isMoveMode, exitModes, registerGlobalKeybind } from "./input"
import { registerElement, focusElement, focusNext, focusPrev, getFocusedElement, clearRegistry, resetFocusOrder, finalizeFocusCycle, handleInputKey, handleSelectKey, handleCheckboxKey, getElement, type InputState, type SelectState, type CheckboxState, type ButtonState, type ElementState, createInputState, createButtonState, createSelectState, createCheckboxState, renderInput, renderSelect, renderCheckbox, renderButton, renderHr, renderList, renderTable, createListState, createTableState, type ListState, type TableState } from "./elements"

export type VNode = { type: string; props: Record<string, any>; children: (VNode | string)[] }
export const Fragment = "Fragment"

export function createElement(type: any, props: Record<string, any> | null, ...children: any[]): VNode {
  if (typeof type === "function") {
    return type({ ...props, children })
  }
  const nodes: (VNode | string)[] = []
  const flatten = (child: any) => {
    if (child == null || child === false || child === true) return
    if (Array.isArray(child)) return child.forEach(flatten)
    nodes.push(typeof child === "number" ? String(child) : child)
  }
  children.forEach(flatten)
  return { type: typeof type === "string" ? type : String(type), props: props ?? {}, children: nodes }
}

interface StyleProps {
  color?: string
  bg?: string
  bold?: boolean
  dim?: boolean
  italic?: boolean
  underline?: boolean
  strikethrough?: boolean
}

interface BoxProps extends StyleProps, LayoutProps {
  id?: string
  focusable?: boolean
  tabIndex?: number
  keybind?: string
  resizable?: boolean
  movable?: boolean
  hoverBg?: string
  hoverColor?: string
  focusBg?: string
  focusColor?: string
  onFocus?: () => void
  onBlur?: () => void
  onClick?: () => void
  onKeypress?: (key: string) => void
}

interface Cell {
  char: string
  fg: RGBA | null
  bg: RGBA | null
  bold: boolean
  dim: boolean
  italic: boolean
  underline: boolean
  strikethrough: boolean
}

class ScreenBuffer {
  width: number
  height: number
  cells: Cell[][]

  constructor(width: number, height: number) {
    this.width = width
    this.height = height
    this.cells = []
    this.clear()
  }

  clear(): void {
    this.cells = Array.from({ length: this.height }, () =>
      Array.from({ length: this.width }, () => ({
        char: " ", fg: null, bg: null, bold: false, dim: false,
        italic: false, underline: false, strikethrough: false
      }))
    )
  }

  resize(width: number, height: number): void {
    this.width = width
    this.height = height
    this.clear()
  }

  setCell(x: number, y: number, char: string, style: Partial<Cell>): void {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return
    const cell = this.cells[y][x]
    cell.char = char
    if (style.fg !== undefined) cell.fg = style.fg
    if (style.bg !== undefined) cell.bg = style.bg
    if (style.bold !== undefined) cell.bold = style.bold
    if (style.dim !== undefined) cell.dim = style.dim
    if (style.italic !== undefined) cell.italic = style.italic
    if (style.underline !== undefined) cell.underline = style.underline
    if (style.strikethrough !== undefined) cell.strikethrough = style.strikethrough
  }

  writeText(x: number, y: number, text: string, style: Partial<Cell>, maxWidth?: number): number {
    let col = x
    const limit = maxWidth !== undefined ? Math.min(x + maxWidth, this.width) : this.width
    for (const ch of text) {
      if (ch === "\n" || ch === "\r") continue
      if (col >= limit) break
      this.setCell(col, y, ch, style)
      col++
    }
    return col - x
  }

  fillRect(x: number, y: number, w: number, h: number, char: string, style: Partial<Cell>): void {
    for (let row = y; row < y + h && row < this.height; row++) {
      for (let col = x; col < x + w && col < this.width; col++) {
        if (col >= 0 && row >= 0) this.setCell(col, row, char, style)
      }
    }
  }

  drawBorder(x: number, y: number, w: number, h: number, borderStyle: BorderStyle, style: Partial<Cell>): void {
    if (borderStyle === "none" || w < 2 || h < 2) return
    const chars = getBorderChars(borderStyle)
    this.setCell(x, y, chars.tl, style)
    this.setCell(x + w - 1, y, chars.tr, style)
    this.setCell(x, y + h - 1, chars.bl, style)
    this.setCell(x + w - 1, y + h - 1, chars.br, style)
    for (let col = x + 1; col < x + w - 1; col++) {
      this.setCell(col, y, chars.h, style)
      this.setCell(col, y + h - 1, chars.h, style)
    }
    for (let row = y + 1; row < y + h - 1; row++) {
      this.setCell(x, row, chars.v, style)
      this.setCell(x + w - 1, row, chars.v, style)
    }
  }

  render(): string {
    const lines: string[] = []
    for (let y = 0; y < this.height; y++) {
      let line = ""
      let lastFg: RGBA | null = null
      let lastBg: RGBA | null = null
      let lastBold = false
      let lastDim = false
      let lastItalic = false
      let lastUnderline = false
      let lastStrike = false

      for (let x = 0; x < this.width; x++) {
        const cell = this.cells[y][x]
        let codes = ""

        const fgChanged = cell.fg !== lastFg && (cell.fg === null || lastFg === null ||
          cell.fg.r !== lastFg.r || cell.fg.g !== lastFg.g || cell.fg.b !== lastFg.b)
        const bgChanged = cell.bg !== lastBg && (cell.bg === null || lastBg === null ||
          cell.bg.r !== lastBg.r || cell.bg.g !== lastBg.g || cell.bg.b !== lastBg.b)
        const attrChanged = cell.bold !== lastBold || cell.dim !== lastDim ||
          cell.italic !== lastItalic || cell.underline !== lastUnderline || cell.strikethrough !== lastStrike

        if (fgChanged || bgChanged || attrChanged) {
          codes += reset
          if (cell.fg) codes += toAnsiFg(cell.fg)
          if (cell.bg) codes += toAnsiBg(cell.bg)
          if (cell.bold) codes += bold
          if (cell.dim) codes += dim
          if (cell.italic) codes += italic
          if (cell.underline) codes += underline
          if (cell.strikethrough) codes += strikethrough
        }

        line += codes + cell.char
        lastFg = cell.fg
        lastBg = cell.bg
        lastBold = cell.bold
        lastDim = cell.dim
        lastItalic = cell.italic
        lastUnderline = cell.underline
        lastStrike = cell.strikethrough
      }
      lines.push(line + reset)
    }
    return lines.join("\n")
  }
}

interface RenderContext {
  buffer: ScreenBuffer
  x: number
  y: number
  width: number
  height: number
  style: StyleProps
  scrollX: number
  scrollY: number
}

interface ElementPosition {
  id: string
  x: number
  y: number
  width: number
  height: number
  node: VNode
}

let elementPositions: ElementPosition[] = []
let boxPositions: Map<string, { x: number; y: number; width: number; height: number }> = new Map()

function mergeStyle(base: StyleProps, node: VNode): StyleProps {
  return {
    color: node.props.color ?? base.color,
    bg: node.props.bg ?? base.bg,
    bold: node.props.bold ?? base.bold,
    dim: node.props.dim ?? base.dim,
    italic: node.props.italic ?? base.italic,
    underline: node.props.underline ?? base.underline,
    strikethrough: node.props.strikethrough ?? base.strikethrough
  }
}

function getStyleCell(style: StyleProps): Partial<Cell> {
  return {
    fg: parseColor(style.color),
    bg: parseColor(style.bg),
    bold: style.bold ?? false,
    dim: style.dim ?? false,
    italic: style.italic ?? false,
    underline: style.underline ?? false,
    strikethrough: style.strikethrough ?? false
  }
}

function applyFocusStyle(cellStyle: Partial<Cell>, focused: boolean, props: { focusBg?: string; focusColor?: string; bg?: string; color?: string }): Partial<Cell> {
  if (!focused) return cellStyle
  const styled = { ...cellStyle }
  const focusBg = parseColor(props.focusBg || "#444") || styled.bg
  const focusFg = parseColor(props.focusColor || "") || styled.fg || parseColor("#fff")
  if (focusBg) styled.bg = focusBg
  if (focusFg) styled.fg = focusFg
  return styled
}

function measureContent(node: VNode | string, maxWidth: number): { width: number; height: number } {
  if (typeof node === "string") {
    const lines = node.split("\n")
    const height = lines.length
    const width = Math.max(...lines.map(l => l.length))
    return { width: Math.min(width, maxWidth), height }
  }

  const nodeType = node.type.toLowerCase()
  const props = node.props || {}

  const explicitW = resolveUnit(parseUnit(props.width), maxWidth)
  const explicitH = resolveUnit(parseUnit(props.height), 100)
  const [pt, pr, pb, pl] = parsePadding(props.padding)
  const [mt, mr, mb, ml] = parsePadding(props.margin)
  const borderSize = props.border && props.border !== "none" ? 1 : 0

  let totalHeight = 0
  let maxLineWidth = 0

  for (const child of node.children) {
    const m = measureContent(child, explicitW || maxWidth)
    if (nodeType === "box" || nodeType === "text" || nodeType === "span") {
      if (props.flexDirection === "row") {
        maxLineWidth += m.width
        totalHeight = Math.max(totalHeight, m.height)
      } else {
        totalHeight += m.height
        maxLineWidth = Math.max(maxLineWidth, m.width)
      }
    } else {
      totalHeight += m.height
      maxLineWidth = Math.max(maxLineWidth, m.width)
    }
  }

  const contentW = explicitW || (maxLineWidth + pl + pr + borderSize * 2)
  const contentH = explicitH || (totalHeight + pt + pb + borderSize * 2)

  return { width: Math.min(contentW + ml + mr, maxWidth), height: Math.max(1, contentH + mt + mb) }
}

function renderNode(node: VNode | string, ctx: RenderContext): void {
  if (typeof node === "string") {
    const cellStyle = getStyleCell(ctx.style)
    const lines = node.split("\n")
    let row = ctx.y
    for (const line of lines) {
      if (row >= ctx.y + ctx.height) break
      if (row >= 0 && row < ctx.buffer.height) {
        ctx.buffer.writeText(ctx.x, row, line, cellStyle, ctx.width)
      }
      row++
    }
    return
  }

  const nodeType = node.type.toLowerCase()
  const style = mergeStyle(ctx.style, node)

  if (nodeType === "br") {
    return
  }

  if (nodeType === "hr") {
    const hrColor = parseColor(node.props.color || style.color)
    const char = node.props.char || "─"
    const w = resolveUnit(parseUnit(node.props.width), ctx.width) || ctx.width
    ctx.buffer.writeText(ctx.x, ctx.y, char.repeat(w), { fg: hrColor })
    return
  }

  if (nodeType === "input") {
    const id = node.props.id || node.props.name || `input_${ctx.x}_${ctx.y}`
    let state = getElement<InputState>(id)
    if (!state) {
      state = createInputState(id, node.props.value || "", node.props.placeholder || "")
      if (node.props.type === "password") state.mask = "•"
    }
    state.tabIndex = node.props.tabIndex ?? state.tabIndex ?? 0
    registerElement(state)
    const w = resolveUnit(parseUnit(node.props.width), ctx.width) || 20
    const rendered = renderInput(state, w)
    const cellStyle = applyFocusStyle(getStyleCell(style), state.focused, node.props)
    ctx.buffer.writeText(ctx.x, ctx.y, rendered, cellStyle, w)
    elementPositions.push({ id, x: ctx.x, y: ctx.y, width: w, height: 1, node })
    registerRegion({
      id, x: ctx.x, y: ctx.y, width: w, height: 1,
      onPress: () => focusElement(id)
    })
    return
  }

  if (nodeType === "button") {
    const id = node.props.id || `btn_${ctx.x}_${ctx.y}`
    let state = getElement<ButtonState>(id)
    if (!state) {
      state = createButtonState(id)
    }
    state.tabIndex = node.props.tabIndex ?? state.tabIndex ?? 0
    registerElement(state)
    state.hovered = getHoveredId() === id
    const label = node.children.map(c => typeof c === "string" ? c : "").join("")
    const w = resolveUnit(parseUnit(node.props.width), ctx.width) || (label.length + 4)
    const bracket = state.pressed ? "«" : "["
    const close = state.pressed ? "»" : "]"
    const padded = label.slice(0, w - 4).padStart(Math.floor((w - 4 + label.length) / 2)).padEnd(w - 4)
    const buttonText = `${bracket} ${padded} ${close}`
    let cellStyle = getStyleCell(style)

    // Focus state has highest priority, then hover
    if (state.focused) {
      cellStyle = applyFocusStyle(cellStyle, true, node.props)
    } else if (state.hovered) {
      const hoverBg = parseColor(node.props.hoverBg || node.props.bg)
      const hoverFg = node.props.hoverColor ? parseColor(node.props.hoverColor) : undefined
      if (hoverBg) cellStyle.bg = hoverBg
      if (hoverFg) cellStyle.fg = hoverFg
    }
    
    ctx.buffer.writeText(ctx.x, ctx.y, buttonText, cellStyle, w)
    elementPositions.push({ id, x: ctx.x, y: ctx.y, width: w, height: 1, node })
    registerRegion({
      id, x: ctx.x, y: ctx.y, width: w, height: 1,
      onPress: () => { state!.pressed = true; focusElement(id) },
      onRelease: (e) => {
        state!.pressed = false
        const region = findRegionAt(e.x, e.y)
        if (region?.id === id) {
          node.props.onClick?.()
        }
      }
    })
    return
  }

  if (nodeType === "select") {
    const id = node.props.id || node.props.name || `sel_${ctx.x}_${ctx.y}`
    const options = node.children
      .filter((c): c is VNode => typeof c !== "string" && c.type === "option")
      .map(c => ({
        value: c.props.value || c.children.join(""),
        label: c.children.map(ch => typeof ch === "string" ? ch : "").join("")
      }))
    let state = getElement<SelectState>(id)
    if (!state) {
      state = createSelectState(id, options, node.props.value)
    }
    state.tabIndex = node.props.tabIndex ?? state.tabIndex ?? 0
    registerElement(state)
    const w = resolveUnit(parseUnit(node.props.width), ctx.width) || 20
    const lines = renderSelect(state, w)
    const cellStyle = applyFocusStyle(getStyleCell(style), state.focused, node.props)
    lines.forEach((line, i) => ctx.buffer.writeText(ctx.x, ctx.y + i, line, cellStyle, w))
    elementPositions.push({ id, x: ctx.x, y: ctx.y, width: w, height: lines.length, node })
    registerRegion({
      id, x: ctx.x, y: ctx.y, width: w, height: lines.length,
      onPress: (e) => {
        focusElement(id)
        if (state!.open) {
          const relativeY = e.y - ctx.y
          if (relativeY >= 1 && relativeY <= state!.options.length) {
            state!.highlightIndex = relativeY - 1
            state!.value = state!.options[state!.highlightIndex].value
            state!.open = false
          } else if (relativeY === 0) {
            state!.open = false
          }
        } else {
          state!.open = true
        }
      }
    })
    return
  }

  if (nodeType === "checkbox") {
    const id = node.props.id || node.props.name || `chk_${ctx.x}_${ctx.y}`
    const label = node.props.label || node.children.map(c => typeof c === "string" ? c : "").join("")
    let state = getElement<CheckboxState>(id)
    if (!state) {
      state = createCheckboxState(id, node.props.checked || false, label)
    }
    state.tabIndex = node.props.tabIndex ?? state.tabIndex ?? 0
    registerElement(state)
    const rendered = renderCheckbox(state)
    const cellStyle = applyFocusStyle(getStyleCell(style), state.focused, node.props)
    ctx.buffer.writeText(ctx.x, ctx.y, rendered, cellStyle)
    const w = rendered.length
    elementPositions.push({ id, x: ctx.x, y: ctx.y, width: w, height: 1, node })
    registerRegion({
      id, x: ctx.x, y: ctx.y, width: w, height: 1,
      onPress: () => {
        focusElement(id)
        state!.checked = !state!.checked
        state!.value = state!.checked
        node.props.onChange?.(state!.checked)
      }
    })
    return
  }

  if (nodeType === "ul" || nodeType === "ol") {
    const id = node.props.id || `list_${ctx.x}_${ctx.y}`
    const items = node.children
      .filter((c): c is VNode => typeof c !== "string" && c.type === "li")
      .map(c => c.children.map(ch => typeof ch === "string" ? ch : "").join(""))
    let state = getElement<ListState>(id)
    if (!state) {
      state = createListState(id, items, nodeType === "ol")
    }
    state.tabIndex = node.props.tabIndex ?? state.tabIndex ?? 0
    registerElement(state)
    const lines = renderList(state, ctx.width)
    const cellStyle = getStyleCell(style)
    lines.forEach((line, i) => ctx.buffer.writeText(ctx.x, ctx.y + i, line, cellStyle))
    elementPositions.push({ id, x: ctx.x, y: ctx.y, width: ctx.width, height: lines.length, node })
    registerRegion({
      id, x: ctx.x, y: ctx.y, width: ctx.width, height: lines.length,
      onPress: (e) => {
        focusElement(id)
        state!.selectedIndex = e.y - ctx.y
      }
    })
    return
  }

  if (nodeType === "table") {
    const id = node.props.id || `tbl_${ctx.x}_${ctx.y}`
    const thead = node.children.find((c): c is VNode => typeof c !== "string" && c.type === "thead")
    const tbody = node.children.find((c): c is VNode => typeof c !== "string" && c.type === "tbody")
    const headerCells = thead?.children
      .filter((c): c is VNode => typeof c !== "string" && c.type === "tr")[0]?.children
      .filter((c): c is VNode => typeof c !== "string" && (c.type === "th" || c.type === "td"))
      .map(c => c.children.map(ch => typeof ch === "string" ? ch : "").join("")) || []
    const bodyRows = tbody?.children
      .filter((c): c is VNode => typeof c !== "string" && c.type === "tr")
      .map(tr => tr.children
        .filter((c): c is VNode => typeof c !== "string" && (c.type === "td" || c.type === "th"))
        .map(c => c.children.map(ch => typeof ch === "string" ? ch : "").join(""))
      ) || []
    let state = getElement<TableState>(id)
    if (!state) {
      state = createTableState(id, headerCells, bodyRows)
      registerElement(state)
    }
    const colWidths = headerCells.map((h, i) => {
      const maxBody = Math.max(...bodyRows.map(r => (r[i] || "").length), 0)
      return Math.max(h.length, maxBody, 5)
    })
    const lines = renderTable(state, colWidths)
    const cellStyle = getStyleCell(style)
    lines.forEach((line, i) => ctx.buffer.writeText(ctx.x, ctx.y + i, line, cellStyle))
    return
  }

  if (nodeType === "form") {
    let row = ctx.y
    for (const child of node.children) {
      if (typeof child === "string") {
        ctx.buffer.writeText(ctx.x, row, child, getStyleCell(style))
        row++
      } else {
        renderNode(child, { ...ctx, y: row, style })
        const measured = measureContent(child, ctx.width)
        row += measured.height
      }
    }
    return
  }

  if (nodeType === "box" || nodeType === "text" || nodeType === "span" || nodeType === Fragment) {
    const props = node.props as BoxProps
    const id = props.id
    const content = measureContent(node, ctx.width)
    const layout = calculateLayout(props, ctx.width, ctx.height, content.width, content.height)

    const [mt, mr, mb, ml] = parsePadding(props.margin)
    const boxX = ctx.x + (props.left || 0) + ml
    const boxY = ctx.y + (props.top || 0) + mt
    const availW = ctx.width - ml - mr
    const availH = ctx.height - mt - mb
    const boxW = resolveUnit(parseUnit(props.width), availW) || availW
    const boxH = resolveUnit(parseUnit(props.height), availH) || content.height + (props.border && props.border !== "none" ? 2 : 0) + (parsePadding(props.padding)[0] + parsePadding(props.padding)[2])

    let cellStyle = getStyleCell(style)
    const isHovered = id ? getHoveredId() === id : false

    let boxState: ElementState | undefined
    const isInteractiveBox = props.focusable || props.onClick || props.resizable || props.movable
    if (id && isInteractiveBox) {
      boxState = getElement<ElementState>(id)
      if (!boxState) {
        boxState = { id, type: "box", focused: false, disabled: false, value: null }
      }
      boxState.tabIndex = props.tabIndex ?? boxState.tabIndex ?? 0
      registerElement(boxState)
    }

    if (isHovered && props.hoverBg) {
      const hoverBg = parseColor(props.hoverBg)
      if (hoverBg) cellStyle.bg = hoverBg
    }

    if (boxState?.focused) {
      cellStyle = applyFocusStyle(cellStyle, true, props)
    }

    if (cellStyle.bg) {
      ctx.buffer.fillRect(boxX, boxY, boxW, boxH, " ", cellStyle)
    }

    if (props.border && props.border !== "none") {
      const borderColor = parseColor(props.borderColor || style.color)
      ctx.buffer.drawBorder(boxX, boxY, boxW, boxH, props.border, { fg: borderColor })
    }

    const [pt, pr, pb, pl] = parsePadding(props.padding)
    const borderOffset = props.border && props.border !== "none" ? 1 : 0
    const innerX = boxX + borderOffset + pl
    const innerY = boxY + borderOffset + pt
    const innerW = Math.max(1, boxW - borderOffset * 2 - pl - pr)
    const innerH = Math.max(1, boxH - borderOffset * 2 - pt - pb)

    if (id) {
      boxPositions.set(id, { x: boxX, y: boxY, width: boxW, height: boxH })
      const isClickable = !!props.onClick
      if (isInteractiveBox || isClickable) {
        elementPositions.push({ id, x: boxX, y: boxY, width: boxW, height: boxH, node })
        registerRegion({
          id, x: boxX, y: boxY, width: boxW, height: boxH,
          resizable: props.resizable,
          movable: props.movable,
          onPress: () => {
            if (props.focusable) focusElement(id)
          },
          onRelease: (e) => {
            const region = findRegionAt(e.x, e.y)
            if (region?.id === id) {
              props.onClick?.()
            }
          }
        })
      }
    }

    const hasFlexDirection = props.flexDirection !== undefined
    const display: Display = props.display || (hasFlexDirection ? "flex" : "block")
    const isScrollable = props.overflow === "scroll"

    if (display === "flex") {
      const childLayouts = node.children.map(child => {
        const m = measureContent(child, innerW)
        return { x: 0, y: 0, width: m.width, height: m.height, innerX: 0, innerY: 0, innerWidth: m.width, innerHeight: m.height, scrollX: 0, scrollY: 0, contentWidth: m.width, contentHeight: m.height }
      })
      const childProps = node.children.map(child => typeof child === "string" ? {} : child.props || {})
      layoutFlexChildren(childLayouts, innerW, innerH, props, childProps)
      node.children.forEach((child, i) => {
        const cl = childLayouts[i]
        renderNode(child, { ...ctx, x: innerX + cl.x, y: innerY + cl.y, width: cl.width, height: cl.height, style })
      })
    } else if (display === "grid") {
      const childLayouts = node.children.map(child => {
        const m = measureContent(child, innerW)
        return { x: 0, y: 0, width: m.width, height: m.height, innerX: 0, innerY: 0, innerWidth: m.width, innerHeight: m.height, scrollX: 0, scrollY: 0, contentWidth: m.width, contentHeight: m.height }
      })
      layoutGridChildren(childLayouts, innerW, innerH, props)
      node.children.forEach((child, i) => {
        const cl = childLayouts[i]
        renderNode(child, { ...ctx, x: innerX + cl.x, y: innerY + cl.y, width: cl.width, height: cl.height, style })
      })
    } else {
      let row = innerY
      const align: TextAlign = props.textAlign || "left"
      for (const child of node.children) {
        if (row >= innerY + innerH) break
        if (typeof child === "string") {
          const lines = child.split("\n")
          for (const line of lines) {
            if (row >= innerY + innerH) break
            let textX = innerX
            if (align === "center") textX = innerX + Math.floor((innerW - line.length) / 2)
            else if (align === "right") textX = innerX + innerW - line.length
            ctx.buffer.writeText(Math.max(innerX, textX), row, line, cellStyle, innerW)
            row++
          }
        } else {
          renderNode(child, { ...ctx, x: innerX, y: row, width: innerW, height: innerH - (row - innerY), style })
          const m = measureContent(child, innerW)
          row += m.height
        }
      }
    }

    if (isScrollable && content.height > innerH) {
      const scrollRatio = innerH / content.height
      const thumbSize = Math.max(1, Math.floor(scrollRatio * innerH))
      const thumbPos = Math.floor((ctx.scrollY / (content.height - innerH)) * (innerH - thumbSize))
      for (let i = 0; i < innerH; i++) {
        const char = i >= thumbPos && i < thumbPos + thumbSize ? "█" : "░"
        ctx.buffer.setCell(boxX + boxW - 1, innerY + i, char, { fg: parseColor("gray") })
      }
    }

    return
  }

  for (const child of node.children) {
    renderNode(child, { ...ctx, style })
  }
}

export function renderLines(source: VNode, width?: number, height?: number): string[] {
  const w = width ?? process.stdout.columns ?? 80
  const h = height ?? process.stdout.rows ?? 24
  const buffer = new ScreenBuffer(w, h)
  elementPositions = []
  boxPositions.clear()
  clearRegions()

  renderNode(source, {
    buffer, x: 0, y: 0, width: w, height: h,
    style: {}, scrollX: 0, scrollY: 0
  })

  return buffer.render().split("\n")
}

export interface RunOptions {
  onExit?: () => void
  onUpdate?: (tree: VNode) => VNode
  onBeforeRender?: (tree: VNode, draw: () => void) => void
}

export function run(source: VNode, options?: RunOptions) {
  if (!process.stdout.isTTY || !process.stdin.isTTY) return () => { }

  const out = process.stdout
  let tree = source
  let width = out.columns || 80
  let height = out.rows || 24
  let scrollY = 0
  let running = true

  const buffer = new ScreenBuffer(width, height)

  process.stdin.setRawMode(true).resume()
  
  out.write("\x1b[?1049h\x1b[H\x1b[2J\x1b[?25l")
  out.write(enableMouse())

  const draw = () => {
    if (!running) return
    elementPositions = []
    boxPositions.clear()
    clearRegions()
    resetFocusOrder()
    buffer.clear()

    if (options?.onUpdate) {
      tree = options.onUpdate(tree) || tree
    }

    renderNode(tree, {
      buffer, x: 0, y: 0, width, height,
      style: {}, scrollX: 0, scrollY
    })

    finalizeFocusCycle()

    out.write("\x1b[H" + buffer.render())
  }

  const exit = () => {
    if (!running) return
    running = false
    out.write(disableMouse())
    out.write("\x1b[0m\x1b[?25h\x1b[?1049l")
    process.stdin.off("data", onData).setRawMode(false).pause()
    out.off("resize", onResize)
    options?.onExit?.()
  }

  const onResize = () => {
    width = out.columns || 80
    height = out.rows || 24
    buffer.resize(width, height)
    draw()
  }

  const onData = (buf: Buffer) => {
    const mouseEvents = parseMouseEvent(buf)
    if (mouseEvents.length > 0) {
      mouseEvents.forEach(e => {
        if (e.button === "scroll-up") scrollY = Math.max(0, scrollY - 2)
        else if (e.button === "scroll-down") scrollY += 2
        else processMouseEvent(e)
      })
      draw()
      return
    }

    const key = buf.toString()

    // Check for Ctrl+C to quit (standard SIGINT)
    if (key === "\u0003") {
      exit()
      return
    }

    // Process global or element-specific key bindings first
    const bindingResult = processKeyInput(buf)
    if (bindingResult.handled) {
      draw()
      return
    }

    const parsed = parseKey(buf)

    // Handle Tab Navigation
    if (parsed.key === "tab") {
      if (parsed.shift) focusPrev()
      else focusNext()
      draw()
      return
    }

    // Pass input to focused element
    const focused = getFocusedElement()
    let elementHandled = false

    if (focused) {
      if (focused.type === "input") {
        elementHandled = handleInputKey(focused as InputState, key)
      } else if (focused.type === "select") {
        elementHandled = handleSelectKey(focused as SelectState, key)
      } else if (focused.type === "checkbox") {
        elementHandled = handleCheckboxKey(focused as CheckboxState, key)
      } else if (focused.type === "button") {
        if (key === "\r" || key === " " || key === "\n") {
           const pos = elementPositions.find(p => p.id === focused.id)
           if (pos?.node.props.onClick) pos.node.props.onClick()
           elementHandled = true
        }
      }
    }

    // Handle scrolling if not consumed by element
    if (!elementHandled) {
      if (parsed.key === "up") scrollY = Math.max(0, scrollY - 1)
      else if (parsed.key === "down") scrollY++
      else if (parsed.key === "pageup") scrollY = Math.max(0, scrollY - height)
      else if (parsed.key === "pagedown") scrollY += height
      else if (key === "q") { exit(); return }
    }

    draw()
  }

  process.stdin.on("data", onData)
  out.on("resize", onResize)
  
  options?.onBeforeRender?.(tree, draw)
  draw()

  return exit
}

export { parseColor, toAnsiFg, toAnsiBg } from "./colors"
export type { RGBA } from "./colors"
export type { LayoutProps, BorderStyle } from "./layout"
