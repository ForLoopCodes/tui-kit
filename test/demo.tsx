/** @jsxRuntime classic */
/** @jsx createElement */
/** @jsxFrag Fragment */
/**
 * TUI Kit Demo - Showcases colors, buttons, inputs, and layout
 */

import { createApp, createElement, Fragment, useState, KeyEvent } from "../src";
// Provide compatibility for JSX runtime (some runners emit React.createElement)
(globalThis as any).React = { createElement, Fragment };

const formatKey = (key: KeyEvent): string => {
  const parts: string[] = [];
  if (key.ctrl) parts.push("Ctrl");
  if (key.alt) parts.push("Alt");
  if (key.shift) parts.push("Shift");

  let name = key.name || key.char || "";
  if (name === "space") name = "Space";
  if (name === "escape") name = "Esc";
  if (name === "return") name = "Enter";
  if (name) {
    parts.push(
      name.length === 1
        ? name.toUpperCase()
        : name[0].toUpperCase() + name.slice(1),
    );
  }

  return parts.length > 0 ? parts.join("+") : "Unknown";
};

let setLastKey: ((value: string) => void) | null = null;
let setPageScroll:
  | ((value: number | ((prev: number) => number)) => void)
  | null = null;

// Demo App Component
const App = () => {
  const [lastKey, setLastKeyState] = useState("");
  const [pageScroll, setPageScrollState] = useState(0);
  setLastKey = setLastKeyState;
  setPageScroll = setPageScrollState;

  return (
    <box
      id="page"
      width="100%"
      height="100%"
      flexDirection="column"
      padding={1}
      bg="#1a1a2e"
      overflow="scroll"
      scrollY={pageScroll}
      scrollbarColor="#16c79a"
      scrollbarTrackColor="#0f3460"
    >
      {/* Header */}
      <box border="rounded" borderColor="#e94560" padding={[0, 2]} width="100%">
        <box flexDirection="row" justifyContent="center" width="100%">
          <text bold color="#e94560">
            TUI Kit
          </text>
        </box>
      </box>

      {/* Main content */}
      <box flexDirection="row" gap={2} padding={[1, 0]} width="100%">
        {/* Left column - Colors */}
        <box
          border="single"
          borderColor="#0f3460"
          padding={1}
          width="30%"
          flexDirection="column"
        >
          <text bold underline color="#16c79a">
            Colors
          </text>
          <br />
          <text color="#ff6b6b">● Red</text>
          <text color="#feca57">● Yellow</text>
          <text color="#48dbfb">● Cyan</text>
          <text color="#ff9ff3">● Pink</text>
          <text color="#54a0ff">● Blue</text>
          <text color="#5f27cd">● Purple</text>
          <text color="rgb(46, 213, 115)">● RGB Green</text>
          <text color="hsl(280, 100%, 70%)">● HSL Purple</text>
        </box>

        {/* Middle column - Form elements */}
        <box
          border="single"
          borderColor="#0f3460"
          padding={1}
          width="40%"
          flexDirection="column"
        >
          <text bold underline color="#16c79a">
            Form Elements
          </text>
          <br />

          <text color="#888">Name:</text>
          <input
            id="name"
            tabIndex={1}
            placeholder="Enter your name..."
            width={30}
            bg="#2d2d44"
          />
          <br />

          <text color="#888">Email:</text>
          <input
            id="email"
            tabIndex={2}
            placeholder="Enter email..."
            type="email"
            width={30}
            bg="#2d2d44"
          />
          <br />

          <text color="#888">Password:</text>
          <input
            id="password"
            tabIndex={3}
            placeholder="Enter password..."
            type="password"
            width={30}
            bg="#2d2d44"
          />
          <br />

          <box flexDirection="row" gap={2}>
            <button
              id="submit"
              tabIndex={4}
              bg="#e94560"
              focusBg="#ff6b6b"
              width={12}
              onClick={() => {}}
            >
              Submit
            </button>
            <button
              id="cancel"
              tabIndex={5}
              bg="#0f3460"
              focusBg="#16537e"
              width={12}
            >
              Cancel
            </button>
          </box>

          <br />
          <text bold underline color="#16c79a">
            Key Pressed
          </text>
          <box
            border="single"
            borderColor="#0f3460"
            padding={[0, 1]}
            width="100%"
          >
            <text color="#feca57">{lastKey || "Press any key..."}</text>
          </box>
        </box>

        {/* Right column - Text styles */}
        <box
          border="single"
          borderColor="#0f3460"
          padding={1}
          width="30%"
          flexDirection="column"
        >
          <text bold underline color="#16c79a">
            Text Styles
          </text>
          <br />
          <text bold>Bold text</text>
          <text italic>Italic text</text>
          <text underline>Underlined text</text>
          <text strikethrough>Strikethrough</text>
          <text dim>Dimmed text</text>
          <text bold italic color="#feca57">
            Bold + Italic
          </text>
          <text bold underline color="#48dbfb">
            Bold + Underlined
          </text>

          <br />
          <text bold underline color="#16c79a">
            Scrollable Panel
          </text>
          <box
            id="scroll-panel"
            tabIndex={6}
            focusable
            border="single"
            borderColor="#0f3460"
            padding={[0, 1]}
            height={8}
            overflow="scroll"
            scrollbarColor="#feca57"
            scrollbarTrackColor="#2d2d44"
          >
            <text color="#888">Use ↑/↓ or PgUp/PgDn</text>
            <text color="#888">to scroll this panel.</text>
            <text>• Item 01</text>
            <text>• Item 02</text>
            <text>• Item 03</text>
            <text>• Item 04</text>
            <text>• Item 05</text>
            <text>• Item 06</text>
            <text>• Item 07</text>
            <text>• Item 08</text>
            <text>• Item 09</text>
            <text>• Item 10</text>
            <text>• Item 11</text>
            <text>• Item 12</text>
            <text>• Item 13</text>
            <text>• Item 14</text>
          </box>
        </box>
      </box>

      {/* Table section */}
      <box
        border="single"
        borderColor="#0f3460"
        padding={1}
        width="100%"
        flexDirection="column"
      >
        <text bold underline color="#16c79a">
          Sample Data
        </text>
        <br />
        <box flexDirection="row" gap={4}>
          <text color="#888" width={15}>
            Product
          </text>
          <text color="#888" width={10}>
            Price
          </text>
          <text color="#888" width={10}>
            Stock
          </text>
        </box>
        <hr color="#333" width={45} />
        <box flexDirection="row" gap={4}>
          <text width={15}>Widget Pro</text>
          <text color="#54a0ff" width={10}>
            $29.99
          </text>
          <text color="#16c79a" width={10}>
            ✓ In Stock
          </text>
        </box>
        <box flexDirection="row" gap={4}>
          <text width={15}>Gadget Plus</text>
          <text color="#54a0ff" width={10}>
            $49.99
          </text>
          <text color="#16c79a" width={10}>
            ✓ In Stock
          </text>
        </box>
        <box flexDirection="row" gap={4}>
          <text width={15}>Super Thing</text>
          <text color="#54a0ff" width={10}>
            $99.99
          </text>
          <text color="#ff6b6b" width={10}>
            ✗ Out
          </text>
        </box>
      </box>

      {/* Long content for page scrolling */}
      <box
        border="single"
        borderColor="#0f3460"
        padding={1}
        width="100%"
        flexDirection="column"
      >
        <text bold underline color="#16c79a">
          Long Content
        </text>
        <text dim color="#888">
          Ctrl+↑/↓ scrolls the whole page
        </text>
        <br />
        <text>• Scroll demo line 01</text>
        <text>• Scroll demo line 02</text>
        <text>• Scroll demo line 03</text>
        <text>• Scroll demo line 04</text>
        <text>• Scroll demo line 05</text>
        <text>• Scroll demo line 06</text>
        <text>• Scroll demo line 07</text>
        <text>• Scroll demo line 08</text>
        <text>• Scroll demo line 09</text>
        <text>• Scroll demo line 10</text>
        <text>• Scroll demo line 11</text>
        <text>• Scroll demo line 12</text>
        <text>• Scroll demo line 13</text>
        <text>• Scroll demo line 14</text>
        <text>• Scroll demo line 15</text>
        <text>• Scroll demo line 16</text>
        <text>• Scroll demo line 17</text>
        <text>• Scroll demo line 18</text>
        <text>• Scroll demo line 19</text>
        <text>• Scroll demo line 20</text>
      </box>

      {/* Footer */}
      <box
        width="100%"
        flexDirection="row"
        justifyContent="center"
        padding={[1, 0]}
      >
        <text dim color="#666">
          Tab to navigate • Enter/Space to activate • Ctrl+↑/↓ page scroll •
          q/Esc exit
        </text>
      </box>
    </box>
  );
};

// Run the demo (pass App function, not <App /> to preserve hooks context)
const app = createApp(App);
const input = app.getInput();
input.on("keypress", (key: KeyEvent) => {
  const formatted = formatKey(key);
  if (setLastKey) {
    setLastKey(formatted);
  }
});
const exit = () => app.exit();

// Handle process exit
process.on("SIGINT", () => {
  exit();
  process.exit(0);
});
