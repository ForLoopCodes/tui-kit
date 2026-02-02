/**
 * Layout engine with simplified Flexbox semantics
 * Handles measurement, layout, and positioning
 */

import type { VNode, StyleProps } from './elements';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayoutNode {
  node: VNode;
  rect: Rect;
  children: LayoutNode[];
  scrollX: number;
  scrollY: number;
  contentWidth: number;
  contentHeight: number;
}

export interface LayoutContext {
  parentWidth: number;
  parentHeight: number;
  x: number;
  y: number;
}

/**
 * Parse a size value (number, percentage, or 'auto')
 */
export function parseSize(
  value: number | string | undefined,
  parentSize: number,
  defaultValue: number = 0
): number {
  if (value === undefined || value === 'auto') {
    return defaultValue;
  }

  if (typeof value === 'number') {
    return Math.floor(value);
  }

  if (typeof value === 'string') {
    if (value.endsWith('%')) {
      const percent = parseFloat(value) / 100;
      return Math.floor(parentSize * percent);
    }
    if (value.endsWith('blocks')) {
      return Math.floor(parseFloat(value));
    }
    const num = parseFloat(value);
    if (!isNaN(num)) {
      return Math.floor(num);
    }
  }

  return defaultValue;
}

/**
 * Parse padding/margin values
 * Accepts: number, [vertical, horizontal], [top, right, bottom, left]
 */
export function parseSpacing(
  value: number | number[] | undefined
): { top: number; right: number; bottom: number; left: number } {
  if (value === undefined) {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }

  if (typeof value === 'number') {
    return { top: value, right: value, bottom: value, left: value };
  }

  if (Array.isArray(value)) {
    if (value.length === 2) {
      return { top: value[0], right: value[1], bottom: value[0], left: value[1] };
    }
    if (value.length === 4) {
      return { top: value[0], right: value[1], bottom: value[2], left: value[3] };
    }
  }

  return { top: 0, right: 0, bottom: 0, left: 0 };
}

/**
 * Get border thickness
 */
export function getBorderThickness(border: string | undefined): number {
  if (!border || border === 'none') return 0;
  return 1;
}

/**
 * Measure the intrinsic size of text content
 */
export function measureText(text: string): { width: number; height: number } {
  const lines = text.split('\n');
  const width = Math.max(...lines.map((l) => textWidth(l)));
  const height = lines.length;
  return { width, height };
}

/**
 * Calculate display width using code points (handles surrogate pairs)
 */
export function textWidth(text: string): number {
  return Array.from(stripAnsi(text)).length;
}

/**
 * Strip ANSI escape codes from a string
 */
export function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

/**
 * Clamp a number between min and max
 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Get text content from a VNode tree
 */
export function getTextContent(node: VNode | string | number): string {
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (!node) return '';

  if (Array.isArray(node.children)) {
    return node.children.map(getTextContent).join('');
  }

  return '';
}

/**
 * Measure a single node's content size
 */
export function measureNode(
  node: VNode,
  ctx: LayoutContext
): { width: number; height: number } {
  const props = node.props as StyleProps;
  const padding = parseSpacing(props.padding);
  const borderSize = getBorderThickness(props.border);

  // Calculate available inner space
  const paddingH = padding.left + padding.right + borderSize * 2;
  const paddingV = padding.top + padding.bottom + borderSize * 2;

  // If explicit size is set, use it
  let width = parseSize(props.width, ctx.parentWidth, 0);
  let height = parseSize(props.height, ctx.parentHeight, 0);

  // Measure children for intrinsic sizing
  if (width === 0 || height === 0) {
    const children = normalizeChildren(node.children);
    const flexDirection = props.flexDirection || 'column';
    const gap = props.gap || 0;

    let contentWidth = 0;
    let contentHeight = 0;

    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const childSize = measureChild(child, {
        parentWidth: ctx.parentWidth - paddingH,
        parentHeight: ctx.parentHeight - paddingV,
        x: 0,
        y: 0,
      });

      if (flexDirection === 'row' || flexDirection === 'row-reverse') {
        contentWidth += childSize.width + (i > 0 ? gap : 0);
        contentHeight = Math.max(contentHeight, childSize.height);
      } else {
        contentWidth = Math.max(contentWidth, childSize.width);
        contentHeight += childSize.height + (i > 0 ? gap : 0);
      }
    }

    if (width === 0) width = contentWidth + paddingH;
    if (height === 0) height = contentHeight + paddingV;
  }

  // Form elements need minimum height if not explicitly set
  const type = node.type;
  const isFormElement = type === 'input' || type === 'textbox' || type === 'button' || type === 'checkbox' || type === 'select';
  const explicitHeight = parseSize(props.height, ctx.parentHeight, 0) > 0;
  if (isFormElement && !explicitHeight && height === 0) {
    height = 1 + paddingV; // 1 line for text + padding
  }

  // Apply min/max constraints
  if (props.minWidth !== undefined) {
    width = Math.max(width, parseSize(props.minWidth, ctx.parentWidth, 0));
  }
  if (props.maxWidth !== undefined) {
    width = Math.min(width, parseSize(props.maxWidth, ctx.parentWidth, Infinity));
  }
  if (props.minHeight !== undefined) {
    height = Math.max(height, parseSize(props.minHeight, ctx.parentHeight, 0));
  }
  if (props.maxHeight !== undefined) {
    height = Math.min(height, parseSize(props.maxHeight, ctx.parentHeight, Infinity));
  }

  return { width, height };
}

