import ConfigPanel from '@/components/ConfigPanel'
import PlaybackPanel from '@/components/PlaybackPanel'
import DataPanel from '@/components/DataPanel'

function App() {
  return (
    <div className="h-screen flex flex-col">
      <!-- 配置区 -->
      <div className="h-[300px] bg-blue-50 border-b border-blue-200 overflow-hidden">
        <ConfigPanel />
      </div>

      <!-- 3D 回放区 -->
      <div className="flex-1 bg-gray-900">
        <PlaybackPanel />
      </div>

      <!-- 数据展示区 -->
      <div className="h-[250px] bg-white border-t border-gray-200">
        <DataPanel />
      </div>
    </div>
  )
}

export default App
