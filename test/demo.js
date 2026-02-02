"use strict";
/**
 * TUI Kit Demo - Showcases colors, buttons, inputs, and layout
 */
Object.defineProperty(exports, "__esModule", { value: true });
const src_1 = require("../src");
// Demo App Component
const App = () => {
    return ((0, src_1.createElement)("box", { width: "100%", height: "100%", flexDirection: "column", padding: 1, bg: "#1a1a2e" },
        (0, src_1.createElement)("box", { border: "rounded", borderColor: "#e94560", padding: [0, 2], width: "100%" },
            (0, src_1.createElement)("box", { flexDirection: "row", justifyContent: "center", width: "100%" },
                (0, src_1.createElement)("text", { bold: true, color: "#e94560" }, "\u2728 TUI Kit Demo \u2728"))),
        (0, src_1.createElement)("box", { flexDirection: "row", gap: 2, padding: [1, 0], width: "100%" },
            (0, src_1.createElement)("box", { border: "single", borderColor: "#0f3460", padding: 1, width: "30%", flexDirection: "column" },
                (0, src_1.createElement)("text", { bold: true, underline: true, color: "#16c79a" }, "Colors"),
                (0, src_1.createElement)("br", null),
                (0, src_1.createElement)("text", { color: "#ff6b6b" }, "\u25CF Red"),
                (0, src_1.createElement)("text", { color: "#feca57" }, "\u25CF Yellow"),
                (0, src_1.createElement)("text", { color: "#48dbfb" }, "\u25CF Cyan"),
                (0, src_1.createElement)("text", { color: "#ff9ff3" }, "\u25CF Pink"),
                (0, src_1.createElement)("text", { color: "#54a0ff" }, "\u25CF Blue"),
                (0, src_1.createElement)("text", { color: "#5f27cd" }, "\u25CF Purple"),
                (0, src_1.createElement)("text", { color: "rgb(46, 213, 115)" }, "\u25CF RGB Green"),
                (0, src_1.createElement)("text", { color: "hsl(280, 100%, 70%)" }, "\u25CF HSL Purple")),
            (0, src_1.createElement)("box", { border: "single", borderColor: "#0f3460", padding: 1, width: "40%", flexDirection: "column" },
                (0, src_1.createElement)("text", { bold: true, underline: true, color: "#16c79a" }, "Form Elements"),
                (0, src_1.createElement)("br", null),
                (0, src_1.createElement)("text", { color: "#888" }, "Name:"),
                (0, src_1.createElement)("input", { id: "name", tabIndex: 1, placeholder: "Enter your name...", width: 30, bg: "#2d2d44" }),
                (0, src_1.createElement)("br", null),
                (0, src_1.createElement)("text", { color: "#888" }, "Email:"),
                (0, src_1.createElement)("input", { id: "email", tabIndex: 2, placeholder: "Enter email...", type: "email", width: 30, bg: "#2d2d44" }),
                (0, src_1.createElement)("br", null),
                (0, src_1.createElement)("text", { color: "#888" }, "Password:"),
                (0, src_1.createElement)("input", { id: "password", tabIndex: 3, placeholder: "Enter password...", type: "password", width: 30, bg: "#2d2d44" }),
                (0, src_1.createElement)("br", null),
                (0, src_1.createElement)("box", { flexDirection: "row", gap: 2 },
                    (0, src_1.createElement)("button", { id: "submit", tabIndex: 4, bg: "#e94560", focusBg: "#ff6b6b", width: 12, onClick: () => { } }, "Submit"),
                    (0, src_1.createElement)("button", { id: "cancel", tabIndex: 5, bg: "#0f3460", focusBg: "#16537e", width: 12 }, "Cancel"))),
            (0, src_1.createElement)("box", { border: "single", borderColor: "#0f3460", padding: 1, width: "30%", flexDirection: "column" },
                (0, src_1.createElement)("text", { bold: true, underline: true, color: "#16c79a" }, "Text Styles"),
                (0, src_1.createElement)("br", null),
                (0, src_1.createElement)("text", { bold: true }, "Bold text"),
                (0, src_1.createElement)("text", { italic: true }, "Italic text"),
                (0, src_1.createElement)("text", { underline: true }, "Underlined text"),
                (0, src_1.createElement)("text", { strikethrough: true }, "Strikethrough"),
                (0, src_1.createElement)("text", { dim: true }, "Dimmed text"),
                (0, src_1.createElement)("text", { bold: true, italic: true, color: "#feca57" }, "Bold + Italic"),
                (0, src_1.createElement)("text", { bold: true, underline: true, color: "#48dbfb" }, "Bold + Underlined"))),
        (0, src_1.createElement)("box", { border: "single", borderColor: "#0f3460", padding: 1, width: "100%", flexDirection: "column" },
            (0, src_1.createElement)("text", { bold: true, underline: true, color: "#16c79a" }, "Sample Data"),
            (0, src_1.createElement)("br", null),
            (0, src_1.createElement)("box", { flexDirection: "row", gap: 4 },
                (0, src_1.createElement)("text", { color: "#888", width: 15 }, "Product"),
                (0, src_1.createElement)("text", { color: "#888", width: 10 }, "Price"),
                (0, src_1.createElement)("text", { color: "#888", width: 10 }, "Stock")),
            (0, src_1.createElement)("hr", { color: "#333", width: 45 }),
            (0, src_1.createElement)("box", { flexDirection: "row", gap: 4 },
                (0, src_1.createElement)("text", { width: 15 }, "Widget Pro"),
                (0, src_1.createElement)("text", { color: "#54a0ff", width: 10 }, "$29.99"),
                (0, src_1.createElement)("text", { color: "#16c79a", width: 10 }, "\u2713 In Stock")),
            (0, src_1.createElement)("box", { flexDirection: "row", gap: 4 },
                (0, src_1.createElement)("text", { width: 15 }, "Gadget Plus"),
                (0, src_1.createElement)("text", { color: "#54a0ff", width: 10 }, "$49.99"),
                (0, src_1.createElement)("text", { color: "#16c79a", width: 10 }, "\u2713 In Stock")),
            (0, src_1.createElement)("box", { flexDirection: "row", gap: 4 },
                (0, src_1.createElement)("text", { width: 15 }, "Super Thing"),
                (0, src_1.createElement)("text", { color: "#54a0ff", width: 10 }, "$99.99"),
                (0, src_1.createElement)("text", { color: "#ff6b6b", width: 10 }, "\u2717 Out"))),
        (0, src_1.createElement)("box", { width: "100%", flexDirection: "row", justifyContent: "center", padding: [1, 0] },
            (0, src_1.createElement)("text", { dim: true, color: "#666" }, "Press Tab to navigate \u2022 Enter/Space to activate \u2022 q or Esc to exit"))));
};
// Run the demo
const exit = (0, src_1.run)((0, src_1.createElement)(App, null));
// Handle process exit
process.on('SIGINT', () => {
    exit();
    process.exit(0);
});
//# sourceMappingURL=demo.js.map