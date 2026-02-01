import { renderLines, createElement } from "../src";

console.log("Starting Debug...");

try {
  const node = createElement("box", { width: 20, height: 5, bg: "red", color: "white" }, "Hello World");
  console.log("Node created:", JSON.stringify(node, null, 2));

  const lines = renderLines(node, 40, 10);
  console.log("Rendered lines:");
  lines.forEach(line => console.log(`[${line}]`));
} catch (e) {
  console.error("Error:", e);
}

console.log("Done.");
