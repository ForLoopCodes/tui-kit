/**
 * App runtime - render loop, alternate buffer, resize handling
 */

import { ScreenBuffer, renderLayout, Terminal } from './render';
import { layout, LayoutNode, findFocusable, parseSpacing, getBorderThickness } from './layout';
import { InputHandler, setGlobalKeybindManager, KeyEvent, MouseEvent } from './input';
import { VNode, renderVNode, setRerenderCallback, createComponentContext, runWithHooks, StyleProps } from './elements';

/**
 * App configuration
 */
export interface AppConfig {
  /** Use alternate screen buffer */
  altScreen?: boolean;
  /** Enable mouse support */
  mouse?: boolean;
  /** Initial width (auto-detected if not set) */
  width?: number;
  /** Initial height (auto-detected if not set) */
  height?: number;
  /** Frame rate limit */
  fps?: number;
}

/**
 * App instance
 */
export interface App {
  /** Rerender the app */
  render: () => void;
  /** Exit the app */
  exit: () => void;
  /** Get screen buffer */
  getBuffer: () => ScreenBuffer;
  /** Get layout tree */
  getLayout: () => LayoutNode | null;
  /** Get input handler */
  getInput: () => InputHandler;
  /** Focus an element by ID */
  focus: (id: string) => void;
  /** Get focused element ID */
  getFocusedId: () => string | null;
}

/**
 * Global state for element handlers
 */
interface ElementState {
  id: string;
  value?: string;
  checked?: boolean;
  scrollX?: number;
  scrollY?: number;
}

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

/**
 * Create an app instance (non-blocking)
 */
