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
});
