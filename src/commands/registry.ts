import {
  ansi,
  formatHeader,
  formatError,
  formatDim,
  formatLink,
  identity,
} from '../utils/ansi'
import { formatPostAsBat } from '../utils/cat'
import { calculateStats, getTopTags } from '../utils/stats'
import { findClosestMatch } from '../utils/fuzzy'
import { processImagesForTerminal } from '../utils/image'
import { overlayPath } from '../overlays'
import * as vfs from '../vfs'
import type { FsNode } from '../vfs'
import type { Command } from './types'

/**
 * Find a command by name or alias
 */
export function findCommand(nameOrAlias: string): Command | undefined {
  // First check if it's a direct command name
  let cmd = commands.find((c) => c.name === nameOrAlias)
  if (cmd) return cmd

  // Then check if it's an alias
  cmd = commands.find((c) => c.aliases?.includes(nameOrAlias))
  return cmd
}

/**
 * Resolve a path argument, trying .md extension fallback for files,
 * then slug lookup as a last resort (so `cat building-a-blog` works anywhere).
 */
function resolveFileArg(cwd: string, arg: string): string | null {
  const resolved = vfs.resolve(cwd, arg)
  const node = vfs.stat(resolved)
  if (node) return resolved

  // Try .md extension fallback
  const withMd = resolved + '.md'
  if (vfs.stat(withMd)) return withMd

  // Try slug lookup (convenience: `cat building-a-blog` from any directory)
  const entry = vfs.findBySlug(arg)
  if (entry) return vfs.HOME + entry.path

  return null
}

