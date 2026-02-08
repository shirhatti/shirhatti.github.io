---
title: Building a Terminal-Themed Blog
date: 2025-01-15
tags:
  - programming
  - webdev
  - react
excerpt: How I built this blog using React and xterm.js
---

Building a Terminal-Themed Blog
===============================

Tech Stack
----------
  - React + TypeScript
  - Vite (blazing fast builds)
  - xterm.js (terminal emulation)
  - GitHub Pages (hosting)
  - Bun (runtime & package manager)

Why?
----
I wanted a blog that feels native to my workflow. As someone who
lives in the terminal, a traditional blog felt wrong.

The Implementation
------------------
The secret sauce is xterm.js — a full-featured terminal emulator
that runs in the browser. Combined with React for state management
and routing, we get a SPA that feels like a shell session.

Key features:
  * Custom command processor
  * Command history (arrow keys work!)
  * ANSI color support
  * Responsive terminal sizing
  * Bat-style syntax highlighting
