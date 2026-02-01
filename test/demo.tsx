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
 * Interactive terminal shopping website demo using tui-kit
 * Showcases grid layout flexbox and interactive elements
 */

import { run, createElement, Fragment } from "../src";

const products = [
  { id: 1, name: "Pro Keyboard", price: 149.99, color: "#ff6b6b" },
  { id: 2, name: "Ultra Mouse", price: 89.99, color: "#4ecdc4" },
  { id: 3, name: "4K Monitor", price: 399.99, color: "#45b7d1" },
  { id: 4, name: "Headphones", price: 199.99, color: "#96ceb4" },
  { id: 5, name: "Webcam Kit", price: 129.99, color: "#ffeaa7" },
  { id: 6, name: "Desk Mat", price: 29.99, color: "#dfe6e9" },
];

const ProductCard = ({ product }: { product: (typeof products)[0] }) => (
  <box
    id={`card_${product.id}`}
    border="single"
    borderColor={product.color}
    padding={1}
    width={28}
    hoverBg="#1a1a2e"
  >
    <box color={product.color} bold>
      {product.name}
    </box>
    <box color="#888">${product.price.toFixed(2)}</box>
    <button
      id={`add_${product.id}`}
      bg={product.color}
      color="#000"
      onClick={() => console.log(`Added ${product.name}`)}
    >
      Add to Cart
    </button>
  </box>
);

const Header = () => (
  <box flexDirection="row" justifyContent="space-between" padding={[0, 1]}>
    <box flexDirection="row" gap={1}>
      <box color="#e94560" bold>
        Terminal
      </box>
      <box color="#fff" bold underline>
        Shop
      </box>
    </box>
    <box color="#888">Tab: Navigate | Enter: Select | Esc: Exit</box>
  </box>
);

const ProductGrid = () => (
  <box display="grid" gridTemplateColumns="1fr 1fr 1fr" gap={1}>
    {products.map((p) => (
      <ProductCard product={p} />
    ))}
  </box>
);

const CartPanel = () => (
  <box width={25} border="double" borderColor="#ffa502" padding={1}>
    <box color="#ffa502" bold>
      Your Cart
    </box>
    <hr color="#444" />
    <box color="#888" dim italic>
      Empty cart
    </box>
    <hr color="#444" />
    <button id="checkout" bg="#2ed573" color="#000">
      Checkout
    </button>
  </box>
);

const App = () => (
  <box bg="#0f0f1a" color="#eee" padding={1}>
    <Header />
    <hr color="#333" />
    <box flexDirection="row" gap={2} padding={[1, 0]}>
      <box flex={1}>
        <box color="#dfe6e9" bold>
          Featured Products
        </box>
        <ProductGrid />
      </box>
      <CartPanel />
    </box>
    <box bg="#1a1a2e" padding={[0, 1]}>
      <box color="#636e72" dim>
        Hotkeys: 1-6 Add to cart | C: Checkout | Q: Quit
      </box>
    </box>
  </box>
);

const exit = run(<App />);

process.on("SIGINT", () => {
  exit();
  process.exit();
});