export const commands: Command[] = [
  {
    name: 'help',
    description: 'Show available commands',
    aliases: ['h'],
    handler: (_args, ctx) => {
      const { terminal } = ctx

      const groups: { label: string; cmds: string[] }[] = [
        { label: 'Reading', cmds: ['cat', 'less', 'ls'] },
        { label: 'Navigation', cmds: ['cd', 'pwd', 'tree'] },
        { label: 'Info', cmds: ['stats', 'whoami'] },
        { label: 'Terminal', cmds: ['clear', 'help', 'man'] },
      ]

      const cmdMap = new Map(
        commands.filter((c) => !c.hidden).map((c) => [c.name, c]),
      )

      terminal.writeln('')
      terminal.writeln(formatHeader('Available Commands'))

      for (const group of groups) {
        terminal.writeln('')
        terminal.writeln(
          `  ${ansi.bold}${ansi.brightWhite}${group.label}${ansi.reset}`,
        )
        for (const name of group.cmds) {
          const cmd = cmdMap.get(name)
          if (!cmd) continue
          const nameStr = `${ansi.green}${cmd.name}${ansi.reset}`
          const aliasText = cmd.aliases?.length
            ? `${ansi.dim} (${cmd.aliases.join(', ')})${ansi.reset}`
            : ''
          terminal.writeln(
            `    ${nameStr.padEnd(25)}${cmd.description}${aliasText}`,
          )
        }
      }
      terminal.writeln('')
    },
  },
  {
    name: 'man',
    description: 'Display manual pages for commands',
    handler: (args, ctx) => {
      const { terminal } = ctx

      if (args.length === 0) {
        terminal.writeln('')
        terminal.writeln(`${ansi.bold}${ansi.underline}NAME${ansi.reset}`)
        terminal.writeln(
          `       man - an interface to the terminal blog command reference manuals`,
        )
        terminal.writeln('')
        terminal.writeln(`${ansi.bold}${ansi.underline}SYNOPSIS${ansi.reset}`)
        terminal.writeln(
          `       ${ansi.bold}man${ansi.reset} [${ansi.underline}command${ansi.reset}]`,
        )
        terminal.writeln('')
        terminal.writeln(
          `${ansi.bold}${ansi.underline}DESCRIPTION${ansi.reset}`,
        )
        terminal.writeln(
          `       ${ansi.bold}man${ansi.reset} displays the manual page for a given command.`,
        )
        terminal.writeln('')
        terminal.writeln(
          `${ansi.bold}${ansi.underline}AVAILABLE MANUAL PAGES${ansi.reset}`,
        )

        const manPages = [
          'cat',
          'cd',
          'clear',
          'help',
          'less',
          'ls',
          'man',
          'pwd',
          'stats',
          'tree',
        ]
        manPages.forEach((page) => {
          terminal.writeln(`       ${ansi.bold}${page}${ansi.reset}`)
        })

        terminal.writeln('')
        terminal.writeln(`${ansi.bold}${ansi.underline}EXAMPLES${ansi.reset}`)
        terminal.writeln(`       man ls        Display the ls manual page`)
        terminal.writeln(`       man cat       Display the cat manual page`)
        terminal.writeln('')
        return
      }

      const commandName = args[0].toLowerCase()
      const manPage = getManPage(commandName)

      if (!manPage) {
        terminal.writeln('')
        terminal.writeln(formatError(`No manual entry for ${commandName}`))
        terminal.writeln(
          `${ansi.dim}Try 'man' without arguments to see available manual pages${ansi.reset}`,
        )
        terminal.writeln('')
        return
      }

      terminal.writeln('')
      terminal.writeln(`${ansi.bold}${ansi.underline}NAME${ansi.reset}`)
      terminal.writeln(`       ${manPage.name}`)
      terminal.writeln('')

      terminal.writeln(`${ansi.bold}${ansi.underline}SYNOPSIS${ansi.reset}`)
      terminal.writeln(`       ${manPage.synopsis}`)
      terminal.writeln('')

      terminal.writeln(`${ansi.bold}${ansi.underline}DESCRIPTION${ansi.reset}`)
      manPage.description.forEach((line) => {
        terminal.writeln(`       ${line}`)
      })
      terminal.writeln('')

      if (manPage.options && manPage.options.length > 0) {
        terminal.writeln(`${ansi.bold}${ansi.underline}OPTIONS${ansi.reset}`)
        manPage.options.forEach((opt) => {
          terminal.writeln(`       ${ansi.bold}${opt.flag}${ansi.reset}`)
          terminal.writeln(`              ${opt.description}`)
          terminal.writeln('')
        })
      }

      terminal.writeln(`${ansi.bold}${ansi.underline}EXAMPLES${ansi.reset}`)
      manPage.examples.forEach((example) => {
        terminal.writeln(`       ${example}`)
      })
      terminal.writeln('')

      if (manPage.seeAlso && manPage.seeAlso.length > 0) {
        terminal.writeln(`${ansi.bold}${ansi.underline}SEE ALSO${ansi.reset}`)
        terminal.writeln(`       ${manPage.seeAlso.join(', ')}`)
        terminal.writeln('')
      }
    },
  },
  {
    name: 'ls',
    description: 'List directory contents',
    aliases: ['ll'],
    handler: (args, ctx) => {
      const { terminal, cwd } = ctx
      const longFormat = args.includes('-l') || args.includes('--long')
      const showAll = args.includes('-a') || args.includes('--all')

      // Find the target path (first non-flag argument, or cwd)
      const target = args.find((a) => !a.startsWith('-')) ?? cwd
      const resolved = target === cwd ? cwd : vfs.resolve(cwd, target)
      const node = vfs.stat(resolved)

      if (!node) {
        terminal.writeln('')
        terminal.writeln(
          formatError(
            `ls: cannot access '${target}': No such file or directory`,
          ),
        )
        terminal.writeln('')
        return
      }

      if (node.type !== 'dir') {
        // Single file — just print its name
        terminal.writeln('')
        terminal.writeln(`  ${ansi.brightGreen}${node.name}${ansi.reset}`)
        terminal.writeln('')
        return
      }

      const entries = vfs.readdir(resolved)
      if (entries.length === 0) {
        terminal.writeln('')
        terminal.writeln(formatDim('  (empty directory)'))
        terminal.writeln('')
        return
      }

      // Sort: directories first, then files, alphabetically within each
      const sorted = [...entries].sort((a, b) => {
        if (a.type !== b.type) return a.type === 'dir' ? -1 : 1
        return a.name.localeCompare(b.name)
      })

      terminal.writeln('')

      if (longFormat || showAll) {
        for (const entry of sorted) {
          if (entry.type === 'dir') {
            terminal.writeln(`  ${ansi.brightBlue}${entry.name}/${ansi.reset}`)
          } else if (entry.entry) {
            const { meta } = entry.entry
            const date = `${ansi.dim}${meta.date}${ansi.reset}`
            const name = `${ansi.brightGreen}${entry.name}${ansi.reset}`
            const title = `${ansi.brightWhite}${meta.title}${ansi.reset}`
            terminal.writeln(`  ${date}  ${name}  ${title}`)
            if (showAll) {
              if (meta.tags.length > 0) {
                const tags = meta.tags
                  .map((t) => `${ansi.cyan}${t}${ansi.reset}`)
                  .join(`${ansi.dim}, ${ansi.reset}`)
                terminal.writeln(
                  `${' '.repeat(14)}${ansi.dim}[${ansi.reset}${tags}${ansi.dim}]${ansi.reset}`,
                )
              }
              const readTime = Math.ceil(meta.wordCount / 200)
              terminal.writeln(
                `${' '.repeat(14)}${ansi.dim}${meta.wordCount} words \u2022 ~${readTime} min read${ansi.reset}`,
              )
            }
          }
        }
      } else {
        for (const entry of sorted) {
          if (entry.type === 'dir') {
            terminal.writeln(`  ${ansi.brightBlue}${entry.name}/${ansi.reset}`)
          } else {
            terminal.writeln(`  ${ansi.brightGreen}${entry.name}${ansi.reset}`)
          }
        }
      }

      terminal.writeln('')
    },
  },
  {
    name: 'cat',
    description: 'Read a blog post with syntax highlighting',
    handler: async (args, ctx) => {
      const { terminal, cwd } = ctx
      if (args.length === 0) {
        terminal.writeln('')
        terminal.writeln(formatError('usage: cat <file>'))
        terminal.writeln(
          formatDim('  Try: cat posts/2016/04/11-building-a-blog.md'),
        )
        terminal.writeln('')
        return
      }

      const resolved = resolveFileArg(cwd, args[0])
      if (!resolved) {
        terminal.writeln('')
        terminal.writeln(
          formatError(`cat: '${args[0]}': No such file or directory`),
        )

        // Suggest similar files in the current directory
        const dirEntries = vfs.readdir(cwd)
        const filenames = dirEntries
          .filter((e) => e.type === 'file')
          .map((e) => e.name)
        const suggestion = findClosestMatch(args[0], filenames, 3)

        if (suggestion) {
          terminal.writeln('')
          terminal.writeln(
            `${ansi.dim}Did you mean ${ansi.reset}${ansi.brightGreen}${suggestion}${ansi.reset}${ansi.dim}?${ansi.reset}`,
          )
        } else {
          terminal.writeln('')
          terminal.writeln(
            `${ansi.dim}Use ${ansi.reset}${ansi.green}ls${ansi.reset}${ansi.dim} to see files in the current directory${ansi.reset}`,
          )
        }

        terminal.writeln('')
        return
      }

      const post = await vfs.readFile(resolved)
      if (!post) {
        terminal.writeln('')
        terminal.writeln(formatError(`cat: '${args[0]}': Not a readable file`))
        terminal.writeln('')
        return
      }

      if (Object.keys(post.images).length > 0) {
        const processedContent = await processImagesForTerminal(
          post.content,
          post.images,
          terminal.cols,
        )
        terminal.write(
          formatPostAsBat(
            { ...post, content: processedContent },
            { cols: terminal.cols },
          ),
        )
      } else {
        terminal.write(formatPostAsBat(post, { cols: terminal.cols }))
      }
    },
  },
  {
    name: 'less',
    description: 'Read a blog post in the pager',
    handler: async (args, ctx) => {
      const { terminal, cwd, navigate, openOverlay } = ctx
      if (args.length === 0) {
        terminal.writeln('')
        terminal.writeln(formatError('usage: less <file>'))
        terminal.writeln(
          formatDim('  Try: less posts/2016/04/11-building-a-blog.md'),
        )
        terminal.writeln('')
        return
      }

      const resolved = resolveFileArg(cwd, args[0])
      if (!resolved) {
        terminal.writeln('')
        terminal.writeln(
          formatError(`less: '${args[0]}': No such file or directory`),
        )

        const dirEntries = vfs.readdir(cwd)
        const filenames = dirEntries
          .filter((e) => e.type === 'file')
          .map((e) => e.name)
        const suggestion = findClosestMatch(args[0], filenames, 3)

        if (suggestion) {
          terminal.writeln('')
          terminal.writeln(
            `${ansi.dim}Did you mean ${ansi.reset}${ansi.brightGreen}${suggestion}${ansi.reset}${ansi.dim}?${ansi.reset}`,
          )
        } else {
          terminal.writeln('')
          terminal.writeln(
            `${ansi.dim}Use ${ansi.reset}${ansi.green}ls${ansi.reset}${ansi.dim} to see files in the current directory${ansi.reset}`,
          )
        }

        terminal.writeln('')
        return
      }

      const post = await vfs.readFile(resolved)
      if (!post) {
        terminal.writeln('')
        terminal.writeln(formatError(`less: '${args[0]}': Not a readable file`))
        terminal.writeln('')
        return
      }

      navigate(overlayPath('pager', { slug: post.slug }))
      if (openOverlay) return openOverlay('pager', { post })
    },
  },
  {
    name: 'cd',
    description: 'Change directory',
    handler: (args, ctx) => {
      const { terminal, cwd, setCwd } = ctx

      // cd with no args goes home
      const target = args[0] ?? '~'
      const resolved = vfs.resolve(cwd, target)
      const node = vfs.stat(resolved)

      if (!node) {
        terminal.writeln('')
        terminal.writeln(
          formatError(`cd: '${target}': No such file or directory`),
        )
        terminal.writeln('')
        return
      }

      if (node.type !== 'dir') {
        terminal.writeln('')
        terminal.writeln(formatError(`cd: '${target}': Not a directory`))
        terminal.writeln('')
        return
      }

      setCwd(resolved)
    },
  },
  {
    name: 'pwd',
    description: 'Print working directory',
    handler: (_args, ctx) => {
      const { terminal, cwd } = ctx
      terminal.writeln('')
      terminal.writeln(`  ${cwd}`)
      terminal.writeln('')
    },
  },
  {
    name: 'tree',
    description: 'Display directory tree',
    handler: (args, ctx) => {
      const { terminal, cwd } = ctx

      const target = args.find((a) => !a.startsWith('-')) ?? cwd
      const resolved = target === cwd ? cwd : vfs.resolve(cwd, target)
      const node = vfs.stat(resolved)

      if (!node || node.type !== 'dir') {
        terminal.writeln('')
        terminal.writeln(
          formatError(`tree: '${target}': No such file or directory`),
        )
        terminal.writeln('')
        return
      }

      let dirCount = 0
      let fileCount = 0

      function walk(n: FsNode, prefix: string, isLast: boolean) {
        const connector = isLast ? '\u2514\u2500\u2500 ' : '\u251c\u2500\u2500 '
        const name =
          n.type === 'dir'
            ? `${ansi.brightBlue}${n.name}/${ansi.reset}`
            : `${ansi.brightGreen}${n.name}${ansi.reset}`
        terminal.writeln(`${prefix}${connector}${name}`)

        if (n.type === 'dir') {
          dirCount++
          const children = Array.from(n.children.values()).sort((a, b) => {
            if (a.type !== b.type) return a.type === 'dir' ? -1 : 1
            return a.name.localeCompare(b.name)
          })
          const childPrefix = prefix + (isLast ? '    ' : '\u2502   ')
          children.forEach((child, i) => {
            walk(child, childPrefix, i === children.length - 1)
          })
        } else {
          fileCount++
        }
      }

      terminal.writeln('')
      const rootName = `${ansi.brightBlue}${vfs.displayPath(resolved)}${ansi.reset}`
      terminal.writeln(`  ${rootName}`)

      const children = Array.from(node.children.values()).sort((a, b) => {
        if (a.type !== b.type) return a.type === 'dir' ? -1 : 1
        return a.name.localeCompare(b.name)
      })
      children.forEach((child, i) => {
        walk(child, '  ', i === children.length - 1)
      })

      terminal.writeln('')
      terminal.writeln(
        `  ${ansi.dim}${dirCount} directories, ${fileCount} files${ansi.reset}`,
      )
      terminal.writeln('')
    },
  },
  {
    name: 'clear',
    description: 'Clear the terminal',
    aliases: ['c'],
    handler: (_args, ctx) => {
      ctx.terminal.clear()
    },
  },
  {
    name: 'whoami',
    description: 'About the blog author',
    handler: (_args, ctx) => {
      const { terminal } = ctx
      terminal.writeln('')
      identity.headerBox.forEach((line) => terminal.writeln(line))
      terminal.writeln('')
      identity
        .contactLines(formatLink)
        .forEach((line) => terminal.writeln(line))
      terminal.writeln('')
    },
  },
  {
    name: 'exit',
    description: 'Exit the terminal (just kidding)',
    aliases: ['q'],
    handler: (_args, ctx) => {
      const { terminal } = ctx
      terminal.writeln('')
      terminal.writeln(
        `${ansi.dim}Nice try! But you can't escape that easily...${ansi.reset}`,
      )
      terminal.writeln(
        `${ansi.dim}Just close the browser tab if you really want to leave.${ansi.reset}`,
      )
      terminal.writeln('')
    },
  },
  {
    name: 'stats',
    description: 'Show blog statistics (htop-style)',
    handler: (_args, ctx) => {
      const { terminal } = ctx
      const entries = vfs.allEntries()
      const stats = calculateStats(entries)
      const topTags = getTopTags(stats.tags, 10)

      // Header bar (htop-style with inverted colors)
      terminal.writeln('')
      terminal.writeln(
        `${ansi.bold}\x1b[7m btop - blog monitor \x1b[27m${ansi.reset}                                     ${ansi.dim}${new Date().toLocaleString()}${ansi.reset}`,
      )
      terminal.writeln('')

      // CPU-style meters (repurposed for blog metrics)
      const postUsage = Math.min(100, (stats.totalPosts / 50) * 100)
      const wordUsage = Math.min(100, (stats.totalWords / 50000) * 100)
      const tagUsage = Math.min(100, (stats.tags.size / 20) * 100)

      terminal.writeln(renderMeter('Posts', stats.totalPosts, postUsage))
      terminal.writeln(renderMeter('Words', stats.totalWords, wordUsage))
      terminal.writeln(renderMeter('Tags', stats.tags.size, tagUsage))

      terminal.writeln('')

      // Memory-style stats
      const avgWords = stats.averageWordsPerPost
      const avgWordsBar = renderBar(Math.min(100, (avgWords / 500) * 100), 30)
      terminal.writeln(
        `  ${ansi.brightCyan}Avg words/post:${ansi.reset} ${avgWordsBar} ${ansi.bold}${avgWords}${ansi.reset}`,
      )

      if (stats.oldestDate) {
        const daysSinceFirst = Math.floor(
          (new Date().getTime() - new Date(stats.oldestDate).getTime()) /
            (1000 * 60 * 60 * 24),
        )
        const postsPerMonth = stats.totalPosts / (daysSinceFirst / 30)
        const velocityBar = renderBar(Math.min(100, postsPerMonth * 20), 30)
        terminal.writeln(
          `  ${ansi.brightCyan}Posts/month:${ansi.reset}    ${velocityBar} ${ansi.bold}${postsPerMonth.toFixed(1)}${ansi.reset}`,
        )
      }

      terminal.writeln('')

      // Process table header (htop-style)
      terminal.writeln(
        `  ${ansi.bold}\x1b[7m PID   TAG              %CPU  POSTS  COMMAND ${' '.repeat(20)}\x1b[27m${ansi.reset}`,
      )

      topTags.slice(0, 8).forEach(([tag, count], idx) => {
        const pid = (1000 + idx).toString().padStart(5)
        const cpu = ((count / stats.totalPosts) * 100).toFixed(1).padStart(5)
        const tagName = tag.padEnd(16)
        const postCount = count.toString().padStart(6)
        const command = `blog/${tag}`

        const cpuNum = parseFloat(cpu)
        let cpuColor: string = ansi.brightGreen
        if (cpuNum > 30) cpuColor = ansi.brightYellow
        if (cpuNum > 50) cpuColor = ansi.brightRed

        terminal.writeln(
          `  ${ansi.dim}${pid}${ansi.reset}  ${ansi.brightWhite}${tagName}${ansi.reset} ${cpuColor}${cpu}${ansi.reset}  ${ansi.bold}${postCount}${ansi.reset}  ${ansi.dim}${command}${ansi.reset}`,
        )
      })

      terminal.writeln('')

      terminal.writeln(
        `${ansi.dim}\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500${ansi.reset}`,
      )
      terminal.writeln(
        `${ansi.brightGreen}F1${ansi.reset}${ansi.dim}Help ${ansi.reset}${ansi.brightGreen}F2${ansi.reset}${ansi.dim}Setup ${ansi.reset}${ansi.brightGreen}F3${ansi.reset}${ansi.dim}Search ${ansi.reset}${ansi.brightGreen}F9${ansi.reset}${ansi.dim}List ${ansi.reset}${ansi.brightGreen}F10${ansi.reset}${ansi.dim}Quit${ansi.reset}`,
      )
      terminal.writeln(
        `${ansi.dim}Hint: Try ${ansi.reset}${ansi.green}ls${ansi.reset}${ansi.dim}, ${ansi.reset}${ansi.green}cat <file>${ansi.reset}${ansi.dim}, or ${ansi.reset}${ansi.green}help${ansi.reset}`,
      )
      terminal.writeln('')
    },
  },
  // Easter Eggs (hidden commands)
  {
    name: 'fortune',
    description: 'Random programming quotes and tips',
    hidden: true,
    handler: (_args, ctx) => {
      const { terminal } = ctx

      const fortunes = [
        'A good programmer looks both ways before crossing a one-way street.',
        'Always code as if the person who ends up maintaining your code is a violent psychopath who knows where you live.',
        'Walking on water and developing software from a specification are easy if both are frozen.',
        'Before software can be reusable it first has to be usable.',
        'The most important property of a program is whether it accomplishes the intention of its user.',
        'Simplicity is the soul of efficiency.',
        'Controlling complexity is the essence of computer programming.',
        'Programs must be written for people to read, and only incidentally for machines to execute.',
        'The function of good software is to make the complex appear to be simple.',
        'Truth can only be found in one place: the code.',
        "It's not a bug \u2013 it's an undocumented feature.",
        'Code never lies, comments sometimes do.',
        'Premature optimization is the root of all evil.',
        'Good code is its own best documentation.',
        'The best performance improvement is the transition from the nonworking state to the working state.',
      ]

      const fortune = fortunes[Math.floor(Math.random() * fortunes.length)]

      terminal.writeln('')
      terminal.writeln(
        `${ansi.bold}${ansi.brightCyan}\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557${ansi.reset}`,
      )
      terminal.writeln(
        `${ansi.bold}${ansi.brightCyan}\u2551${ansi.reset}  ${ansi.brightYellow}\u2728 Your Fortune${ansi.reset}                                        ${ansi.bold}${ansi.brightCyan}\u2551${ansi.reset}`,
      )
      terminal.writeln(
        `${ansi.bold}${ansi.brightCyan}\u255a\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255d${ansi.reset}`,
      )
      terminal.writeln('')

      const words = fortune.split(' ')
      const lines: string[] = []
      let currentLine = ''
      const maxWidth = 55

      words.forEach((word) => {
        if ((currentLine + word).length > maxWidth) {
          lines.push(currentLine.trim())
          currentLine = word + ' '
        } else {
          currentLine += word + ' '
        }
      })
      if (currentLine) lines.push(currentLine.trim())

      lines.forEach((line) => {
        terminal.writeln(
          `  ${ansi.dim}"${line}${ansi.reset}${ansi.dim}"${ansi.reset}`,
        )
      })

      terminal.writeln('')
    },
  },
]

