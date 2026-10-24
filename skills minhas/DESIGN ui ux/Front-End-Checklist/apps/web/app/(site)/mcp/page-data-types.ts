export interface ToolParameter {
  name: string
  type: string
  required: boolean
  description: string
}
export interface McpToolConfig {
  name: string
  title: string
  icon: string
  description: string
  useCase: string
  parameters: ToolParameter[]
  example: string
}
export interface SetupConfig {
  id: string
  title: string
  description: string
  config: string
}
export interface FaqItem {
  question: string
  answer: string
}
export interface ExamplePrompt {
  prompt: string
  description?: string
}
export interface TroubleshootingItem {
  title: string
  content: string
}
