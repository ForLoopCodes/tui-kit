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
 * Core virtual terminal rendering logic using custom jsx nodes implementation
 * Primary state management for screen buffers and keyboard interactive scrolling
 */

export type Segment = { text: string; color?: string; bg?: string }
type Style = { color?: string; bg?: string }
type BoxProps = { width?: number; pad?: number; block?: boolean }
type Props = Style & BoxProps & { children?: any }
export type VNode = { type: string; props: Props; children: (VNode | string)[] }
export const Fragment = "Fragment"

export function createElement(type: any, props: Props | null, ...children: any[]): VNode {
  const nodes: (VNode | string)[] = []
  const add = (child: any) => {
    if (child == null || child === false || child === true) return
    if (Array.isArray(child)) return child.forEach(add)
    nodes.push(typeof child === "number" ? String(child) : child)
  }
  children.forEach(add)
  return { type: typeof type === "string" ? type : String(type), props: props ?? {}, children: nodes }
}

const reset = "\x1b[0m"
const clear = "\x1b[K"

const colorCodes: Record<string, number> = {
  black: 30,
  red: 31,
  green: 32,
  yellow: 33,
  blue: 34,
  magenta: 35,
  cyan: 36,
  white: 37,
  gray: 90,
  grey: 90,
  brightblack: 90,
  brightred: 91,
  brightgreen: 92,
  brightyellow: 93,
  brightblue: 94,
  brightmagenta: 95,
  brightcyan: 96,
  brightwhite: 97,
  default: 39
}

export function parseJsx(source: string): Segment[] {
  const segments: Segment[] = []
  const tag = /<text\b([^>]*)>([\s\S]*?)<\/text>/gi
  let lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = tag.exec(source))) {
    if (match.index > lastIndex) segments.push({ text: source.slice(lastIndex, match.index) })
    const attrs = parseAttrs(match[1] || "")
    segments.push({ text: match[2], color: attrs.color, bg: attrs.bg })
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < source.length) segments.push({ text: source.slice(lastIndex) })
  return segments
}

function parseAttrs(raw: string): Style {
  const attrs: Style = {}
  const attr = /(\w+)\s*=\s*["']([^"']*)["']/g
  let match: RegExpExecArray | null
  while ((match = attr.exec(raw))) {
    const key = match[1].toLowerCase()
    const value = match[2].trim()
    if (key === "color" || key === "fg") attrs.color = value
    if (key === "bg" || key === "background") attrs.bg = value
  }
  return attrs
}

function styleCode(color?: string, bg?: string) {
  const codes: number[] = []
  const norm = (value?: string) => value?.toLowerCase().replace(/[^a-z]/g, "")
  const fg = norm(color)
  const bgKey = norm(bg)
  if (fg && colorCodes[fg] !== undefined) codes.push(colorCodes[fg])
  if (bgKey && colorCodes[bgKey] !== undefined) codes.push(colorCodes[bgKey] + 10)
  return codes.length ? `\x1b[${codes.join(";")}m` : ""
}

type Token = { kind: "text"; text: string; color?: string; bg?: string } | { kind: "box"; enter: boolean; props: BoxProps }

const mergeStyle = (base: Style, next: Style): Style => ({
  color: next.color ?? base.color,
  bg: next.bg ?? base.bg
})

const normalizeWidth = (value?: number) => (typeof value === "number" && value > 0 ? Math.floor(value) : undefined)
const normalizePad = (value?: number) => (typeof value === "number" && value > 0 ? Math.floor(value) : 0)

const pushTokens = (node: VNode | string, style: Style, tokens: Token[]) => {
  if (typeof node === "string") {
    tokens.push({ kind: "text", text: node, color: style.color, bg: style.bg })
    return
  }
  const nextStyle = mergeStyle(style, node.props)
  const nodeType = node.type
  if (nodeType === "box" || nodeType === "div") {
    const props = {
      width: normalizeWidth(node.props.width),
      pad: normalizePad(node.props.pad),
      block: node.props.block !== false
    }
    tokens.push({ kind: "box", enter: true, props })
    node.children.forEach(child => pushTokens(child, nextStyle, tokens))
    tokens.push({ kind: "box", enter: false, props })
    return
  }
  node.children.forEach(child => pushTokens(child, nextStyle, tokens))
}

