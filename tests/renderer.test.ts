import { describe, expect, test } from "bun:test";
import { getStringTree } from "../src/renderer.js";

describe("getStringTree", () => {
  test("renders default tree structure", () => {
    const value = getStringTree([
      {
        name: "done",
        children: [{ name: "hiking" }, { name: "camping" }],
      },
      {
        name: "todo",
        children: [{ name: "surfing" }],
      },
    ]);

    expect(value).toBe(`·
├── done
│   ├── hiking
│   └── camping
└── todo
    └── surfing`);
  });

  test("supports custom key names", () => {
    const value = getStringTree(
      [
        {
          title: "root",
          items: [{ title: "child" }],
        },
      ],
      {
        labelKey: "title",
        childrenKey: "items",
      },
    );

    expect(value).toBe(`·
└── root
    └── child`);
  });

  test("sanitizes ansi/control characters in labels by default", () => {
    const value = getStringTree([
      {
        name: "\u001b[31mred\u001b[0m\nfile",
      },
    ]);

    expect(value).toBe(`·
└── red\\x0afile`);
  });

  test("can disable label sanitization", () => {
    const value = getStringTree(
      [
        {
          name: "\u001b[31mred\u001b[0m",
        },
      ],
      {
        sanitizeLabels: false,
      },
    );

    expect(value).toContain("\u001b[31mred\u001b[0m");
  });
});
