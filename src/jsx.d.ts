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
 * JSX intrinsic element typings for all ui elements with css like properties
 * Defines props for box input button select checkbox table and layout elements
 */

import type { VNode } from "./tui"

type StyleProps = {
  color?: string
  bg?: string
  bold?: boolean
  dim?: boolean
  italic?: boolean
  underline?: boolean
  strikethrough?: boolean
  inverse?: boolean
}

type LayoutProps = {
  width?: string | number
  height?: string | number
  minWidth?: number
  maxWidth?: number
  minHeight?: number
  maxHeight?: number
  padding?: number | [number, number] | [number, number, number, number]
  margin?: number | [number, number] | [number, number, number, number]
  position?: "relative" | "absolute" | "fixed"
  top?: number
  left?: number
  right?: number
  bottom?: number
  display?: "block" | "flex" | "grid" | "none"
  flexDirection?: "row" | "column" | "row-reverse" | "column-reverse"
  flexWrap?: "nowrap" | "wrap" | "wrap-reverse"
  justifyContent?: "flex-start" | "flex-end" | "center" | "space-between" | "space-around" | "space-evenly"
  alignItems?: "flex-start" | "flex-end" | "center" | "stretch" | "baseline"
  flex?: number
  gap?: number
  gridTemplateColumns?: string
  gridTemplateRows?: string
  gridGap?: number
  textAlign?: "left" | "center" | "right"
  overflow?: "visible" | "hidden" | "scroll"
  border?: "none" | "single" | "double" | "rounded" | "bold" | "dashed"
  borderColor?: string
  zIndex?: number
}

type InteractiveProps = {
  id?: string
  focusable?: boolean
  tabIndex?: number
  keybind?: string
  resizable?: boolean
  movable?: boolean
  hoverBg?: string
  hoverColor?: string
  focusBg?: string
  focusColor?: string
  onFocus?: () => void
  onBlur?: () => void
  onClick?: () => void
  onKeypress?: (key: string) => void
}

type BoxProps = StyleProps & LayoutProps & InteractiveProps & { children?: any }

type InputProps = StyleProps & LayoutProps & InteractiveProps & {
  name?: string
  value?: string
  placeholder?: string
  type?: "text" | "password" | "email" | "number"
  disabled?: boolean
  onInput?: (value: string) => void
  onSubmit?: (value: string) => void
}

type TextboxProps = StyleProps & LayoutProps & InteractiveProps & {
  name?: string
  value?: string
  placeholder?: string
  disabled?: boolean
  onInput?: (value: string) => void
}

type ButtonProps = StyleProps & LayoutProps & InteractiveProps & {
  disabled?: boolean
  hoverBg?: string
  focusBg?: string
  children?: any
}

type SelectProps = StyleProps & {
  id?: string
  name?: string
  value?: string
  width?: string | number
  disabled?: boolean
  onChange?: (value: string) => void
  children?: any
}

type OptionProps = {
  value?: string
  selected?: boolean
  children?: any
}

type CheckboxProps = StyleProps & {
  id?: string
  name?: string
  checked?: boolean
  label?: string
  disabled?: boolean
  onChange?: (checked: boolean) => void
  children?: any
}

type FormProps = StyleProps & {
  id?: string
  onSubmit?: (data: Record<string, any>) => void
  children?: any
}

type ListProps = StyleProps & {
  id?: string
  children?: any
}

type ListItemProps = StyleProps & {
  children?: any
}

type HrProps = {
  width?: string | number
  color?: string
  char?: string
}

type BrProps = {}

type TableProps = StyleProps & {
  id?: string
  border?: "none" | "single" | "double" | "rounded" | "bold"
  children?: any
}

type TheadProps = { children?: any }
type TbodyProps = { children?: any }
type TrProps = StyleProps & { children?: any }
type ThProps = StyleProps & { width?: number; children?: any }
type TdProps = StyleProps & { width?: number; children?: any }

declare global {
  namespace JSX {
    type Element = VNode
    interface IntrinsicElements {
      box: BoxProps
      text: BoxProps
      span: BoxProps
      input: InputProps
      textbox: TextboxProps
      button: ButtonProps
      select: SelectProps
      option: OptionProps
      checkbox: CheckboxProps
      form: FormProps
      ul: ListProps
      ol: ListProps
      li: ListItemProps
      hr: HrProps
      br: BrProps
      table: TableProps
      thead: TheadProps
      tbody: TbodyProps
      tr: TrProps
      th: ThProps
      td: TdProps
    }
  }
}

export { }
