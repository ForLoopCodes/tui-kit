/**
 * App runtime - render loop, alternate buffer, resize handling
 */

import { ScreenBuffer, renderLayout, Terminal } from './render';
import { layout, LayoutNode, findFocusable } from './layout';
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
}

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
      state = { id, value: props.value || '', checked: props.checked || false };
      elementStates.set(id, state);
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
