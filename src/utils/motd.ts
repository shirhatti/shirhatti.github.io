// Messages of the day - tips and quotes for terminal users
export const motdMessages = [
  "Pro tip: Use Tab to autocomplete commands and post names",
  "Did you know? Arrow keys navigate your command history",
  "Shortcut: Ctrl+L clears the screen (same as 'clear')",
  "Try 'ls -l' for detailed post listings with dates and tags",
  "Fun fact: This blog is built with React and xterm.js",
  "Keyboard ninja: Ctrl+C cancels the current input",
  "Use 'cat' or 'bat' to read posts with syntax highlighting",
  "Terminal wisdom: Less is more, unless you're reading blogs",
  "The best interface is the one you don't have to think about",
  "Real programmers use the terminal. You're in good company.",
  "Remember: Type 'help' anytime to see available commands",
  "Hidden feature: Try the 'stats' command for blog analytics",
  "Power user tip: '..' takes you back home instantly",
  "Your command history is saved - use up/down arrows to browse",
  "Quality over quantity: Every post here is worth your time",
]

export function getRandomMotd(): string {
  const index = Math.floor(Math.random() * motdMessages.length)
  return motdMessages[index]
}

export function getTipOfTheDay(): string {
  // Use date as seed for consistent tip per day
  const today = new Date()
  const dayOfYear = Math.floor(
    (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000
  )
  const index = dayOfYear % motdMessages.length
  return motdMessages[index]
}
