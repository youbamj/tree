import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { $ } from "bun";

async function createCliFixture(): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), "tree-cli-test-"));
  await mkdir(path.join(dir, "src"));
  await mkdir(path.join(dir, "node_modules"));
  await writeFile(path.join(dir, "src", "index.ts"), "export {}", "utf8");
  await writeFile(path.join(dir, "node_modules", "pkg.js"), "", "utf8");
  await writeFile(path.join(dir, ".gitignore"), "node_modules\n", "utf8");
  return dir;
}

function rootChildNamesFromJson(output: string): string[] {
  const parsed = JSON.parse(output) as Array<{ children?: Array<{ name: string }> }>;
  const root = parsed[0];
  if (!root?.children) {
    return [];
  }
  return root.children.map((child) => child.name);
}

describe("ytree CLI", () => {
  test("outputs JSON and respects .gitignore by default", async () => {
    const fixtureDir = await createCliFixture();

    const output = await $`bun run src/cli.ts --json ${fixtureDir}`.text();
    const childNames = rootChildNamesFromJson(output);

    expect(childNames).toContain("src");
    expect(childNames).not.toContain("node_modules");
  });

  test("supports --no-gitignore", async () => {
    const fixtureDir = await createCliFixture();

    const output = await $`bun run src/cli.ts --json --no-gitignore ${fixtureDir}`.text();
    const childNames = rootChildNamesFromJson(output);

    expect(childNames).toContain("src");
    expect(childNames).toContain("node_modules");
  });

  test("writes markdown output with --out", async () => {
    const fixtureDir = await createCliFixture();
    const outFile = path.join(fixtureDir, "tree.md");

    await $`bun run src/cli.ts ${fixtureDir} --out ${outFile} --no-color`.quiet();

    const fileContent = await readFile(outFile, "utf8");
    expect(fileContent.startsWith("```text\n")).toBe(true);
    expect(fileContent.includes("src")).toBe(true);
  });

  test("supports --max-nodes", async () => {
    const fixtureDir = await createCliFixture();

    const output =
      await $`bun run src/cli.ts --json --no-gitignore --sort none --max-nodes 2 ${fixtureDir}`.text();
    const childNames = rootChildNamesFromJson(output);

    expect(childNames).toHaveLength(1);
  });

  test("supports --max-nodes -1 to disable cap", async () => {
    const fixtureDir = await createCliFixture();

    const output =
      await $`bun run src/cli.ts --json --no-gitignore --sort none --max-nodes -1 ${fixtureDir}`.text();
    const childNames = rootChildNamesFromJson(output);

    expect(childNames.length).toBeGreaterThan(1);
  });
});
