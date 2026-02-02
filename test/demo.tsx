/** @jsxRuntime classic */
/** @jsx createElement */
/** @jsxFrag Fragment */
/**
 * TUI Kit Demo - Multi-page app with routing
 */

import {
  createApp,
  createElement,
  Fragment,
  useState,
  useNavigation,
  KeyEvent,
} from "../src";
// Provide compatibility for JSX runtime
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

// Home Page
const HomePage = () => {
  const { navigate } = useNavigation();

  return (
    <box
      width="100%"
      height="100%"
      flexDirection="column"
      padding={1}
      bg="#1a1a2e"
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
      <box flexDirection="column" padding={[2, 0]} gap={1} width="100%">
        <text color="#16c79a">Welcome to TUI Kit!</text>
        <text color="#48dbfb">A terminal UI framework with JSX support.</text>
        <br />
        <text bold color="#feca57">
          Features:
        </text>
        <box padding={[0, 0, 0, 2]}>
          <text color="#fff">• Multi-page routing with navigation</text>
        </box>
        <box padding={[0, 0, 0, 2]}>
          <text color="#fff">• Flex layout engine</text>
        </box>
        <box padding={[0, 0, 0, 2]}>
          <text color="#fff">• Form inputs (text, password, email, etc.)</text>
        </box>
        <box padding={[0, 0, 0, 2]}>
          <text color="#fff">• Scrollable containers & pages</text>
        </box>
        <box padding={[0, 0, 0, 2]}>
          <text color="#fff">• Mouse support (click, scroll, drag)</text>
        </box>
        <box padding={[0, 0, 0, 2]}>
          <text color="#fff">
            • Full keyboard navigation (Tab, arrows, etc.)
          </text>
        </box>
        <br />
        <text bold color="#feca57">
          Navigate to:
        </text>
        <button
          border="rounded"
          borderColor="#16c79a"
          padding={[0, 2]}
          width={25}
          textAlign="center"
          onClick={() => navigate("/settings")}
        >
          <text color="#16c79a">→ Settings Page</text>
        </button>
        <button
          border="rounded"
          borderColor="#ff9ff3"
          padding={[0, 2]}
          width={25}
          textAlign="center"
          onClick={() => navigate("/about")}
        >
          <text color="#ff9ff3">→ About Page</text>
        </button>
      </box>

      {/* Footer */}
      <box width="100%" flexDirection="column" padding={[2, 0, 0, 0]}>
        <text dim color="#666" textAlign="center">
          Tab to navigate • Enter/Space to activate • q/Esc exit
        </text>
      </box>
    </box>
  );
};

// Settings Page
const SettingsPage = () => {
  const { navigate } = useNavigation();
  const [username, setUsername] = useState("alice");
  const [theme, setTheme] = useState("dark");

  return (
    <box
      width="100%"
      height="100%"
      flexDirection="column"
      padding={1}
      bg="#1a1a2e"
    >
      {/* Header */}
      <box border="rounded" borderColor="#e94560" padding={[0, 2]} width="100%">
        <box flexDirection="row" justifyContent="center" width="100%">
          <text bold color="#e94560">
            Settings
          </text>
        </box>
      </box>

      {/* Settings form */}
      <box flexDirection="column" padding={[2, 0]} gap={1} width="100%">
        <text bold color="#16c79a">
          User Settings
        </text>
        <br />

        <text color="#feca57">Username:</text>
        <input
          id="settings-username"
          name="username"
          value={username}
          placeholder="Enter username"
          border="single"
          borderColor="#48dbfb"
          padding={[0, 1]}
          width={30}
          onInput={setUsername}
        />

        <text color="#feca57">Theme:</text>
        <box flexDirection="row" gap={2}>
          <button
            border={theme === "dark" ? "double" : "single"}
            borderColor={theme === "dark" ? "#16c79a" : "#666"}
            padding={[0, 2]}
            onClick={() => setTheme("dark")}
          >
            <text color={theme === "dark" ? "#16c79a" : "#fff"}>Dark</text>
          </button>
          <button
            border={theme === "light" ? "double" : "single"}
            borderColor={theme === "light" ? "#feca57" : "#666"}
            padding={[0, 2]}
            onClick={() => setTheme("light")}
          >
            <text color={theme === "light" ? "#feca57" : "#fff"}>Light</text>
          </button>
        </box>

        <br />
        <text dim color="#666">
          Current: {username} ({theme} theme)
        </text>
      </box>

      {/* Navigation buttons */}
      <box flexDirection="column" gap={1} padding={[2, 0, 0, 0]}>
        <button
          border="rounded"
          borderColor="#54a0ff"
          padding={[0, 2]}
          width={20}
          textAlign="center"
          onClick={() => navigate("/")}
        >
          <text color="#54a0ff">← Back to Home</text>
        </button>
      </box>

      {/* Footer */}
      <box width="100%" flexDirection="column" padding={[2, 0, 0, 0]}>
        <text dim color="#666" textAlign="center">
          Tab to navigate • Enter/Space to activate • q/Esc exit
        </text>
      </box>
    </box>
  );
};

