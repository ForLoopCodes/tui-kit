# tui-kit — Terminal UI Framework

A lightweight, composable, JSX/TSX-based terminal UI framework for building beautiful, interactive command-line applications with modern web-like ergonomics.

## Features ✨

- **JSX/TSX Syntax** — Write UI with familiar component-based syntax
- **CSS-like Styling** — Colors (hex, rgb, hsl), bold, italic, underline, backgrounds
- **Flexbox Layout** — Simple, predictable layout with flex properties
- **Form Elements** — Inputs, buttons, checkboxes, selects, and more
- **Scrolling** — Full support for scrollable containers with visual scrollbars
- **Focus Management** — Tab navigation and focus states built-in
- **Mouse & Keyboard** — Complete keyboard bindings and mouse event support
- **TrueColor Support** — 24-bit ANSI colors with accurate rendering
- **Double Buffering** — Smooth, flicker-free rendering with diff optimization

## Installation

```bash
npm install tui-kit
# or
yarn add tui-kit
```

## Quick Start

```tsx
import { createApp, createElement, useState } from "tui-kit";

const App = () => {
  const [name, setName] = useState("");

  return (
    <box
      width="100%"
      height="100%"
      flexDirection="column"
      padding={1}
      bg="#1a1a2e"
    >
      <text bold color="#e94560">
        Welcome to tui-kit
      </text>

      <text color="#888">Enter your name:</text>
      <input
        id="name-input"
        tabIndex={1}
        placeholder="Type here..."
        value={name}
        onChange={(value) => setName(value)}
        width={30}
      />

      <button
        id="submit-btn"
        tabIndex={2}
        onClick={() => {
          console.log(`Hello, ${name}!`);
        }}
      >
        Submit
      </button>
    </box>
  );
};

// Run the app
createApp(App);
```

## Core Concepts

### Virtual DOM & Components

Components are functions that return VNode trees. Use JSX syntax for clean, readable UI:

```tsx
const MyComponent = () => {
  const [count, setCount] = useState(0);

  return (
    <box flexDirection="column" padding={1}>
      <text>Count: {count}</text>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </box>
  );
};
```

### Styling

All elements support CSS-like properties:

```tsx
<box
  width={80}
  height={24}
  padding={[1, 2]} // [vertical, horizontal]
  margin={1} // all sides
  bg="#1a1a2e" // background color
  color="#ffffff" // text color
  border="single" // single, double, rounded, bold, dashed
  borderColor="#0f3460"
>
  <text bold italic underline color="#feca57">
    Styled text
  </text>
</box>
```

### Layout

Use Flexbox-like properties:

```tsx
<box
  flexDirection="row" // row, column, row-reverse, column-reverse
  justifyContent="space-between"
  alignItems="center"
  gap={2}
  width="100%"
>
  {/* children */}
</box>
```

### Form Elements

#### Input

```tsx
<input
  id="email"
  tabIndex={1}
  placeholder="Enter email..."
  type="email"
  value={email}
  onChange={(val) => setEmail(val)}
  onSubmit={(val) => console.log("Submitted:", val)}
  width={30}
  bg="#2d2d44"
/>
```

#### Button

```tsx
<button
  id="submit"
  tabIndex={2}
  bg="#e94560"
  focusBg="#ff6b6b"
  onClick={() => console.log("clicked")}
>
  Submit
</button>
```

#### Checkbox

```tsx
<checkbox
  id="agree"
  tabIndex={3}
  checked={agreed}
  label="I agree"
  onChange={(checked) => setAgreed(checked)}
/>
```

#### Select / Dropdown

```tsx
<select id="language" value={lang} onChange={(val) => setLang(val)}>
  <option value="en">English</option>
  <option value="es">Spanish</option>
  <option value="fr">French</option>
</select>
```

### Colors

Supports multiple color formats:

```tsx
// Hex
color = "#ff0000";
color = "rgb(255, 0, 0)";
color = "rgba(255, 0, 0, 0.8)";
color = "hsl(0, 100%, 50%)";
color = "hsl(0, 100%, 50%, 0.8)";

// Named colors (limited set)
color = "#ff6b6b"; // red-ish
color = "#feca57"; // yellow
color = "#48dbfb"; // cyan
```

### Scrolling

Create scrollable containers:

```tsx
<box
  id="scrollable"
  width={40}
  height={10}
  overflow="scroll"
  scrollbarColor="#16c79a"
  scrollbarTrackColor="#0f3460"
>
  <text>• Item 1</text>
  <text>• Item 2</text>
  <text>• Item 3</text>
  {/* ... more items ... */}
</box>
```

**Navigation:**

- **Arrow Up/Down** — Scroll focused container
- **Page Up/Page Down** — Scroll faster
- **Home/End** — Jump to top/bottom
- **Mouse Wheel** — Scroll container under cursor

