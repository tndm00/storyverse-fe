import { lazy, type ComponentType } from "react";

// React.lazy for modules that use named (not default) exports.
//   lazyNamed(() => import("./pages/HomePage"), "HomePage")
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- ComponentType<any> is required so lazyNamed accepts components with required props (e.g. BrowsePage's lengthMode)
export function lazyNamed<M extends Record<string, ComponentType<any>>, K extends keyof M>(
  factory: () => Promise<M>,
  exportName: K,
) {
  return lazy(() => factory().then((module) => ({ default: module[exportName] })));
}
