import type { Stats } from "node:fs";
import { lstat, readFile, readdir, realpath } from "node:fs/promises";
import path from "node:path";
import createIgnore, { type Ignore } from "ignore";
import type { GetFileTreeOptions, SortOrder, TreeNode } from "./types.js";

interface InternalOptions {
  rootDir: string;
  maxDepth?: number;
  includeHidden: boolean;
  followSymlinks: boolean;
  sort: SortOrder;
  ignorePatterns: string[];
  gitignoreMatcher?: Ignore;
  maxNodes?: number;
  nodeCount: number;
  visited: Set<string>;
}

const DEFAULT_MAX_NODES = 10_000;

function normalizeSlashes(input: string): string {
  return input.replace(/\\/g, "/");
}

function parseIgnore(ignore?: string | string[]): string[] {
  if (!ignore) return [];
  const list = Array.isArray(ignore) ? ignore : ignore.split(",");
  return list
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => normalizeSlashes(item.replace(/\/$/, "")));
}

function normalizeMaxNodes(maxNodes: number): number | undefined {
  if (maxNodes === -1) return undefined;
  if (!Number.isInteger(maxNodes) || maxNodes < 1) {
    throw new Error("maxNodes must be a positive integer or -1 to disable the cap");
  }
  return maxNodes;
}

function shouldIgnoreByPatterns(
  relativePath: string,
  baseName: string,
  ignorePatterns: string[],
): boolean {
  if (ignorePatterns.length === 0) return false;

  const rel = normalizeSlashes(relativePath);
  for (const pattern of ignorePatterns) {
    if (pattern.includes("/")) {
      if (rel === pattern || rel.startsWith(`${pattern}/`)) {
        return true;
      }
      continue;
    }

    if (baseName === pattern) {
      return true;
    }
  }

  return false;
}

function shouldIgnoreByGitignore(
  relativePath: string,
  isDirectory: boolean,
  gitignoreMatcher?: Ignore,
): boolean {
  if (!gitignoreMatcher || relativePath === "") {
    return false;
  }

  if (gitignoreMatcher.ignores(relativePath)) {
    return true;
  }

  if (isDirectory && gitignoreMatcher.ignores(`${relativePath}/`)) {
    return true;
  }

  return false;
}

async function loadGitignore(rootDir: string, enabled: boolean): Promise<Ignore | undefined> {
  if (!enabled) {
    return undefined;
  }

  try {
    const gitignorePath = path.join(rootDir, ".gitignore");
    const content = await readFile(gitignorePath, "utf8");
    const gitignoreMatcher = createIgnore();
    gitignoreMatcher.add(content);
    return gitignoreMatcher;
  } catch {
    return undefined;
  }
}

function compareNames(a: string, b: string, sort: SortOrder): number {
  if (sort === "none") return 0;
  const result = a.localeCompare(b);
  return sort === "desc" ? -result : result;
}

async function buildNode(
  absolutePath: string,
  depth: number,
  options: InternalOptions,
): Promise<TreeNode | null> {
  let stats: Stats;
  try {
    stats = await lstat(absolutePath);
  } catch (error) {
    if (depth === 1) {
      throw error;
    }
    return null;
  }

  const relativePath = normalizeSlashes(path.relative(options.rootDir, absolutePath));
  const name = path.basename(absolutePath);
  const isDirectory = stats.isDirectory();

  if (!options.includeHidden && name.startsWith(".")) {
    return null;
  }

  if (shouldIgnoreByPatterns(relativePath, name, options.ignorePatterns)) {
    return null;
  }

  if (shouldIgnoreByGitignore(relativePath, isDirectory, options.gitignoreMatcher)) {
    return null;
  }

  if (options.maxNodes !== undefined && options.nodeCount >= options.maxNodes) {
    return null;
  }

  const node: TreeNode = {
    name,
    path: absolutePath,
    type: isDirectory ? "directory" : stats.isSymbolicLink() ? "symlink" : "file",
  };

  options.nodeCount += 1;

  if (options.maxDepth !== undefined && depth >= options.maxDepth) {
    return node;
  }

  const shouldTraverseDirectory = isDirectory;
  const shouldTraverseSymlink = stats.isSymbolicLink() && options.followSymlinks;

  if (!shouldTraverseDirectory && !shouldTraverseSymlink) {
    return node;
  }

  let targetPath = absolutePath;
  if (shouldTraverseSymlink) {
    try {
      targetPath = await realpath(absolutePath);
    } catch {
      return node;
    }

    if (options.visited.has(targetPath)) {
      return node;
    }
    options.visited.add(targetPath);
  }

  let entries: string[];
  try {
    entries = await readdir(targetPath);
  } catch {
    return node;
  }

  entries = [...entries].sort((a, b) => compareNames(a, b, options.sort));

  const children: TreeNode[] = [];
  for (const entry of entries) {
    const childPath = path.join(targetPath, entry);
    const child = await buildNode(childPath, depth + 1, options);
    if (child) {
      children.push(child);
    }
  }

  if (children.length > 0) {
    node.children = children;
  }

  return node;
}

export async function getFileTree({
  dir,
  ignore,
  level,
  includeHidden = true,
  followSymlinks = false,
  sort = "asc",
  gitignore = true,
  maxNodes = DEFAULT_MAX_NODES,
}: GetFileTreeOptions): Promise<TreeNode[]> {
  const rootDir = path.resolve(process.cwd(), dir);
  const ignorePatterns = parseIgnore(ignore);
  const gitignoreMatcher = await loadGitignore(rootDir, gitignore);

  const options: InternalOptions = {
    rootDir,
    maxDepth: level,
    includeHidden,
    followSymlinks,
    sort,
    ignorePatterns,
    gitignoreMatcher,
    maxNodes: normalizeMaxNodes(maxNodes),
    nodeCount: 0,
    visited: new Set<string>(),
  };

  const rootNode = await buildNode(rootDir, 1, options);
  return rootNode ? [rootNode] : [];
}