## Key Systems

### Focus Management

Tab navigation cycles through focusable elements (`input`, `button`, `checkbox`, `select`, or elements with `tabIndex`):

```tsx
<input id="field1" tabIndex={1} placeholder="First" />
<input id="field2" tabIndex={2} placeholder="Second" />
<button id="btn" tabIndex={3}>Submit</button>

// Press Tab to navigate between elements
// Press Enter/Space to activate button
```

### Input Handling

```tsx
// Keyboard events
input.on("keypress", (key: KeyEvent) => {
  console.log(key.name); // 'up', 'down', 'a', 'escape', etc.
  console.log(key.ctrl); // true if Ctrl held
  console.log(key.alt); // true if Alt held
  console.log(key.shift); // true if Shift held
});

// Mouse events
input.on("mouse", (event: MouseEvent) => {
  console.log(event.type); // 'press', 'release', 'move', 'drag', 'scroll'
  console.log(event.x, event.y);
  console.log(event.button); // 'left', 'right', 'middle'
});
```

### Render Loop

The app automatically re-renders when:

- State changes (via `useState`)
- Focus changes
- Mouse/keyboard events occur

For manual control:

```tsx
const app = createApp(MyComponent);

app.render(); // Force render
app.focus("element-id"); // Focus by ID
app.getFocusedId(); // Get current focus
app.exit(); // Clean up and exit
```

## API Reference

### Intrinsic Elements

- `<box>` — Container (flex layout)
- `<text>` — Text content
- `<input>` — Text input field
- `<textbox>` — Multi-line input
- `<button>` — Clickable button
- `<checkbox>` — Boolean toggle
- `<select>` — Dropdown list
- `<option>` — Select option
- `<ul>` / `<ol>` — Lists
- `<li>` — List item
- `<table>` / `<thead>` / `<tbody>` / `<tr>` / `<th>` / `<td>` — Tables
- `<hr>` — Horizontal divider
- `<br>` — Line break

### Common Props

| Prop            | Type               | Description                                      |
| --------------- | ------------------ | ------------------------------------------------ |
| `id`            | string             | Element identifier for focus                     |
| `width`         | number \| string   | Width (px or %)                                  |
| `height`        | number \| string   | Height (px or %)                                 |
| `padding`       | number \| number[] | Box padding                                      |
| `margin`        | number \| number[] | Box margin                                       |
| `color`         | string             | Text color (hex/rgb/hsl)                         |
| `bg`            | string             | Background color                                 |
| `bold`          | boolean            | Bold text                                        |
| `italic`        | boolean            | Italic text                                      |
| `underline`     | boolean            | Underlined text                                  |
| `strikethrough` | boolean            | Strike-through text                              |
| `border`        | string             | Border style (single/double/rounded/bold/dashed) |
| `borderColor`   | string             | Border color                                     |
| `focusBg`       | string             | Background when focused                          |
| `overflow`      | string             | 'visible' \| 'hidden' \| 'scroll'                |
| `tabIndex`      | number             | Focus order (0, 1, 2, ...)                       |
| `onClick`       | () => void         | Click handler                                    |
| `onFocus`       | () => void         | Focus handler                                    |
| `onBlur`        | () => void         | Blur handler                                     |

### State Management (useState)

```tsx
const Component = () => {
  const [value, setValue] = useState(initialValue);

  // Trigger re-render when state changes
  setValue(newValue);
  setValue((prev) => prev + 1);

  return <text>{value}</text>;
};
```

## Examples

### Simple Form

```tsx
const LoginApp = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = () => {
    console.log(`Login: ${username}`);
  };

  return (
    <box
      width="100%"
      height="100%"
      flexDirection="column"
      padding={2}
      bg="#1a1a2e"
    >
      <text bold color="#e94560">
        Login
      </text>
      <br />

      <text color="#888">Username:</text>
      <input
        id="username"
        tabIndex={1}
        placeholder="Enter username..."
        value={username}
        onChange={setUsername}
        width={30}
      />
      <br />

      <text color="#888">Password:</text>
      <input
        id="password"
        tabIndex={2}
        type="password"
        placeholder="Enter password..."
        value={password}
        onChange={setPassword}
        width={30}
      />
      <br />

      <button
        id="login"
        tabIndex={3}
        bg="#0f3460"
        focusBg="#16537e"
        onClick={handleLogin}
      >
        Login
      </button>
    </box>
  );
};

createApp(LoginApp);
```

### Scrollable List

