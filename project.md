# tui-kit — Project Overview

A lightweight, composable, JSX/TSX-based terminal UI framework
designed to make building interactive terminal applications approachable
and consistent with web-like styling and layout principles.

## Table of Contents

1. Vision & Goals
2. Core Features
3. Architecture & Module Summary
4. Styling & Color System
5. Layout Engine
6. Rendering Pipeline
7. Input & Event Model
8. Component API and Intrinsics
9. Examples & Demos
10. Development Workflow
11. Testing & Performance
12. Roadmap
13. Contribution Guidelines
14. License

## Vision & Goals ✅

- Bring the ergonomics of modern UI development to terminal apps.
- Use a familiar JSX/TSX authoring model and a small, predictable runtime.
- Provide a CSS-like styling surface with TrueColor support and
  high fidelity text styling (bold, italic, underline, strike, inverse).
- Offer a small, composable set of building blocks (box, text, input, button, lists, table).
- Make interactive UX accessible via keyboard-first focus management
  and optional mouse support where terminals allow it.

## Core Features ✨

- JSX/TSX component syntax and a tiny virtual DOM.
- CSS-like styling: colors (hex, rgb/rgba, hsl/hsla, named), bg, bold, etc.
- Layout engine with simplified Flexbox semantics and grid basics.
- TrueColor (24-bit) ANSI escape sequences for accurate color.
- Box model with padding, margin, borders, scrollable containers and scrollbars.
- Interactive elements: input, textbox, button, select, checkbox, lists, tables.
- Keyboard and mouse event handling, focus management and keybindings.
- Double-buffered rendering and diff-optimized output to minimize flicker.
- Small API surface friendly to embedding in CLIs, REPLs, or full-screen apps.

## Architecture & Module Summary 🔧

- `src/colors.ts` — color parsing, conversion, and simple blending.
- `src/layout.ts` — measurement and layout (measure -> layout -> place).
- `src/render.ts` — ScreenBuffer, cell model, border drawing and text writing.
- `src/input.ts` — key and mouse parsing, focus manager, and bindings.
- `src/app.ts` (or `src/tui.ts`) — runtime orchestration: render loop, alt buffer, resize handling.
- `test/*` — example applications and interactive demos (`demo.tsx`, `shop.tsx`).
- `elements.md` — documentation of elements, props and examples.

## Styling & Color System 🎨

- Parse CSS-like color strings: hex (`#rrggbb`), short hex, `rgb()`, `rgba()`, `hsl()`, `hsla()`, and CSS names.
- Internally represent colors as RGBA and support alpha blending when compositing backgrounds.
- Generate correct SGR sequences for 24-bit colors using ANSI truecolor codes.
- Support text attributes (bold, dim, italic, underline, strikethrough) and
  combine them efficiently with per-cell state during rendering.
- Allow inline and inherited styles; style merges follow a simple parent-to-child rule.

## Layout Engine 📐

- A practical, minimal subset of Flexbox: row/column directions, justify/content, align-items, gap.
- Units: absolute numeric widths (columns), percentage (relative to parent), and flexible 'auto' sizing.
- Box model: padding, margin, border thickness and border styles (single, rounded, none).
- Measurement phase computes intrinsic widths/heights of children and content flow.
- Grid helpers offer a simple way to align items in rows and columns for tables.

## Rendering Pipeline 🖨️

1. Build/Update VDOM — JSX creates a lightweight VNode tree.
2. Measure — recursively compute content size hints for each node.
3. Layout — resolve positions and sizes using layout rules and containers.
4. Paint — write characters and style into a ScreenBuffer grid of cells.
5. Diff & Flush — compute minimal terminal output (or re-render whole buffer) and write.

- ScreenBuffer is a 2D cell matrix; each cell stores char, fg, bg, and attributes.
- Double buffering or simple full redraws are supported; diffing reduces terminal updates.
- Uses alternate screen buffer (where available) and clears lines using safe sequences.

## Input & Event Model ⌨️🖱️

- Keyboard parsing supports common sequences, modifiers, and printable keys.
- Mouse support uses SGR/modern mouse reporting when available and maps presses, drags and scrolls.
- Focus manager keeps a registry of focusable elements, tabIndex, and visual focus styles.
- Regions are registered for mouse events and callbacks (onPress, onRelease, onDrag).
- Global keybindings and element-specific handlers are supported.

## Component API & Intrinsics 📦

- Intrinsic elements: `box`, `text`, `input`, `textbox`, `button`, `ul`, `ol`, `li`, `hr`, `br`, `table`, `thead`, `tbody`, `tr`, `th`, `td`.
- Primary exports: `run()` (blocking full-screen app), `createApp()` (composable runtime), `createElement()`/`Fragment` for JSX.
- Each element accepts shared style props plus element-specific props (e.g., `placeholder`, `onChange`, `tabIndex`).
- Example usage (TSX):

```tsx
const App = () => (
  <box width="100%" height="100%" flexDirection="column">
    <text bold color="#e94560">
      tui-kit
    </text>
    <input id="name" tabIndex={1} placeholder="type name..." />
    <button id="ok" tabIndex={2} onClick={() => console.log("click")}>
      OK
    </button>
  </box>
);
run(<App />);
```

## Examples & Demos 🧪

- `test/demo.tsx` — a small showcase for colors, buttons, inputs and scrolling.
- `test/shop.tsx` — a more elaborate interactive demo (cart, products, checkout).
- Use `npm run demo` or `npm run shop` to launch them during development.

## Development Workflow 🛠️

- Language: TypeScript. Target: Node (CommonJS) with builds in `dist/`.
- Scripts: `npm run build`, `npm run demo`, `npm run shop`.
- Run quick prototypes with `ts-node --files` for TSX demos.
- Keep modules small and focused: color, layout, render, input, app, elements.
- Prefer deterministic behavior and small GC pressure in hot paths.

## Testing & Performance 📈

- Unit tests for color parsing and layout math (off-terminal logic).
- Snapshot tests for rendering: generate `renderLines()` output and assert
  text + ANSI codes for major components.
- Performance tests: check allocation rate, large lists rendering, and scroll behavior.
- Use throttling for input events and avoid per-keystroke allocations where possible.

## Design Trade-offs & Constraints ⚖️

- Terminals are character grids — precise pixel layout and overlapping is impossible.
- TrueColor gives many colors, but terminal support varies across environments.
- Accessibility is focused on keyboard navigation; screen reader coverage is limited.
- Keep API small, stable and predictable; avoid introducing heavy runtime dependencies.

## Roadmap & Future Ideas 🚀

- More complete Flexbox and Grid implementation with improved wrapping and baselines.
- Animations and transitions (limited to discrete frame updates).
- Plugin system for extensions (custom renderers, effects).
- Better testing harness for interactive flows and CI-based visual diffing.
- Small ecosystem of ready-made widgets (tables, trees, tab views, menus).

## Contribution Guidelines 👥

- Open a small, focused PR with tests and a short explanation.
- Follow the repository's code-style and keep functions concise and well-named.
- Document new elements in `elements.md` and add demo usage in `test/`.
- Add unit tests to `test/` and ensure `npm run build` passes.

## License & Credits 📜

- Licensed under MIT — please see `LICENSE` for details.
- Credits to contributors for feature ideas and test cases.

---

If you'd like, I can add a short 'quick start' section with copyable commands
or expand the API reference into a dedicated `API.md` file.
