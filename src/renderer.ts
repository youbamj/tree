import type { RenderTreeOptions, TreeNode } from "./types.js";

const DEFAULT_RENDER_OPTIONS: Required<RenderTreeOptions> = {
  labelKey: "name",
  childrenKey: "children",
  rootMarker: "·",
  indent: "    ",
  branch: "├── ",
  lastBranch: "└── ",
  vertical: "│   ",
  sanitizeLabels: true,
};

function asRecord(value: object): Record<string, unknown> {
  return value as Record<string, unknown>;
}

function stripAnsiSequences(value: string): string {
  let output = "";

  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);

    // CSI escape sequence: ESC [ ... final-byte
    if (code === 0x1b && value.charCodeAt(i + 1) === 0x5b) {
      i += 2;
      while (i < value.length) {
        const next = value.charCodeAt(i);
        if (next >= 0x40 && next <= 0x7e) {
          break;
        }
        i += 1;
      }
      continue;
    }

    output += value[i] ?? "";
  }

  return output;
}

function sanitizeControlCharacters(value: string): string {
  let output = "";

  for (const char of value) {
    const code = char.charCodeAt(0);
    if (code < 32 || code === 127) {
      output += `\\x${code.toString(16).padStart(2, "0")}`;
      continue;
    }

    output += char;
  }

  return output;
}

function sanitizeLabel(label: string): string {
  return sanitizeControlCharacters(stripAnsiSequences(label));
}

function readChildren<T extends object>(node: T, childrenKey: string): T[] {
  const value = asRecord(node)[childrenKey];
  return Array.isArray(value) ? (value as T[]) : [];
}

function readLabel<T extends object>(node: T, labelKey: string, sanitize: boolean): string {
  const value = asRecord(node)[labelKey];
  const label = value == null ? "" : String(value);
  return sanitize ? sanitizeLabel(label) : label;
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
    row += readLabel(node, options.labelKey, options.sanitizeLabels);
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
