import { TerminalWindow } from './components/TerminalWindow/TerminalWindow'
import { LazyTerminal } from './components/Terminal/LazyTerminal'

export default function App() {
  return (
    <TerminalWindow>
      <LazyTerminal />
    </TerminalWindow>
  )
}
