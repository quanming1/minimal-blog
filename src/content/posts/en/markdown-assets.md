---
title: 'Attachments in Posts: Markdown Asset Reference'
date: '2026-08-13'
description: 'A new "asset reference" syntax lets posts include downloadable files with image previews — one click to download or view the source on GitHub.'
tags: [Markdown, Blog, Engineering]
---

Today I added a new syntax to this blog: **asset reference**. Posts can now attach companion files — sample code, templates, images, archives — right in the body. Readers download them in one click, or jump to GitHub to view the source.

## The syntax

A regular blockquote whose first line is `[!asset]` followed by the file path:

> [!asset] markdown-assets/markdown-cheatsheet.md
> A one-page Markdown cheatsheet covering the basics plus this blog's extensions — handy while writing.

The rendered card shows the file name plus two links: "↓ 下载" (download) and "GitHub". Files live under the site's asset directory, so the links are directly downloadable.

## Images get a preview

When the path ends with an image extension, the card shows a lazy-loaded preview on top:

> [!asset] markdown-assets/asset-demo.svg
> A demo SVG that exercises the image preview feature.

## How to use it

Asset files live under `public/assets/`, one directory per post:

```
public/assets/<post-slug>/<filename>
```

The referenced path is the part relative to `public/assets/`. A few conventions:

- Lowercase kebab-case file names, no spaces
- No `..` in paths (directory traversal is rejected)
- Image extensions (png / jpg / gif / svg etc.) automatically get a preview; other types are download-only

## More extensions

> [!TIP]
> For the complete list and the developer guide, see [docs/markdown-extensions.md](https://github.com/quanming1/minimal-blog/blob/main/docs/markdown-extensions.md).

==Asset reference== is just the newest one. The blog already supports five kinds of ==callouts== (as above), definition lists (`Term` + `: Def`), and sub/superscripts (H_{2}O, E=mc^{2}) — all through the same Markdown pipeline, so the writing experience stays consistent.