```tsx
const ListApp = () => {
  const [selected, setSelected] = useState(0);
  const items = Array.from({ length: 50 }, (_, i) => `Item ${i + 1}`);

  return (
    <box
      id="list"
      width={40}
      height={20}
      overflow="scroll"
      border="single"
      padding={1}
      borderColor="#0f3460"
    >
      {items.map((item, i) => (
        <text key={i} color={selected === i ? "#feca57" : "#ffffff"}>
          {selected === i ? "▶ " : "  "}
          {item}
        </text>
      ))}
    </box>
  );
};

createApp(ListApp);
```

## Keyboard Shortcuts

| Key                  | Action                                    |
| -------------------- | ----------------------------------------- |
| **Tab**              | Navigate to next focusable element        |
| **Shift+Tab**        | Navigate to previous focusable element    |
| **Enter**            | Activate button / Submit input            |
| **Space**            | Toggle checkbox / Activate button         |
| **Arrow Up/Down**    | Scroll focused container or navigate menu |
| **Page Up/Down**     | Scroll faster                             |
| **Home/End**         | Jump to top/bottom of scrollable content  |
| **q / Esc / Ctrl+C** | Exit application                          |

## Advanced Topics

### Custom Components

```tsx
const Card = ({ title, children }) => (
  <box border="rounded" padding={1} borderColor="#0f3460" bg="#2d2d44">
    <text bold color="#16c79a">
      {title}
    </text>
    {children}
  </box>
);

// Usage
<Card title="Settings">
  <text>Configure your preferences here</text>
</Card>;
```

### Global Keybindings

```tsx
const app = createApp(MyApp);
const input = app.getInput();

input.registerGlobalKeybind({
  key: "h",
  ctrl: true,
  handler: () => {
    console.log("Help pressed");
  },
});
```

### Direct Buffer Access

```tsx
const app = createApp(MyApp);
const buffer = app.getBuffer();
const layout = app.getLayout();

// Lower-level manipulation if needed
buffer.writeText(0, 0, "Custom text", fg, bg);
buffer.drawBorder(0, 0, 10, 5, "single");
```

## Performance Tips

1. **Keep state updates minimal** — Only update necessary state
2. **Use keys in lists** — Help virtual DOM track elements
3. **Limit render frequency** — Avoid excessive `requestRender()` calls
4. **Monitor large lists** — Consider virtual scrolling for 1000+ items
5. **Lazy load content** — Load data on demand, not upfront

## Troubleshooting

### Input not appearing in fields?

- Check element has `width` set
- Verify `overflow` is not hiding content
- Ensure element is within visible bounds

### Scrollbar not showing?

- Set `overflow="scroll"` on container
- Ensure content height > container height
- Check `scrollbarColor` is visible against background

### Focus not working as expected?

- Verify elements have `id` or `focusable={true}`
- Check `tabIndex` values are correct (0, 1, 2, ...)
- Ensure element is not `disabled`

### Colors not rendering?

- Use valid hex (#RRGGBB), rgb(), hsl() formats
- Check terminal supports 24-bit color (most modern terminals do)
- Try simpler colors first (red, blue, green)

## Development

```bash
# Build TypeScript
npm run build

# Run demo
npm run demo

# Watch mode
npm run watch
```

## Project Structure

```
src/
  ├── elements.ts      # JSX element types and virtual DOM
  ├── layout.ts        # Measurement and layout engine
  ├── render.ts        # ScreenBuffer and rendering
  ├── colors.ts        # Color parsing and conversion
  ├── input.ts         # Keyboard/mouse handling and focus
  └── app.ts           # Application runtime and event loop

test/
  └── demo.tsx         # Interactive demo application

dist/
  └── (compiled output)
```

## Browser Support

**Terminal/Console only** — This is for terminal applications, not web browsers.

Supported environments:

- **Node.js** 14+
- **Deno** (with appropriate Node compat)
- **Bun**
- Any environment with raw stdin/stdout access

Tested on:

- macOS Terminal
- Ubuntu Terminal (Gnome, Konsole)
- Windows Terminal (v1.4+)
- iTerm2

## License

ISC (or your preferred license)

## Contributing

Contributions welcome! Areas of interest:

- More widget types (tabs, menus, trees)
- Animation/transition support
- Improved accessibility
- Performance optimizations
- Better error messages

See `CONTRIBUTING.md` for guidelines.

## Roadmap

- [x] Core layout and rendering
- [x] Focus management and keyboard navigation
- [x] Form elements (input, button, checkbox, select)
- [x] Scrollable containers with scrollbars
- [x] Mouse support
- [ ] Tab widgets
- [ ] Tree views
- [ ] Menu systems
- [ ] Animations/transitions
- [ ] Plugin architecture
- [ ] More comprehensive widget library

## Support

For issues, questions, or suggestions:

- Open an GitHub issue
- Check existing documentation in `project.md` and `elements.md`
- Review demo app for usage examples

Happy building! 🚀
