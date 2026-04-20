# Hermes TUI / Web Chat

Hermes Agent 的网页版聊天界面，替代 Windows 上无法运行的 TUI 终端交互。

## 🚀 快速开始

### 一键启动（Windows）

双击运行 `start-web-chat.bat`，脚本会自动：
1. 启动 Hermes Gateway（API Server 模式）
2. 打开浏览器进入聊天界面

### 手动启动

```bash
# 1. 启动 Hermes Gateway
hermes gateway run

# 2. 用浏览器打开 chat.html
# 或直接访问文件路径
```

## 📁 文件说明

| 文件 | 说明 |
|------|------|
| `chat.html` | 网页聊天界面（单文件，双击即用） |
| `start-web-chat.bat` | Windows 一键启动脚本 |
| `config.yaml.example` | Hermes 配置示例（含 DeepSeek + Kimi 双模型） |

## ✨ 功能特性

- 💬 **流式对话** — SSE 实时输出，打字机效果
- 🎨 **Markdown 渲染** — 代码高亮、表格、列表完整支持
- 💾 **本地会话管理** — 新建/切换/删除对话，记录保存在浏览器
- 🔄 **双模型驱动** — DeepSeek 默认，Kimi 自动 fallback
- 🔧 **完整工具调用** — 代码执行、文件操作、网页浏览等

## ⚙️ 前置配置

在 `config.yaml` 中添加：

```yaml
model:
  default: deepseek-chat
  provider: deepseek
  base_url: https://api.deepseek.com/v1

fallback_providers:
  - provider: kimi-for-coding
    model: kimi-for-coding

platforms:
  api_server:
    enabled: true
    extra:
      host: 127.0.0.1
      port: 8642
      cors_origins: "*"
```

在 `.env` 中配置 API Key：

```env
DEEPSEEK_API_KEY=sk-xxx
KIMI_API_KEY=sk-kimi-xxx
```

## 🌐 API 端点

Gateway 启动后，OpenAI 兼容 API 地址：

```
http://127.0.0.1:8642/v1/chat/completions
```

任何支持 OpenAI API 的前端（Open WebUI、LobeChat 等）都可以直接接入。

## 🖼️ 界面预览

- 深色主题设计
- 左侧会话列表
- 右侧聊天区域
- 底部输入框（支持 Shift+Enter 换行）

## 📄 许可证

MIT
