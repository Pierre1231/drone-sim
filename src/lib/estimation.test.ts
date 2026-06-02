import { describe, it, expect } from 'vitest'
import { estimateHoverPerformance } from './estimation'

describe('estimateHoverPerformance', () => {
  it('should estimate hover time and current for a typical F450 config', () => {
    // DJI F450 典型配置
    const result = estimateHoverPerformance({
      totalWeightKg: 1.5,      // 1.5kg 整机
      propDiameterIn: 9.4,     // 9450 桨，9.4 英寸
      batteryCapacityMah: 5000,// 5000mAh
      batteryCells: 4,         // 4S
      motorEfficiency: 0.75,   // 75% 效率
    })

    // 验证输出结构
    expect(result).toHaveProperty('hoverTimeMin')
    expect(result).toHaveProperty('currentA')

    // 验证数量级合理（F450 约 10-20 分钟，电流约 10-20A）
    expect(result.hoverTimeMin).toBeGreaterThan(5)
    expect(result.hoverTimeMin).toBeLessThan(30)
    expect(result.currentA).toBeGreaterThan(5)
    expect(result.currentA).toBeLessThan(30)
  })

  it('should return higher hover time for lighter drone', () => {
    const light = estimateHoverPerformance({
      totalWeightKg: 0.5,
      propDiameterIn: 5,
      batteryCapacityMah: 3000,
      batteryCells: 3,
      motorEfficiency: 0.75,
    })

    const heavy = estimateHoverPerformance({
      totalWeightKg: 2.0,
      propDiameterIn: 5,
      batteryCapacityMah: 3000,
      batteryCells: 3,
      motorEfficiency: 0.75,
    })

    expect(light.hoverTimeMin).toBeGreaterThan(heavy.hoverTimeMin)
  })

  it('should return higher hover time for larger battery', () => {
    const smallBattery = estimateHoverPerformance({
      totalWeightKg: 1.0,
      propDiameterIn: 8,
      batteryCapacityMah: 2000,
      batteryCells: 4,
      motorEfficiency: 0.75,
    })

    const largeBattery = estimateHoverPerformance({
      totalWeightKg: 1.0,
      propDiameterIn: 8,
      batteryCapacityMah: 6000,
      batteryCells: 4,
      motorEfficiency: 0.75,
    })

    expect(largeBattery.hoverTimeMin).toBeGreaterThan(smallBattery.hoverTimeMin)
  })

  it('should throw error for invalid inputs', () => {
    expect(() =>
      estimateHoverPerformance({
        totalWeightKg: 0,
        propDiameterIn: 10,
        batteryCapacityMah: 5000,
        batteryCells: 4,
        motorEfficiency: 0.75,
      })
    ).toThrow()

    expect(() =>
      estimateHoverPerformance({
        totalWeightKg: 1,
        propDiameterIn: 0,
        batteryCapacityMah: 5000,
        batteryCells: 4,
        motorEfficiency: 0.75,
      })
    ).toThrow()
  })
})
