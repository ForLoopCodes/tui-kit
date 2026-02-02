/**
 * JSX Elements and Virtual DOM
 * Provides createElement, Fragment, and intrinsic element types
 */

/**
 * Style properties shared by all elements
 */
export interface StyleProps {
  // Identification
  id?: string;

  // Sizing
  width?: number | string;
  height?: number | string;
  minWidth?: number | string;
  maxWidth?: number | string;
  minHeight?: number | string;
  maxHeight?: number | string;

  // Colors
  color?: string;
  bg?: string;

  // Text formatting
  bold?: boolean;
  dim?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  inverse?: boolean;

  // Border
  border?: 'none' | 'single' | 'double' | 'rounded' | 'bold' | 'dashed';
  borderColor?: string;

  // Spacing
  padding?: number | number[];
  margin?: number | number[];

  // Layout
  display?: 'block' | 'flex' | 'grid' | 'none';
  flexDirection?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
  flexWrap?: 'nowrap' | 'wrap' | 'wrap-reverse';
  justifyContent?: 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly';
  alignItems?: 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline';
  gap?: number;

  // Grid
  gridTemplateColumns?: string;
  gridTemplateRows?: string;
  gridGap?: number;

  // Text alignment
  textAlign?: 'left' | 'center' | 'right';

  // Positioning
  position?: 'relative' | 'absolute' | 'fixed';
  top?: number | string;
  right?: number | string;
  bottom?: number | string;
  left?: number | string;

  // Overflow
  overflow?: 'visible' | 'hidden' | 'scroll';
  scrollX?: number;
  scrollY?: number;
  scrollbarColor?: string;
  scrollbarTrackColor?: string;

  // Interactivity
  focusable?: boolean;
  tabIndex?: number;
  resizable?: boolean;
  movable?: boolean;
  disabled?: boolean;

  // Focus styles
  focusBg?: string;
  hoverBg?: string;

  // Events
  onFocus?: () => void;
  onBlur?: () => void;
  onClick?: () => void;
  onKeypress?: (key: any) => void;
}

/**
 * Input element props
 */
export interface InputProps extends StyleProps {
  name?: string;
  value?: string;
  placeholder?: string;
  type?: 'text' | 'password' | 'email' | 'number';
  onInput?: (value: string) => void;
  onSubmit?: (value: string) => void;
  onChange?: (value: string) => void;
}

/**
 * Textbox (multiline) props
 */
export interface TextboxProps extends StyleProps {
  name?: string;
  value?: string;
  placeholder?: string;
  onInput?: (value: string) => void;
}

/**
 * Button props
 */
export interface ButtonProps extends StyleProps {
  type?: 'button' | 'submit';
}

/**
 * Select props
 */
export interface SelectProps extends StyleProps {
  name?: string;
  value?: string;
  onChange?: (value: string) => void;
}

/**
 * Option props
 */
export interface OptionProps {
  value: string;
  children?: any;
}

/**
 * Checkbox props
 */
export interface CheckboxProps extends StyleProps {
  name?: string;
  checked?: boolean;
  label?: string;
  onChange?: (checked: boolean) => void;
}

/**
 * Form props
 */
export interface FormProps extends StyleProps {
  onSubmit?: (data: Record<string, any>) => void;
}

/**
 * Table props
 */
export interface TableProps extends StyleProps { }

/**
 * HR props
 */
export interface HrProps extends StyleProps {
  char?: string;
}

/**
 * Virtual DOM Node
 */
export interface VNode {
  type: string | Function;
  props: Record<string, any>;
  children: VNode[] | VNode | string | number | null;
  key?: string | number;
}

/**
 * JSX element types
 */
export type Child = VNode | string | number | boolean | null | undefined | Child[];

/**
 * Create a virtual DOM element
 */
export function createElement(
  type: string | Function,
  props: Record<string, any> | null,
  ...children: any[]
): VNode {
  // Flatten and filter children
  const flatChildren = flattenChildren(children);

  return {
    type,
    props: props || {},
    children: flatChildren.length === 0 ? null : flatChildren.length === 1 ? flatChildren[0] : flatChildren,
  };
}

