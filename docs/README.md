# 前端文档索引

## 1. 文档说明

本目录用于集中维护前端模块开发说明、界面改造说明和历史设计/计划归档。

- 当前运行、构建、测试和环境变量口径，优先查看 [../README.md](../README.md)。
- 单机摄像头部署、活体联调和答辩口径，优先查看后端文档中的 [../backend/docs/integration/phase5-local-runbook.md](../backend/docs/integration/phase5-local-runbook.md) 对应章节。
- 当前模块开发入口，优先查看 [module-guides/README.md](module-guides/README.md)。
- 当前界面层改造说明，查看 [前端UI改造说明.md](前端UI改造说明.md)。
- 历史设计稿与实施计划归档，查看 [superpowers/README.md](superpowers/README.md)。

## 2. 当前口径优先级

- 本地启动、测试、构建命令以 [../README.md](../README.md) 和 `package.json` 为准。
- 代理、环境变量和开发服务器行为以 [../README.md](../README.md)、`../.env.example`、`../vite.config.js` 为准。
- 路由、权限和页面实际行为以 `../src/router/`、`../src/store/`、`../src/views/`、`../src/api/` 的当前实现为准。

## 3. 分类索引

### 3.1 模块开发指南

- [module-guides/README.md](module-guides/README.md)
  - 用途：汇总 `FE-01` 到 `FE-08` 的模块开发指南和新会话启动模板。
  - 何时查看：准备实现某个业务模块、确认模块边界和前后端接口依赖时。

### 3.2 界面改造说明

- [前端UI改造说明.md](前端UI改造说明.md)
  - 用途：记录控制台风格改造、公共组件抽象和页面层视觉收口说明。
  - 何时查看：需要理解当前 UI 设计来源、页面风格约束或展示口径时。

### 3.3 历史设计与计划归档

- [superpowers/README.md](superpowers/README.md)
  - 用途：说明 `superpowers/` 目录中的历史设计稿与实施计划如何阅读，以及当前口径应以哪些文件为准。
  - 何时查看：需要回溯历史方案、阶段性实现计划或对比旧口径与当前口径差异时。

## 4. 使用建议

- 日常开发或联调，先看仓库根 `README.md`，再根据任务进入本目录对应文档。
- 如果历史文档中的命令、页面结构或实现细节与当前仓库行为不一致，优先采用“当前口径优先级”中的文件，不逐篇回写旧记录。
