import { describe, it, expect } from 'vitest'
import { SkillFrontmatterSchema } from '../src/skill'

describe('SkillFrontmatterSchema', () => {
  it('接受有效的 skill frontmatter', () => {
    const result = SkillFrontmatterSchema.safeParse({
      id: 'react-review-skill',
      type: 'skill',
      priority: 'medium',
      appliesTo: ['review'],
    })
    expect(result.success).toBe(true)
  })

  it('拒绝缺少 id', () => {
    const result = SkillFrontmatterSchema.safeParse({ type: 'skill' })
    expect(result.success).toBe(false)
  })

  it('拒绝非 skill 类型', () => {
    const result = SkillFrontmatterSchema.safeParse({ id: 'my-skill', type: 'agent' })
    expect(result.success).toBe(false)
  })

  it('默认 type 为 skill', () => {
    const result = SkillFrontmatterSchema.parse({ id: 'my-skill' })
    expect(result.type).toBe('skill')
  })

  it('默认 priority 为 medium', () => {
    const result = SkillFrontmatterSchema.parse({ id: 'my-skill' })
    expect(result.priority).toBe('medium')
  })
})
