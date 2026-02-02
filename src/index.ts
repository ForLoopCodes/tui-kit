/**
 * tui-kit - A lightweight, composable, JSX/TSX-based terminal UI framework
 */

// Core exports
export { createElement, Fragment, VNode, Child, StyleProps } from './elements';
export { useState, useNavigation, setRerenderCallback } from './elements';

// App runtime
export { run, createApp, renderLines, App, AppConfig } from './app';

// Colors
export {
  parseColor,
  fgColor,
  bgColor,
  blendColors,
  rgbaToHex,
  RGBA,
  RESET,
  STYLES,
  TextStyle,
  styleCode,
} from './colors';

// Layout
export {
  layout,
  parseSize,
  parseSpacing,
  findById,
  findFocusable,
  hitTest,
  LayoutNode,
  Rect,
  LayoutContext,
} from './layout';

// Rendering
export {
  ScreenBuffer,
  renderLayout,
  Cell,
  Terminal,
} from './render';

// Input
export {
  parseKey,
  parseMouse,
  registerGlobalKeybind,
  InputHandler,
  FocusManager,
  KeybindManager,
  MouseManager,
  KeyEvent,
  MouseEvent,
  Keybind,
  MouseRegion,
} from './input';

// Element prop types
export {
  InputProps,
  TextboxProps,
  ButtonProps,
  LinkProps,
  SelectProps,
  OptionProps,
  CheckboxProps,
  FormProps,
  TableProps,
  HrProps,
} from './elements';
