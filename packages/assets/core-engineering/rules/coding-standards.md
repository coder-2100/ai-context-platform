---
id: core-coding-standards
priority: high
layer: core
appliesTo: [review, implement, debug, migration, architecture, test]
---

# Core Coding Standards

## Principles
- Prefer composition over inheritance
- Small functions with single responsibility (< 50 lines)
- Explicit over implicit
- Fail fast with clear error messages

## Forbidden
- Nested callback chains (use async/await)
- Mutable global state
- Silent error swallowing
- God objects or god functions

## Recommended
- Use TypeScript strict mode
- Prefer const, use let only when necessary
- Return early to reduce nesting
- Name variables and functions to reveal intent
- Write self-documenting code; add comments only for non-obvious WHY

## Error Handling
- Always handle rejected promises
- Use specific error types, not generic Error
- Include context in error messages
- Validate inputs at system boundaries

## Testing
- Test behavior, not implementation
- One assertion per test case (conceptually)
- Test edge cases and error paths
- Use descriptive test names
