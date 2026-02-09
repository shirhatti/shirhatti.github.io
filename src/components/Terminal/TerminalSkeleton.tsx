import * as stylex from '@stylexjs/stylex'

const pulse = stylex.keyframes({
  '0%': { opacity: 0.6 },
  '50%': { opacity: 1 },
  '100%': { opacity: 0.6 },
})

const shimmer = {
  animationName: pulse,
  animationDuration: '1.5s',
  animationTimingFunction: 'ease-in-out',
  animationIterationCount: 'infinite',
} as const

const styles = stylex.create({
  skeleton: {
    padding: 20,
    minHeight: 400,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  line: {
    height: 16,
    background:
      'linear-gradient(90deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.1) 50%, rgba(255, 255, 255, 0.05) 100%)',
    borderRadius: 4,
    ...shimmer,
  },
  prompt: {
    height: 16,
    width: 200,
    background:
      'linear-gradient(90deg, rgba(0, 255, 0, 0.1) 0%, rgba(0, 255, 0, 0.2) 50%, rgba(0, 255, 0, 0.1) 100%)',
    borderRadius: 4,
    marginTop: 20,
    ...shimmer,
  },
  w80: { width: '80%' },
  w60: { width: '60%' },
})

export function TerminalSkeleton() {
  return (
    <div {...stylex.props(styles.skeleton)}>
      <div {...stylex.props(styles.line)} />
      <div {...stylex.props(styles.line, styles.w80)} />
      <div {...stylex.props(styles.line, styles.w60)} />
      <div {...stylex.props(styles.prompt)} />
    </div>
  )
}