/**
 * Measure a child (either VNode or text)
 */
function measureChild(
  child: VNode | string | number,
  ctx: LayoutContext
): { width: number; height: number } {
  if (typeof child === 'string') {
    return measureText(child);
  }
  if (typeof child === 'number') {
    return measureText(String(child));
  }
  return measureNode(child, ctx);
}

/**
 * Normalize children to array
 */
export function normalizeChildren(
  children: VNode['children']
): (VNode | string | number)[] {
  if (!children) return [];
  if (Array.isArray(children)) return children.flat(Infinity).filter((c) => c != null);
  return [children];
}

/**
 * Perform layout calculation for the entire tree
 */
export function layout(
  node: VNode,
  screenWidth: number,
  screenHeight: number
): LayoutNode {
  const ctx: LayoutContext = {
    parentWidth: screenWidth,
    parentHeight: screenHeight,
    x: 0,
    y: 0,
  };

  return layoutNode(node, ctx);
}

/**
 * Layout a single node and its children
 */
function layoutNode(node: VNode, ctx: LayoutContext): LayoutNode {
  const props = node.props as StyleProps;
  const padding = parseSpacing(props.padding);
  const margin = parseSpacing(props.margin);
  const borderSize = getBorderThickness(props.border);

  // Calculate size
  const size = measureNode(node, ctx);
  let { width, height } = size;

  // Handle 100% width/height
  if (props.width === '100%') width = ctx.parentWidth;
  if (props.height === '100%') height = ctx.parentHeight;

  // Calculate position
  let x = ctx.x + margin.left;
  let y = ctx.y + margin.top;

  // Handle absolute/fixed positioning
  if (props.position === 'absolute' || props.position === 'fixed') {
    if (props.left !== undefined) x = parseSize(props.left, ctx.parentWidth, 0);
    if (props.top !== undefined) y = parseSize(props.top, ctx.parentHeight, 0);
    if (props.right !== undefined) {
      x = ctx.parentWidth - width - parseSize(props.right, ctx.parentWidth, 0);
    }
    if (props.bottom !== undefined) {
      y = ctx.parentHeight - height - parseSize(props.bottom, ctx.parentHeight, 0);
    }
  }

  // Layout children
  const children = normalizeChildren(node.children);
  const flexDirection = props.flexDirection || 'column';
  const justifyContent = props.justifyContent || 'flex-start';
  const alignItems = props.alignItems || 'flex-start';
  const gap = props.gap || 0;

  // Inner content area
  const innerX = x + padding.left + borderSize;
  const innerY = y + padding.top + borderSize;
  const innerWidth = width - padding.left - padding.right - borderSize * 2;
  const innerHeight = height - padding.top - padding.bottom - borderSize * 2;

  // Measure all children first
  const childSizes = children.map((child) =>
    measureChild(child, {
      parentWidth: innerWidth,
      parentHeight: innerHeight,
      x: 0,
      y: 0,
    })
  );

  // Calculate total size of children
  const isRow = flexDirection === 'row' || flexDirection === 'row-reverse';
  const totalMainSize = childSizes.reduce(
    (sum, s, i) => sum + (isRow ? s.width : s.height) + (i > 0 ? gap : 0),
    0
  );

  // Calculate starting position based on justifyContent
  let mainPos = 0;
  let mainGap = gap;
  const availableMain = isRow ? innerWidth : innerHeight;
  const freeSpace = availableMain - totalMainSize;

  switch (justifyContent) {
    case 'flex-end':
      mainPos = freeSpace;
      break;
    case 'center':
      mainPos = freeSpace / 2;
      break;
    case 'space-between':
      mainGap = children.length > 1 ? freeSpace / (children.length - 1) + gap : gap;
      break;
    case 'space-around':
      mainGap = freeSpace / children.length;
      mainPos = mainGap / 2;
      break;
    case 'space-evenly':
      mainGap = freeSpace / (children.length + 1);
      mainPos = mainGap;
      break;
  }

  // Layout each child
  const layoutChildren: LayoutNode[] = [];
  let contentWidth = 0;
  let contentHeight = 0;

  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    const childSize = childSizes[i];

    // Calculate cross-axis position based on alignItems
    let crossPos = 0;
    const crossSize = isRow ? childSize.height : childSize.width;
    const availableCross = isRow ? innerHeight : innerWidth;

    switch (alignItems) {
      case 'flex-end':
        crossPos = availableCross - crossSize;
        break;
      case 'center':
        crossPos = (availableCross - crossSize) / 2;
        break;
      case 'stretch':
        // For stretch, we'd modify the child size
        break;
    }

    const childX = isRow ? innerX + mainPos : innerX + crossPos;
    const childY = isRow ? innerY + crossPos : innerY + mainPos;

    if (typeof child === 'string' || typeof child === 'number') {
      // Text node - create a synthetic layout node
      layoutChildren.push({
        node: { type: 'text', props: {}, children: String(child) } as VNode,
        rect: {
          x: childX,
          y: childY,
          width: childSize.width,
          height: childSize.height,
        },
        children: [],
        scrollX: 0,
        scrollY: 0,
        contentWidth: childSize.width,
        contentHeight: childSize.height,
      });
    } else {
      // Recurse for VNode children
      const childLayout = layoutNode(child, {
        parentWidth: innerWidth,
        parentHeight: innerHeight,
        x: childX,
        y: childY,
      });
      layoutChildren.push(childLayout);
    }

    // Track content size
    contentWidth = Math.max(contentWidth, childX - innerX + childSize.width);
    contentHeight = Math.max(contentHeight, childY - innerY + childSize.height);

    // Advance position
    mainPos += (isRow ? childSize.width : childSize.height) + mainGap;
  }

  // Handle reverse directions
  if (flexDirection === 'row-reverse' || flexDirection === 'column-reverse') {
    layoutChildren.reverse();
  }

  const maxScrollX = Math.max(0, contentWidth - Math.max(0, innerWidth));
  const maxScrollY = Math.max(0, contentHeight - Math.max(0, innerHeight));
  const rawScrollX = typeof props.scrollX === 'number' ? props.scrollX : 0;
  const rawScrollY = typeof props.scrollY === 'number' ? props.scrollY : 0;
  const scrollX = clamp(Math.floor(rawScrollX), 0, maxScrollX);
  const scrollY = clamp(Math.floor(rawScrollY), 0, maxScrollY);

  return {
    node,
    rect: { x, y, width, height },
    children: layoutChildren,
    scrollX,
    scrollY,
    contentWidth,
    contentHeight,
  };
}