const segmentsToTokens = (segments: Segment[]): Token[] =>
  segments.map(segment => ({ kind: "text", text: segment.text, color: segment.color, bg: segment.bg }))

const toTokens = (source: VNode | string | Segment[]): Token[] => {
  if (typeof source === "string") return segmentsToTokens(parseJsx(source))
  if (Array.isArray(source)) return segmentsToTokens(source)
  const tokens: Token[] = []
  pushTokens(source, {}, tokens)
  return tokens
}

type BoxState = { limit: number; pad: number; block: boolean }

function tokensToLines(tokens: Token[], width: number): string[] {
  const lines: string[] = []
  let line = ""
  let col = 0
  let active = ""
  let padTotal = 0
  let limit = Math.max(1, width)
  const stack: BoxState[] = []
  const applyPad = () => {
    if (padTotal && col === 0) {
      const fill = Math.min(padTotal, limit)
      line += " ".repeat(fill)
      col += fill
    }
  }
  const addRightPad = () => {
    if (padTotal && col < limit) {
      const fill = Math.min(padTotal, limit - col)
      if (fill) {
        line += " ".repeat(fill)
        col += fill
      }
    }
  }
  const pushLine = () => {
    addRightPad()
    if (active) line += reset
    lines.push(line + clear)
    line = active
    col = 0
    applyPad()
  }
  applyPad()
  for (const token of tokens) {
    if (token.kind === "box") {
      if (token.enter) {
        const block = token.props.block !== false
        if (block && col > 0) pushLine()
        const nextLimit = token.props.width ? Math.min(limit, token.props.width) : limit
        stack.push({ limit: nextLimit, pad: token.props.pad ?? 0, block })
        padTotal += token.props.pad ?? 0
        limit = nextLimit
        if (col >= limit) pushLine()
        applyPad()
      } else {
        const last = stack.pop()
        if (last) {
          padTotal -= last.pad
          limit = stack.length ? stack[stack.length - 1].limit : Math.max(1, width)
          if (last.block && col > 0) pushLine()
          if (col >= limit) pushLine()
          applyPad()
        }
      }
      continue
    }
    const style = styleCode(token.color, token.bg)
    if (style !== active) {
      if (active) line += reset
      if (style) line += style
      active = style
    }
    for (const ch of token.text) {
      if (ch === "\r") continue
      if (ch === "\n") {
        pushLine()
        continue
      }
      if (col >= limit) pushLine()
      line += ch
      col++
    }
  }
  if (line.length || !lines.length) {
    addRightPad()
    if (active) line += reset
    lines.push(line + clear)
  }
  return lines
}

export function renderLines(source: VNode | string | Segment[], width?: number) {
  return tokensToLines(toTokens(source), width ?? process.stdout.columns ?? 80)
}

export function run(source: VNode | string | Segment[]) {
  if (!process.stdout.isTTY || !process.stdin.isTTY) return () => { }
  const out = process.stdout
  const tokens = toTokens(source)
  out.write("\x1b[?1049h\x1b[H\x1b[2J\x1b[?25l")
  let width = out.columns || 80
  let height = out.rows || 24
  let lines = tokensToLines(tokens, width)
  let offset = 0
  const draw = () => {
    const max = Math.max(0, lines.length - height)
    offset = Math.max(0, Math.min(offset, max))
    out.write("\x1b[H" + lines.slice(offset, offset + height).join("\n") + "\x1b[0J")
  }
  const exit = () => {
    out.write("\x1b[0m\x1b[?25h\x1b[?1049l")
    process.stdin.off("data", onKey).setRawMode(false).pause()
    out.off("resize", onResize)
  }
  const onResize = () => {
    width = out.columns || 80
    height = out.rows || 24
    lines = tokensToLines(tokens, width)
    draw()
  }
  const onKey = (buf: Buffer) => {
    const key = buf.toString()
    if (key === "\u0003" || key === "q" || key === "\x1b") return exit()
    if (key === "\x1b[A" || key === "k") offset -= 1
    else if (key === "\x1b[B" || key === "j") offset += 1
    else if (key === "\x1b[5~") offset -= height
    else if (key === "\x1b[6~") offset += height
    else if (key === "\x1b[H") offset = 0
    else if (key === "\x1b[F") offset = Math.max(0, lines.length - height)
    else return
    draw()
  }
  process.stdin.setRawMode(true).resume().on("data", onKey)
  out.on("resize", onResize)
  draw()
  return exit
}