/**
 * Flatten and filter children array
 */
function flattenChildren(children: any[]): any[] {
  const result: any[] = [];
  for (const child of children) {
    if (child === null || child === undefined || child === false || child === true) {
      continue;
    }
    if (Array.isArray(child)) {
      result.push(...flattenChildren(child));
    } else {
      result.push(child);
    }
  }
  return result;
}

/**
 * Fragment component
 */
export function Fragment(props: { children?: any }): VNode {
  return {
    type: 'fragment',
    props: {},
    children: props.children ?? null,
  };
}

/**
 * Render a VNode tree, handling function components
 */
export function renderVNode(node: VNode | string | number | null): VNode | string | number | null {
  if (node === null || typeof node === 'string' || typeof node === 'number') {
    return node;
  }

  // Handle function components
  if (typeof node.type === 'function') {
    const result = node.type({ ...node.props, children: node.children });
    return renderVNode(result);
  }

  // Handle fragments
  if (node.type === 'fragment') {
    return {
      type: 'box',
      props: {},
      children: node.children,
    };
  }

  // Recursively render children
  if (Array.isArray(node.children)) {
    return {
      ...node,
      children: node.children.map(renderVNode).filter((c) => c !== null) as any,
    };
  } else if (node.children && typeof node.children === 'object' && 'type' in node.children) {
    return {
      ...node,
      children: renderVNode(node.children as VNode),
    };
  }

  return node;
}

/**
 * JSX namespace for TypeScript
 */
declare global {
  namespace JSX {
    interface Element extends VNode { }

    interface IntrinsicElements {
      box: StyleProps & { children?: Child };
      text: StyleProps & { children?: Child };
      input: InputProps;
      textbox: TextboxProps;
      button: ButtonProps & { children?: Child };
      select: SelectProps & { children?: Child };
      option: OptionProps;
      checkbox: CheckboxProps;
      form: FormProps & { children?: Child };
      ul: StyleProps & { children?: Child };
      ol: StyleProps & { children?: Child };
      li: StyleProps & { children?: Child };
      table: TableProps & { children?: Child };
      thead: StyleProps & { children?: Child };
      tbody: StyleProps & { children?: Child };
      tr: StyleProps & { children?: Child };
      th: StyleProps & { children?: Child };
      td: StyleProps & { children?: Child };
      hr: HrProps;
      br: {};
    }

    interface ElementChildrenAttribute {
      children: {};
    }
  }
}

/**
 * State management hook (simple implementation)
 */
let currentComponent: { states: any[]; stateIndex: number } | null = null;
let rerenderCallback: (() => void) | null = null;

export function setRerenderCallback(callback: () => void): void {
  rerenderCallback = callback;
}

/**
 * useState hook
 */
export function useState<T>(initialValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  if (!currentComponent) {
    throw new Error('useState must be called within a component');
  }

  const component = currentComponent;
  const index = component.stateIndex++;

  // Initialize state if needed
  if (component.states.length <= index) {
    component.states.push(initialValue);
  }

  const setState = (value: T | ((prev: T) => T)) => {
    const newValue = typeof value === 'function' ? (value as (prev: T) => T)(component.states[index]) : value;
    if (component.states[index] !== newValue) {
      component.states[index] = newValue;
      rerenderCallback?.();
    }
  };

  return [component.states[index], setState];
}

/**
 * Create a component context for hooks
 */
export function createComponentContext(): { states: any[]; stateIndex: number } {
  return { states: [], stateIndex: 0 };
}

/**
 * Run a function component with hooks context
 */
export function runWithHooks<T>(
  context: { states: any[]; stateIndex: number },
  fn: () => T
): T {
  const prev = currentComponent;
  currentComponent = context;
  context.stateIndex = 0;

  try {
    return fn();
  } finally {
    currentComponent = prev;
  }
}
