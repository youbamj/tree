export type NodeType = "file" | "directory" | "symlink";

export interface TreeNode {
  name: string;
  path?: string;
  type?: NodeType;
  children?: TreeNode[];
}

export interface RenderTreeOptions {
  labelKey?: string;
  childrenKey?: string;
  rootMarker?: string;
  indent?: string;
  branch?: string;
  lastBranch?: string;
  vertical?: string;
}

export type SortOrder = "asc" | "desc" | "none";

export interface GetFileTreeOptions {
  dir: string;
  ignore?: string | string[];
  level?: number;
  includeHidden?: boolean;
  followSymlinks?: boolean;
  sort?: SortOrder;
  gitignore?: boolean;
}
