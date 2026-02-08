---
title: My Favorite Vim Tips
date: 2025-02-01
tags:
  - vim
  - productivity
excerpt: Productivity tips for Vim users
---

My Favorite Vim Tips
====================

1. Use relative line numbers
   :set relativenumber
   Makes jumping around with [count]j/k much faster.

2. Learn text objects
   ciw  change inner word
   da"  delete around quotes
   vi{  visual select inside braces

3. The dot command is your friend
   . repeats your last change
   Combine with motions for powerful editing.

4. Buffer management
   :ls    list buffers
   :b N   switch to buffer N
   :bd    delete current buffer

5. Marks for quick navigation
   ma     set mark a
   'a     jump to mark a
   '.     jump to last change
