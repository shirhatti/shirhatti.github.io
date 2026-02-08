# Terminal Blog

A terminal-themed static blog built with React, TypeScript, and xterm.js. Features a `bat`-style reading experience with syntax highlighting, line numbers, and beautiful formatting.

## Features

### 🎨 Bat-Style Reading Experience

- **Syntax Highlighting**: Markdown-style syntax highlighting for headers, code, commands, and more
- **Line Numbers**: Every line numbered for easy reference
- **File Headers**: Display post metadata (date, tags) in a clean header
- **Grid Separators**: Box-drawing characters for visual structure
- **Color-Coded Output**: Commands, strings, numbers, and comments are all highlighted
- **Tag-Based Navigation**: Browse posts by topic with visual tag indicators

### 📊 Analytics & Insights

- **Blog Statistics**: Track post count, total words, and average words per post
- **Tag Analytics**: See most popular tags with visual bar charts
- **Search Functionality**: Full-text search across all posts with context
- **Command History**: Review and reuse previous commands

### 💻 Terminal Interface

- **Interactive Commands**: Navigate the blog using shell-like commands
- **Tab Completion**: Smart completion for commands and post names
- **Command History**: Arrow up/down to navigate through command history
- **Fuzzy Matching**: Get suggestions for mistyped commands and posts
- **Keyboard Shortcuts**:
  - `Tab` - Autocomplete commands/posts (press twice to see all matches)
  - `Ctrl+C` - Cancel current input
  - `Ctrl+L` - Clear screen
  - `↑/↓` - Navigate command history
- **macOS-Style Window**: Beautiful terminal window chrome with traffic light buttons
- **Mobile Support**: Touch-friendly command palette and input

### 📝 Available Commands

#### Navigation & Reading
- `help` (alias: `h`) - Show all available commands
- `ls` (alias: `ll`) - List all blog posts (simple format)
- `ls -l` - List posts with full details (titles, tags, dates)
- `ls -a` - Show all metadata
- `ls --sort=title` - Sort by title instead of date
- `cat <post>` - Read a post with bat-style formatting
- `bat <post>` - Alias for `cat` (same beautiful output)
- `..` - Go back to home

#### Search & Discovery
- `tags` - Browse all tags with post counts
- `tags <name>` - Show all posts with a specific tag
- `grep <pattern>` - Search through all posts
- `grep -i <pattern>` - Case-insensitive search
- `stats` - View blog analytics (post count, word count, top tags)

#### Utilities
- `clear` (alias: `c`) - Clear the terminal
- `about` - Learn about this blog (with statistics)
- `whoami` - Display current user
- `history` - Show command history with line numbers
- `shortcuts` (aliases: `keys`, `hotkeys`) - Show keyboard shortcuts
- `motd` (alias: `tip`) - Show message/tip of the day
- `rss` - Generate RSS feed (XML)
- `rss json` - Generate JSON Feed
- `exit` (alias: `q`) - Try to exit (just kidding!)

#### Advanced Features
- **Tab Completion**: Press Tab to autocomplete commands and post names
- **Fuzzy Suggestions**: Mistyped commands get smart suggestions
- **Command History**: Use ↑/↓ arrows to navigate
- **Error Recovery**: Helpful error messages with suggestions

## Development

### Prerequisites

- [Bun](https://bun.sh/) - Fast JavaScript runtime and package manager
- (Optional) [Nix](https://nixos.org/) with flakes enabled

### Quick Start

```bash
# Install dependencies
bun install

# Start dev server with HMR
bun dev

# Build for production
bun run build

# Preview production build
bun preview
```

### Using Nix

```bash
# Enter development shell
nix develop

# Then use bun commands as normal
bun dev
```

## Project Structure

```
blog/
├── posts/                      # Blog posts (markdown)
│   └── YYYY/MM/
│       └── DD-slug.md         # Posts organized by date
├── src/
│   ├── components/
│   │   ├── Terminal/          # xterm.js integration
│   │   └── TerminalWindow/    # Window chrome UI
│   ├── commands/               # Command system
│   ├── data/
│   │   ├── posts.ts           # Post loader (glob import)
│   │   └── types.ts           # Type definitions
│   ├── utils/
│   │   ├── ansi.ts            # ANSI color utilities
│   │   └── bat.ts             # Bat-style formatter
│   ├── router.tsx             # Hash-based routing
│   ├── App.tsx                # Root component
│   └── main.tsx               # Entry point
├── vite.config.ts             # Vite configuration
├── package.json
└── flake.nix                  # Nix development environment
```

## Adding Content

Posts are markdown files with YAML frontmatter, organized by date in `posts/YYYY/MM/DD-slug.md`.

### Creating a New Post

1. Create a file following the naming convention:
   ```
   posts/2025/02/07-my-new-post.md
   ```

2. Add YAML frontmatter and content:
   ```markdown
   ---
   title: My New Post
   date: 2025-02-07
   tags:
     - example
     - tutorial
   excerpt: A short description of the post
   ---

   My New Post
   ===========

   Post content here...

   Code blocks (indent with 2 spaces):
     git commit -m "example"
     npm install
   ```

Posts are automatically loaded and sorted by date (newest first).

### Content Formatting Tips

The bat formatter supports:

- **Headers**: Lines in ALL CAPS or with `===`/`---` underlines
- **Code blocks**: Indented lines (2+ spaces) with commands
- **Bullet lists**: Lines starting with `*` or `-`
- **Numbered lists**: Lines starting with `1.`, `2.`, etc.
- **Inline code**: Wrap with backticks: `` `code` ``
- **Commands**: Shell commands like `git`, `vim`, `npm` are highlighted
- **Strings**: Quoted text is highlighted

## Deployment

### GitHub Pages

1. Create a GitHub repository named `<username>.github.io`
2. Push your code:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin git@github.com:<username>/<username>.github.io.git
   git push -u origin main
   ```
3. Enable GitHub Pages:
   - Go to Settings → Pages
   - Source: GitHub Actions
4. The workflow will auto-deploy on every push to `main`

The site will be available at `https://<username>.github.io`

## Tech Stack

- **Runtime**: [Bun](https://bun.sh/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Framework**: [React 19](https://react.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Terminal**: [xterm.js](https://xtermjs.org/) v6
- **Routing**: [React Router](https://reactrouter.com/) v7 (hash mode)
- **Frontmatter**: Custom YAML parser (browser-friendly, no dependencies)

## License

MIT

## Inspiration

- [bat](https://github.com/sharkdp/bat) - A cat clone with wings
- Terminal aesthetics and developer UX
