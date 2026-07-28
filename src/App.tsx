import { OrgProvider } from './context/OrgContext'
import { AppShell } from './dlt/AppShell'
import TilesApp from './TilesApp'

// Tiles is unchanged and still the whole app for anyone without a DLT seat.
// AppShell only adds navigation for people who have one.
export default function App() {
  return (
    <OrgProvider>
      <AppShell tiles={<TilesApp />} />
    </OrgProvider>
  )
}
