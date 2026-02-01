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
 * Keyboard input handling system with focus management and custom keybindings
 * Processes raw terminal input and dispatches to focused elements or global handlers
 */

export type KeyHandler = (key: string, raw: Buffer) => boolean
export type KeyBinding = { key: string; ctrl?: boolean; alt?: boolean; shift?: boolean; handler: () => void }

const globalBindings: Map<string, KeyBinding> = new Map()
const elementBindings: Map<string, KeyBinding[]> = new Map()

let resizeMode = false
let moveMode = false
let focusedElementId: string | null = null

export function parseKey(buf: Buffer): { key: string; ctrl: boolean; alt: boolean; shift: boolean } {
  const str = buf.toString()
  let key = str
  let ctrl = false
  let alt = false
  let shift = false
  
  if (str.charCodeAt(0) < 27 && str.length === 1) {
    ctrl = true
    key = String.fromCharCode(str.charCodeAt(0) + 96)
  }
  
  if (str.startsWith("\x1b[") || str.startsWith("\x1bO")) {
    const seq = str.slice(2)
    if (seq === "A") key = "up"
    else if (seq === "B") key = "down"
    else if (seq === "C") key = "right"
    else if (seq === "D") key = "left"
    else if (seq === "H") key = "home"
    else if (seq === "F") key = "end"
    else if (seq === "3~") key = "delete"
    else if (seq === "5~") key = "pageup"
    else if (seq === "6~") key = "pagedown"
    else if (seq === "1;5A") { key = "up"; ctrl = true }
    else if (seq === "1;5B") { key = "down"; ctrl = true }
    else if (seq === "1;5C") { key = "right"; ctrl = true }
    else if (seq === "1;5D") { key = "left"; ctrl = true }
    else if (seq === "1;2A") { key = "up"; shift = true }
    else if (seq === "1;2B") { key = "down"; shift = true }
    else if (seq === "1;2C") { key = "right"; shift = true }
    else if (seq === "1;2D") { key = "left"; shift = true }
    else if (seq.match(/^\d+;\d+[A-Z]$/)) {
      const m = seq.match(/^(\d+);(\d+)([A-Z])$/)
      if (m) {
        const mod = parseInt(m[2])
        shift = (mod & 1) !== 0
        alt = (mod & 2) !== 0
        ctrl = (mod & 4) !== 0
        if (m[3] === "A") key = "up"
        else if (m[3] === "B") key = "down"
        else if (m[3] === "C") key = "right"
        else if (m[3] === "D") key = "left"
      }
    }
  }
  
  if (str.startsWith("\x1b") && str.length === 2) {
    alt = true
    key = str[1]
  }
  
  if (key === "\t") key = "tab"
  if (key === "\r") key = "enter"
  if (key === "\x7f" || key === "\b") key = "backspace"
  if (key === "\x1b" && str.length === 1) key = "escape"
  if (key === " ") key = "space"
  
  return { key, ctrl, alt, shift }
}

export function formatKeyBinding(binding: KeyBinding): string {
  const parts: string[] = []
  if (binding.ctrl) parts.push("ctrl")
  if (binding.alt) parts.push("alt")
  if (binding.shift) parts.push("shift")
  parts.push(binding.key)
  return parts.join("+")
}

export function parseKeyBinding(str: string): Partial<KeyBinding> {
  const parts = str.toLowerCase().split("+")
  const result: Partial<KeyBinding> = {}
  for (const part of parts) {
    if (part === "ctrl") result.ctrl = true
    else if (part === "alt") result.alt = true
    else if (part === "shift") result.shift = true
    else result.key = part
  }
  return result
}

export function registerGlobalKeybind(binding: KeyBinding): void {
  globalBindings.set(formatKeyBinding(binding), binding)
}

export function unregisterGlobalKeybind(keyStr: string): void {
  globalBindings.delete(keyStr)
}

export function registerElementKeybind(elementId: string, binding: KeyBinding): void {
  const bindings = elementBindings.get(elementId) || []
  bindings.push(binding)
  elementBindings.set(elementId, bindings)
}

export function clearElementKeybinds(elementId: string): void {
  elementBindings.delete(elementId)
}

export function setFocusedElement(id: string | null): void {
  focusedElementId = id
}

export function getFocusedElementId(): string | null {
  return focusedElementId
}

export function isResizeMode(): boolean {
  return resizeMode
}

export function isMoveMode(): boolean {
  return moveMode
}

export function toggleResizeMode(): void {
  resizeMode = !resizeMode
  moveMode = false
}

export function toggleMoveMode(): void {
  moveMode = !moveMode
  resizeMode = false
}

export function exitModes(): void {
  resizeMode = false
  moveMode = false
}

export function matchBinding(parsed: { key: string; ctrl: boolean; alt: boolean; shift: boolean }, binding: KeyBinding): boolean {
  return parsed.key === binding.key &&
    (binding.ctrl === undefined || parsed.ctrl === binding.ctrl) &&
    (binding.alt === undefined || parsed.alt === binding.alt) &&
    (binding.shift === undefined || parsed.shift === binding.shift)
}

export function processKeyInput(buf: Buffer): { handled: boolean; action?: string } {
  const parsed = parseKey(buf)
  
  if (parsed.ctrl && parsed.key === "r") {
    toggleResizeMode()
    return { handled: true, action: resizeMode ? "resize_mode_on" : "resize_mode_off" }
  }
  
  if (parsed.ctrl && parsed.key === "m") {
    toggleMoveMode()
    return { handled: true, action: moveMode ? "move_mode_on" : "move_mode_off" }
  }
  
  for (const [, binding] of globalBindings) {
    if (matchBinding(parsed, binding)) {
      binding.handler()
      return { handled: true, action: "global_binding" }
    }
  }
  
  if (focusedElementId) {
    const bindings = elementBindings.get(focusedElementId)
    if (bindings) {
      for (const binding of bindings) {
        if (matchBinding(parsed, binding)) {
          binding.handler()
          return { handled: true, action: "element_binding" }
        }
      }
    }
  }
  
  return { handled: false }
}

export function createKeyboardHandler(
  onNavigate: (direction: string) => void,
  onActivate: () => void,
  onEscape: () => void
): KeyHandler {
  return (key: string, raw: Buffer): boolean => {
    const parsed = parseKey(raw)
    
    if (parsed.key === "tab" && !parsed.shift) {
      onNavigate("next")
      return true
    }
    
    if (parsed.key === "tab" && parsed.shift) {
      onNavigate("prev")
      return true
    }
    
    if (parsed.key === "up") {
      onNavigate("up")
      return true
    }
    
    if (parsed.key === "down") {
      onNavigate("down")
      return true
    }
    
    if (parsed.key === "left") {
      onNavigate("left")
      return true
    }
    
    if (parsed.key === "right") {
      onNavigate("right")
      return true
    }
    
    if (parsed.key === "enter" || parsed.key === "space") {
      onActivate()
      return true
    }
    
    if (parsed.key === "escape") {
      onEscape()
      return true
    }
    
    return false
  }
}
