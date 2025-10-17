# Binance Guardian Dashboard

一个使用 React + Vite 构建的 Binance 实时数据可视化应用示例。它展示了常用的行情图表、订单深度、最新成交，并提供前端可配置的价格预警。

## 功能亮点

- 📈 **多图表展示**：K 线图、深度图、实时成交列表与关键指标卡片。
- 🔔 **预警系统**：支持自定义价格上下触发条件，提供本地通知与视觉提示。
- 🔄 **实时更新**：通过 Binance 永续合约 REST/WebSocket 数据源刷新行情、深度与成交数据。
- 🧠 **智能筛选**：根据价格与成交量的短期变化自动找出如“价涨量平”等潜在异动交易对。
- 📊 **合约洞察墙**：六张图同步追踪永续合约持仓量、大户多空占比、主动买卖量与基差变化。
- 🎯 **自定义期货对与周期**：支持输入任意合约交易对、选择最短到 15 秒的图表周期，并在合约监控面板中自由切换 1m / 2m / 5m / 15m / 1h 聚合。
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

- 运行 `npm install` 会安装所有前端依赖。若连接公共 npm registry 时遭遇 `403 Forbidden` 等错误，请确认网络权限或切换镜像源。
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
│   │   ├── analytics/
│   │   ├── charts/
│   │   └── trade/
│   ├── hooks/
│   │   ├── useCandles.ts
│   │   ├── useDepth.ts
│   │   ├── useFuturesAnalytics.ts
│   │   ├── useSymbolScreener.ts
│   │   └── ...
│   ├── styles/
│   ├── types/
│   └── main.tsx
└── vite.config.ts
```

## 注意事项

- Binance 公共 API 有频率限制，若出现429错误请稍后再试。
- 部分 Binance 合约数据在受限地区不可访问，组件会自动回退至内置示例数据并给出提示。
- 浏览器需支持 WebSocket 并允许访问外部网络。
- 预警配置及可选的 API Key 均存储在浏览器 `localStorage` 中。

欢迎根据需要扩展指标、增加更多可视化以及与后端服务集成的功能。
