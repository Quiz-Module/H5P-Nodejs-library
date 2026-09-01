# Duplicate H5P Content in the Frontend (Using Existing Routes)

This document explains how to duplicate an H5P content item using only the existing REST routes exposed by the example server.

## Summary

You can duplicate content by:

1. Fetching the full content data.
2. Rewriting any content file paths so the server copies the files from the original content.
3. Posting the content data as a new item.

## Routes Used

- `GET /h5p/:contentId/edit`
- `POST /h5p/`

## Flow

1. Fetch the original content data from `GET /h5p/:contentId/edit`.
2. If the content uses files, rewrite file paths in `params` to use the special copy pattern.
3. Create the duplicate by posting to `POST /h5p/` with the same library and parameters.

## Why Path Rewriting Is Required

When the server saves content, it will copy files from another content item only if the file path is a **relative path** in the format:

- `../content/<sourceContentId>/<path>`

Example:

- `../content/123/images/pic.png`

If you do not rewrite file paths, the new content will reference files that are not owned by the new content id.

## Example (Frontend)

```ts
const sourceId = "123";

// 1) fetch source content
const source = await fetch(`/h5p/${sourceId}/edit`).then((r) => r.json());

// 2) rewrite file paths so the server copies files
const rewrittenParams = rewriteContentFilePaths(
  source.params,
  (path) => `../content/${sourceId}/${path}`
);

// 3) create new content
const result = await fetch(`/h5p/`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    library: source.library,
    params: {
      metadata: {
        ...source.metadata,
        title: `${source.metadata.title} (Copy)`
      },
      params: rewrittenParams
    }
  })
}).then((r) => r.json());

console.log("New content id:", result.contentId);
```

## Helper: Rewrite Content File Paths

This helper does a deep traversal of the params and rewrites any string that looks like a relative content file path (e.g. `images/pic.png`, `videos/clip.mp4`).

```ts
function rewriteContentFilePaths(
  params: any,
  rewrite: (p: string) => string
): any {
  if (Array.isArray(params)) {
    return params.map((v) => rewriteContentFilePaths(v, rewrite));
  }

  if (params && typeof params === "object") {
    const next: any = {};
    for (const [k, v] of Object.entries(params)) {
      next[k] = rewriteContentFilePaths(v, rewrite);
    }
    return next;
  }

  if (typeof params === "string") {
    if (looksLikeContentFilePath(params)) {
      return rewrite(params);
    }
  }

  return params;
}

function looksLikeContentFilePath(path: string): boolean {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return false;
  }

  if (path.startsWith("../content/")) {
    return false;
  }

  // Simple heuristic: has a file extension and no leading slash
  return /^[^/][^?]*\.[a-zA-Z0-9]{2,5}$/.test(path);
}
```

## Notes

- If the content has **no files**, you can skip the rewrite step and just POST the data from `/edit`.
- The duplication flow assumes the logged-in user has permission to view the original content and create new content.
- For large content, this is still fast because file copying happens on the server side.
