import { ansi, formatHeader, formatError, formatDim, formatLink } from '../utils/ansi'
import { formatPostAsBat, formatLsOutput } from '../utils/bat'
import { calculateStats, getTopTags } from '../utils/stats'
import { findClosestMatch } from '../utils/fuzzy'
import { processImagesForTerminal } from '../utils/image'
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

export const commands: Command[] = [
  {
    name: 'help',
    description: 'Show available commands',
    aliases: ['h'],
    handler: (_args, ctx) => {
      const { terminal } = ctx

      const groups: { label: string; cmds: string[] }[] = [
        { label: 'Reading',    cmds: ['cat', 'less', 'ls'] },
        { label: 'Info',       cmds: ['about', 'stats', 'whoami'] },
        { label: 'Terminal',   cmds: ['clear', 'help', 'man'] },
      ]

      const cmdMap = new Map(commands.filter(c => !c.hidden).map(c => [c.name, c]))

      terminal.writeln('')
      terminal.writeln(formatHeader('Available Commands'))

      for (const group of groups) {
        terminal.writeln('')
        terminal.writeln(`  ${ansi.bold}${ansi.brightWhite}${group.label}${ansi.reset}`)
        for (const name of group.cmds) {
          const cmd = cmdMap.get(name)
          if (!cmd) continue
          const nameStr = `${ansi.green}${cmd.name}${ansi.reset}`
          const aliasText = cmd.aliases?.length
            ? `${ansi.dim} (${cmd.aliases.join(', ')})${ansi.reset}`
            : ''
          terminal.writeln(`    ${nameStr.padEnd(25)}${cmd.description}${aliasText}`)
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
        // List all available man pages
        terminal.writeln('')
        terminal.writeln(`${ansi.bold}${ansi.underline}NAME${ansi.reset}`)
        terminal.writeln(`       man - an interface to the terminal blog command reference manuals`)
        terminal.writeln('')
        terminal.writeln(`${ansi.bold}${ansi.underline}SYNOPSIS${ansi.reset}`)
        terminal.writeln(`       ${ansi.bold}man${ansi.reset} [${ansi.underline}command${ansi.reset}]`)
        terminal.writeln('')
        terminal.writeln(`${ansi.bold}${ansi.underline}DESCRIPTION${ansi.reset}`)
        terminal.writeln(`       ${ansi.bold}man${ansi.reset} displays the manual page for a given command.`)
        terminal.writeln('')
        terminal.writeln(`${ansi.bold}${ansi.underline}AVAILABLE MANUAL PAGES${ansi.reset}`)

        const manPages = ['about', 'cat', 'clear', 'help', 'less', 'ls', 'man', 'stats']
        manPages.forEach(page => {
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
        terminal.writeln(`${ansi.dim}Try 'man' without arguments to see available manual pages${ansi.reset}`)
        terminal.writeln('')
        return
      }

      // Display the man page
      terminal.writeln('')
      terminal.writeln(`${ansi.bold}${ansi.underline}NAME${ansi.reset}`)
      terminal.writeln(`       ${manPage.name}`)
      terminal.writeln('')

      terminal.writeln(`${ansi.bold}${ansi.underline}SYNOPSIS${ansi.reset}`)
      terminal.writeln(`       ${manPage.synopsis}`)
      terminal.writeln('')

      terminal.writeln(`${ansi.bold}${ansi.underline}DESCRIPTION${ansi.reset}`)
      manPage.description.forEach(line => {
        terminal.writeln(`       ${line}`)
      })
      terminal.writeln('')

      if (manPage.options && manPage.options.length > 0) {
        terminal.writeln(`${ansi.bold}${ansi.underline}OPTIONS${ansi.reset}`)
        manPage.options.forEach(opt => {
          terminal.writeln(`       ${ansi.bold}${opt.flag}${ansi.reset}`)
          terminal.writeln(`              ${opt.description}`)
          terminal.writeln('')
        })
      }

      terminal.writeln(`${ansi.bold}${ansi.underline}EXAMPLES${ansi.reset}`)
      manPage.examples.forEach(example => {
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
    description: 'List all blog posts (use -l for details, -a for all metadata)',
    aliases: ['ll'],
    handler: (args, ctx) => {
      const { terminal, posts } = ctx
      const longFormat = args.includes('-l') || args.includes('--long')
      const showAll = args.includes('-a') || args.includes('--all')

      // Parse --sort flag
      let sortBy: 'date' | 'title' = 'date'
      const sortArg = args.find(arg => arg.startsWith('--sort='))
      if (sortArg) {
        const sortValue = sortArg.split('=')[1]
        if (sortValue === 'title' || sortValue === 'date') {
          sortBy = sortValue
        }
      }

      terminal.write(formatLsOutput(posts, { longFormat, showAll, sortBy }))
    },
  },
  {
    name: 'cat',
    description: 'Read a blog post with syntax highlighting',
    handler: async (args, ctx) => {
      const { terminal, posts, navigate } = ctx
      if (args.length === 0) {
        terminal.writeln('')
        terminal.writeln(formatError('usage: cat <post-name>'))
        terminal.writeln(formatDim('  Try: cat welcome'))
        terminal.writeln('')
        return
      }
      const post = posts.find((p) => p.slug === args[0])
      if (!post) {
        terminal.writeln('')
        terminal.writeln(
          formatError(`cat: '${args[0]}': No such post found`),
        )

        // Try to find a similar post using fuzzy matching
        const postSlugs = posts.map((p) => p.slug)
        const suggestion = findClosestMatch(args[0], postSlugs, 3)

        if (suggestion) {
          terminal.writeln('')
          terminal.writeln(`${ansi.dim}Did you mean ${ansi.reset}${ansi.brightGreen}${suggestion}${ansi.reset}${ansi.dim}?${ansi.reset}`)
          terminal.writeln(`${ansi.dim}Try: ${ansi.reset}${ansi.green}cat ${suggestion}${ansi.reset}`)
        } else {
          terminal.writeln('')
          terminal.writeln(`${ansi.dim}Use ${ansi.reset}${ansi.green}ls${ansi.reset}${ansi.dim} to see all available posts${ansi.reset}`)
        }

        terminal.writeln('')
        return
      }
      navigate(`/post/${post.slug}`)

      // Process images if the post has any
      if (Object.keys(post.images).length > 0) {
        const processedContent = await processImagesForTerminal(
          post.content,
          post.images,
          terminal.cols
        )
        terminal.write(formatPostAsBat({ ...post, content: processedContent }, { cols: terminal.cols }))
      } else {
        terminal.write(formatPostAsBat(post, { cols: terminal.cols }))
      }
    },
  },
  {
    name: 'less',
    description: 'Read a blog post in the pager',
    handler: async (args, ctx) => {
      const { terminal, posts, navigate, openPager } = ctx
      if (args.length === 0) {
        terminal.writeln('')
        terminal.writeln(formatError('usage: less <post-name>'))
        terminal.writeln(formatDim('  Try: less welcome'))
        terminal.writeln('')
        return
      }
      const post = posts.find((p) => p.slug === args[0])
      if (!post) {
        terminal.writeln('')
        terminal.writeln(
          formatError(`less: '${args[0]}': No such post found`),
        )

        const postSlugs = posts.map((p) => p.slug)
        const suggestion = findClosestMatch(args[0], postSlugs, 3)

        if (suggestion) {
          terminal.writeln('')
          terminal.writeln(`${ansi.dim}Did you mean ${ansi.reset}${ansi.brightGreen}${suggestion}${ansi.reset}${ansi.dim}?${ansi.reset}`)
          terminal.writeln(`${ansi.dim}Try: ${ansi.reset}${ansi.green}less ${suggestion}${ansi.reset}`)
        } else {
          terminal.writeln('')
          terminal.writeln(`${ansi.dim}Use ${ansi.reset}${ansi.green}ls${ansi.reset}${ansi.dim} to see all available posts${ansi.reset}`)
        }

        terminal.writeln('')
        return
      }
      navigate(`/post/${post.slug}`)
      if (openPager) return openPager(post)
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
    name: 'about',
    description: 'About this blog',
    handler: (_args, ctx) => {
      const { terminal, posts } = ctx
      const stats = calculateStats(posts)

      terminal.writeln('')
      terminal.writeln(`${ansi.bold}${ansi.brightCyan}┌─────────────────────────────────────────────────────────────┐${ansi.reset}`)
      terminal.writeln(`${ansi.bold}${ansi.brightCyan}│${ansi.reset}  ${ansi.bold}${ansi.brightWhite}TERMINAL BLOG${ansi.reset}                                          ${ansi.bold}${ansi.brightCyan}│${ansi.reset}`)
      terminal.writeln(`${ansi.bold}${ansi.brightCyan}│${ansi.reset}  ${ansi.dim}A command-line interface for the modern web${ansi.reset}             ${ansi.bold}${ansi.brightCyan}│${ansi.reset}`)
      terminal.writeln(`${ansi.bold}${ansi.brightCyan}└─────────────────────────────────────────────────────────────┘${ansi.reset}`)
      terminal.writeln('')

      terminal.writeln(`  ${ansi.brightGreen}●${ansi.reset} ${ansi.bold}Technology Stack${ansi.reset}`)
      terminal.writeln(`    ${ansi.brightCyan}Frontend:${ansi.reset}       ${ansi.dim}React 19 + TypeScript 5.8${ansi.reset}`)
      terminal.writeln(`    ${ansi.brightCyan}Terminal:${ansi.reset}       ${ansi.dim}xterm.js 5.5.0${ansi.reset}`)
      terminal.writeln(`    ${ansi.brightCyan}Build Tool:${ansi.reset}     ${ansi.dim}Vite 7 with SWC${ansi.reset}`)
      terminal.writeln(`    ${ansi.brightCyan}Routing:${ansi.reset}        ${ansi.dim}React Router 7${ansi.reset}`)
      terminal.writeln(`    ${ansi.brightCyan}Styling:${ansi.reset}        ${ansi.dim}Pure CSS with terminal aesthetics${ansi.reset}`)
      terminal.writeln('')

      terminal.writeln(`  ${ansi.brightBlue}●${ansi.reset} ${ansi.bold}Philosophy${ansi.reset}`)
      terminal.writeln(`    ${ansi.dim}The web doesn't need more animations${ansi.reset}`)
      terminal.writeln(`    ${ansi.dim}It needs more terminals${ansi.reset}`)
      terminal.writeln(`    ${ansi.dim}Simple, fast, keyboard-driven${ansi.reset}`)
      terminal.writeln('')

      terminal.writeln(`  ${ansi.brightYellow}●${ansi.reset} ${ansi.bold}Content Statistics${ansi.reset}`)
      terminal.writeln(`    ${ansi.dim}${stats.totalPosts} posts and counting${ansi.reset}`)
      terminal.writeln(`    ${ansi.dim}${stats.totalWords.toLocaleString()} total words written${ansi.reset}`)
      terminal.writeln(`    ${ansi.dim}Average ${stats.averageWordsPerPost} words per post${ansi.reset}`)
      if (stats.tags.size > 0) {
        terminal.writeln(`    ${ansi.dim}${stats.tags.size} unique tags${ansi.reset}`)
      }
      terminal.writeln('')

      terminal.writeln(`  ${ansi.brightMagenta}●${ansi.reset} ${ansi.bold}Features${ansi.reset}`)
      terminal.writeln(`    ${ansi.dim}Tab completion for commands and posts${ansi.reset}`)
      terminal.writeln(`    ${ansi.dim}Command history (up/down arrows)${ansi.reset}`)
      terminal.writeln(`    ${ansi.dim}Syntax highlighting with bat-style output${ansi.reset}`)
      terminal.writeln(`    ${ansi.dim}Tag-based navigation and search${ansi.reset}`)
      terminal.writeln(`    ${ansi.dim}Fuzzy command suggestions${ansi.reset}`)
      terminal.writeln(`    ${ansi.dim}RSS/JSON feed support${ansi.reset}`)
      terminal.writeln('')

      terminal.writeln(`  ${ansi.brightRed}●${ansi.reset} ${ansi.bold}Links${ansi.reset}`)
      terminal.writeln(`    ${ansi.brightCyan}Source:${ansi.reset}         ${ansi.dim}https://github.com/yourusername/terminal-blog${ansi.reset}`)
      terminal.writeln(`    ${ansi.brightCyan}Report Bug:${ansi.reset}     ${ansi.dim}https://github.com/yourusername/terminal-blog/issues${ansi.reset}`)
      terminal.writeln('')

      terminal.writeln(`  ${ansi.dim}Type ${ansi.reset}${ansi.green}help${ansi.reset}${ansi.dim} to see all commands${ansi.reset}`)
      terminal.writeln(`  ${ansi.dim}Type ${ansi.reset}${ansi.green}stats${ansi.reset}${ansi.dim} for detailed analytics${ansi.reset}`)
      terminal.writeln('')
    },
  },
  {
    name: 'whoami',
    description: 'About the blog author',
    handler: (_args, ctx) => {
      const { terminal } = ctx
      terminal.writeln('')
      terminal.writeln(`${ansi.brightCyan}${ansi.bold}Sourabh Shirhatti${ansi.reset}`)
      terminal.writeln(`  ${ansi.dim}Builder, Product Manager, and Developer${ansi.reset}`)
      terminal.writeln('')
      terminal.writeln(`  ${ansi.brightGreen}Email:${ansi.reset}      ${ansi.dim}sourabh\u200B[AT]\u200Bmail\u200B.\u200Bshirhatti\u200B.\u200Bcom${ansi.reset}`)
      terminal.writeln(`  ${ansi.brightGreen}GitHub:${ansi.reset}     ${formatLink('https://github.com/shirhatti', `${ansi.dim}https://github.com/shirhatti${ansi.reset}`)}`)
      terminal.writeln(`  ${ansi.brightGreen}Twitter:${ansi.reset}    ${formatLink('https://twitter.com/sshirhatti', `${ansi.dim}https://twitter.com/sshirhatti${ansi.reset}`)}`)
      terminal.writeln(`  ${ansi.brightGreen}LinkedIn:${ansi.reset}   ${formatLink('https://linkedin.com/in/shirhatti', `${ansi.dim}https://linkedin.com/in/shirhatti${ansi.reset}`)}`)
      terminal.writeln('')
    },
  },
  {
    name: 'bat',
    description: 'Alias for cat (prettier output)',
    handler: (args, ctx) => {
      // Just call cat with the same args
      const catCmd = commands.find((c) => c.name === 'cat')
      if (catCmd) {
        return catCmd.handler(args, ctx)
      }
    },
  },
  {
    name: 'exit',
    description: 'Exit the terminal (just kidding)',
    aliases: ['q'],
    handler: (_args, ctx) => {
      const { terminal } = ctx
      terminal.writeln('')
      terminal.writeln(`${ansi.dim}Nice try! But you can't escape that easily...${ansi.reset}`)
      terminal.writeln(`${ansi.dim}Just close the browser tab if you really want to leave.${ansi.reset}`)
      terminal.writeln('')
    },
  },
  {
    name: '..',
    description: 'Go back home',
    handler: (_args, ctx) => {
      const { terminal, navigate } = ctx
      terminal.clear()
      terminal.writeln('')
      terminal.writeln(formatHeader('Welcome Back!'))
      terminal.writeln('')
      terminal.writeln(`${ansi.dim}Navigated to home. Type ${ansi.reset}${ansi.green}help${ansi.reset}${ansi.dim} to see available commands.${ansi.reset}`)
      terminal.writeln('')
      navigate('/')
    },
  },
  {
    name: 'stats',
    description: 'Show blog statistics (htop-style)',
    handler: (_args, ctx) => {
      const { terminal, posts } = ctx
      const stats = calculateStats(posts)
      const topTags = getTopTags(stats.tags, 10)

      // Header bar (htop-style with inverted colors)
      terminal.writeln('')
      terminal.writeln(`${ansi.bold}\x1b[7m btop - blog monitor \x1b[27m${ansi.reset}                                     ${ansi.dim}${new Date().toLocaleString()}${ansi.reset}`)
      terminal.writeln('')

      // CPU-style meters (repurposed for blog metrics)
      const postUsage = Math.min(100, (stats.totalPosts / 50) * 100) // Max 50 posts = 100%
      const wordUsage = Math.min(100, (stats.totalWords / 50000) * 100) // Max 50k words = 100%
      const tagUsage = Math.min(100, (stats.tags.size / 20) * 100) // Max 20 tags = 100%

      // Posts meter
      const postBar = renderMeter('Posts', stats.totalPosts, postUsage)
      terminal.writeln(postBar)

      // Words meter
      const wordBar = renderMeter('Words', stats.totalWords, wordUsage)
      terminal.writeln(wordBar)

      // Tags meter
      const tagBar = renderMeter('Tags', stats.tags.size, tagUsage)
      terminal.writeln(tagBar)

      terminal.writeln('')

      // Memory-style stats (repurposed for averages)
      const avgWords = stats.averageWordsPerPost
      const avgWordsBar = renderBar(Math.min(100, (avgWords / 500) * 100), 30)
      terminal.writeln(`  ${ansi.brightCyan}Avg words/post:${ansi.reset} ${avgWordsBar} ${ansi.bold}${avgWords}${ansi.reset}`)

      if (stats.oldestPost && stats.newestPost) {
        const daysSinceFirst = Math.floor((new Date().getTime() - new Date(stats.oldestPost.date).getTime()) / (1000 * 60 * 60 * 24))
        const postsPerMonth = stats.totalPosts / (daysSinceFirst / 30)
        const velocityBar = renderBar(Math.min(100, postsPerMonth * 20), 30)
        terminal.writeln(`  ${ansi.brightCyan}Posts/month:${ansi.reset}    ${velocityBar} ${ansi.bold}${postsPerMonth.toFixed(1)}${ansi.reset}`)
      }

      terminal.writeln('')

      // Process table header (htop-style)
      terminal.writeln(`  ${ansi.bold}\x1b[7m PID   TAG              %CPU  POSTS  COMMAND ${' '.repeat(20)}\x1b[27m${ansi.reset}`)

      // Top tags as "processes"
      topTags.slice(0, 8).forEach(([tag, count], idx) => {
        const pid = (1000 + idx).toString().padStart(5)
        const cpu = ((count / stats.totalPosts) * 100).toFixed(1).padStart(5)
        const tagName = tag.padEnd(16)
        const postCount = count.toString().padStart(6)
        const command = `blog/${tag}`

        // Color code by usage
        const cpuNum = parseFloat(cpu)
        let cpuColor: string = ansi.brightGreen
        if (cpuNum > 30) cpuColor = ansi.brightYellow
        if (cpuNum > 50) cpuColor = ansi.brightRed

        terminal.writeln(`  ${ansi.dim}${pid}${ansi.reset}  ${ansi.brightWhite}${tagName}${ansi.reset} ${cpuColor}${cpu}${ansi.reset}  ${ansi.bold}${postCount}${ansi.reset}  ${ansi.dim}${command}${ansi.reset}`)
      })

      terminal.writeln('')

      // Footer (htop-style help hints)
      terminal.writeln(`${ansi.dim}─────────────────────────────────────────────────────────────────────────────${ansi.reset}`)
      terminal.writeln(`${ansi.brightGreen}F1${ansi.reset}${ansi.dim}Help ${ansi.reset}${ansi.brightGreen}F2${ansi.reset}${ansi.dim}Setup ${ansi.reset}${ansi.brightGreen}F3${ansi.reset}${ansi.dim}Search ${ansi.reset}${ansi.brightGreen}F9${ansi.reset}${ansi.dim}List ${ansi.reset}${ansi.brightGreen}F10${ansi.reset}${ansi.dim}Quit${ansi.reset}`)
      terminal.writeln(`${ansi.dim}Hint: Try ${ansi.reset}${ansi.green}ls${ansi.reset}${ansi.dim}, ${ansi.reset}${ansi.green}cat <slug>${ansi.reset}${ansi.dim}, or ${ansi.reset}${ansi.green}help${ansi.reset}`)
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
        'It\'s not a bug – it\'s an undocumented feature.',
        'Code never lies, comments sometimes do.',
        'Premature optimization is the root of all evil.',
        'Good code is its own best documentation.',
        'The best performance improvement is the transition from the nonworking state to the working state.']

      const fortune = fortunes[Math.floor(Math.random() * fortunes.length)]

      terminal.writeln('')
      terminal.writeln(`${ansi.bold}${ansi.brightCyan}╔═══════════════════════════════════════════════════════════╗${ansi.reset}`)
      terminal.writeln(`${ansi.bold}${ansi.brightCyan}║${ansi.reset}  ${ansi.brightYellow}✨ Your Fortune${ansi.reset}                                        ${ansi.bold}${ansi.brightCyan}║${ansi.reset}`)
      terminal.writeln(`${ansi.bold}${ansi.brightCyan}╚═══════════════════════════════════════════════════════════╝${ansi.reset}`)
      terminal.writeln('')

      // Word wrap the fortune
      const words = fortune.split(' ')
      const lines = []
      let currentLine = ''
      const maxWidth = 55

      words.forEach(word => {
        if ((currentLine + word).length > maxWidth) {
          lines.push(currentLine.trim())
          currentLine = word + ' '
        } else {
          currentLine += word + ' '
        }
      })
      if (currentLine) lines.push(currentLine.trim())

      lines.forEach(line => {
        terminal.writeln(`  ${ansi.dim}"${line}${ansi.reset}${ansi.dim}"${ansi.reset}`)
      })

      terminal.writeln('')
    },
  },
  {
    name: 'sl',
    description: 'Steam Locomotive (typo of ls)',
    hidden: true,
    handler: async (_args, ctx) => {
      const { terminal } = ctx

      terminal.writeln('')
      terminal.writeln(`${ansi.dim}Did you mean 'ls'? Here comes the train...${ansi.reset}`)
      terminal.writeln('')

      const frames = [
        [
          '      ====        ________                ___________ ',
          '  _D _|  |_______/        \\__I_I_____===__|_________| ',
          '   |(_)---  |   H\\________/ |   |        =|___ ___|   ',
          '   /     |  |   H  |  |     |   |         ||_| |_||   ',
          '  |      |  |   H  |__--------------------| [___] |   ',
          '  | ________|___H__/__|_____/[][]~\\_______|       |   ',
          '  |/ |   |-----------I_____I [][] []  D   |=======|__ '],
        [
          '                 ====        ________                ___________ ',
          '             _D _|  |_______/        \\__I_I_____===__|_________| ',
          '              |(_)---  |   H\\________/ |   |        =|___ ___|   ',
          '              /     |  |   H  |  |     |   |         ||_| |_||   ',
          '             |      |  |   H  |__--------------------| [___] |   ',
          '             | ________|___H__/__|_____/[][]~\\_______|       |   ',
          '             |/ |   |-----------I_____I [][] []  D   |=======|__ ']]

      for (let i = 0; i < 4; i++) {
        const frame = frames[i % 2]
        frame.forEach(line => terminal.writeln(ansi.brightYellow + line + ansi.reset))

        // Wait before next frame
        if (i < 3) {
          await new Promise(resolve => setTimeout(resolve, 300))
          // Clear the frame
          for (let j = 0; j < frame.length; j++) {
            terminal.write('\x1b[1A') // Move up one line
            terminal.write('\x1b[2K') // Clear line
          }
        }
      }

      terminal.writeln('')
      terminal.writeln(`${ansi.dim}Maybe try 'ls' next time?${ansi.reset}`)
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

// Helper function to get man page content
function getManPage(command: string): ManPage | null {
  const pages: Record<string, ManPage> = {
    ls: {
      name: 'ls - list blog posts',
      synopsis: `${ansi.bold}ls${ansi.reset} [${ansi.underline}OPTION${ansi.reset}]...`,
      description: [
        'List all blog posts in the terminal blog.',
        '',
        'By default, displays a compact list of post titles sorted by date (newest first).',
        'Use options to customize the output format and sorting order.'],
      options: [
        {
          flag: '-l, --long',
          description: 'Use a long listing format with metadata (date, word count, reading time)',
        },
        {
          flag: '-a, --all',
          description: 'Show all metadata including tags and full descriptions',
        },
        {
          flag: '--sort=FIELD',
          description: 'Sort by FIELD: "date" (default) or "title"',
        }],
      examples: [
        'ls               List all posts (compact format)',
        'ls -l            List with metadata',
        'ls -a            List with all metadata including tags',
        'ls --sort=title  Sort posts alphabetically by title',
        'll               Alias for ls -l'],
      seeAlso: ['cat(1)'],
    },
    cat: {
      name: 'cat - display blog post content',
      synopsis: `${ansi.bold}cat${ansi.reset} ${ansi.underline}POST-NAME${ansi.reset}`,
      description: [
        'Read and display a blog post with syntax highlighting.',
        '',
        'The output uses bat-style formatting with line numbers, git-style diffs,',
        'and syntax highlighting for code blocks. Post content is rendered with',
        'enhanced readability using terminal colors and formatting.'],
      examples: [
        'cat welcome              Display the "welcome" post',
        'cat my-first-post        Display post by slug name',
        'bat welcome              Alternative command (bat is an alias for cat)'],
      seeAlso: ['ls(1)', 'less(1)', 'bat(1)'],
    },
    less: {
      name: 'less - read a blog post in the pager',
      synopsis: `${ansi.bold}less${ansi.reset} ${ansi.underline}POST-NAME${ansi.reset}`,
      description: [
        'Open a blog post in the HTML pager with proportional fonts.',
        '',
        'The pager provides a reading experience with proper heading sizes,',
        'bold/italic formatting, and native scrolling. Supports vim-style',
        'keyboard navigation and touch scrolling on mobile.'],
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
        'less welcome             Open "welcome" in the pager',
        'less my-first-post       Open post by slug name'],
      seeAlso: ['cat(1)', 'ls(1)'],
    },
    stats: {
      name: 'stats - display blog statistics',
      synopsis: `${ansi.bold}stats${ansi.reset}`,
      description: [
        'Display comprehensive blog statistics in an htop-style interface.',
        '',
        'Shows metrics including total posts, word count, tags, posting velocity,',
        'and a breakdown of the most popular tags. The output uses a btop-inspired',
        'design with colorful meters and progress bars.'],
      examples: [
        'stats                Show blog statistics dashboard'],
      seeAlso: ['about(1)', 'ls(1)'],
    },
    man: {
      name: 'man - display manual pages',
      synopsis: `${ansi.bold}man${ansi.reset} [${ansi.underline}COMMAND${ansi.reset}]`,
      description: [
        'Display the manual page for a command.',
        '',
        'Manual pages provide detailed documentation for terminal blog commands,',
        'including syntax, options, examples, and related commands.',
        '',
        'Without arguments, lists all available manual pages.'],
      examples: [
        'man                  List all available manual pages',
        'man ls               Display the ls manual',
        'man man              Display this manual (meta!)'],
      seeAlso: ['help(1)'],
    },
    help: {
      name: 'help - show available commands',
      synopsis: `${ansi.bold}help${ansi.reset}`,
      description: [
        'Display a quick reference of all available commands.',
        '',
        'Shows a compact list of commands with brief descriptions and aliases.',
        'For detailed documentation on a specific command, use man(1).'],
      examples: [
        'help                 Show all commands',
        'h                    Alias for help'],
      seeAlso: ['man(1)'],
    },
    clear: {
      name: 'clear - clear the terminal screen',
      synopsis: `${ansi.bold}clear${ansi.reset}`,
      description: [
        'Clear the terminal screen and scrollback buffer.',
        '',
        'This command removes all output from the screen, providing a clean slate.',
        'Command history is preserved and can still be accessed with arrow keys.'],
      examples: [
        'clear                Clear the screen',
        'c                    Alias for clear'],
      seeAlso: [],
    },
    about: {
      name: 'about - information about this blog',
      synopsis: `${ansi.bold}about${ansi.reset}`,
      description: [
        'Display information about the terminal blog.',
        '',
        'Shows the technology stack, philosophy, content statistics, features,',
        'and useful links. Provides an overview of what makes this blog unique.'],
      examples: [
        'about                Show blog information'],
      seeAlso: ['stats(1)', 'help(1)'],
    },
  }

  return pages[command] || null
}

// Helper functions for htop-style stats display
function renderMeter(label: string, value: number, percentage: number): string {
  const barLength = 40
  const filled = Math.floor((percentage / 100) * barLength)

  // Create colored bar segments
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
      bar += `${color}█${ansi.reset}`
    } else {
      bar += `${ansi.dim}░${ansi.reset}`
    }
  }

  bar += ']'
  return bar
}
