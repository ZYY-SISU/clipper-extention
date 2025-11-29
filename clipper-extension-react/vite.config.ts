import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { crx, defineManifest } from '@crxjs/vite-plugin'

// 定义 Manifest V3 (这是 Chrome 插件的身份证)
const manifest = defineManifest({
  manifest_version: 3,
  name: "AI智能剪藏助手",
  version: "1.0.0",
  description: "智能结构化剪藏扩展",
  "icons": {
    "16": "icons/icon-16.png",
    "32": "icons/icon-32.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  },
  // 权限申请
  permissions: ["sidePanel", "activeTab", "scripting", "tabs", "storage"], 
  // 侧边栏配置
  side_panel: {
    default_path: "src/sidepanel/index.html"
  },
  // 顶部图标点击行为：打开侧边栏
  action: {
    default_title: "打开剪藏",
  },
  // vvvvvvvvvv 新增部分 vvvvvvvvvv
  //后台脚本，放置一些监听事件（在脚本中告诉它把“点击图标”和“打开侧边栏”关联起来。）
  background: {
    service_worker: "src/background/index.ts",
    type: "module" // 使用 ES Module 语法
  },
  host_permissions: [
    "http://localhost/*", 
    "http://127.0.0.1/*",
    "https://api.siliconflow.cn/*"
  ],

  // 注入页面的脚本
  content_scripts: [
    {
      matches: ["<all_urls>"],
      js: ["src/content/index.ts"]
    }
  ]
})

export default defineConfig({
  plugins: [
    react(),
    crx({ manifest }), // 使用 CRX 插件处理 manifest
  ],
  server: {
    port: 5174,
  },
  // 优化配置，解决大块代码警告
  build: {
    // 增加chunk大小警告限制
    chunkSizeWarningLimit: 1000, // 默认是500
    // 手动代码分割
    rollupOptions: {
      output: {
        manualChunks: {
          // 将react-markdown和相关插件单独打包
          'markdown': ['react-markdown', 'rehype-raw'],
          // 将第三方库分开打包
          'react-vendor': ['react', 'react-dom'],
          'lucide': ['lucide-react'],
        },
      },
    },
  }
})