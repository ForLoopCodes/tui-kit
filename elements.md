# TUI Kit Elements Documentation

Complete reference for all terminal UI elements with CSS-like styling, flexbox/grid layout, and interactive features.

## Table of Contents
- [Box (Universal Container)](#box)
- [Input Elements](#input-elements)
- [Button](#button)
- [Select & Option](#select)
- [Checkbox](#checkbox)
- [Form](#form)
- [Lists (ul, ol, li)](#lists)
- [Table](#table)
- [hr & br](#utility-elements)
- [Colors](#colors)
- [Keyboard Navigation](#keyboard-navigation)
- [Mouse Support](#mouse-support)

---

## Box

The universal container element supporting CSS-like styling, flexbox, grid, borders, and positioning.

```tsx
<box
  // Sizing
  width={50}              // number (chars), "50%", "10blocks"
  height={20}
  minWidth={10}
  maxWidth={100}
  
  // Colors (RGBA, RGB, Hex, Named)
  color="rgba(255,100,50,0.8)"
  bg="#1a1a2e"
  
  // Text formatting
  bold
  italic
  underline
  dim
  strikethrough
  
  // Borders
  border="rounded"        // none, single, double, rounded, bold, dashed
  borderColor="cyan"
  
  // Padding (single, [v,h], [t,r,b,l])
  padding={2}
  padding={[1, 2]}
  padding={[1, 2, 1, 2]}
  
  // Layout
  display="flex"          // block, flex, grid, none
  flexDirection="row"     // row, column, row-reverse, column-reverse
  flexWrap="wrap"         // nowrap, wrap, wrap-reverse
  justifyContent="center" // flex-start, flex-end, center, space-between, space-around, space-evenly
  alignItems="center"     // flex-start, flex-end, center, stretch, baseline
  gap={1}
  
  // Grid
  gridTemplateColumns="1fr 2fr 1fr"
  gridTemplateRows="auto"
  gridGap={2}
  
  // Text alignment
  textAlign="center"      // left, center, right
  
  // Positioning
  position="absolute"     // relative, absolute, fixed
  top={5}
  left={10}
  
  // Scroll
  overflow="scroll"       // visible, hidden, scroll
  
  // Interactivity
  id="mybox"
  focusable
  tabIndex={1}
  resizable
  movable
  
  // Events
  onFocus={() => {}}
  onBlur={() => {}}
  onClick={() => {}}
  onKeypress={(key) => {}}
>
  {children}
</box>
```

---

## Input Elements

### Text Input

```tsx
<input
  id="email"
  name="email"
  value=""
  placeholder="Enter email..."
  type="text"             // text, password, email, number
  width={30}
  color="white"
  bg="gray"
  disabled={false}
  onInput={(value) => console.log(value)}
  onSubmit={(value) => handleSubmit(value)}
/>
```

### Textbox (Multiline)

```tsx
<textbox
  id="description"
  value=""
  placeholder="Enter description..."
  width={40}
  height={5}
  onInput={(value) => {}}
/>
```

---

## Button

```tsx
<button
  id="submit"
  onClick={() => doAction()}
  bg="blue"
  hoverBg="brightblue"
  focusBg="cyan"
  width={20}
>
  Click Me
</button>
```

---

## Select

Dropdown select with option children:

```tsx
<select 
  id="size" 
  value="md" 
  width={20}
  onChange={(value) => setSize(value)}
>
  <option value="sm">Small</option>
  <option value="md">Medium</option>
  <option value="lg">Large</option>
</select>
```

Keyboard: `Enter`/`Space` to open, `↑`/`↓` to navigate, `Enter` to select, `Esc` to close.

---

## Checkbox

```tsx
<checkbox
  id="agree"
  checked={false}
  label="I agree to terms"
  onChange={(checked) => setAgreed(checked)}
/>
```

Keyboard: `Space`/`Enter` to toggle.

---

## Form

Groups inputs together:

```tsx
<form onSubmit={(data) => handleSubmit(data)}>
  <input name="username" placeholder="Username" />
  <input name="password" type="password" placeholder="Password" />
  <button type="submit">Login</button>
</form>
```

---

## Lists

### Unordered List

```tsx
<ul>
  <li>First item</li>
  <li>Second item</li>
  <li>Third item</li>
</ul>
```

Output:
```
• First item
• Second item
• Third item
```

### Ordered List

```tsx
<ol>
  <li>Step one</li>
  <li>Step two</li>
  <li>Step three</li>
</ol>
```

Output:
```
1. Step one
2. Step two
3. Step three
```

---

## Table

Full table support with headers and borders:

```tsx
<table border="single">
  <thead>
    <tr>
      <th>Product</th>
      <th>Price</th>
      <th>Qty</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Widget</td>
      <td>$9.99</td>
      <td>2</td>
    </tr>
    <tr>
      <td>Gadget</td>
      <td>$19.99</td>
      <td>1</td>
    </tr>
  </tbody>
</table>
```

Output:
```
┌────────┬───────┬─────┐
│Product │Price  │Qty  │
├────────┼───────┼─────┤
│Widget  │$9.99  │2    │
│Gadget  │$19.99 │1    │
└────────┴───────┴─────┘
```

---

## Utility Elements

### Horizontal Rule

```tsx
<hr width={40} color="gray" char="─" />
```

### Line Break

```tsx
<br />
```

---

## Colors

Supports multiple formats:

| Format | Example |
|--------|---------|
| Named | `red`, `cyan`, `brightgreen`, `coral` |
| Hex 3-digit | `#f00` |
| Hex 6-digit | `#ff0000` |
| Hex 8-digit (alpha) | `#ff000080` |
| RGB | `rgb(255, 0, 0)` |
| RGBA | `rgba(255, 0, 0, 0.5)` |
| Percent | `rgb(100%, 0%, 0%)` |

### Named Colors (60+)

`black`, `red`, `green`, `yellow`, `blue`, `magenta`, `cyan`, `white`, `gray`, `brightred`, `brightgreen`, `brightyellow`, `brightblue`, `brightmagenta`, `brightcyan`, `brightwhite`, `orange`, `pink`, `purple`, `brown`, `lime`, `teal`, `navy`, `olive`, `maroon`, `aqua`, `silver`, `gold`, `coral`, `salmon`, `violet`, `indigo`, `turquoise`, `crimson`, `khaki`, `plum`, `orchid`, `tan`, `beige`, `ivory`, `azure`, `lavender`, `mint`, `rose`, `slate`, `charcoal`, `transparent`

---

## Keyboard Navigation

| Key | Action |
|-----|--------|
| `Tab` | Focus next element |
| `Shift+Tab` | Focus previous element |
| `↑` `↓` | Scroll / Navigate in lists |
| `←` `→` | Move cursor in inputs |
| `Enter` / `Space` | Activate button, toggle checkbox, open select |
| `Esc` | Close dropdown / Exit |
| `Ctrl+R` | Toggle resize mode |
| `Ctrl+M` | Toggle move mode |
| `q` | Quit |

### Custom Keybinds

```tsx
import { registerGlobalKeybind } from "tui-kit"

registerGlobalKeybind({
  key: "s",
  ctrl: true,
  handler: () => saveDocument()
})
```

---

## Mouse Support

Mouse is automatically enabled with SGR 1006 extended encoding.

| Action | Behavior |
|--------|----------|
| Click | Focus element, activate button |
| Hover | Highlight hoverable elements |
| Drag on edges | Resize (if `resizable` enabled) |
| Drag on header | Move (if `movable` enabled) |
| Scroll wheel | Scroll content |

---

## Basic Example

```tsx
import { run, createElement } from "tui-kit"

const App = () => (
  <box border="rounded" padding={2} bg="#1a1a2e">
    <box color="#ff6b6b" bold>Welcome to TUI Kit!</box>
    <hr color="gray" />
    <input placeholder="Enter your name..." width={30} />
    <button onClick={() => console.log("Hello!")}>
      Say Hello
    </button>
  </box>
)

const exit = run(<App />)
process.on("SIGINT", () => { exit(); process.exit() })
```

---

## Running

```bash
# Build the library
npm run build

# Run the demo
npx tsx test/demo.tsx
```

Press `Esc` or `q` to exit.
