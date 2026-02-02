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
 * Showcases grid layout, flexbox, focus navigation, and interactive elements
 */

import { run, createElement, Fragment } from "../src";

// Product data
const products = [
  { id: 1, name: "Pro Keyboard", price: 149.99, color: "#ff6b6b" },
  { id: 2, name: "Ultra Mouse", price: 89.99, color: "#4ecdc4" },
  { id: 3, name: "4K Monitor", price: 399.99, color: "#45b7d1" },
  { id: 4, name: "Headphones", price: 199.99, color: "#96ceb4" },
  { id: 5, name: "Webcam Kit", price: 129.99, color: "#ffeaa7" },
  { id: 6, name: "Desk Mat", price: 29.99, color: "#dfe6e9" },
];

// Cart state
type CartItem = { id: number; name: string; price: number; qty: number };
let cart: CartItem[] = [];
let redraw: () => void = () => {};

function addToCart(product: typeof products[0]) {
  const existing = cart.find((i) => i.id === product.id);
  if (existing) {
    existing.qty++;
  } else {
    cart.push({ id: product.id, name: product.name, price: product.price, qty: 1 });
  }
  redraw();
}

function getCartTotal(): string {
  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  return `$${total.toFixed(2)}`;
}

function getCartCount(): number {
  return cart.reduce((sum, item) => sum + item.qty, 0);
}

// Components
const ProductCard = ({ product }: { product: typeof products[0] }) => (
  <box
    id={`card_${product.id}`}
    border="single"
    borderColor={product.color}
    padding={1}
    width={26}
  >
    <box color={product.color} bold>
      {product.name}
    </box>
    <box color="#888">${product.price.toFixed(2)}</box>
    <button
      id={`add_${product.id}`}
      bg={product.color}
      color="#000"
      hoverBg="#fff"
      hoverColor="#000"
      focusBg="#fff"
      focusColor="#000"
      onClick={() => addToCart(product)}
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
    <box color="#666">Tab: Navigate | Enter: Select | Q: Quit</box>
  </box>
);

const ProductGrid = () => (
  <box display="grid" gridTemplateColumns="1fr 1fr 1fr" gap={1}>
    {products.map((p) => (
      <ProductCard product={p} />
    ))}
  </box>
);

const CartItem = ({ item }: { item: CartItem }) => (
  <box flexDirection="row" justifyContent="space-between">
    <box color="#dfe6e9">
      {item.qty}x {item.name.slice(0, 10)}
    </box>
    <box color="#888">${(item.price * item.qty).toFixed(2)}</box>
  </box>
);

const CartPanel = () => (
  <box width={28} border="double" borderColor="#ffa502" padding={1}>
    <box color="#ffa502" bold>
      🛒 Cart ({getCartCount()})
    </box>
    <hr color="#444" />
    {cart.length === 0 ? (
      <box color="#666" italic>
        Empty cart
      </box>
    ) : (
      <box>
        {cart.map((item) => (
          <CartItem item={item} />
        ))}
      </box>
    )}
    <hr color="#444" />
    <box flexDirection="row" justifyContent="space-between">
      <box color="#fff" bold>
        Total:
      </box>
      <box color="#2ed573" bold>
        {getCartTotal()}
      </box>
    </box>
    <box padding={[1, 0, 0, 0]}>
      <button
        id="checkout"
        bg="#2ed573"
        color="#000"
        hoverBg="#7bed9f"
        focusBg="#fff"
        focusColor="#2ed573"
        onClick={() => {
          if (cart.length > 0) {
            cart = [];
            redraw();
          }
        }}
      >
        Checkout
      </button>
    </box>
  </box>
);

const App = () => (
  <box bg="#0f0f1a" color="#eee" padding={1}>
    <Header />
    <hr color="#333" />
    <box flexDirection="row" gap={2} padding={[1, 0]}>
      <box flex={1}>
        <box color="#dfe6e9" bold padding={[0, 0, 1, 0]}>
          Featured Products
        </box>
        <ProductGrid />
      </box>
      <CartPanel />
    </box>
    <box bg="#1a1a2e" padding={[1, 1]}>
      <box color="#636e72">
        Press Tab to navigate • Enter/Space to select • Q to quit
      </box>
    </box>
  </box>
);

// Run the app
const exit = run(<App />, {
  onBeforeRender: (_tree: any, draw: () => void) => {
    redraw = draw;
  },
});

process.on("SIGINT", () => {
  exit();
  process.exit();
});
