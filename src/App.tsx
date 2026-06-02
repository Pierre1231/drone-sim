function App() {
  return (
    <div className="h-screen flex flex-col">
      {/* 配置区 */}
      <div className="h-[200px] bg-blue-50 border-b border-blue-200 flex items-center justify-center">
        <p className="text-blue-800 font-medium">配置区（部件选型）</p>
      </div>

      {/* 3D 回放区 */}
      <div className="flex-1 bg-gray-100 flex items-center justify-center">
        <p className="text-gray-600 font-medium">3D 回放区</p>
      </div>

      {/* 数据展示区 */}
      <div className="h-[300px] bg-green-50 border-t border-green-200 flex items-center justify-center">
        <p className="text-green-800 font-medium">数据展示区（图表 + 报告）</p>
      </div>
    </div>
  )
}

export default App
