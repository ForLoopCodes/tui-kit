/**
 * Router - Simple routing system for multi-page tui-kit apps
 */

import { VNode } from './elements';

export interface Route {
  path: string;
  component: () => VNode;
}

export interface RouterConfig {
  routes: Route[];
  initialPath?: string;
}

let currentPath: string = '/';
let routeMap: Map<string, () => VNode> = new Map();
let navigationCallback: ((path: string) => void) | null = null;

/**
 * Initialize the router with routes
 */
export function initRouter(config: RouterConfig): void {
  routeMap.clear();

  for (const route of config.routes) {
    routeMap.set(route.path, route.component);
  }

  currentPath = config.initialPath || '/';
}

/**
 * Navigate to a path
 */
export function navigate(path: string): boolean {
  if (!routeMap.has(path)) {
    console.warn(`Route not found: ${path}`);
    return false;
  }

  currentPath = path;
  navigationCallback?.(path);
  return true;
}

/**
 * Get the current path
 */
export function getCurrentPath(): string {
  return currentPath;
}

/**
 * Render the current route
 */
export function renderCurrentRoute(): VNode | null {
  const component = routeMap.get(currentPath);
  if (!component) {
    return null;
  }

  return component();
}

/**
 * Get the component function for the current route
 */
export function getCurrentComponent(): (() => VNode) | null {
  return routeMap.get(currentPath) || null;
}

/**
 * Set navigation callback (called by app)
 */
export function setNavigationCallback(callback: (path: string) => void): void {
  navigationCallback = callback;
}

/**
 * Get all registered routes
 */
export function getRoutes(): string[] {
  return Array.from(routeMap.keys());
}
