export interface Employee {
  id: string
  badge_code: string
  name: string
  department: string | null
  role: string | null
  active: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export type TimeEventType = 'check_in' | 'lunch_out' | 'lunch_in' | 'check_out'

export type ScanSource = 'scanner' | 'camera' | 'manual'

export interface TimeEvent {
  id: string
  employee_id: string
  event_type: TimeEventType
  event_time: string
  source: ScanSource
  created_at: string
}

export interface EmployeeDayStatus {
  employee: Employee
  events: TimeEvent[]
  nextEvent: TimeEventType | null
}

export const EVENT_LABELS: Record<TimeEventType, string> = {
  check_in: 'Entrada',
  lunch_out: 'Saída p/ almoço',
  lunch_in: 'Volta do almoço',
  check_out: 'Saída',
}

export const EVENT_ORDER: TimeEventType[] = ['check_in', 'lunch_out', 'lunch_in', 'check_out']
