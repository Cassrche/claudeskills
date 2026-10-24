/**
 * User and Authentication Types
 * Aligned with Better-Auth / Prisma schema (@repo/auth)
 */

export interface User {
  id: string
  email: string
  name: string | null
  avatarUrl: string | null
  role: UserRole
  plan: UserPlan
  createdAt: Date
  updatedAt: Date
  preferences: UserPreferences
}

export type UserRole = 'user' | 'admin' | 'moderator'

export type UserPlan = 'free' | 'professional' | 'enterprise'

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system'
  language: string
  emailNotifications: boolean
  progressReminders: boolean
  learningPath: string | null
}

export interface UserProgress {
  ruleId: string
  completed: boolean
  completedAt?: Date
  notes?: string
}

export interface UserProject {
  id: string
  userId: string
  name: string
  description: string | null
  createdAt: Date
  updatedAt: Date
  rules: ProjectRule[]
}

export interface ProjectRule {
  ruleId: string
  status: 'pending' | 'in_progress' | 'completed' | 'not_applicable'
  notes: string | null
  assignedTo: string | null
  dueDate: Date | null
}

export interface LearningPath {
  id: string
  name: string
  description: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  estimatedHours: number
  rules: LearningPathRule[]
  prerequisites: string[]
}

export interface LearningPathRule {
  ruleId: string
  order: number
  isRequired: boolean
  learningObjectives: string[]
}

export interface Certificate {
  id: string
  userId: string
  learningPathId: string
  completedAt: Date
  score: number
  verificationCode: string
}
