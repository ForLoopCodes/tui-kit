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
 * Primary library exports providing public api for terminal ui components
 * Includes types for rendering elements styling colors layout and interactions
 */

export { run, renderLines, createElement, Fragment } from "./tui"
export type { VNode, RGBA, LayoutProps, BorderStyle, RunOptions } from "./tui"
export { parseColor, toAnsiFg, toAnsiBg, reset, bold, dim, italic, underline } from "./colors"
export { parseUnit, resolveUnit, getBorderChars } from "./layout"
export { enableMouse, disableMouse, parseMouseEvent, processMouseEvent, registerRegion } from "./mouse"
export { parseKey, registerGlobalKeybind, createKeyboardHandler } from "./input"
export { 
  registerElement, focusElement, focusNext, focusPrev, getFocusedElement,
  createInputState, createButtonState, createSelectState, createCheckboxState,
  handleInputKey, handleSelectKey, handleCheckboxKey, resetFocusOrder
} from "./elements"
