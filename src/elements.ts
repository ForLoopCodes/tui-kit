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
 * Interactive element state management for inputs buttons selects and forms
 * Handles focus states cursor positions selections and component rendering
 */

import type { RGBA } from "./colors"

export interface ElementState {
  id: string
  type: string
  focused: boolean
  disabled: boolean
  value: any
  cursor?: number
  scrollOffset?: number
}

export interface InputState extends ElementState {
  type: "input"
  value: string
  cursor: number
  selectionStart: number
  selectionEnd: number
  placeholder: string
  mask?: string
}

export interface TextboxState extends ElementState {
  type: "textbox"
  value: string
  cursorLine: number
  cursorCol: number
  scrollY: number
  lines: string[]
}

export interface ButtonState extends ElementState {
  type: "button"
  pressed: boolean
  hovered: boolean
}

export interface SelectState extends ElementState {
  type: "select"
  value: string
  options: { value: string; label: string }[]
  open: boolean
  highlightIndex: number
}

export interface CheckboxState extends ElementState {
  type: "checkbox"
  checked: boolean
  label: string
}

export interface FormState extends ElementState {
  type: "form"
  fields: Record<string, any>
  focusIndex: number
  fieldIds: string[]
}

export interface ListState extends ElementState {
  type: "list"
  ordered: boolean
  items: string[]
  selectedIndex: number
}

export interface TableState extends ElementState {
  type: "table"
  headers: string[]
  rows: string[][]
  selectedRow: number
  selectedCol: number
  scrollY: number
}

let elementRegistry: Map<string, ElementState> = new Map()
let focusOrder: string[] = []
let currentFocusIndex = -1
let nextId = 1

export function generateId(prefix: string): string {
  return `${prefix}_${nextId++}`
}

export function registerElement(state: ElementState): void {
  elementRegistry.set(state.id, state)
  if (!focusOrder.includes(state.id)) focusOrder.push(state.id)
}

export function unregisterElement(id: string): void {
  elementRegistry.delete(id)
  focusOrder = focusOrder.filter(fid => fid !== id)
}

export function getElement<T extends ElementState>(id: string): T | undefined {
  return elementRegistry.get(id) as T | undefined
}

export function setElementValue(id: string, value: any): void {
  const el = elementRegistry.get(id)
  if (el) el.value = value
}

export function focusElement(id: string): void {
  for (const [key, el] of elementRegistry) {
    el.focused = key === id
  }
  currentFocusIndex = focusOrder.indexOf(id)
}

export function getFocusedElement(): ElementState | undefined {
  return [...elementRegistry.values()].find(el => el.focused)
}

export function focusNext(): string | undefined {
  if (focusOrder.length === 0) return undefined
  currentFocusIndex = (currentFocusIndex + 1) % focusOrder.length
  const id = focusOrder[currentFocusIndex]
  focusElement(id)
  return id
}

export function focusPrev(): string | undefined {
  if (focusOrder.length === 0) return undefined
  currentFocusIndex = currentFocusIndex <= 0 ? focusOrder.length - 1 : currentFocusIndex - 1
  const id = focusOrder[currentFocusIndex]
  focusElement(id)
  return id
}

export function clearRegistry(): void {
  elementRegistry.clear()
  focusOrder = []
  currentFocusIndex = -1
}

export function createInputState(id: string, value = "", placeholder = ""): InputState {
  return {
    id, type: "input", focused: false, disabled: false,
    value, cursor: value.length, selectionStart: 0, selectionEnd: 0, placeholder
  }
}

export function createButtonState(id: string): ButtonState {
  return { id, type: "button", focused: false, disabled: false, value: null, pressed: false, hovered: false }
}

export function createSelectState(id: string, options: { value: string; label: string }[], value = ""): SelectState {
  return {
    id, type: "select", focused: false, disabled: false,
    value: value || (options[0]?.value ?? ""),
    options, open: false, highlightIndex: 0
  }
}

export function createCheckboxState(id: string, checked = false, label = ""): CheckboxState {
  return { id, type: "checkbox", focused: false, disabled: false, value: checked, checked, label }
}

export function createTextboxState(id: string, value = ""): TextboxState {
  const lines = value.split("\n")
  return {
    id, type: "textbox", focused: false, disabled: false,
    value, lines, cursorLine: 0, cursorCol: 0, scrollY: 0
  }
}

export function createFormState(id: string, fieldIds: string[]): FormState {
  return {
    id, type: "form", focused: false, disabled: false,
    value: null, fields: {}, focusIndex: 0, fieldIds
  }
}

export function createListState(id: string, items: string[], ordered = false): ListState {
  return { id, type: "list", focused: false, disabled: false, value: null, ordered, items, selectedIndex: -1 }
}

export function createTableState(id: string, headers: string[], rows: string[][]): TableState {
  return {
    id, type: "table", focused: false, disabled: false, value: null,
    headers, rows, selectedRow: -1, selectedCol: -1, scrollY: 0
  }
}

export function handleInputKey(state: InputState, key: string): boolean {
  if (state.disabled) return false
  
  if (key === "\x7f" || key === "\b") {
    if (state.cursor > 0) {
      state.value = state.value.slice(0, state.cursor - 1) + state.value.slice(state.cursor)
      state.cursor--
    }
    return true
  }
  
  if (key === "\x1b[D") {
    if (state.cursor > 0) state.cursor--
    return true
  }
  
  if (key === "\x1b[C") {
    if (state.cursor < state.value.length) state.cursor++
    return true
  }
  
  if (key === "\x1b[H") {
    state.cursor = 0
    return true
  }
  
  if (key === "\x1b[F") {
    state.cursor = state.value.length
    return true
  }
  
  if (key === "\x1b[3~") {
    if (state.cursor < state.value.length) {
      state.value = state.value.slice(0, state.cursor) + state.value.slice(state.cursor + 1)
    }
    return true
  }
  
  if (key.length === 1 && key.charCodeAt(0) >= 32) {
    state.value = state.value.slice(0, state.cursor) + key + state.value.slice(state.cursor)
    state.cursor++
    return true
  }
  
  return false
}

