# @youbamj/tree

<p>
  <a href="https://www.npmjs.com/package/%40youbamj%2Ftree">
    <img src="https://img.shields.io/npm/v/%40youbamj%2Ftree" alt="NPM Version" />
  </a>
  <a href="https://www.npmjs.com/package/%40youbamj%2Ftree">
    <img src="https://img.shields.io/npm/l/%40youbamj%2Ftree" alt="License" />
  </a>
</p>

`@youbamj/tree` is a modern TypeScript + Bun package to render directory trees and custom object trees.

- CLI command: `ytree`
- Library functions: `getFileTree()` and `getStringTree()`

## Install

### Install CLI globally

Using npm:

```bash
npm install -g @youbamj/tree
```

Using bun:

```bash
bun add -g @youbamj/tree
```

### Install in your project

Using npm:

```bash
npm install @youbamj/tree
```

Using bun:

```bash
bun add @youbamj/tree
```

## Use in terminal

You can run `ytree` in the shell:

```bash
ytree -d ./src --ignore node_modules,.git --depth 3
```

Example output:

```text
·
└── src
    ├── cli.ts
    ├── fs-tree.ts
    ├── index.ts
    ├── renderer.ts
    └── types.ts
```

## Options

```text
Usage: ytree [options] [directory]

Arguments:
  directory               Directory to render (default: ".")

Options:
  -v, --version           Show version
  -d, --dir <path>        Directory to render (overrides positional arg)
  -o, --out <file>        Write output to a file
  -i, --ignore <pattern>  Ignore basename or relative path (repeatable and comma-separated)
  -l, --depth <n>         Max depth (root is level 1)
  --no-hidden             Exclude hidden files/folders
  --follow-symlinks       Traverse symbolic links
  --no-gitignore          Do not respect .gitignore rules
  --sort <mode>           Sorting mode: asc | desc | none
  --max-nodes <n>         Maximum number of nodes to include (default: 10000, use -1 for no cap)
  --json                  Print JSON tree
  -c, --color [name]      Output color (default: "white")
  --no-color              Disable color output
  -h, --help              Display help
```

## Use in your project

`getFileTree()` uses a default safety cap of `10000` nodes.
Set `maxNodes: -1` to disable the cap.

### 1) Render a directory tree to string

```ts
import { getFileTree, getStringTree } from "@youbamj/tree";

const treeData = await getFileTree({
  dir: "./",
  ignore: ["node_modules", ".git"],
  level: 3,
  includeHidden: false,
  gitignore: true,
  sort: "asc"
});

console.log(getStringTree(treeData));
```

Example output:

```text
·
└── my-project
    ├── package.json
    ├── src
    │   ├── cli.ts
    │   └── index.ts
    └── tsconfig.json
```

Bun ESM script example:

```ts
// scripts/show-tree.ts
import { getFileTree, getStringTree } from "@youbamj/tree";

const data = await getFileTree({ dir: ".", level: 2 });
console.log(getStringTree(data));
```

Run it with:

```bash
bun run scripts/show-tree.ts
```

### 2) Get raw `getFileTree()` JSON result

```ts
import { getFileTree } from "@youbamj/tree";

const treeData = await getFileTree({
  dir: "./src",
  level: 2
});

console.log(JSON.stringify(treeData, null, 2));
```

Example result:

```json
[
  {
    "name": "src",
    "path": "/absolute/path/to/src",
    "type": "directory",
    "children": [
      {
        "name": "cli.ts",
        "path": "/absolute/path/to/src/cli.ts",
        "type": "file"
      },
      {
        "name": "index.ts",
        "path": "/absolute/path/to/src/index.ts",
        "type": "file"
      }
    ]
  }
]
```

### 3) Render custom object trees to string

```ts
import { getStringTree } from "@youbamj/tree";

const output = getStringTree(
  [
    {
      title: "done",
      items: [{ title: "hiking" }, { title: "camping" }]
    }
  ],
  {
    labelKey: "title",
    childrenKey: "items",
    sanitizeLabels: true
  }
);

console.log(output);
```

Example output:

```text
·
└── done
    ├── hiking
    └── camping
```

## Why @youbamj/tree?

- 🌲 Render directory content in a clean tree structure
- 📝 Optionally write output to a file (`--out`)
- 🎨 Colorized CLI output
- 🧩 Convert custom arrays/objects to tree strings
- 🙈 `.gitignore` support by default
- 🔒 Terminal-safe label sanitization by default
- ⚡ TypeScript + Bun friendly

## License

[MIT](./LICENSE)
