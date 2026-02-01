# tui-kit

Minimal terminal UI toolkit with a tiny JSX-style `<text>` tag parser and a fast scrollable renderer.

Quick start

- Install dev dependencies: `npm install`
- Run demo: `npm run demo`
- Or run the compiled demo after build: `node dist/test/demo.js`

The demo uses `ts-node` to run `test/demo.tsx` directly and demonstrates color and scrolling.

API

- `parseJsx(source: string)` — parse `<text>` blocks into segments
- `renderLines(source, width?)` — produce wrapped, styled lines
- `createElement` and `Fragment` — TSX factories
- `run(source)` — start interactive demo (returns cleanup function)
