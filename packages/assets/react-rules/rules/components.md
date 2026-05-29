---
id: react-components-rules
priority: medium
layer: stack
appliesTo: [review, implement]
---

# React Components Rules

## Principles
- One component per file
- Prefer function components with hooks
- Keep components focused on a single responsibility
- Extract reusable logic into custom hooks

## Forbidden
- Giant components (> 200 lines)
- Prop drilling more than 2 levels deep (use context or state management)
- Inline styles for complex layouts
- Direct DOM manipulation

## Recommended
- Use TypeScript for props and state
- Destructure props in function signature
- Use descriptive prop names
- Keep render method clean — extract complex logic to helpers
- Prefer controlled components over uncontrolled

## File Organization
- Component file name matches component name (PascalCase)
- Co-locate styles, tests, and stories with component
- Index file for public API of component directory
