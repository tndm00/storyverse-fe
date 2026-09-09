import { lazy, type ComponentType } from "react";

// React.lazy for modules that use named (not default) exports.
//   lazyNamed(() => import("./pages/HomePage"), "HomePage")
export function lazyNamed<M extends Record<string, ComponentType<unknown>>, K extends keyof M>(
  factory: () => Promise<M>,
  exportName: K,
) {
  return lazy(() => factory().then((module) => ({ default: module[exportName] })));
}