export function handleSelectKey(state: SelectState, key: string): boolean {
  if (state.disabled) return false
  
  if (key === "\r" || key === " ") {
    if (state.open) {
      state.value = state.options[state.highlightIndex]?.value ?? state.value
      state.open = false
    } else {
      state.open = true
      state.highlightIndex = state.options.findIndex(o => o.value === state.value)
      if (state.highlightIndex < 0) state.highlightIndex = 0
    }
    return true
  }
  
  if (key === "\x1b[A" && state.open) {
    state.highlightIndex = Math.max(0, state.highlightIndex - 1)
    return true
  }
  
  if (key === "\x1b[B" && state.open) {
    state.highlightIndex = Math.min(state.options.length - 1, state.highlightIndex + 1)
    return true
  }
  
  if (key === "\x1b" && state.open) {
    state.open = false
    return true
  }
  
  return false
}

export function handleCheckboxKey(state: CheckboxState, key: string): boolean {
  if (state.disabled) return false
  
  if (key === " " || key === "\r") {
    state.checked = !state.checked
    state.value = state.checked
    return true
  }
  
  return false
}

export function renderInput(state: InputState, width: number): string {
  const displayValue = state.mask
    ? state.value.replace(/./g, state.mask)
    : state.value
  const placeholder = state.value ? "" : state.placeholder
  const text = displayValue || placeholder
  const visibleWidth = Math.max(1, width - 2)
  let start = 0
  if (state.cursor > start + visibleWidth - 1) start = state.cursor - visibleWidth + 1
  const visible = text.slice(start, start + visibleWidth).padEnd(visibleWidth)
  const cursorPos = state.cursor - start
  
  if (state.focused && cursorPos >= 0 && cursorPos < visibleWidth) {
    return "[" + visible.slice(0, cursorPos) + "\x1b[7m" + (visible[cursorPos] || " ") + "\x1b[27m" + visible.slice(cursorPos + 1) + "]"
  }
  return "[" + visible + "]"
}

export function renderSelect(state: SelectState, width: number): string[] {
  const current = state.options.find(o => o.value === state.value)?.label || state.value
  const arrow = state.open ? "▲" : "▼"
  const header = `[${current.slice(0, width - 4).padEnd(width - 4)}${arrow}]`
  
  if (!state.open) return [header]
  
  const lines = [header]
  state.options.forEach((opt, i) => {
    const prefix = i === state.highlightIndex ? ">" : " "
    lines.push(` ${prefix} ${opt.label.slice(0, width - 4)}`)
  })
  return lines
}

export function renderCheckbox(state: CheckboxState): string {
  const box = state.checked ? "[✓]" : "[ ]"
  const focus = state.focused ? "\x1b[7m" : ""
  const reset = state.focused ? "\x1b[27m" : ""
  return `${focus}${box}${reset} ${state.label}`
}

export function renderButton(label: string, state: ButtonState, width: number): string {
  const padded = label.slice(0, width - 4).padStart(Math.floor((width - 4 + label.length) / 2)).padEnd(width - 4)
  const bracket = state.pressed ? "«" : "["
  const close = state.pressed ? "»" : "]"
  const focus = state.focused ? "\x1b[7m" : ""
  const reset = state.focused ? "\x1b[27m" : ""
  return `${focus}${bracket} ${padded} ${close}${reset}`
}

export function renderHr(width: number, char = "─"): string {
  return char.repeat(width)
}

export function renderList(state: ListState, width: number): string[] {
  return state.items.map((item, i) => {
    const marker = state.ordered ? `${i + 1}.` : "•"
    const prefix = state.selectedIndex === i ? "\x1b[7m" : ""
    const suffix = state.selectedIndex === i ? "\x1b[27m" : ""
    return `${prefix}${marker} ${item.slice(0, width - marker.length - 2)}${suffix}`
  })
}

export function renderTable(state: TableState, colWidths: number[]): string[] {
  const lines: string[] = []
  const sep = "│"
  const hline = "─"
  
  const renderRow = (cells: string[], isHeader = false, rowIdx = -1): string => {
    return sep + cells.map((cell, ci) => {
      const w = colWidths[ci] || 10
      const padded = cell.slice(0, w).padEnd(w)
      const isSelected = rowIdx === state.selectedRow && ci === state.selectedCol
      return isSelected ? `\x1b[7m${padded}\x1b[27m` : padded
    }).join(sep) + sep
  }
  
  const border = "┌" + colWidths.map(w => hline.repeat(w)).join("┬") + "┐"
  const midBorder = "├" + colWidths.map(w => hline.repeat(w)).join("┼") + "┤"
  const bottomBorder = "└" + colWidths.map(w => hline.repeat(w)).join("┴") + "┘"
  
  lines.push(border)
  if (state.headers.length) {
    lines.push(renderRow(state.headers, true))
    lines.push(midBorder)
  }
  state.rows.forEach((row, ri) => lines.push(renderRow(row, false, ri)))
  lines.push(bottomBorder)
  
  return lines
}
