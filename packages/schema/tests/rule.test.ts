import { describe, it, expect } from 'vitest'
import { RuleFrontmatterSchema } from '../src/rule'

describe('RuleFrontmatterSchema', () => {
  it('接受有效的 rule frontmatter', () => {
    const result = RuleFrontmatterSchema.safeParse({
      id: 'react-hooks-rules',
      priority: 'high',
      layer: 'stack',
      appliesTo: ['review', 'implement'],
    })
    expect(result.success).toBe(true)
  })

  it('接受仅含 id 的最小 frontmatter', () => {
    const result = RuleFrontmatterSchema.safeParse({ id: 'my-rule' })
    expect(result.success).toBe(true)
  })

  it('拒绝缺少 id', () => {
    const result = RuleFrontmatterSchema.safeParse({ priority: 'high' })
    expect(result.success).toBe(false)
  })

  it('拒绝无效的 priority', () => {
    const result = RuleFrontmatterSchema.safeParse({ id: 'my-rule', priority: 'urgent' })
    expect(result.success).toBe(false)
  })

  it('默认 priority 为 medium', () => {
    const result = RuleFrontmatterSchema.parse({ id: 'my-rule' })
    expect(result.priority).toBe('medium')
  })

  it('默认 appliesTo 为空数组', () => {
    const result = RuleFrontmatterSchema.parse({ id: 'my-rule' })
    expect(result.appliesTo).toEqual([])
  })
})
