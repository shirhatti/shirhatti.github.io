/**
 * Image processing utilities for inline terminal image display
 * Uses the iTerm2 inline image protocol via @xterm/addon-image
 */

interface ImagePlaceholder {
  fullMatch: string
  alt: string
  path: string
}

/**
 * Find all markdown image placeholders in content
 */
export function findImagePlaceholders(content: string): ImagePlaceholder[] {
  const regex = /!\[([^\]]*)\]\(([^)]+)\)/g
  const matches: ImagePlaceholder[] = []
  let match: RegExpExecArray | null

  while ((match = regex.exec(content)) !== null) {
    matches.push({
      fullMatch: match[0],
      alt: match[1],
      path: match[2],
    })
  }

  return matches
}

/**
 * Fetch an image URL and return its base64-encoded data
 */
async function fetchImageAsBase64(
  url: string,
): Promise<{ base64: string; size: number } | null> {
  try {
    const response = await fetch(url)
    if (!response.ok) return null

    const blob = await response.blob()
    const arrayBuffer = await blob.arrayBuffer()
    const bytes = new Uint8Array(arrayBuffer)

    // Convert to base64
    let binary = ''
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    const base64 = btoa(binary)

    return { base64, size: bytes.length }
  } catch {
    return null
  }
}

/**
 * Generate an iTerm2 inline image escape sequence
 */
function iterm2ImageSequence(
  base64: string,
  size: number,
  width: number,
): string {
  return `\x1b]1337;File=inline=1;size=${size};width=${width}:${base64}\x07`
}

/**
 * Process markdown content, replacing image placeholders with iTerm2 inline image sequences.
 * Falls back to [Image: alt text] if image fetch fails.
 */
export async function processImagesForTerminal(
  content: string,
  images: Record<string, string>,
  termCols: number,
): Promise<string> {
  const placeholders = findImagePlaceholders(content)
  if (placeholders.length === 0) return content

  const imageWidth = Math.min(termCols - 8, 72)
  let result = content

  for (const placeholder of placeholders) {
    const imageUrl = images[placeholder.path]
    if (!imageUrl) {
      // No matching image found, show fallback
      const fallback = placeholder.alt
        ? `\x1b[2m[Image: ${placeholder.alt}]\x1b[0m`
        : `\x1b[2m[Image]\x1b[0m`
      result = result.replace(placeholder.fullMatch, fallback)
      continue
    }

    const imageData = await fetchImageAsBase64(imageUrl)
    if (!imageData) {
      const fallback = placeholder.alt
        ? `\x1b[2m[Image: ${placeholder.alt}]\x1b[0m`
        : `\x1b[2m[Image]\x1b[0m`
      result = result.replace(placeholder.fullMatch, fallback)
      continue
    }

    const sequence = iterm2ImageSequence(
      imageData.base64,
      imageData.size,
      imageWidth,
    )
    // Add dim alt-text caption below the image
    const caption = placeholder.alt
      ? `\r\n\x1b[2m  ${placeholder.alt}\x1b[0m`
      : ''
    result = result.replace(placeholder.fullMatch, sequence + caption)
  }

  return result
}
