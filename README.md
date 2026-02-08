# shirhatti.github.io

Personal blog built with React, TypeScript, and xterm.js.

## Development

```bash
nix develop
bun dev
```

## Adding Posts

Create a markdown file in `posts/YYYY/MM/DD-slug.md` with YAML frontmatter:

```markdown
---
title: My New Post
date: 2025-02-07
tags:
  - example
excerpt: A short description of the post
---

Post content here...
```

Posts are automatically loaded and sorted by date.
