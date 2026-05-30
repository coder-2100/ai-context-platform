// plopfile.js — AI Context Platform 知识资产包脚手架配置
module.exports = (plop) => {
  // kebabCase helper：将输入转为 kebab-case（小写连字符）
  plop.setHelper("kebabCase", (text) => {
    return plop
      .getHelper("camelCase")(text)
      .replace(/([a-z])([A-Z])/g, "$1-$2")
      .toLowerCase();
  });

  // entryDir helper：根据包类型生成入口目录名
  plop.setHelper("entryDir", (type) => {
    const dirMap = {
      rules: "rules",
      skills: "skills",
      agents: "agents",
      domains: "domains",
      playbooks: "playbooks",
      meta: "rules",
    };
    return dirMap[type] || "rules";
  });

  // entryField helper：根据包类型生成 entry 中的字段名
  plop.setHelper("entryField", (type) => {
    const fieldMap = {
      rules: "rules",
      skills: "skills",
      agents: "agents",
      domains: "domains",
      playbooks: "playbooks",
      meta: "rules",
    };
    return fieldMap[type] || "rules";
  });

  // otherEntries helper：返回除主入口外的其他 entry 字段（用于 manifest.yaml 模板）
  plop.setHelper("otherEntries", (type) => {
    const all = [
      "rules",
      "skills",
      "agents",
      "domains",
      "playbooks",
      "templates",
    ];
    const main = plop.getHelper("entryField")(type);
    return all.filter((e) => e !== main);
  });

  // layerDesc helper：根据层级生成中文描述
  plop.setHelper("layerDesc", (layer) => {
    const descMap = {
      core: "所有项目的基础规范，在上下文组装中始终优先加载",
      stack: "技术栈规范，依赖 core 层基础规范",
      domain: "业务领域规范，描述特定业务场景的知识",
      project: "项目特有规范，仅适用于当前项目",
    };
    return descMap[layer] || "自定义层级";
  });

  plop.setGenerator("package", {
    description: "创建新的 AI Context 知识资产包",
    prompts: [
      {
        type: "input",
        name: "name",
        message: "包短名（用于 @coder-2100/<name>）",
        validate: (value) => {
          if (!value) return "包名不能为空";
          if (!/^[a-z][a-z0-9-]*$/.test(value))
            return "包名只能包含小写字母、数字和连字符，且以字母开头";
          return true;
        },
      },
      {
        type: "list",
        name: "type",
        message: "包类型",
        choices: ["rules", "skills", "agents", "domains", "playbooks", "meta"],
      },
      {
        type: "list",
        name: "layer",
        message: "层级",
        choices: ["core", "stack", "domain", "project"],
      },
      {
        type: "input",
        name: "description",
        message: "描述",
        validate: (value) => (value ? true : "描述不能为空"),
      },
      {
        type: "list",
        name: "priority",
        message: "优先级",
        choices: ["critical", "high", "medium", "low"],
        default: "medium",
      },
      {
        type: "input",
        name: "tags",
        message: "标签（逗号分隔，如 react,frontend）",
        filter: (value) =>
          value
            ? value
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean)
            : [],
      },
      {
        type: "checkbox",
        name: "compatibleTools",
        message: "适配工具",
        choices: [
          { name: "claude-code", value: "claude-code", checked: true },
          { name: "codex", value: "codex" },
          { name: "trae", value: "trae" },
          { name: "gemini", value: "gemini" },
        ],
      },
      {
        type: "input",
        name: "author",
        message: "作者（可留空）",
        default: "",
      },
    ],
    actions: [
      // package.json
      {
        type: "add",
        path: "packages/assets/{{kebabCase name}}/package.json",
        templateFile: "templates/package-template/package.json.hbs",
      },
      // manifest.yaml
      {
        type: "add",
        path: "packages/assets/{{kebabCase name}}/manifest.yaml",
        templateFile: "templates/package-template/manifest.yaml.hbs",
      },
      // README.md
      {
        type: "add",
        path: "packages/assets/{{kebabCase name}}/README.md",
        templateFile: "templates/package-template/README.md.hbs",
      },
      // CHANGELOG.md
      {
        type: "add",
        path: "packages/assets/{{kebabCase name}}/CHANGELOG.md",
        templateFile: "templates/package-template/CHANGELOG.md.hbs",
      },
      // 入口目录 .gitkeep
      {
        type: "add",
        path: "packages/assets/{{kebabCase name}}/{{entryDir type}}/.gitkeep",
        template: "",
      },
      // 完成提示（使用自定义 action 输出提示信息）
      (data) => {
        const name = plop.getHelper("kebabCase")(data.name);
        const entryDir = plop.getHelper("entryDir")(data.type);
        console.log(
          [
            "",
            `✅ 创建包 @coder-2100/${name} 于 packages/assets/${name}/`,
            "",
            "下一步：",
            "1. 编辑 manifest.yaml 的 entry 字段，替换 .gitkeep 为实际规则文件",
            "2. 编辑 appliesTo 字段，指定适用的 task 类型",
            `3. 在 ${entryDir}/ 目录下编写内容文件`,
            "4. 运行 pnpm validate 验证包格式",
            "",
          ].join("\n"),
        );
        return `Created @coder-2100/${name}`;
      },
    ],
  });
};