export function createApp(
  rootElement: VNode | (() => VNode),
  config: AppConfig = {}
): App {
  const {
    altScreen = true,
    mouse = true,
    width = process.stdout.columns || 80,
    height = process.stdout.rows || 24,
    fps = 60,
  } = config;

  // Create screen buffer
  const buffer = new ScreenBuffer(width, height);

  // Create input handler
  const input = new InputHandler();

  // Set global keybind manager
  setGlobalKeybindManager(input.getKeybindManager());

  // Element states
  const elementStates = new Map<string, ElementState>();

  // Component context for hooks
  const componentContext = createComponentContext();

  // Layout tree
  let layoutTree: LayoutNode | null = null;
  let isRunning = true;
  let dirty = true;
  let lastRenderTime = 0;
  const minFrameTime = 1000 / fps;
  let renderTimer: NodeJS.Timeout | null = null;

  // Get root VNode
  const getRootVNode = (): VNode => {
    if (typeof rootElement === 'function') {
      return runWithHooks(componentContext, rootElement);
    }
    return rootElement;
  };

  const scheduleRender = () => {
    if (!isRunning || !dirty) return;
    if (renderTimer) return;
    const now = Date.now();
    const delay = Math.max(0, minFrameTime - (now - lastRenderTime));
    renderTimer = setTimeout(() => {
      renderTimer = null;
      render();
    }, delay);
  };

  const requestRender = () => {
    dirty = true;
    render();
  };

  // Rerender callback for hooks
  setRerenderCallback(() => {
    requestRender();
  });

  // Render function
  const render = () => {
    if (!isRunning || !dirty) return;

    const now = Date.now();
    if (now - lastRenderTime < minFrameTime) {
      scheduleRender();
      return;
    }
    lastRenderTime = now;

    // Clear buffer
    buffer.clear();

    // Get root node
    const root = getRootVNode();

    // Render virtual DOM
    const rendered = renderVNode(root) as VNode;

    // Inject state into nodes
    injectState(rendered, elementStates);

    // Calculate layout
    layoutTree = layout(rendered, buffer.width, buffer.height);

    // Register focusable elements
    const focusManager = input.getFocusManager();
    const prevFocusedId = focusManager.getFocusedId();
    focusManager.clear();
    const focusable = findFocusable(layoutTree);
    let autoIdCounter = 0;
    for (const node of focusable) {
      const props = node.node.props as StyleProps;
      let id = props.id;
      if (!id) {
        id = `__auto_focus_${autoIdCounter++}`;
        props.id = id;
      }
      focusManager.register(id, props.tabIndex ?? 0, {
        onFocus: props.onFocus,
        onBlur: props.onBlur,
        onKeypress: (key: KeyEvent) => handleKeypress(node, key),
      });
    }

    // Restore previous focus if possible, otherwise focus first element
    const restored = prevFocusedId ? focusManager.focus(prevFocusedId) : false;
    if (!restored && focusable.length > 0) {
      const firstId = (focusable[0].node.props as StyleProps).id;
      if (firstId) focusManager.focus(firstId);
    }

    // Render to buffer
    renderLayout(layoutTree, buffer, focusManager.getFocusedId());

    // Output to terminal
    process.stdout.write(buffer.render());

    dirty = false;
  };

  // Handle keypress on focused element
  const handleKeypress = (node: LayoutNode, key: KeyEvent) => {
    const props = node.node.props as any;
    const type = node.node.type;
    const id = props.id;

    if (!id) return;

    // Get or create element state
    let state = elementStates.get(id);
    if (!state) {
      state = {
        id,
        value: props.value || '',
        checked: props.checked || false,
        scrollX: typeof props.scrollX === 'number' ? props.scrollX : 0,
        scrollY: typeof props.scrollY === 'number' ? props.scrollY : 0,
      };
      elementStates.set(id, state);
    }

    // Handle scrolling for scrollable containers
    if (props.overflow === 'scroll') {
      const padding = parseSpacing(props.padding);
      const borderSize = getBorderThickness(props.border);
      const innerWidth = Math.max(0, node.rect.width - padding.left - padding.right - borderSize * 2);
      const innerHeight = Math.max(0, node.rect.height - padding.top - padding.bottom - borderSize * 2);
      const maxScrollX = Math.max(0, node.contentWidth - innerWidth);
      const maxScrollY = Math.max(0, node.contentHeight - innerHeight);

      let dx = 0;
      let dy = 0;

      switch (key.name) {
        case 'up':
          dy = -1;
          break;
        case 'down':
          dy = 1;
          break;
        case 'left':
          dx = -1;
          break;
        case 'right':
          dx = 1;
          break;
        case 'pageup':
          dy = -Math.max(1, innerHeight - 1);
          break;
        case 'pagedown':
          dy = Math.max(1, innerHeight - 1);
          break;
        case 'home':
          dy = -maxScrollY;
          break;
        case 'end':
          dy = maxScrollY;
          break;
      }

      if (dx !== 0 || dy !== 0) {
        const currentScrollX = typeof state.scrollX === 'number' ? state.scrollX : (typeof props.scrollX === 'number' ? props.scrollX : 0);
        const currentScrollY = typeof state.scrollY === 'number' ? state.scrollY : (typeof props.scrollY === 'number' ? props.scrollY : 0);
        state.scrollX = clamp(currentScrollX + dx, 0, maxScrollX);
        state.scrollY = clamp(currentScrollY + dy, 0, maxScrollY);
        requestRender();
        return;
      }
    }

    // Handle input elements
    if (type === 'input' || type === 'textbox') {
      if (key.name === 'backspace') {
        state.value = (state.value || '').slice(0, -1);
        props.onInput?.(state.value);
        props.onChange?.(state.value);
        requestRender();
      } else if (key.name === 'return') {
        props.onSubmit?.(state.value);
      } else if (key.char && !key.ctrl && !key.alt && key.name !== 'tab') {
        state.value = (state.value || '') + key.char;
        props.onInput?.(state.value);
        props.onChange?.(state.value);
        requestRender();
      }
    }

    // Handle button
    if (type === 'button') {
      if (key.name === 'return' || key.name === 'space') {
        props.onClick?.();
      }
    }

    // Handle checkbox
    if (type === 'checkbox') {
      if (key.name === 'return' || key.name === 'space') {
        state.checked = !state.checked;
        props.onChange?.(state.checked);
        requestRender();
      }
    }

    // Custom handler
    props.onKeypress?.(key);
  };

  // Inject state into rendered nodes
  const injectState = (node: VNode | string | number | null, states: Map<string, ElementState>) => {
    if (!node || typeof node !== 'object') return;

    const props = node.props as any;
    const id = props.id;

    if (id && states.has(id)) {
      const state = states.get(id)!;
      if (state.value !== undefined && props.value === undefined) {
        props.value = state.value;
      }
      if (state.checked !== undefined && props.checked === undefined) {
        props.checked = state.checked;
      }
      if (state.scrollX !== undefined && props.scrollX === undefined) {
        props.scrollX = state.scrollX;
      }
      if (state.scrollY !== undefined && props.scrollY === undefined) {
        props.scrollY = state.scrollY;
      }
    }

    // Recurse into children
    if (Array.isArray(node.children)) {
      for (const child of node.children) {
        injectState(child as VNode, states);
      }
    } else if (node.children && typeof node.children === 'object') {
      injectState(node.children as VNode, states);
    }
  };

  // Mouse event handler
  const handleMouse = (event: MouseEvent) => {
    if (!layoutTree) return;

    if (event.type === 'scroll') {
      const target = findScrollableAt(layoutTree, event.x, event.y);
      if (!target) return;

      const props = target.node.props as any;
      const id = props.id;
      if (!id || props.overflow !== 'scroll') return;

      let state = elementStates.get(id);
      if (!state) {
        state = {
          id,
          value: props.value || '',
          checked: props.checked || false,
          scrollX: typeof props.scrollX === 'number' ? props.scrollX : 0,
          scrollY: typeof props.scrollY === 'number' ? props.scrollY : 0,
        };
        elementStates.set(id, state);
      }

      const padding = parseSpacing(props.padding);
      const borderSize = getBorderThickness(props.border);
      const innerWidth = Math.max(0, target.rect.width - padding.left - padding.right - borderSize * 2);
      const innerHeight = Math.max(0, target.rect.height - padding.top - padding.bottom - borderSize * 2);
      const maxScrollX = Math.max(0, target.contentWidth - innerWidth);
      const maxScrollY = Math.max(0, target.contentHeight - innerHeight);

      const delta = event.scrollDirection === 'up' ? -3 : 3;
      if (event.shift) {
        const currentScrollX = typeof state.scrollX === 'number' ? state.scrollX : 0;
        state.scrollX = clamp(currentScrollX + delta, 0, maxScrollX);
      } else {
        const currentScrollY = typeof state.scrollY === 'number' ? state.scrollY : 0;
        state.scrollY = clamp(currentScrollY + delta, 0, maxScrollY);
      }

      requestRender();
      return;
    }

    // Hit test
    const hit = hitTestLayout(layoutTree, event.x, event.y);
    if (!hit) return;

    const props = hit.node.props as any;

    if (event.type === 'press') {
      // Focus on click
      if (props.id) {
        input.getFocusManager().focus(props.id);
        requestRender();
      }

      // Trigger onClick
      if (props.onClick) {
        props.onClick();
      }
    }
  };

  // Simple hit test
  const hitTestLayout = (node: LayoutNode, x: number, y: number): LayoutNode | null => {
    const { rect, children } = node;

    if (x < rect.x || x >= rect.x + rect.width || y < rect.y || y >= rect.y + rect.height) {
      return null;
    }

    // Check children in reverse order
    for (let i = children.length - 1; i >= 0; i--) {
      const hit = hitTestLayout(children[i], x, y);
      if (hit) return hit;
    }

    return node;
  };

  const findScrollableAt = (node: LayoutNode, x: number, y: number): LayoutNode | null => {
    const { rect, children } = node;

    if (x < rect.x || x >= rect.x + rect.width || y < rect.y || y >= rect.y + rect.height) {
      return null;
    }

    for (let i = children.length - 1; i >= 0; i--) {
      const hit = findScrollableAt(children[i], x, y);
      if (hit) return hit;
    }

    const props = node.node.props as StyleProps;
    if (props.overflow === 'scroll') {
      return node;
    }

    return null;
  };

  // Resize handler
  const handleResize = () => {
    buffer.resize(process.stdout.columns || 80, process.stdout.rows || 24);
    requestRender();
  };

  // Exit function
  const exit = () => {
    isRunning = false;
    if (renderTimer) {
      clearTimeout(renderTimer);
      renderTimer = null;
    }

    // Restore terminal
    if (altScreen) {
      process.stdout.write(Terminal.exitAltScreen);
    }
    if (mouse) {
      process.stdout.write(Terminal.disableMouse);
    }
    process.stdout.write(Terminal.showCursor);
    process.stdout.write(Terminal.reset);

    // Stop input
    input.stop();

    // Remove resize listener
    process.stdout.off('resize', handleResize);
  };

  // Initialize
  const initialize = () => {
    // Enter alternate screen
    if (altScreen) {
      process.stdout.write(Terminal.enterAltScreen);
    }

    // Hide cursor
    process.stdout.write(Terminal.hideCursor);

    // Clear screen
    process.stdout.write(Terminal.clearScreen);
    process.stdout.write(Terminal.cursorHome);

    // Enable mouse
    if (mouse) {
      process.stdout.write(Terminal.enableMouse);
    }

    // Start input handler
    input.start();

    // Register default keybinds
    input.registerGlobalKeybind({
      key: 'q',
      handler: exit,
    });

    input.registerGlobalKeybind({
      key: 'c',
      ctrl: true,
      handler: exit,
    });

    input.registerGlobalKeybind({
      key: 'escape',
      handler: exit,
    });

    // Page scroll keybinds
    input.registerGlobalKeybind({
      key: 'up',
      ctrl: true,
      handler: () => {
        if (!layoutTree) return;
        let state = elementStates.get('page');
        if (!state) {
          state = {
            id: 'page',
            value: '',
            checked: false,
            scrollX: 0,
            scrollY: 0,
          };
          elementStates.set('page', state);
        }
        const padding = parseSpacing([1, 1]);
        const borderSize = 0;
        const innerHeight = Math.max(0, layoutTree.rect.height - padding.top - padding.bottom - borderSize * 2);
        const maxScrollY = Math.max(0, layoutTree.contentHeight - innerHeight);
        const currentScrollY = typeof state.scrollY === 'number' ? state.scrollY : 0;
        state.scrollY = clamp(currentScrollY - 5, 0, maxScrollY);
        requestRender();
      },
    });

    input.registerGlobalKeybind({
      key: 'down',
      ctrl: true,
      handler: () => {
        if (!layoutTree) return;
        let state = elementStates.get('page');
        if (!state) {
          state = {
            id: 'page',
            value: '',
            checked: false,
            scrollX: 0,
            scrollY: 0,
          };
          elementStates.set('page', state);
        }
        const padding = parseSpacing([1, 1]);
        const borderSize = 0;
        const innerHeight = Math.max(0, layoutTree.rect.height - padding.top - padding.bottom - borderSize * 2);
        const maxScrollY = Math.max(0, layoutTree.contentHeight - innerHeight);
        const currentScrollY = typeof state.scrollY === 'number' ? state.scrollY : 0;
        state.scrollY = clamp(currentScrollY + 5, 0, maxScrollY);
        requestRender();
      },
    });

    // Listen for events
    input.on('key', () => {
      if (dirty) render();
    });

    input.on('mouse', handleMouse);

    input.on('focus', () => {
      requestRender();
    });

    // Handle resize
    process.stdout.on('resize', handleResize);

    // Initial render
    requestRender();
  };

  // Start the app
  initialize();

  return {
    render,
    exit,
    getBuffer: () => buffer,
    getLayout: () => layoutTree,
    getInput: () => input,
    focus: (id: string) => {
      input.getFocusManager().focus(id);
      requestRender();
    },
    getFocusedId: () => input.getFocusManager().getFocusedId(),
  };
}

/**
 * Run a full-screen app (blocking)
 * Returns an exit function
 */
export function run(
  rootElement: VNode | (() => VNode),
  config: AppConfig = {}
): () => void {
  const app = createApp(rootElement, config);
  return app.exit;
}

/**
 * Render lines to string (for testing)
 */
export function renderLines(rootElement: VNode, width: number = 80, height: number = 24): string[] {
  const buffer = new ScreenBuffer(width, height);
  const rendered = renderVNode(rootElement) as VNode;
  const layoutTree = layout(rendered, width, height);
  renderLayout(layoutTree, buffer, null);

  // Convert buffer to lines
  const lines: string[] = [];
  for (let y = 0; y < height; y++) {
    let line = '';
    for (let x = 0; x < width; x++) {
      line += buffer.getCell(x, y)?.char || ' ';
    }
    lines.push(line.trimEnd());
  }

  return lines;
}
