import type { RenderTreeOptions, TreeNode } from "./types.js";

const DEFAULT_RENDER_OPTIONS: Required<RenderTreeOptions> = {
  labelKey: "name",
  childrenKey: "children",
  rootMarker: "·",
  indent: "    ",
  branch: "├── ",
  lastBranch: "└── ",
  vertical: "│   ",
};

function asRecord(value: object): Record<string, unknown> {
  return value as Record<string, unknown>;
}

function readChildren<T extends object>(node: T, childrenKey: string): T[] {
  const value = asRecord(node)[childrenKey];
  return Array.isArray(value) ? (value as T[]) : [];
}

function readLabel<T extends object>(node: T, labelKey: string): string {
  const value = asRecord(node)[labelKey];
  return value == null ? "" : String(value);
}

function walk<T extends object>(
  nodes: T[],
  options: Required<RenderTreeOptions>,
  parentLastFlags: boolean[],
  out: string[],
): void {
  for (const [i, node] of nodes.entries()) {
    const isLast = i === nodes.length - 1;

    let row = "";
    for (const parentIsLast of parentLastFlags) {
      row += parentIsLast ? options.indent : options.vertical;
    }

    row += isLast ? options.lastBranch : options.branch;
    row += readLabel(node, options.labelKey);
    out.push(row);

    const children = readChildren(node, options.childrenKey);
    if (children.length > 0) {
      walk(children, options, [...parentLastFlags, isLast], out);
    }
  }
}

export function getTreeLines<T extends object>(
  data: T[] = [],
  renderOptions: RenderTreeOptions = {},
): string[] {
  const options = { ...DEFAULT_RENDER_OPTIONS, ...renderOptions };
  if (data.length === 0) return [];

  const lines: string[] = [options.rootMarker];
  walk(data, options, [], lines);
  return lines;
}

export function getStringTree<T extends object>(
  data: T[] = [],
  renderOptions: RenderTreeOptions = {},
): string {
  return getTreeLines(data, renderOptions).join("\n");
}

export type { TreeNode };