/**
 * Find a layout node by element ID
 */
export function findById(root: LayoutNode, id: string): LayoutNode | null {
  const props = root.node.props as StyleProps;
  if (props.id === id) return root;

  for (const child of root.children) {
    const found = findById(child, id);
    if (found) return found;
  }

  return null;
}

/**
 * Find all focusable elements in layout order
 */
export function findFocusable(root: LayoutNode): LayoutNode[] {
  const focusable: LayoutNode[] = [];

  function traverse(node: LayoutNode) {
    const props = node.node.props as StyleProps;
    const nodeType = node.node.type as string;

    // Check if focusable
    if (
      props.focusable ||
      props.tabIndex !== undefined ||
      ['input', 'textbox', 'button', 'select', 'checkbox'].includes(nodeType)
    ) {
      focusable.push(node);
    }

    // Traverse children
    for (const child of node.children) {
      traverse(child);
    }
  }

  traverse(root);

  // Sort by tabIndex
  focusable.sort((a, b) => {
    const aIdx = (a.node.props as StyleProps).tabIndex ?? 0;
    const bIdx = (b.node.props as StyleProps).tabIndex ?? 0;
    return aIdx - bIdx;
  });

  return focusable;
}

/**
 * Hit test - find the deepest node at a given position
 */
export function hitTest(root: LayoutNode, x: number, y: number): LayoutNode | null {
  // Check if point is within node bounds
  const { rect } = root;
  if (x < rect.x || x >= rect.x + rect.width || y < rect.y || y >= rect.y + rect.height) {
    return null;
  }

  // Check children (in reverse order for z-ordering)
  for (let i = root.children.length - 1; i >= 0; i--) {
    const hit = hitTest(root.children[i], x, y);
    if (hit) return hit;
  }

  return root;
}
