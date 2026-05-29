---
id: react-review-skill
type: skill
priority: medium
appliesTo: [review]
---

# React Review Skill

## Focus
- Rendering performance
- Stale closure detection
- Hydration mismatch risks
- Unnecessary re-renders

## Workflow
1. Inspect hooks dependencies
2. Inspect memoization strategy
3. Inspect async effects cleanup
4. Check component decomposition
5. Verify prop types and interfaces

## Checklist
- [ ] useEffect dependencies are complete and correct
- [ ] useMemo/useCallback used where needed (not overused)
- [ ] No inline object/function creation in render path
- [ ] Effects have proper cleanup
- [ ] Component is focused on single responsibility
- [ ] Props have TypeScript types
- [ ] No prop drilling beyond 2 levels
