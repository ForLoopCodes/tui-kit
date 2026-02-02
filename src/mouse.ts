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
 * Mouse input handling using SGR 1006 extended encoding for click hover drag
 * Processes mouse events and routes to appropriate element handlers for interaction
 */

export type MouseButton = "left" | "middle" | "right" | "scroll-up" | "scroll-down" | "none"
export type MouseAction = "press" | "release" | "move" | "drag"

export interface MouseEvent {
  x: number
  y: number
  button: MouseButton
  action: MouseAction
  ctrl: boolean
  alt: boolean
  shift: boolean
}

export interface MouseRegion {
  id: string
  x: number
  y: number
  width: number
  height: number
  resizable?: boolean
  movable?: boolean
  onPress?: (e: MouseEvent) => void
  onRelease?: (e: MouseEvent) => void
  onHover?: (e: MouseEvent) => void
  onEnter?: (e: MouseEvent) => void
  onLeave?: (e: MouseEvent) => void
  onDrag?: (e: MouseEvent, dx: number, dy: number) => void
}

let mouseEnabled = false
let regions: MouseRegion[] = []
let hoveredId: string | null = null
let pressedId: string | null = null
let dragStart: { x: number; y: number } | null = null
let lastMousePos: { x: number; y: number } = { x: 0, y: 0 }

export function enableMouse(): string {
  mouseEnabled = true
  // Enable standard (1000), drag (1002), all-motion (1003), and SGR (1006)
  // This redundancy helps some terminals (like Windows Terminal) properly initialize the mouse state
  return "\x1b[?1000h\x1b[?1002h\x1b[?1003h\x1b[?1006h"
}

export function disableMouse(): string {
  mouseEnabled = false
  return "\x1b[?1000l\x1b[?1002l\x1b[?1003l\x1b[?1006l"
}

export function isMouseEnabled(): boolean {
  return mouseEnabled
}

export function registerRegion(region: MouseRegion): void {
  regions = regions.filter(r => r.id !== region.id)
  regions.push(region)
  regions.sort((a, b) => (b.x + b.y * 1000) - (a.x + a.y * 1000))
}

export function unregisterRegion(id: string): void {
  regions = regions.filter(r => r.id !== id)
}

export function clearRegions(): void {
  regions = []
}

export function getHoveredId(): string | null {
  return hoveredId
}

export function getPressedId(): string | null {
  return pressedId
}

export function parseMouseEvent(buf: Buffer): MouseEvent[] {
  const str = buf.toString()
  const events: MouseEvent[] = []

  // SGR mode - \x1b[<Cb;Cx;CyM or \x1b[<Cb;Cx;Cy m
  const sgrMatches = str.matchAll(/\x1b\[<(\d+);(\d+);(\d+)([Mm])/g)
  for (const match of sgrMatches) {
    const code = parseInt(match[1])
    const x = parseInt(match[2]) - 1
    const y = parseInt(match[3]) - 1
    const release = match[4] === "m"

    const buttonBits = code & 3
    const shift = (code & 4) !== 0
    const alt = (code & 8) !== 0
    const ctrl = (code & 16) !== 0
    const motion = (code & 32) !== 0
    const scroll = (code & 64) !== 0

    let button: MouseButton = "none"
    if (scroll) button = (code & 1) === 0 ? "scroll-up" : "scroll-down"
    else if (buttonBits === 0) button = "left"
    else if (buttonBits === 1) button = "middle"
    else if (buttonBits === 2) button = "right"

    let action: MouseAction = release ? "release" : "press"
    if (motion && !release) action = pressedId ? "drag" : "move"

    events.push({ x, y, button, action, ctrl, alt, shift })
  }

  if (events.length > 0) return events

  const legacyMatches = str.matchAll(/\x1b\[M(.)(.)(.)/g)
  for (const match of legacyMatches) {
    const code = match[1].charCodeAt(0) - 32
    const x = match[2].charCodeAt(0) - 33
    const y = match[3].charCodeAt(0) - 33

    const buttonBits = code & 3
    const motion = (code & 32) !== 0

    let button: MouseButton = "none"
    if (buttonBits === 0) button = "left"
    else if (buttonBits === 1) button = "middle"
    else if (buttonBits === 2) button = "right"
    else if (buttonBits === 3) button = "none"

    const action: MouseAction = motion ? (pressedId ? "drag" : "move") : (buttonBits === 3 ? "release" : "press")

    events.push({ x, y, button, action, ctrl: false, alt: false, shift: false })
  }

  return events
}

export function findRegionAt(x: number, y: number): MouseRegion | null {
  for (const region of regions) {
    if (x >= region.x && x < region.x + region.width &&
      y >= region.y && y < region.y + region.height) {
      return region
    }
  }
  return null
}

export function processMouseEvent(event: MouseEvent): { regionId: string | null; action: string } {
  lastMousePos = { x: event.x, y: event.y }
  const region = findRegionAt(event.x, event.y)

  if (event.action === "move" || (event.action === "drag" && !pressedId)) {
    const newHoveredId = region?.id || null
    if (newHoveredId !== hoveredId) {
      const oldRegion = hoveredId ? regions.find(r => r.id === hoveredId) : null
      if (oldRegion?.onLeave) oldRegion.onLeave(event)

      hoveredId = newHoveredId

      if (region?.onEnter) region.onEnter(event)
      return { regionId: hoveredId, action: "hover_change" }
    }
    if (region?.onHover) region.onHover(event)
    return { regionId: hoveredId, action: "move" }
  }

  if (event.action === "press") {
    const oldPressedId = pressedId
    pressedId = region?.id || null
    dragStart = { x: event.x, y: event.y }

    if (pressedId !== oldPressedId) {
      if (region?.onPress) region.onPress(event)
    }
    return { regionId: pressedId, action: "press" }
  }

  if (event.action === "release") {
    const releasedId = pressedId
    if (releasedId) {
      const pressedRegion = regions.find(r => r.id === releasedId)
      if (pressedRegion && pressedRegion.onRelease) {
        pressedRegion.onRelease(event)
      }
    }
    pressedId = null
    dragStart = null
    return { regionId: releasedId, action: "release" }
  }

  if (event.action === "drag" && pressedId && dragStart) {
    const pressedRegion = regions.find(r => r.id === pressedId)
    if (pressedRegion?.onDrag) {
      const dx = event.x - dragStart.x
      const dy = event.y - dragStart.y
      pressedRegion.onDrag(event, dx, dy)
      dragStart = { x: event.x, y: event.y }
      return { regionId: pressedId, action: "drag" }
    }
  }

  return { regionId: null, action: "none" }
}

export function isResizeEdge(region: MouseRegion, x: number, y: number): string | null {
  if (!region.resizable) return null
  const edgeSize = 1
  const onLeft = x < region.x + edgeSize
  const onRight = x >= region.x + region.width - edgeSize
  const onTop = y < region.y + edgeSize
  const onBottom = y >= region.y + region.height - edgeSize

  if (onTop && onLeft) return "nw"
  if (onTop && onRight) return "ne"
  if (onBottom && onLeft) return "sw"
  if (onBottom && onRight) return "se"
  if (onTop) return "n"
  if (onBottom) return "s"
  if (onLeft) return "w"
  if (onRight) return "e"
  return null
}

export function isMoveArea(region: MouseRegion, x: number, y: number): boolean {
  if (!region.movable) return false
  return y === region.y && x >= region.x && x < region.x + region.width
}

export function getLastMousePos(): { x: number; y: number } {
  return { ...lastMousePos }
}
