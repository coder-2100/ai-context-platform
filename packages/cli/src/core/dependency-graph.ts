/** 循环依赖检测结果：环路路径数组（首尾相同），无环路时返回 null */
export type CycleResult = string[] | null;

/**
 * 使用 DFS 检测依赖图中的环路
 * @param graph 依赖图：包名 → 其直接依赖包名集合
 * @returns 环路路径（首尾相同），无环路返回 null
 */
export function detectCircularDependency(
  graph: Map<string, Set<string>>,
): CycleResult {
  const visited = new Set<string>();
  const stack: string[] = [];

  for (const node of graph.keys()) {
    if (visited.has(node)) continue;
    const cycle = dfs(graph, node, visited, stack);
    if (cycle) return cycle;
  }

  return null;
}

/** DFS 递归遍历，维护访问栈检测回边 */
function dfs(
  graph: Map<string, Set<string>>,
  node: string,
  visited: Set<string>,
  stack: string[],
): CycleResult {
  visited.add(node);
  stack.push(node);

  const deps = graph.get(node) || new Set<string>();
  for (const dep of deps) {
    const cycleIdx = stack.indexOf(dep);
    if (cycleIdx !== -1) {
      return [...stack.slice(cycleIdx), dep];
    }
    if (!visited.has(dep)) {
      const result = dfs(graph, dep, visited, stack);
      if (result) return result;
    }
  }

  stack.pop();
  return null;
}
