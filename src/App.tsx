import ConfigPanel from '@/components/ConfigPanel'

function App() {
  return (
    <div className="h-screen flex flex-col">
      {/* 配置区 */}
      <div className="h-[280px] bg-blue-50 border-b border-blue-200 overflow-hidden">
        <ConfigPanel />
      </div>

      {/* 3D 回放区 */}
      <div className="flex-1 bg-gray-100 flex items-center justify-center">
        <p className="text-gray-600 font-medium">3D 回放区（仿真后显示）</p>
      </div>

      {/* 数据展示区 */}
      <div className="h-[250px] bg-green-50 border-t border-green-200 flex items-center justify-center">
        <p className="text-green-800 font-medium">数据展示区（图表 + 报告）</p>
      </div>
    </div>
  )
}

export default App