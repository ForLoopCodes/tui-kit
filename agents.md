# Agents & Managers Guide

This document describes the internal agent/manager systems in tui-kit and patterns for extending the framework with autonomous agents and event handlers.

## Table of Contents

1. [Built-in Managers](#built-in-managers)
2. [Event System](#event-system)
3. [Focus Manager](#focus-manager)
4. [Input Handler](#input-handler)
5. [Keybind Manager](#keybind-manager)
6. [Mouse Manager](#mouse-manager)
7. [Custom Agents](#custom-agents)
8. [Asynchronous Patterns](#asynchronous-patterns)

## Built-in Managers

TUI-kit uses several internal "manager" agents to coordinate application behavior:

```
┌─────────────────────────────────────────────┐
│          Application Runtime                │
├─────────────────────────────────────────────┤
│                                             │
│  ┌──────────────┐  ┌────────────────────┐ │
│  │ Focus Mgr    │  │ Input Handler      │ │
│  └──────────────┘  └────────────────────┘ │
│                           │                │
│  ┌──────────────┐  ┌──────▼────────────┐ │
│  │ Keyboard Mgr │  │ Mouse Manager     │ │
│  └──────────────┘  └──────────────────┘ │
│                                          │
│  ┌──────────────────────────────────┐  │
│  │   Render Loop & State Engine      │  │
│  └──────────────────────────────────┘  │
│                                          │
└─────────────────────────────────────────────┘
```

## Event System

All managers are built on Node's `EventEmitter` pattern. The main application listens for events and coordinates state updates:

```typescript
const app = createApp(MyComponent);
const input = app.getInput();

// Listen for events
input.on("key", (keyEvent) => {
  console.log("Key pressed:", keyEvent.name);
});

input.on("mouse", (mouseEvent) => {
  console.log("Mouse event:", mouseEvent.type);
});

input.on("focus", (focusedId) => {
  console.log("Focused element:", focusedId);
});
```

### Event Types

| Event      | Listener Args    | Description                        |
| ---------- | ---------------- | ---------------------------------- |
| `key`      | `KeyEvent`       | Any key was pressed                |
| `keypress` | `KeyEvent`       | Element-specific key press         |
| `mouse`    | `MouseEvent`     | Mouse action (click, scroll, drag) |
| `focus`    | `string \| null` | Focus changed to element           |

## Focus Manager

The **FocusManager** maintains the current focus state and handles Tab navigation.

### API

```typescript
const focusManager = input.getFocusManager();

// Get current focused element ID
const focusedId = focusManager.getFocusedId();

// Set focus by ID
focusManager.focus("element-id");

// Navigate
focusManager.focusNext(); // Tab forward
focusManager.focusPrev(); // Shift+Tab backward
focusManager.focusFirst(); // Jump to first

// Registration (internal, handled by runtime)
focusManager.register(id, tabIndex, {
  onFocus: () => console.log("Focused"),
  onBlur: () => console.log("Blurred"),
  onKeypress: (key) => handleKey(key),
});

focusManager.clear(); // Clear all registrations
```

### Focus Events

```tsx
<input
  id="username"
  onFocus={() => console.log("Input focused")}
  onBlur={() => console.log("Input blurred")}
  onKeypress={(key) => console.log("Key in input:", key.name)}
/>
```

### Tab Order

Control focus order via `tabIndex`:

```tsx
<input id="first" tabIndex={1} />      // Focused first
<input id="second" tabIndex={2} />     // Focused second
<button id="third" tabIndex={3} />     // Focused third

// Missing tabIndex goes last, in DOM order
<div>Focused last</div>
```

## Input Handler

The **InputHandler** coordinates keyboard and mouse event parsing and distribution.

### Keyboard Event Structure

```typescript
interface KeyEvent {
  name: string; // 'a', 'up', 'escape', etc.
  char: string; // The character typed (for printable keys)
  ctrl: boolean; // Ctrl key held
  alt: boolean; // Alt key held
  shift: boolean; // Shift key held
  meta: boolean; // Meta/Cmd key held
  sequence: string; // Raw escape sequence
}
```

### Key Names

Common key names:

```
Letters/Numbers: 'a'-'z', '0'-'9'
Navigation: 'up', 'down', 'left', 'right', 'home', 'end'
Page: 'pageup', 'pagedown'
Function: 'f1'-'f12'
Special: 'escape', 'enter', 'tab', 'backspace', 'delete', 'space', 'insert'
```

### Examples

```typescript
const input = app.getInput();

input.on("keypress", (key) => {
  if (key.name === "q") console.log("Quit requested");
  if (key.name === "up" && key.ctrl) console.log("Scroll up");
  if (key.name === "escape") console.log("Cancel");
});
```

### Mouse Event Structure

```typescript
interface MouseEvent {
  type: "press" | "release" | "move" | "drag" | "scroll";
  button: "left" | "middle" | "right" | "none";
  x: number; // Column (0-based)
  y: number; // Row (0-based)
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  scrollDirection?: "up" | "down";
}
```

### Mouse Examples

```typescript
input.on("mouse", (event) => {
  if (event.type === "press" && event.button === "left") {
    console.log(`Clicked at ${event.x}, ${event.y}`);
  }

  if (event.type === "scroll") {
    console.log(`Scroll ${event.scrollDirection}`);
  }

  if (event.type === "drag") {
    console.log(`Dragging to ${event.x}, ${event.y}`);
  }
});
```

## Keybind Manager

The **KeybindManager** registers global keyboard shortcuts.

### Global Keybindings

```typescript
const input = app.getInput();

input.registerGlobalKeybind({
  key: "h",
  ctrl: true,
  handler: () => console.log("Help!"),
});

input.registerGlobalKeybind({
  key: "q",
  handler: () => app.exit(),
});

input.registerGlobalKeybind({
  key: "down",
  ctrl: true,
  handler: () => console.log("Scroll down"),
});
```

### Managing Keybinds

```typescript
const keybindMgr = input.getKeybindManager();

// Register
keybindMgr.register({
  key: "s",
  shift: true,
  ctrl: true,
  handler: () => console.log("Shift+Ctrl+S"),
});

// Unregister
keybindMgr.unregister("s", true, false, true);

// Clear all
keybindMgr.clear();
```

### Keybind Matching

Keybinds are matched against KeyEvents:

```typescript
// Declaration
{ key: 'up', ctrl: true, alt: false, shift: false, handler: ... }

// Pressed key must match:
// - key name matches ('up')
// - ctrl flag matches (true)
// - alt flag matches (false)
// - shift flag matches (false)
```

## Mouse Manager

The **MouseManager** handles click regions and drag detection.

### Mouse Regions

```typescript
const mouseManager = input.getMouseManager();

mouseManager.register({
  id: "button-1",
  x: 10,
  y: 5,
  width: 12,
  height: 3,
  onPress: (event) => console.log("Pressed at", event.x, event.y),
  onRelease: (event) => console.log("Released"),
  onClick: (event) => console.log("Clicked"),
  onDrag: (event) => console.log("Dragging to", event.x, event.y),
});

mouseManager.unregister("button-1");
mouseManager.clear();
```

(Note: The runtime typically manages this automatically for focusable elements.)

## Custom Agents

### Pattern 1: Event Listener Agent

Create an agent that listens to input events and performs actions:

```typescript
class AutoSaveAgent {
  private timeout: NodeJS.Timeout | null = null;

  constructor(private input: InputHandler) {
    this.setupListeners();
  }

  private setupListeners() {
    this.input.on("keypress", () => {
      this.scheduleAutoSave();
    });
  }

  private scheduleAutoSave() {
    if (this.timeout) clearTimeout(this.timeout);

    this.timeout = setTimeout(() => {
      console.log("Auto-saving...");
      // Perform save
      this.timeout = null;
    }, 5000);
  }

  destroy() {
    if (this.timeout) clearTimeout(this.timeout);
  }
}

// Usage
const app = createApp(MyApp);
const autoSave = new AutoSaveAgent(app.getInput());
// Later...
autoSave.destroy();
```

### Pattern 2: Command Dispatcher

Create a registry of commands that can be triggered by keybinds:

```typescript
class CommandDispatcher {
  private commands = new Map<string, () => void>();

  register(name: string, handler: () => void) {
    this.commands.set(name, handler);
  }

  execute(name: string) {
    const cmd = this.commands.get(name);
    if (cmd) cmd();
    else console.warn(`Unknown command: ${name}`);
  }

  bindKeybind(
    input: InputHandler,
    key: string,
    command: string,
    ctrl = false,
    alt = false,
  ) {
    input.registerGlobalKeybind({
      key,
      ctrl,
      alt,
      handler: () => this.execute(command),
    });
  }
}

// Usage
const dispatcher = new CommandDispatcher();
dispatcher.register("undo", () => console.log("Undo"));
dispatcher.register("redo", () => console.log("Redo"));
dispatcher.register("save", () => console.log("Save"));

const app = createApp(MyApp);
dispatcher.bindKeybind(app.getInput(), "z", "undo", true);
dispatcher.bindKeybind(app.getInput(), "y", "redo", true);
dispatcher.bindKeybind(app.getInput(), "s", "save", true);
```

### Pattern 3: State Observer

Create an agent that monitors and reacts to state changes:

```typescript
class StateObserver {
  private lastState: any = null;

  constructor(
    private getState: () => any,
    private onChange: (state: any) => void,
  ) {
    this.checkState();
  }

  private checkState() {
    const newState = this.getState();
    if (JSON.stringify(newState) !== JSON.stringify(this.lastState)) {
      this.onChange(newState);
      this.lastState = newState;
    }

    // Poll periodically
    setTimeout(() => this.checkState(), 100);
  }
}

// Usage
const observer = new StateObserver(
  () => app.getLayout(),
  (layout) => console.log("Layout changed!"),
);
```

### Pattern 4: Modal or Dialog Agent

Create a reusable modal/dialog with its own focus and event handling:

```typescript
class ModalAgent {
  private active = false;

  constructor(
    private app: App,
    private renderModal: () => VNode,
    private onConfirm: () => void,
    private onCancel: () => void,
  ) {}

  show() {
    this.active = true;
    const input = this.app.getInput();

    input.registerGlobalKeybind({
      key: "enter",
      handler: () => {
        if (this.active) {
          this.onConfirm();
          this.hide();
        }
      },
    });

    input.registerGlobalKeybind({
      key: "escape",
      handler: () => {
        if (this.active) {
          this.onCancel();
          this.hide();
        }
      },
    });

    this.app.render();
  }

  hide() {
    this.active = false;
  }

  isActive() {
    return this.active;
  }
}
```

### Pattern 5: Notification Agent

Simple notification system:

```typescript
class NotificationAgent {
  private queue: Array<{ message: string; duration: number }> = [];
  private currentIndex = 0;

  constructor(private app: App) {}

  notify(message: string, duration = 3000) {
    this.queue.push({ message, duration });

    if (this.currentIndex === 0) {
      this.showNext();
    }
  }

  private showNext() {
    if (this.currentIndex >= this.queue.length) {
      this.currentIndex = 0;
      this.queue = [];
      return;
    }

    const { message, duration } = this.queue[this.currentIndex];
    console.log(`[Notification] ${message}`);

    setTimeout(() => {
      this.currentIndex++;
      this.showNext();
    }, duration);
  }
}

// Usage
const notifications = new NotificationAgent(app);
notifications.notify("Settings saved!", 2000);
notifications.notify("Error: Failed to load", 3000);
```

## Asynchronous Patterns

### Handling async operations while keeping UI responsive:

```typescript
class AsyncAgent {
  constructor(private app: App) {}

  async executeAsync(asyncFn: () => Promise<void>) {
    try {
      // Show loading state
      console.log("Loading...");

      // Don't block the app
      await asyncFn();

      // Re-render after completion
      this.app.render();
      console.log("Done!");
    } catch (error) {
      console.error("Error:", error);
      this.app.render();
    }
  }
}

// Usage
const agent = new AsyncAgent(app);
agent.executeAsync(async () => {
  const data = await fetch("https://api.example.com/data");
  console.log(data);
});
```

### Long-running operations with progress:

```typescript
interface TaskProgress {
  total: number;
  current: number;
  status: string;
}

class ProgressAgent {
  private progress: TaskProgress = { total: 0, current: 0, status: "" };

  async runTask(task: (progress: TaskProgress) => Promise<void>) {
    this.progress = { total: 100, current: 0, status: "Starting..." };

    try {
      await task(this.progress);
    } finally {
      this.progress.status = "Complete";
    }
  }

  getProgress(): TaskProgress {
    return { ...this.progress };
  }
}

// Usage
const progress = new ProgressAgent();
await progress.runTask(async (p) => {
  for (let i = 0; i < 100; i++) {
    p.current = i;
    p.status = `Processing ${i}/100...`;

    // Simulate work
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
});
```

## Best Practices

1. **Keep handlers pure** — Avoid side effects in event handlers when possible
2. **Clean up resources** — Unregister agents when no longer needed
3. **Use weak references** — Prevent memory leaks in long-running apps
4. **Batch operations** — Group multiple renders into one update
5. **Avoid deep nesting** — Keep event listener chains shallow
6. **Document agent contracts** — Make expected inputs/outputs clear
7. **Test in isolation** — Test agents independently from the app
8. **Use TypeScript** — Type-safe agent code is easier to maintain

## Common Patterns Summary

| Pattern                | Use Case                     | Example                 |
| ---------------------- | ---------------------------- | ----------------------- |
| **Event Listener**     | React to input               | Auto-save, logging      |
| **Command Dispatcher** | Centralized command handling | Menu systems, shortcuts |
| **State Observer**     | React to state changes       | Auto-sync, validation   |
| **Modal/Dialog**       | Isolated UI flow             | Confirmations, forms    |
| **Notification**       | User feedback                | Alerts, toasts          |
| **Async Agent**        | Long operations              | Fetch, computation      |
| **Progress Tracker**   | Track async work             | Download, processing    |

## Examples in Demo

See `test/demo.tsx` for real-world examples:

- Form input handling with input validation
- Button click handlers
- Focus management for multi-element forms
- Scrollable container with keyboard and mouse navigation
- Global keybindings (Ctrl+Up/Down for page scroll)

## Troubleshooting Agents

**Agent not responding to events?**

- Verify event name is correct (check InputHandler documentation)
- Ensure keybind key name matches actual key
- Check event modifiers (ctrl, alt, shift) match exactly

**Memory leak in agent?**

- Make sure to clean up timeouts/intervals
- Unregister event listeners when done
- Remove keybinds if they're temporary

**Agent blocking UI?**

- Use `setTimeout` with 0 delay to defer work
- Break long operations into smaller chunks
- Consider using `setImmediate` for background tasks

**Conflicting agents?**

- Use different event listeners if possible
- Register in deterministic order
- Use dispatcher pattern to manage multiple agents

## Further Reading

- [Node.js EventEmitter](https://nodejs.org/api/events.html)
- [tui-kit Input System](./src/input.ts)
- [tui-kit App Runtime](./src/app.ts)
- [Demo Application](./test/demo.tsx)
