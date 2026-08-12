---
title: The Joy of a Markdown-Powered Blog
date: '2026-08-11'
description: Static blog workflow — write MD locally, push, auto-deploy. Everything is a file.
tags: [Static Blog, Workflow, Writing]
---

## Content is files

Every post on this blog is a plain `.md` file. No database, no admin panel, no login — a file is a draft, a folder is an archive.

```
src/content/posts/
├── zh/          # Chinese posts
└── en/          # English posts
```

## Publishing flow

```bash
# 1. Create a post
touch src/content/posts/en/my-post.md
# 2. Write Markdown (title/date/tags in frontmatter)
# 3. Push
git add . && git commit -m "post: title" && git push
# 4. Build & deploy happen automatically
```

## Why I love this

- **Versioned**: every post has git history — see what changed, roll back anytime
- **Searchable**: `grep` beats any on-site search engine
- **Zero lock-in**: if you ever outgrow this framework, the Markdown files move with you
- **Focused writing**: no rich-text editor distractions — just a cursor and plain text

Ten years from now, these `.md` files will still be readable. That is the confidence of "Mingzhi."

## Extended syntax

This blog supports some Markdown extensions (full list in [docs/markdown-extensions.md](https://github.com/quanming1/minimal-blog/blob/main/docs/markdown-extensions.md)):

> [!TIP]
> Tip: start a blockquote with `> [!TIP]` for a callout — supported types are `NOTE` / `TIP` / `IMPORTANT` / `WARNING` / `CAUTION`.

> [!IMPORTANT]
> Use `IMPORTANT` for things that matter: e.g. "decide what you want to say before you start writing."

> [!WARNING]
> Warnings work the same way; the type carries the semantics.

Inline `==highlights==` mark key points, like "the joy of writing is ==building up, one post at a time==."

Terms can be written as definition lists (term line followed by `: definition` lines):

Mingzhi
: From the Zhuge Liang line "without indifference there is no clear aspiration", the name and the stance of this blog.
: Simply put: a clear ambition.

Subscripts and superscripts suit formulas and units: water is H_{2}O, and E=mc^{2}.