// Man page data structure
interface ManPage {
  name: string
  synopsis: string
  description: string[]
  options?: { flag: string; description: string }[]
  examples: string[]
  seeAlso?: string[]
}

function getManPage(command: string): ManPage | null {
  const pages: Record<string, ManPage> = {
    ls: {
      name: 'ls - list directory contents',
      synopsis: `${ansi.bold}ls${ansi.reset} [${ansi.underline}OPTION${ansi.reset}]... [${ansi.underline}PATH${ansi.reset}]`,
      description: [
        'List the contents of a directory in the virtual filesystem.',
        '',
        'By default, lists the current working directory.',
        'Directories are shown in blue, files in green.',
      ],
      options: [
        {
          flag: '-l, --long',
          description: 'Use a long listing format with metadata (date, title)',
        },
        {
          flag: '-a, --all',
          description:
            'Show all metadata including tags, word count, and reading time',
        },
      ],
      examples: [
        'ls               List current directory',
        'ls -l            List with metadata',
        'ls posts/        List posts directory',
        'ls -la ~/posts/  List posts with all metadata',
        'll               Alias for ls -l',
      ],
      seeAlso: ['cat(1)', 'cd(1)', 'tree(1)'],
    },
    cat: {
      name: 'cat - display blog post content',
      synopsis: `${ansi.bold}cat${ansi.reset} ${ansi.underline}FILE${ansi.reset}`,
      description: [
        'Read and display a blog post with syntax highlighting.',
        '',
        'Paths are resolved relative to the current working directory.',
        'The .md extension is optional.',
      ],
      examples: [
        'cat 11-building-a-blog.md    Display post by filename',
        'cat building-a-blog          Extension is optional',
        'cat posts/2016/04/11-building-a-blog.md   Full path',
      ],
      seeAlso: ['ls(1)', 'less(1)', 'cd(1)'],
    },
    less: {
      name: 'less - read a blog post in the pager',
      synopsis: `${ansi.bold}less${ansi.reset} ${ansi.underline}FILE${ansi.reset}`,
      description: [
        'Open a blog post in the HTML pager with proportional fonts.',
        '',
        'Paths are resolved relative to the current working directory.',
        'The .md extension is optional.',
      ],
      options: [
        { flag: 'j / Down', description: 'Scroll down one line' },
        { flag: 'k / Up', description: 'Scroll up one line' },
        { flag: 'Space / PageDown', description: 'Scroll down one page' },
        { flag: 'b / PageUp', description: 'Scroll up one page' },
        { flag: 'Ctrl+d', description: 'Scroll down half page' },
        { flag: 'Ctrl+u', description: 'Scroll up half page' },
        { flag: 'g / Home', description: 'Go to top' },
        { flag: 'G / End', description: 'Go to bottom' },
        { flag: 'q / Esc', description: 'Close pager' },
      ],
      examples: [
        'less 11-building-a-blog.md   Open post in pager',
        'less building-a-blog         Extension is optional',
      ],
      seeAlso: ['cat(1)', 'ls(1)'],
    },
    cd: {
      name: 'cd - change directory',
      synopsis: `${ansi.bold}cd${ansi.reset} [${ansi.underline}PATH${ansi.reset}]`,
      description: [
        'Change the current working directory.',
        '',
        'With no arguments, changes to the home directory (~).',
        'Supports absolute paths, relative paths, ~, and ..',
      ],
      examples: [
        'cd               Change to home directory',
        'cd posts/        Change to posts directory',
        'cd ..            Go up one level',
        'cd ~/posts/2016  Absolute path from home',
      ],
      seeAlso: ['pwd(1)', 'ls(1)'],
    },
    pwd: {
      name: 'pwd - print working directory',
      synopsis: `${ansi.bold}pwd${ansi.reset}`,
      description: [
        'Print the full pathname of the current working directory.',
      ],
      examples: ['pwd              Print current directory'],
      seeAlso: ['cd(1)', 'ls(1)'],
    },
    tree: {
      name: 'tree - display directory tree',
      synopsis: `${ansi.bold}tree${ansi.reset} [${ansi.underline}PATH${ansi.reset}]`,
      description: [
        'Display a tree view of the directory structure.',
        '',
        'Shows directories and files in a hierarchical format.',
        'With no arguments, displays the tree from the current directory.',
      ],
      examples: [
        'tree             Show tree from current directory',
        'tree ~           Show tree from home directory',
        'tree posts/      Show tree of posts directory',
      ],
      seeAlso: ['ls(1)', 'cd(1)'],
    },
    stats: {
      name: 'stats - display blog statistics',
      synopsis: `${ansi.bold}stats${ansi.reset}`,
      description: [
        'Display comprehensive blog statistics in an htop-style interface.',
        '',
        'Shows metrics including total posts, word count, tags, posting velocity,',
        'and a breakdown of the most popular tags.',
      ],
      examples: ['stats                Show blog statistics dashboard'],
      seeAlso: ['ls(1)'],
    },
    man: {
      name: 'man - display manual pages',
      synopsis: `${ansi.bold}man${ansi.reset} [${ansi.underline}COMMAND${ansi.reset}]`,
      description: [
        'Display the manual page for a command.',
        '',
        'Without arguments, lists all available manual pages.',
      ],
      examples: [
        'man                  List all available manual pages',
        'man ls               Display the ls manual',
        'man man              Display this manual (meta!)',
      ],
      seeAlso: ['help(1)'],
    },
    help: {
      name: 'help - show available commands',
      synopsis: `${ansi.bold}help${ansi.reset}`,
      description: ['Display a quick reference of all available commands.'],
      examples: [
        'help                 Show all commands',
        'h                    Alias for help',
      ],
      seeAlso: ['man(1)'],
    },
    clear: {
      name: 'clear - clear the terminal screen',
      synopsis: `${ansi.bold}clear${ansi.reset}`,
      description: [
        'Clear the terminal screen and scrollback buffer.',
        'Command history is preserved.',
      ],
      examples: [
        'clear                Clear the screen',
        'c                    Alias for clear',
      ],
      seeAlso: [],
    },
  }

  return pages[command] || null
}

