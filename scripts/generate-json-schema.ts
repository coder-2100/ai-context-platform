import { writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { zodToJsonSchema } from 'zod-to-json-schema'
import {
  ManifestSchema,
  RuleFrontmatterSchema,
  SkillFrontmatterSchema,
  AgentFrontmatterSchema,
  ConfigSchema,
  LockfileSchema,
} from '../packages/schema/src/index.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const schemasDir = resolve(__dirname, '..', 'schemas')

mkdirSync(schemasDir, { recursive: true })

const schemas = [
  { name: 'manifest', schema: ManifestSchema },
  { name: 'rule', schema: RuleFrontmatterSchema },
  { name: 'skill', schema: SkillFrontmatterSchema },
  { name: 'agent', schema: AgentFrontmatterSchema },
  { name: 'config', schema: ConfigSchema },
  { name: 'lockfile', schema: LockfileSchema },
]

for (const { name, schema } of schemas) {
  const jsonSchema = zodToJsonSchema(schema, {
    name: `${name}Schema`,
    target: 'jsonSchema7',
  })
  const outputPath = resolve(schemasDir, `${name}.schema.json`)
  writeFileSync(outputPath, JSON.stringify(jsonSchema, null, 2) + '\n')
  console.log(`已生成 ${outputPath}`)
}

console.log('完成。所有 JSON schema 已生成。')
