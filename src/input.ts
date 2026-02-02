/**
 * Input handling - keyboard/mouse parsing, focus manager, keybindings
 */

import { EventEmitter } from 'events';

/**
 * Key event data
 */
export interface KeyEvent {
  name: string;
  char: string;
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  meta: boolean;
  sequence: string;
}

/**
 * Mouse event data
 */
export interface MouseEvent {
  type: 'press' | 'release' | 'move' | 'drag' | 'scroll';
  button: 'left' | 'middle' | 'right' | 'none';
  x: number;
  y: number;
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  scrollDirection?: 'up' | 'down';
}

/**
 * Keybind definition
 */
export interface Keybind {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  handler: () => void;
}

/**
 * Named key mappings
 */
const KEY_NAMES: Record<string, string> = {
  '\x1b': 'escape',
  '\r': 'return',
  '\n': 'return',
  '\t': 'tab',
  '\x7f': 'backspace',
  '\b': 'backspace',
  ' ': 'space',

  // Arrow keys
  '\x1b[A': 'up',
  '\x1b[B': 'down',
  '\x1b[C': 'right',
  '\x1b[D': 'left',
  '\x1bOA': 'up',
  '\x1bOB': 'down',
  '\x1bOC': 'right',
  '\x1bOD': 'left',

  // Function keys
  '\x1bOP': 'f1',
  '\x1bOQ': 'f2',
  '\x1bOR': 'f3',
  '\x1bOS': 'f4',
  '\x1b[15~': 'f5',
  '\x1b[17~': 'f6',
  '\x1b[18~': 'f7',
  '\x1b[19~': 'f8',
  '\x1b[20~': 'f9',
  '\x1b[21~': 'f10',
  '\x1b[23~': 'f11',
  '\x1b[24~': 'f12',

  // Special keys
  '\x1b[2~': 'insert',
  '\x1b[3~': 'delete',
  '\x1b[5~': 'pageup',
  '\x1b[6~': 'pagedown',
  '\x1b[H': 'home',
  '\x1b[F': 'end',
  '\x1b[1~': 'home',
  '\x1b[4~': 'end',
};

/**
 * Parse a key sequence into a KeyEvent
 */
