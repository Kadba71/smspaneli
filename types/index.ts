export interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'user'
  createdAt: string | Date
}

export interface SmsLog {
  id: string
  userId: string
  phoneNumber: string
  message: string
  status: 'queued' | 'processing' | 'success' | 'failed'
  apiResponse?: string | null
  lastError?: string | null
  attemptCount?: number
  processingStartedAt?: string | Date | null
  updatedAt?: string | Date
  createdAt: string | Date
  user?: Pick<User, 'id' | 'name' | 'email'>
}

export interface SmsTemplate {
  id: string
  title: string
  message: string
  isActive: boolean
  createdAt: string | Date
  updatedAt: string | Date
}

export interface AuthUser {
  id: string
  email: string
  name: string
  role: 'admin' | 'user'
}

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface DailySmsQuota {
  limit: number
  used: number
  remaining: number
  exhausted: boolean
}

export interface StatsData {
  totalPersonnel: number
  todaySmsCount: number
  todaySuccessCount: number
  todayFailedCount: number
  todayQueuedCount: number
  todayProcessingCount: number
  successRate: number
  activeUsers: number
}

export interface UserProxy {
  id: string
  userId: string
  userName: string
  userEmail: string
  host: string
  port: number
  protocol: string
  assignedAt: string
  expiresAt: string
  lastError: string | null
  hasCredentials: boolean
}

export interface ProxySummary {
  totalUsers: number
  assignedCount: number
  expiredCount: number
  unassignedCount: number
}
