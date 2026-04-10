# attendance-frontend

考勤系统前端仓库，基于 Vue 3 + Vite 构建，面向浏览器端的签到、登录与地图相关页面开发与调试。

## 技术栈

- Vue 3
- Vue Router 4
- Pinia
- Element Plus
- Axios
- Vite 5
- Vitest + jsdom

## 环境要求

- Node.js：建议使用 `18` 及以上版本
- npm：使用随 Node.js 安装的 npm 即可，建议保持为当前 Node 版本配套版本

安装依赖：

```bash
npm install
```

## 本地配置

项目通过 Vite 环境变量读取前端接口地址、后端代理目标和地图 Key。仓库提供了 `.env.example` 作为示例模板，本地开发时请先将其复制为 `.env.local`，再填写自己的值。

`.env.local` 会覆盖示例值，适合保存本机开发配置；不要把真实密钥直接写回 `.env.example`。

示例：

```env
VITE_API_BASE_URL=/api
VITE_API_PROXY_TARGET=http://127.0.0.1:8080
VITE_AMAP_KEY=你的高德地图开发 Key
```

变量说明：

- `VITE_API_BASE_URL`：前端请求接口的基础路径，当前示例为 `/api`
- `VITE_API_PROXY_TARGET`：本地开发时 Vite 代理转发的后端地址，默认回落到 `http://127.0.0.1:8080`
- `VITE_AMAP_KEY`：地图功能使用的高德地图 Key，缺失时地图相关能力无法正常工作

## 本地启动

启动开发服务器：

```bash
npm run dev
```

项目未额外指定开发端口时，Vite 默认使用 `5173`。启动后可在浏览器打开本地开发地址进行调试。

## 文档入口

- 当前前端文档入口：`docs/README.md`
- 模块开发指南入口：`docs/module-guides/README.md`
- 历史设计与计划归档入口：`docs/superpowers/README.md`

说明：当前运行、构建、代理和环境变量口径以本 README 为准；历史设计稿与实施计划仅用于回溯，不作为当前仓库行为的唯一依据。

## 常用命令

```bash
npm run dev
npm test
npm run build
```

- `npm run dev`：启动本地开发服务器
- `npm test`：运行 Vitest 单元测试，使用 `jsdom` 环境一次性执行测试
- `npm run build`：执行生产构建，产出部署用静态资源

## 与后端代理的关系

开发环境下，前端仍然以 `VITE_API_BASE_URL` 指向的路径发起请求。当前示例值为 `/api`，Vite 会把以 `/api` 开头的请求代理到 `VITE_API_PROXY_TARGET` 指向的后端服务。

按当前配置，常见联调方式如下：

- 前端请求：`/api/...`
- Vite 代理目标：`http://127.0.0.1:8080`
- 实际效果：浏览器访问开发服务器时，由 Vite 把接口请求转发给本地后端，避免直接跨域

需要注意：这个代理只在 `npm run dev` 的开发服务器中生效。生产构建完成后，仍需由部署环境提供正确的后端地址或反向代理规则。

## 常见问题

### 1. 代理失败

表现：前端请求返回 `ECONNREFUSED`、`502`、超时，或者浏览器里接口一直报错。

排查方式：

- 确认后端服务已经启动
- 确认 `.env.local` 中的 `VITE_API_PROXY_TARGET` 指向正确地址和端口
- 如果后端不在本机，改成实际可访问的内网或远程地址
- 修改环境变量后，重新执行 `npm run dev`

### 2. 登录失败

表现：页面能打开，但登录接口失败、提示账号密码错误或接口未授权。

排查方式：

- 先确认代理是否正常，避免请求根本没有到达后端
- 确认后端数据库、测试账号或认证配置已经准备好
- 检查前端当前使用的 `VITE_API_BASE_URL` 是否仍为 `/api`，避免请求打到错误路径

### 3. 地图 Key 缺失

表现：地图不显示、地图脚本加载失败，或者控制台提示缺少 Key。

排查方式：

- 在 `.env.local` 中填写有效的 `VITE_AMAP_KEY`
- 确认使用的是对应环境可用的高德地图 Key
- 修改后重启开发服务器，确保新环境变量已生效

## 验证建议

在修改依赖、环境变量或文档后，可至少执行以下命令确认当前仓库可正常测试与构建：

```bash
npm test
npm run build
```
