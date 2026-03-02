import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { getFileTree } from "../src/fs-tree.js";

async function createFixture(withGitignore = false): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), "tree-test-"));
  await mkdir(path.join(dir, "src"));
  await mkdir(path.join(dir, "src", "nested"));
  await mkdir(path.join(dir, "node_modules"));
  await writeFile(path.join(dir, "package.json"), "{}", "utf8");
  await writeFile(path.join(dir, ".env"), "SECRET=1", "utf8");
  await writeFile(path.join(dir, "src", "index.ts"), "export {}", "utf8");
  await writeFile(path.join(dir, "src", "nested", "a.ts"), "export const a = 1", "utf8");
  await writeFile(path.join(dir, "node_modules", "x.js"), "", "utf8");

  if (withGitignore) {
    await mkdir(path.join(dir, "dist"));
    await writeFile(path.join(dir, "dist", "bundle.js"), "", "utf8");
    await writeFile(path.join(dir, ".gitignore"), "node_modules\ndist\n", "utf8");
  }

  return dir;
}

async function createSymlinkFixture(): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), "tree-symlink-test-"));
  const targetDir = path.join(dir, "target");
  const linkDir = path.join(dir, "linked-target");

  await mkdir(targetDir);
  await writeFile(path.join(targetDir, "hello.txt"), "hello", "utf8");

  const linkType = process.platform === "win32" ? "junction" : "dir";
  await symlink(targetDir, linkDir, linkType);

  return dir;
}

describe("getFileTree", () => {
  test("builds tree and respects ignore + level", async () => {
    const fixtureDir = await createFixture();

    const tree = await getFileTree({
      dir: fixtureDir,
      ignore: ["node_modules"],
      level: 2,
    });

    expect(tree).toHaveLength(1);
    expect(tree[0]?.name).toBe(path.basename(fixtureDir));

    const children = tree[0]?.children ?? [];
    const childNames = children.map((c) => c.name);

    expect(childNames).toContain("src");
    expect(childNames).toContain("package.json");
    expect(childNames).not.toContain("node_modules");

    const src = children.find((c) => c.name === "src");
    expect(src?.children).toBeUndefined();
  });

  test("can skip hidden files", async () => {
    const fixtureDir = await createFixture();

    const tree = await getFileTree({
      dir: fixtureDir,
      includeHidden: false,
    });

    const children = tree[0]?.children ?? [];
    const childNames = children.map((c) => c.name);

    expect(childNames).not.toContain(".env");
  });

  test("respects .gitignore by default", async () => {
    const fixtureDir = await createFixture(true);

    const tree = await getFileTree({ dir: fixtureDir });
    const children = tree[0]?.children ?? [];
    const childNames = children.map((c) => c.name);

    expect(childNames).not.toContain("node_modules");
    expect(childNames).not.toContain("dist");
  });

  test("can disable .gitignore support", async () => {
    const fixtureDir = await createFixture(true);

    const tree = await getFileTree({
      dir: fixtureDir,
      gitignore: false,
    });

    const children = tree[0]?.children ?? [];
    const childNames = children.map((c) => c.name);

    expect(childNames).toContain("node_modules");
    expect(childNames).toContain("dist");
  });

  test("does not traverse symlink directories by default", async () => {
    const fixtureDir = await createSymlinkFixture();

    const tree = await getFileTree({
      dir: fixtureDir,
      sort: "none",
    });

    const children = tree[0]?.children ?? [];
    const linked = children.find((child) => child.name === "linked-target");

    expect(linked?.type).toBe("symlink");
    expect(linked?.children).toBeUndefined();
  });

  test("traverses symlink directories when followSymlinks is true", async () => {
    const fixtureDir = await createSymlinkFixture();

    const tree = await getFileTree({
      dir: fixtureDir,
      followSymlinks: true,
      sort: "none",
    });

    const children = tree[0]?.children ?? [];
    const linked = children.find((child) => child.name === "linked-target");

    expect(linked?.type).toBe("symlink");
    expect(linked?.children?.map((child) => child.name)).toContain("hello.txt");
  });

  test("supports maxNodes to cap traversal", async () => {
    const fixtureDir = await createFixture();

    const tree = await getFileTree({
      dir: fixtureDir,
      gitignore: false,
      maxNodes: 2,
      sort: "none",
    });

    expect(tree).toHaveLength(1);

    const root = tree[0];
    const rootChildren = root?.children ?? [];

    // One slot is used by root itself, so only one child should be included.
    expect(rootChildren.length).toBe(1);
  });

  test("supports maxNodes=-1 to disable cap", async () => {
    const fixtureDir = await createFixture();

    const tree = await getFileTree({
      dir: fixtureDir,
      gitignore: false,
      maxNodes: -1,
      sort: "none",
    });

    const rootChildren = tree[0]?.children ?? [];
    expect(rootChildren.length).toBeGreaterThan(1);
  });
});
