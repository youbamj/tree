#!/usr/bin/env node
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { Command, InvalidOptionArgumentError } from "commander";
import { type SortOrder, getFileTree, getStringTree } from "./index.js";

type ColorName = "white" | "red" | "green" | "yellow" | "blue" | "magenta" | "cyan" | "gray";

const COLOR_CODES: Record<ColorName, string> = {
  white: "\u001b[37m",
  red: "\u001b[31m",
  green: "\u001b[32m",
  yellow: "\u001b[33m",
  blue: "\u001b[34m",
  magenta: "\u001b[35m",
  cyan: "\u001b[36m",
  gray: "\u001b[90m",
};

const RESET = "\u001b[0m";
const VERSION = "0.1.0";

function applyColor(text: string, color: string, enabled: boolean): string {
  if (!enabled) return text;
  const normalized = (color || "white") as ColorName;
  const code = COLOR_CODES[normalized] ?? COLOR_CODES.white;
  return `${code}${text}${RESET}`;
}

function parseDepth(value: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new InvalidOptionArgumentError("depth must be a positive integer");
  }
  return parsed;
}

function parseSort(value: string): SortOrder {
  if (value === "asc" || value === "desc" || value === "none") {
    return value;
  }
  throw new InvalidOptionArgumentError("sort must be one of: asc, desc, none");
}

function parseMaxNodes(value: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || (parsed < 1 && parsed !== -1)) {
    throw new InvalidOptionArgumentError("max-nodes must be a positive integer or -1");
  }
  return parsed;
}

function collectIgnore(value: string, previous: string[]): string[] {
  const parsed = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return [...previous, ...parsed];
}

function normalizeOutput(content: string, filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  if (ext === ".md") {
    return `\
\`\`\`text
${content}
\`\`\`
`;
  }
  return content;
}

const program = new Command();

program
  .name("ytree")
  .description("Render directory trees from the terminal")
  .version(VERSION, "-v, --version", "Show version")
  .argument("[directory]", "Directory to render", ".")
  .option("-d, --dir <path>", "Directory to render (overrides positional arg)")
  .option("-o, --out <file>", "Write output to a file")
  .option(
    "-i, --ignore <pattern>",
    "Ignore basename or relative path (repeatable and comma-separated)",
    collectIgnore,
    [] as string[],
  )
  .option("-l, --depth <n>", "Max depth (root is level 1)", parseDepth)
  .option("--no-hidden", "Exclude hidden files/folders")
  .option("--follow-symlinks", "Traverse symbolic links", false)
  .option("--no-gitignore", "Do not respect .gitignore rules")
  .option("--sort <mode>", "Sorting mode", parseSort, "asc" as SortOrder)
  .option("--max-nodes <n>", "Maximum number of nodes to include", parseMaxNodes)
  .option("--json", "Print JSON tree", false)
  .option("-c, --color [name]", "Output color", "white")
  .option("--no-color", "Disable color output")
  .action(async (directory: string, options) => {
    const dir = options.dir ?? directory;

    const treeData = await getFileTree({
      dir,
      ignore: options.ignore,
      level: options.depth,
      includeHidden: options.hidden,
      followSymlinks: options.followSymlinks,
      gitignore: options.gitignore,
      sort: options.sort,
      maxNodes: options.maxNodes,
    });

    const rendered = options.json ? JSON.stringify(treeData, null, 2) : getStringTree(treeData);

    const colorEnabled = Boolean(options.color) && !options.json;
    const colorName = typeof options.color === "string" ? options.color : "white";
    const output = applyColor(rendered, colorName, colorEnabled);

    console.log(output);

    if (options.out) {
      const fileContent = normalizeOutput(rendered, options.out);
      await writeFile(options.out, fileContent, "utf8");
    }
  });

program.parseAsync(process.argv).catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`[ERR] ${message}\n`);
  process.exit(1);
});