export function parseKey(data: Buffer | string): KeyEvent | null {
  const str = data.toString();

  // Empty input
  if (!str) return null;

  const event: KeyEvent = {
    name: '',
    char: '',
    ctrl: false,
    alt: false,
    shift: false,
    meta: false,
    sequence: str,
  };

  // Check for escape sequences
  if (str.startsWith('\x1b')) {
    // Shift+Tab (back-tab)
    if (str === '\x1b[Z') {
      event.name = 'tab';
      event.shift = true;
      return event;
    }

    // Alt + key
    if (str.length === 2 && str[1] !== '[' && str[1] !== 'O') {
      event.alt = true;
      event.char = str[1];
      event.name = str[1].toLowerCase();
      return event;
    }

    // Named sequence
    if (KEY_NAMES[str]) {
      event.name = KEY_NAMES[str];
      return event;
    }

    // Shift/Ctrl modified arrow keys: \x1b[1;2A (shift+up), \x1b[1;5A (ctrl+up)
    // Try different formats: \x1b[1;mX or \x1b[mX
    let modMatch = str.match(/\x1b\[1;(\d)([ABCDF])/);
    if (!modMatch) {
      modMatch = str.match(/\x1b\[(?:1;)?(\d+)([ABCDF])/);
    }
    if (modMatch) {
      const mod = parseInt(modMatch[1]);
      const dir = { A: 'up', B: 'down', C: 'right', D: 'left', F: 'end' }[modMatch[2]];
      if (dir) {
        event.name = dir;
        // CSI modifier codes: 2=shift, 3=alt, 4=shift+alt, 5=ctrl, 6=shift+ctrl, 7=alt+ctrl, 8=shift+alt+ctrl
        // But also handle bitwise: shift=1, alt=2, ctrl=4
        if (mod <= 8) {
          // Standard CSI codes
          event.shift = mod === 2 || mod === 4 || mod === 6 || mod === 8;
          event.alt = mod === 3 || mod === 4 || mod === 7 || mod === 8;
          event.ctrl = mod === 5 || mod === 6 || mod === 7 || mod === 8;
        } else {
          // Bitwise codes
          event.shift = (mod & 1) !== 0;
          event.alt = (mod & 2) !== 0;
          event.ctrl = (mod & 4) !== 0;
        }
        return event;
      }
    }

    // Unknown escape sequence
    event.name = 'escape';
    return event;
  }

  // Named keys (check before control chars to handle Tab, Backspace, etc.)
  if (KEY_NAMES[str]) {
    event.name = KEY_NAMES[str];
    // For character input (space, tab, etc), also set char
    if (str === ' ' || str === '\t' || str === '\r' || str === '\n') {
      event.char = str;
    }
    return event;
  }

  // Control characters (Ctrl+A = 0x01, Ctrl+Z = 0x1a)
  const code = str.charCodeAt(0);
  if (code >= 1 && code <= 26) {
    event.ctrl = true;
    event.name = String.fromCharCode(code + 96); // Convert to letter
    event.char = event.name;
    return event;
  }

  // Regular character
  event.char = str[0];
  event.name = str[0].toLowerCase();
  event.shift = str[0] !== str[0].toLowerCase();

  return event;
}

/**
 * Parse SGR mouse event
 */
export function parseMouse(data: Buffer | string): MouseEvent | null {
  const str = data.toString();

  // SGR mouse format: \x1b[<Cb;Cx;CyM or \x1b[<Cb;Cx;Cym
  const match = str.match(/\x1b\[<(\d+);(\d+);(\d+)([Mm])/);
  if (!match) return null;

  const code = parseInt(match[1]);
  const x = parseInt(match[2]) - 1;
  const y = parseInt(match[3]) - 1;
  const release = match[4] === 'm';

  // Decode button
  const buttonCode = code & 0x03;
  const buttons: Array<'left' | 'middle' | 'right' | 'none'> = ['left', 'middle', 'right', 'none'];
  const button = buttons[buttonCode];

  // Decode modifiers
  const shift = (code & 0x04) !== 0;
  const alt = (code & 0x08) !== 0;
  const ctrl = (code & 0x10) !== 0;

  // Decode event type
  const motion = (code & 0x20) !== 0;
  const scroll = (code & 0x40) !== 0;

  let type: MouseEvent['type'];
  let scrollDirection: 'up' | 'down' | undefined;

  if (scroll) {
    type = 'scroll';
    scrollDirection = buttonCode === 0 ? 'up' : 'down';
  } else if (motion) {
    type = button !== 'none' ? 'drag' : 'move';
  } else {
    type = release ? 'release' : 'press';
  }

  return {
    type,
    button,
    x,
    y,
    ctrl,
    alt,
    shift,
    scrollDirection,
  };
}

/**
 * Focus manager for keyboard navigation
 */
export class FocusManager {
  private focusableElements: Map<string, { tabIndex: number; element: any }> = new Map();
  private focusedId: string | null = null;
  private focusOrder: string[] = [];

  /**
   * Register a focusable element
   */
  register(id: string, tabIndex: number, element: any): void {
    this.focusableElements.set(id, { tabIndex, element });
    this.updateFocusOrder();
  }

  /**
   * Unregister a focusable element
   */
  unregister(id: string): void {
    this.focusableElements.delete(id);
    if (this.focusedId === id) {
      this.focusNext();
    }
    this.updateFocusOrder();
  }

  /**
   * Clear all registered elements
   */
  clear(): void {
    this.focusableElements.clear();
    this.focusedId = null;
    this.focusOrder = [];
  }

  /**
   * Update focus order based on tabIndex
   */
  private updateFocusOrder(): void {
    const entries = Array.from(this.focusableElements.entries());
    entries.sort((a, b) => a[1].tabIndex - b[1].tabIndex);
    this.focusOrder = entries.map(([id]) => id);
  }

  /**
   * Get currently focused element ID
   */
  getFocusedId(): string | null {
    return this.focusedId;
  }

  /**
   * Set focus to a specific element
   */
  focus(id: string): boolean {
    if (!this.focusableElements.has(id)) {
      return false;
    }

    const prevFocused = this.focusedId;
    this.focusedId = id;

    // Emit blur on previous
    if (prevFocused && prevFocused !== id) {
      const prev = this.focusableElements.get(prevFocused);
      if (prev?.element?.onBlur) {
        prev.element.onBlur();
      }
    }

    // Emit focus on current
    const current = this.focusableElements.get(id);
    if (current?.element?.onFocus) {
      current.element.onFocus();
    }

    return true;
  }

  /**
   * Focus the next element in tab order
   */
  focusNext(): string | null {
    if (this.focusOrder.length === 0) return null;

    if (this.focusedId === null) {
      this.focus(this.focusOrder[0]);
      return this.focusedId;
    }

    const currentIndex = this.focusOrder.indexOf(this.focusedId);
    const nextIndex = (currentIndex + 1) % this.focusOrder.length;
    this.focus(this.focusOrder[nextIndex]);

    return this.focusedId;
  }

  /**
   * Focus the previous element in tab order
   */
  focusPrev(): string | null {
    if (this.focusOrder.length === 0) return null;

    if (this.focusedId === null) {
      this.focus(this.focusOrder[this.focusOrder.length - 1]);
      return this.focusedId;
    }

    const currentIndex = this.focusOrder.indexOf(this.focusedId);
    const prevIndex = (currentIndex - 1 + this.focusOrder.length) % this.focusOrder.length;
    this.focus(this.focusOrder[prevIndex]);

    return this.focusedId;
  }

  /**
   * Focus first element
   */
  focusFirst(): string | null {
    if (this.focusOrder.length === 0) return null;
    this.focus(this.focusOrder[0]);
    return this.focusedId;
  }

  /**
   * Get focused element
   */
  getFocusedElement(): any | null {
    if (!this.focusedId) return null;
    return this.focusableElements.get(this.focusedId)?.element ?? null;
  }
}

/**
 * Global keybinding manager
 */
export class KeybindManager {
  private keybinds: Keybind[] = [];

  /**
   * Register a global keybind
   */
  register(keybind: Keybind): void {
    this.keybinds.push(keybind);
  }

  /**
   * Unregister a keybind
   */
  unregister(key: string, ctrl?: boolean, alt?: boolean, shift?: boolean): void {
    this.keybinds = this.keybinds.filter(
      (kb) =>
        !(
          kb.key === key &&
          (ctrl === undefined || kb.ctrl === ctrl) &&
          (alt === undefined || kb.alt === alt) &&
          (shift === undefined || kb.shift === shift)
        )
    );
  }

  /**
   * Clear all keybinds
   */
  clear(): void {
    this.keybinds = [];
  }

  /**
   * Handle a key event
   */
  handle(event: KeyEvent): boolean {
    for (const keybind of this.keybinds) {
      if (
        keybind.key.toLowerCase() === event.name.toLowerCase() &&
        (keybind.ctrl ?? false) === event.ctrl &&
        (keybind.alt ?? false) === event.alt &&
        (keybind.shift ?? false) === event.shift
      ) {
        keybind.handler();
        return true;
      }
    }
    return false;
  }
}

/**
 * Mouse region for click detection
 */
export interface MouseRegion {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  onPress?: (event: MouseEvent) => void;
  onRelease?: (event: MouseEvent) => void;
  onDrag?: (event: MouseEvent) => void;
  onClick?: (event: MouseEvent) => void;
}

/**
 * Mouse region manager
 */
export class MouseManager {
  private regions: MouseRegion[] = [];
  private pressedRegion: MouseRegion | null = null;

  /**
   * Register a mouse region
   */
  register(region: MouseRegion): void {
    this.regions.push(region);
  }

  /**
   * Unregister a region
   */
  unregister(id: string): void {
    this.regions = this.regions.filter((r) => r.id !== id);
  }

  /**
   * Clear all regions
   */
  clear(): void {
    this.regions = [];
    this.pressedRegion = null;
  }

  /**
   * Handle a mouse event
   */
  handle(event: MouseEvent): MouseRegion | null {
    // Find region at mouse position
    const region = this.findRegion(event.x, event.y);

    switch (event.type) {
      case 'press':
        this.pressedRegion = region;
        if (region?.onPress) {
          region.onPress(event);
        }
        break;

      case 'release':
        if (region?.onRelease) {
          region.onRelease(event);
        }
        // Click if released on same region
        if (region && region === this.pressedRegion && region.onClick) {
          region.onClick(event);
        }
        this.pressedRegion = null;
        break;

      case 'drag':
        if (this.pressedRegion?.onDrag) {
          this.pressedRegion.onDrag(event);
        }
        break;
    }

    return region;
  }

  /**
   * Find region at position (in reverse order for z-index)
   */
  private findRegion(x: number, y: number): MouseRegion | null {
    for (let i = this.regions.length - 1; i >= 0; i--) {
      const r = this.regions[i];
      if (x >= r.x && x < r.x + r.width && y >= r.y && y < r.y + r.height) {
        return r;
      }
    }
    return null;
  }
}

/**
 * Input handler that combines keyboard and mouse handling
 */
export class InputHandler extends EventEmitter {
  private stdin: NodeJS.ReadStream;
  private focusManager: FocusManager;
  private keybindManager: KeybindManager;
  private mouseManager: MouseManager;
  private inputBuffer: string = '';

  constructor(stdin: NodeJS.ReadStream = process.stdin) {
    super();
    this.stdin = stdin;
    this.focusManager = new FocusManager();
    this.keybindManager = new KeybindManager();
    this.mouseManager = new MouseManager();
  }

  /**
   * Start listening for input
   */
  start(): void {
    this.stdin.setRawMode?.(true);
    this.stdin.resume();
    this.stdin.on('data', this.handleData);
  }

  /**
   * Stop listening for input
   */
  stop(): void {
    this.stdin.off('data', this.handleData);
    this.stdin.setRawMode?.(false);
    this.stdin.pause();
  }

  /**
   * Handle raw input data
   */
  private handleData = (data: Buffer): void => {
    const str = data.toString();

    // Check for mouse events
    const mouse = parseMouse(str);
    if (mouse) {
      this.emit('mouse', mouse);
      this.mouseManager.handle(mouse);
      return;
    }

    // Parse key event
    const key = parseKey(data);
    if (key) {
      this.emit('key', key);

      // Check global keybinds first
      if (this.keybindManager.handle(key)) {
        return;
      }

      // Handle focus navigation
      if (key.name === 'tab') {
        if (key.shift) {
          this.focusManager.focusPrev();
        } else {
          this.focusManager.focusNext();
        }
        this.emit('focus', this.focusManager.getFocusedId());
        // Don't return early - let Tab also emit keypress for display
      }

      // Handle input for focused element
      const focused = this.focusManager.getFocusedElement();
      if (focused?.onKeypress) {
        focused.onKeypress(key);
      }

      // Emit key for element handlers
      this.emit('keypress', key);
    }
  };

  /**
   * Get focus manager
   */
  getFocusManager(): FocusManager {
    return this.focusManager;
  }

  /**
   * Get keybind manager
   */
  getKeybindManager(): KeybindManager {
    return this.keybindManager;
  }

  /**
   * Get mouse manager
   */
  getMouseManager(): MouseManager {
    return this.mouseManager;
  }

  /**
   * Register a global keybind (convenience method)
   */
  registerGlobalKeybind(keybind: Keybind): void {
    this.keybindManager.register(keybind);
  }
}

/**
 * Export convenience function
 */
export function registerGlobalKeybind(keybind: Keybind): void {
  // This will be set up by the app runtime
  globalKeybindManager?.register(keybind);
}

// Global singleton (set by app runtime)
let globalKeybindManager: KeybindManager | null = null;

export function setGlobalKeybindManager(manager: KeybindManager): void {
  globalKeybindManager = manager;
}
