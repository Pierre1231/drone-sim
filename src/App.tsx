import ConfigPanel from '@/components/ConfigPanel'
import PlaybackPanel from '@/components/PlaybackPanel'
import DataPanel from '@/components/DataPanel'
import InfoPanel from '@/components/InfoPanel'

function App() {
  return (
    <div className="h-screen flex flex-col">
      <div className="h-[300px] bg-blue-50 border-b border-blue-200 overflow-hidden">
        <ConfigPanel />
      </div>

      <div className="flex-1 bg-gray-900">
        <PlaybackPanel />
      </div>

      <div className="h-[250px] bg-white border-t border-gray-200">
        <DataPanel />
      </div>

      <InfoPanel />
    </div>
  )
}

export default App
