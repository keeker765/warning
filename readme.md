# Binance Guardian Dashboard

一个使用 React + Vite 构建的 Binance 实时数据可视化应用示例。它展示了常用的行情图表、订单深度、最新成交，并提供前端可配置的价格预警。

## 功能亮点

- 📈 **多图表展示**：K 线图、深度图、实时成交列表与关键指标卡片。
- 🔔 **预警系统**：支持自定义价格上下触发条件，提供本地通知与视觉提示。
- 🔄 **实时更新**：通过 Binance 官方 WebSocket 流实时刷新行情、深度与成交数据。
- 🎨 **精美界面**：现代化玻璃拟态风格界面，支持响应式布局。

## 快速开始

```bash
cd frontend
npm install
npm run dev
```

> 需要 Node.js 16+ 环境。

应用将默认在 `http://localhost:5173` 运行。

## 测试与依赖安装

- 运行 `npm install` 会安装所有前端依赖。当前环境连接公共 npm registry 时返回 `403 Forbidden`，导致安装失败；如在本地开发，请确保能够访问 `https://registry.npmjs.org/` 或配置企业镜像。
- 依赖安装成功后，可执行 `npm run build` 或 `npm run test`（如配置测试脚本）验证构建与功能。

## 目录结构

```
frontend/
├── index.html
├── package.json
├── src/
│   ├── App.tsx
│   ├── components/
│   │   ├── alerts/
│   │   ├── charts/
│   │   └── trade/
│   ├── hooks/
│   ├── styles/
│   ├── types/
│   └── main.tsx
└── vite.config.ts
```

## 注意事项

- Binance 公共 API 有频率限制，若出现429错误请稍后再试。
- 浏览器需支持 WebSocket 并允许访问外部网络。
- 预警配置存储在浏览器 `localStorage` 中。

欢迎根据需要扩展指标、增加更多可视化以及与后端服务集成的功能。