// Helper functions for htop-style stats display
function renderMeter(label: string, value: number, percentage: number): string {
  const barLength = 40
  const filled = Math.floor((percentage / 100) * barLength)

  let bar = ''
  for (let i = 0; i < barLength; i++) {
    if (i < filled) {
      let color: string
      if (percentage < 33) color = ansi.brightGreen
      else if (percentage < 66) color = ansi.brightYellow
      else color = ansi.brightRed
      bar += `${color}|${ansi.reset}`
    } else {
      bar += `${ansi.dim}.${ansi.reset}`
    }
  }

  const percentStr = `${percentage.toFixed(0)}%`.padStart(4)
  return `  ${ansi.bold}${label.padEnd(6)}${ansi.reset}[${bar}] ${ansi.bold}${percentStr}${ansi.reset} ${ansi.dim}${value}${ansi.reset}`
}

function renderBar(percentage: number, length: number): string {
  const filled = Math.floor((percentage / 100) * length)
  let bar = '['

  for (let i = 0; i < length; i++) {
    if (i < filled) {
      let color: string
      if (percentage < 33) color = ansi.brightGreen
      else if (percentage < 66) color = ansi.brightYellow
      else color = ansi.brightRed
      bar += `${color}\u2588${ansi.reset}`
    } else {
      bar += `${ansi.dim}\u2591${ansi.reset}`
    }
  }

  bar += ']'
  return bar
}
