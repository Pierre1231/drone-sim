import partsData from '@/database/parts.json'
import type { PartsDatabase, Frame, Motor, Propeller, BatteryCell, ESC } from '@/types/parts'

const db = partsData as PartsDatabase

export function getDatabase(): PartsDatabase {
  return db
}

export function getFrames(): Frame[] {
  return db.frames
}

export function getMotors(): Motor[] {
  return db.motors
}

export function getPropellers(): Propeller[] {
  return db.propellers
}

export function getBatteryCells(): BatteryCell[] {
  return db.batteryCells
}

export function getESCs(): ESC[] {
  return db.escs
}

export function getFrameById(id: string): Frame | undefined {
  return db.frames.find(f => f.id === id)
}

export function getMotorById(id: string): Motor | undefined {
  return db.motors.find(m => m.id === id)
}

export function getPropellerById(id: string): Propeller | undefined {
  return db.propellers.find(p => p.id === id)
}

export function getBatteryCellById(id: string): BatteryCell | undefined {
  return db.batteryCells.find(b => b.id === id)
}

export function getESCById(id: string): ESC | undefined {
  return db.escs.find(e => e.id === id)
}
