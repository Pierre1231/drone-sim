import type { SimResult } from './simulation'

export type DocumentComparisonVerdict = 'pass' | 'warn' | 'fail'

export interface DocumentComparisonRow {
  metric: string
  expected: string
  actual: string
  error: string
  tolerance: string
  verdict: DocumentComparisonVerdict
}

export interface DocumentComparison {
  title: string
  rows: DocumentComparisonRow[]
  note: string
}

export type DocumentComparisonMission =
  | 'hover'
  | 'circle'
  | 'fullspeed'
  | 'test-hover'
  | 'test-circle'
  | 'test-circle-7'

function average(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length
}

function firstIndexAtOrAfter(time: number[], target: number): number {
  const idx = time.findIndex(t => t >= target)
  return idx >= 0 ? idx : time.length - 1
}

function sliceByTime<T>(result: SimResult, values: T[], start: number, end: number): T[] {
  const startIdx = firstIndexAtOrAfter(result.time, start)
  const endIdx = firstIndexAtOrAfter(result.time, end)
  return values.slice(startIdx, Math.max(startIdx + 1, endIdx))
}

function verdictForAbsError(error: number, tolerance: number): DocumentComparisonVerdict {
  if (error <= tolerance) return 'pass'
  if (error <= tolerance * 2) return 'warn'
  return 'fail'
}

function fmt(value: number, unit = ''): string {
  return `${value.toFixed(3)}${unit ? ` ${unit}` : ''}`
}

function makeRow(
  metric: string,
  actual: number,
  expected: number,
  tolerance: number,
  unit = ''
): DocumentComparisonRow {
  const error = actual - expected
  return {
    metric,
    expected: fmt(expected, unit),
    actual: fmt(actual, unit),
    error: `${error >= 0 ? '+' : ''}${fmt(error, unit)}`,
    tolerance: `±${tolerance}${unit ? ` ${unit}` : ''}`,
    verdict: verdictForAbsError(Math.abs(error), tolerance),
  }
}

function cutoffIndex(result: SimResult): number {
  const idx = result.soc.findIndex(s => s <= 0.2)
  return idx >= 0 ? idx : result.time.length - 1
}

function compareHover(result: SimResult): DocumentComparisonRow[] {
  const idx600 = firstIndexAtOrAfter(result.time, 600)
  const idxCutoff = cutoffIndex(result)
  const stablePower = average(sliceByTime(result, result.power, 20, 120))
  const stableThrust = average(sliceByTime(result, result.totalThrust, 20, 120))

  return [
    makeRow('稳态电池功率', stablePower, 339.373061, 8, 'W'),
    makeRow('稳态总推力', stableThrust, 14.715, 0.5, 'N'),
    makeRow('600 s 后 SOC', result.soc[idx600], 0.697615, 0.02),
    makeRow('到 SOC=20% 的时间', result.time[idxCutoff], 1491.0, 120, 's'),
    makeRow('SOC=20% 时电压', result.voltage[idxCutoff], 19.6740, 0.7, 'V'),
    makeRow('SOC=20% 时电流', result.current[idxCutoff], 17.2498, 1.0, 'A'),
  ]
}

function compareFullSpeed(result: SimResult): DocumentComparisonRow[] {
  const idx600 = firstIndexAtOrAfter(result.time, 600)
  const idxCutoff = cutoffIndex(result)
  const power = average(sliceByTime(result, result.power, 20, 120))

  return [
    makeRow('稳态电池功率', power, 341.223962, 8, 'W'),
    makeRow('600 s 后 SOC', result.soc[idx600], 0.695826, 0.02),
    makeRow('到 SOC=20% 的时间', result.time[idxCutoff], 1482.5, 120, 's'),
    makeRow('SOC=20% 时电压', result.voltage[idxCutoff], 19.6670, 0.7, 'V'),
    makeRow('SOC=20% 时电流', result.current[idxCutoff], 17.3500, 1.0, 'A'),
  ]
}

function compareCircle(result: SimResult, targetSpeed: 2 | 7): DocumentComparisonRow[] {
  const start = targetSpeed === 2 ? 10 : 20
  const end = Math.min(120, result.time[result.time.length - 1])
  const power = average(sliceByTime(result, result.power, start, end))
  const expectedPower = targetSpeed === 2 ? 341.294069 : 578.013196
  const expectedSoc600 = targetSpeed === 2 ? 0.695758 : 0.449874
  const expectedEndurance = targetSpeed === 2 ? 1482.1 : 842.6
  const idxCutoff = cutoffIndex(result)
  const idx600 = firstIndexAtOrAfter(result.time, 600)

  return [
    makeRow('稳态电池功率', power, expectedPower, targetSpeed === 2 ? 8 : 30, 'W'),
    makeRow('600 s 后 SOC', result.soc[idx600], expectedSoc600, targetSpeed === 2 ? 0.02 : 0.04),
    makeRow('到 SOC=20% 的时间', result.time[idxCutoff], expectedEndurance, targetSpeed === 2 ? 120 : 80, 's'),
  ]
}

export function buildDocumentComparison(
  missionType: DocumentComparisonMission | null | string,
  result: SimResult
): DocumentComparison {
  if (missionType === 'test-hover' || missionType === 'hover') {
    return {
      title: 'B01 全链路悬停',
      rows: compareHover(result),
      note: '对照《四旋翼仿真测试用例.md》B01：5 m 悬停、6S 8Ah、电池截止 SOC=20%。',
    }
  }
  if (missionType === 'fullspeed') {
    return {
      title: 'B02 水平匀速 5 m/s',
      rows: compareFullSpeed(result),
      note: '对照《四旋翼仿真测试用例.md》B02 输出表：稳态 Pbat、SOC(600s)、SOC20 时间、电压和电流。',
    }
  }
  if (missionType === 'test-circle' || missionType === 'circle') {
    return {
      title: 'B03 圆形轨迹 2 m/s',
      rows: compareCircle(result, 2),
      note: '只判定文档 B03 表格中明确给出的输出：稳态 Pbat、SOC(600s)、到 SOC=20% 的时间。',
    }
  }
  if (missionType === 'test-circle-7') {
    return {
      title: 'B03 圆形轨迹 7 m/s',
      rows: compareCircle(result, 7),
      note: '只判定文档 B03 表格中明确给出的输出：稳态 Pbat、SOC(600s)、到 SOC=20% 的时间。',
    }
  }
  return {
    title: '未匹配文档工况',
    rows: [],
    note: '请选择 B01 悬停、B02 5m/s 直线、B03 圆轨迹 2m/s 或 B03 圆轨迹 7m/s 后运行仿真。',
  }
}
