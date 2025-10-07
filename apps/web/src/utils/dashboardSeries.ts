import type {
  DashboardChartSeries,
  DashboardMetricSeries,
  DashboardMetricSeriesPoint,
} from '@/types/api'

export type NormalizedSeriesMap = Record<string, DashboardMetricSeriesPoint[]>

export function normalizeChartSeries(
  input: DashboardChartSeries | null | undefined
): NormalizedSeriesMap {
  if (!input) {
    return {}
  }

  const result: NormalizedSeriesMap = {}

  const registerSeries = (key: string, points: DashboardMetricSeriesPoint[]) => {
    if (!key || points.length === 0) {
      return
    }
  const normalized = normalizeSeriesKey(key)
    if (!normalized) {
      return
    }
    if (!result[normalized] || result[normalized].length < points.length) {
      result[normalized] = points
    }
  }

  if (Array.isArray(input)) {
    input.forEach((entry) => {
      if (!entry) {
        return
      }
      const typedEntry = entry as DashboardMetricSeries
      const points = normalizeSeriesPoints(typedEntry.points ?? typedEntry.values ?? typedEntry.data)
      if (points.length === 0) {
        return
      }
      const candidates = [typedEntry.id, typedEntry.metric, typedEntry.label].filter(
        (candidate): candidate is string => typeof candidate === 'string' && candidate.trim().length > 0
      )
      if (candidates.length === 0) {
        registerSeries('series', points)
      }
      candidates.forEach((candidate) => registerSeries(candidate, points))
    })
    return result
  }

  if (typeof input === 'object') {
    Object.entries(input).forEach(([key, value]) => {
      if (!value) {
        return
      }
      if (Array.isArray(value)) {
        registerSeries(key, normalizeSeriesPoints(value))
        return
      }
      if (typeof value === 'object') {
        const typedValue = value as DashboardMetricSeries
        const points = normalizeSeriesPoints(typedValue.points ?? typedValue.values ?? typedValue.data)
        registerSeries(key, points)
        if (typeof typedValue.id === 'string') {
          registerSeries(typedValue.id, points)
        }
        if (typeof typedValue.metric === 'string') {
          registerSeries(typedValue.metric, points)
        }
      }
    })
  }

  return result
}

export function filterSeriesByRange(
  points: DashboardMetricSeriesPoint[],
  range: '7d' | '30d' | '90d'
): DashboardMetricSeriesPoint[] {
  if (points.length <= 1) {
    return points
  }

  const windowInDays = range === '7d' ? 7 : range === '30d' ? 30 : 90
  const cutoff = Date.now() - windowInDays * 24 * 60 * 60 * 1000

  const filtered = points.filter((point) => {
    if (typeof point.ts === 'number') {
      return point.ts >= cutoff
    }
    return true
  })

  const dataset = filtered.length > 0 ? filtered : points
  return dataset.slice(-60)
}

export interface SparklineGeometry {
  path: string
  lastX: number
  lastY: number
}

export function buildSparklineGeometry(
  points: DashboardMetricSeriesPoint[]
): SparklineGeometry | null {
  if (points.length === 0) {
    return null
  }

  const cleanPoints = points.filter(
    (point): point is DashboardMetricSeriesPoint & { value: number } =>
      typeof point.value === 'number' && Number.isFinite(point.value)
  )

  if (cleanPoints.length === 0) {
    return null
  }

  if (cleanPoints.length === 1) {
    return { path: 'M0,50 L100,50', lastX: 100, lastY: 50 }
  }

  const values = cleanPoints.map((point) => point.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const valueRange = max - min || 1

  const coordinates = cleanPoints.map((point, index) => {
    const x = (index / (cleanPoints.length - 1)) * 100
    const y = 100 - ((point.value - min) / valueRange) * 100
    return { x, y }
  })

  const path = coordinates
    .map((coord, index) => `${index === 0 ? 'M' : 'L'}${coord.x},${coord.y}`)
    .join(' ')

  const lastPoint = coordinates[coordinates.length - 1]

  return { path, lastX: lastPoint.x, lastY: lastPoint.y }
}

function normalizeSeriesPoints(source: unknown): DashboardMetricSeriesPoint[] {
  if (!Array.isArray(source)) {
    return []
  }

  const points = source
    .map((point) => normalizeSeriesPoint(point))
    .filter((point): point is DashboardMetricSeriesPoint => point !== null)

  return sortSeriesPoints(points)
}

function normalizeSeriesPoint(input: unknown): DashboardMetricSeriesPoint | null {
  if (typeof input === 'number' && Number.isFinite(input)) {
    return { value: input }
  }

  if (!input || typeof input !== 'object') {
    return null
  }

  const candidate = input as Record<string, unknown>
  const valueCandidate =
    candidate.value ??
    candidate.y ??
    candidate.count ??
    candidate.total ??
    candidate.amount ??
    candidate.metric ??
    candidate.rate

  const value =
    typeof valueCandidate === 'number'
      ? valueCandidate
      : typeof valueCandidate === 'string'
      ? Number(valueCandidate)
      : undefined

  if (typeof value !== 'number' || Number.isNaN(value)) {
    return null
  }

  const rawTimestamp =
    candidate.timestamp ??
    candidate.ts ??
    candidate.date ??
    candidate.time ??
    candidate.period ??
    candidate.x ??
    null

  const parsedTs = parsePointTimestamp(rawTimestamp)

  return {
    value,
    timestamp: typeof rawTimestamp === 'string' ? rawTimestamp : undefined,
    ts: parsedTs,
  }
}

export function normalizeSeriesKey(key: string): string {
  if (!key.trim()) {
    return ''
  }
  const withUnderscore = key.replace(/([a-z0-9])([A-Z])/g, '$1_$2')
  return withUnderscore.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_')
}

function parsePointTimestamp(raw: unknown): number | undefined {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return raw
  }
  if (typeof raw === 'string') {
    const parsed = Date.parse(raw)
    if (!Number.isNaN(parsed)) {
      return parsed
    }
  }
  return undefined
}

function sortSeriesPoints(points: DashboardMetricSeriesPoint[]): DashboardMetricSeriesPoint[] {
  if (points.length <= 1) {
    return points
  }

  const withIndex = points.map((point, index) => ({ point, index }))

  withIndex.sort((a, b) => {
    const aTs = a.point.ts
    const bTs = b.point.ts

    if (typeof aTs === 'number' && typeof bTs === 'number') {
      if (aTs === bTs) {
        return a.index - b.index
      }
      return aTs - bTs
    }

    if (typeof aTs === 'number') {
      return -1
    }

    if (typeof bTs === 'number') {
      return 1
    }

    return a.index - b.index
  })

  return withIndex.map((entry) => entry.point)
}

