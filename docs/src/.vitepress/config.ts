import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'AI Context Platform',
  description: '企业级 AI Coding 知识管理',

  themeConfig: {
    nav: [
      { text: 'CLI', link: '/cli/getting-started' },
      { text: '资产', link: '/assets/overview' },
      { text: '架构', link: '/architecture/overview' },
    ],

    sidebar: {
      '/cli/': [
        { text: '快速开始', link: '/cli/getting-started' },
      ],
      '/assets/': [
        { text: '总览', link: '/assets/overview' },
      ],
      '/architecture/': [
        { text: '总览', link: '/architecture/overview' },
      ],
    },

    search: {
      provider: 'local',
    },
  },
})