// About Page
const AboutPage = () => {
  const { navigate } = useNavigation();

  return (
    <box
      width="100%"
      height="100%"
      flexDirection="column"
      padding={1}
      bg="#1a1a2e"
    >
      {/* Header */}
      <box border="rounded" borderColor="#e94560" padding={[0, 2]} width="100%">
        <box flexDirection="row" justifyContent="center" width="100%">
          <text bold color="#e94560">
            About
          </text>
        </box>
      </box>

      {/* About content */}
      <box flexDirection="column" padding={[2, 0]} gap={1} width="100%">
        <text bold color="#16c79a">
          About TUI Kit
        </text>
        <br />

        <text color="#fff">
          TUI Kit is a modern terminal UI framework for building interactive
          command-line applications with JSX.
        </text>
        <br />

        <text bold color="#feca57">
          Key Features:
        </text>
        <box padding={[0, 0, 0, 2]}>
          <text color="#fff">• JSX-based component system</text>
        </box>
        <box padding={[0, 0, 0, 2]}>
          <text color="#fff">• Flexbox layout engine</text>
        </box>
        <box padding={[0, 0, 0, 2]}>
          <text color="#fff">• Full keyboard & mouse support</text>
        </box>
        <box padding={[0, 0, 0, 2]}>
          <text color="#fff">• Routing for multi-page apps</text>
        </box>
        <box padding={[0, 0, 0, 2]}>
          <text color="#fff">• Hooks (useState)</text>
        </box>
        <br />

        <text bold color="#feca57">
          Components:
        </text>
        <box padding={[0, 0, 0, 2]}>
          <text color="#fff">• Box, Text, Input, Button</text>
        </box>
        <box padding={[0, 0, 0, 2]}>
          <text color="#fff">• Textbox, Select, Checkbox</text>
        </box>
        <box padding={[0, 0, 0, 2]}>
          <text color="#fff">• Form, Table, List</text>
        </box>
      </box>

      {/* Navigation buttons */}
      <box flexDirection="column" gap={1} padding={[2, 0, 0, 0]}>
        <button
          border="rounded"
          borderColor="#ff9ff3"
          padding={[0, 2]}
          width={20}
          textAlign="center"
          onClick={() => navigate("/")}
        >
          <text color="#ff9ff3">← Back to Home</text>
        </button>
      </box>

      {/* Footer */}
      <box width="100%" flexDirection="column" padding={[2, 0, 0, 0]}>
        <text dim color="#666" textAlign="center">
          Tab to navigate • Enter/Space to activate • q/Esc exit
        </text>
      </box>
    </box>
  );
};

// Initialize app with routes
const app = createApp(() => <box />, {
  routes: {
    routes: [
      { path: "/", component: HomePage },
      { path: "/settings", component: SettingsPage },
      { path: "/about", component: AboutPage },
    ],
    initialPath: "/",
  },
});

const input = app.getInput();
input.on("keypress", (key: KeyEvent) => {
  const formatted = formatKey(key);
  const fn = setLastKey as ((value: string) => void) | null;
  fn?.(formatted);
});

const exit = () => app.exit();

// Handle process exit
process.on("SIGINT", () => {
  exit();
  process.exit(0);
});
