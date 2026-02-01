/**
 *   ▄████████  ▄██████▄     ▄████████  ▄█        ▄██████▄   ▄██████▄     ▄███████▄
 *  ███    ███ ███    ███   ███    ███ ███       ███    ███ ███    ███   ███    ███
 *  ███    █▀  ███    ███   ███    ███ ███       ███    ███ ███    ███   ███    ███
 * ▄███▄▄▄     ███    ███  ▄███▄▄▄▄██▀ ███       ███    ███ ███    ███   ███    ███
 *▀▀███▀▀▀     ███    ███ ▀▀███▀▀▀▀▀   ███       ███    ███ ███    ███ ▀█████████▀
 *  ███        ███    ███ ▀███████████ ███       ███    ███ ███    ███   ███
 *  ███        ███    ███   ███    ███ ███▌    ▄ ███    ███ ███    ███   ███
 *  ███         ▀██████▀    ███    ███ █████▄▄██  ▀██████▀   ▀██████▀   ▄████▀
 *                          ███    ███ ▀
 *
 * Demonstration script showing scrollable colored text using tsx component syntax
 * Generates two hundred lines and manages signal interrupts for cleanup
 */

import { run, createElement } from "../src";

const palette = ["brightgreen", "brightyellow", "brightcyan"];

const rows = Array.from({ length: 200 }, (_, index) => (
  <span>
    <text color={palette[index % palette.length]}>
      Line {index + 1} — sample content to demonstrate scrolling
    </text>
    {"\n"}
  </span>
));

const exit = run(
  <box width={70} pad={1}>
    <text color="magenta">
      tui-kit demo — navigate with ↑/↓/PgUp/PgDn. Press q/esc/Ctrl+C to exit.
    </text>
    {"\n\n"}
    {rows}
  </box>,
);

process.on("SIGINT", () => {
  exit();
  process.exit();
});
