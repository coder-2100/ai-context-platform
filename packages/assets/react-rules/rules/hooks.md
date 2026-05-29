---
id: react-hooks-rules
priority: high
layer: stack
appliesTo: [review, implement]
---

# React Hooks Rules

## Principles
- Hooks are for stateful logic, not for code organization alone
- Keep hooks small and focused
- Prefer custom hooks for reusable stateful logic

## Forbidden
- Calling hooks inside conditions, loops, or nested functions
- Using useEffect for derived state (use useMemo instead)
- Stale closures from missing dependencies
- useEffect chains that depend on each other's setState

## Recommended
- Include all reactive values in useEffect dependencies
- Use useCallback for event handlers passed as props
- Use useMemo for expensive computations
- Clean up effects (subscriptions, timers, event listeners)
- Use useRef for values that should not trigger re-renders

## Common Pitfalls
- Forgetting cleanup in useEffect → memory leaks
- Missing dependency in useEffect → stale data bugs
- Creating objects/arrays inline in render → unnecessary re-renders
- Using state for derived values → unnecessary re-renders
