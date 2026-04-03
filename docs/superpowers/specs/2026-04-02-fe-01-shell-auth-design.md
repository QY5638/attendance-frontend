# FE-01 公共壳层与认证模块设计

## 1. 背景

- 当前前端仓库仅保留 `src/api`、`src/assets`、`src/components`、`src/layout`、`src/router`、`src/store`、`src/utils`、`src/views` 空目录骨架，尚未具备可运行工程能力。
- `FE-01` 是后续 `FE-02 ~ FE-08` 的前置模块，必须先提供登录态、公共壳层、角色菜单和受保护路由。
- 后端当前已提供 `POST /api/auth/login`，实际返回字段为 `token`、`roleCode`、`realName`。

## 2. 目标与非目标

### 2.1 目标

- 提供可用的登录页 `/login`。
- 提供后台公共壳层，包含侧边菜单、顶部信息区和主内容区。
- 提供统一认证状态管理，支持登录、恢复登录态和退出登录。
- 提供基于 `roleCode` 的菜单过滤与路由守卫。
- 为 `FE-02 ~ FE-08` 预留路由和菜单挂载位，但不实现具体业务页面。
- 保持请求层结构可扩展，后续如需接入本地 mock，可在不重写认证主链路的前提下补充。

### 2.2 非目标

- 不实现用户、打卡、异常、统计、系统配置等具体业务逻辑。
- 不实现后端菜单接口、动态权限中心、按钮级权限控制。
- 不实现 refresh token、多端会话同步、SSO 等复杂认证能力。
- 不修改后端接口、数据库或后端文档。

## 3. 设计原则

- 采用“静态路由树 + 前端角色过滤”方案，优先保证 `FE-01` 快速稳定落地。
- 只做最小必要工程补齐：`Vite + Vue3 + Vue Router + Pinia + Axios + Element Plus`。
- 保持目录与职责清晰，尽量复用 `router meta` 生成菜单，避免维护两份配置。
- 首版只支持 `ADMIN` 与 `EMPLOYEE` 两类角色，未知角色视为无访问权限。
- 首版按 `npm run build` 作为最小构建验收标准。

## 4. 工程边界

### 4.1 允许落地的核心目录

- `src/views/`
- `src/layout/`
- `src/router/`
- `src/store/`
- `src/api/`
- `src/utils/`

### 4.2 为补齐可运行能力允许新增的最小工程文件

- `package.json`
- `vite.config.js`
- `index.html`
- `src/main.js`
- `src/App.vue`

说明：当前仓库缺少前端启动入口与依赖清单，上述文件属于 `FE-01` 为“可运行工程能力”补齐的最小范围，不视为跨模块侵入。

## 5. 整体架构

### 5.1 分层结构

1. 视图层
   - `views/login`：登录页与表单校验。
   - `views/placeholder`：通用占位页，承接尚未开发的业务模块。
   - `views/error`：`403` 页面。

2. 壳层层
   - `layout`：后台公共壳层，负责菜单、顶部栏、内容区布局。

3. 路由层
   - `router`：维护静态路由树、角色元信息、全局守卫。

4. 状态层
   - `store`：维护 `token`、`roleCode`、`realName` 及登录动作。

5. 基础设施层
   - `api`：认证请求封装。
   - `utils`：请求实例、token 持久化、本地工具方法。

### 5.2 登录主链路

1. 用户访问 `/login`。
2. 输入 `username`、`password` 并提交。
3. 前端调用 `POST /api/auth/login`。
4. 登录成功后，将 `token`、`roleCode`、`realName` 写入认证 store 与 `localStorage`。
5. 路由守卫放行并跳转到 `redirect` 或角色默认首页。
6. 后台壳层根据当前角色过滤路由并渲染菜单。

## 6. 技术栈与实现约束

- 构建工具：`Vite`
- 框架：`Vue3`
- 路由：`Vue Router`
- 状态管理：`Pinia`
- UI：`Element Plus`
- 请求库：`Axios`
- 语言：首版使用 `JavaScript`，暂不引入 `TypeScript`，以降低空骨架仓库的启动成本

说明：仓库内当前没有 `tsconfig.json`、`package.json` 或现成类型体系，首版保持最小实现，后续如项目统一转 `TypeScript` 再整体迁移。

## 7. 路由设计

### 7.1 路由层级

1. 公共路由
   - `/login`

2. 受保护根路由
   - `/`
   - 加载后台主壳层

3. 受保护业务子路由
   - `/dashboard`
   - `/statistics`
   - `/user`
   - `/department`
   - `/system/role`
   - `/face`
   - `/attendance`
   - `/exception`
   - `/warning`
   - `/review`
   - `/system`

4. 错误与兜底路由
   - `/403`
   - `/:pathMatch(.*)*`

### 7.2 路由元信息规范

每个受保护路由在 `meta` 中统一声明以下字段：

- `requiresAuth`：是否需要登录
- `title`：页面标题
- `menuGroup`：菜单分组名
- `roles`：允许访问的角色数组
- `icon`：菜单图标标识
- `hidden`：是否在侧边栏隐藏
- `moduleCode`：对应并发模块编号，如 `FE-02`

### 7.3 默认首页

- `ADMIN -> /dashboard`
- `EMPLOYEE -> /attendance`

如果未来默认首页所指向路由不再对当前角色开放，则回退到该角色的第一个可见菜单项。

## 8. 菜单设计

### 8.1 菜单分组

1. 工作台
   - `/dashboard`
   - `/statistics`

2. 基础资料
   - `/user`
   - `/department`
   - `/system/role`

3. 考勤业务
   - `/face`
   - `/attendance`

4. 风险与系统
   - `/exception`
   - `/warning`
   - `/review`
   - `/system`

### 8.2 角色菜单映射

#### ADMIN

- `/dashboard`
- `/statistics`
- `/user`
- `/department`
- `/system/role`
- `/attendance`
- `/exception`
- `/warning`
- `/review`
- `/system`

#### EMPLOYEE

- `/dashboard`
- `/face`
- `/attendance`

说明：首版 `EMPLOYEE` 仍保留 `/dashboard`，用于后续承接个人概览入口；即使当前为占位页，也能保持系统结构一致。

### 8.3 菜单生成规则

- 菜单直接基于静态路由表与 `meta` 信息生成。
- 不单独维护第二份菜单配置。
- `hidden = true` 的路由不出现在侧边栏，但仍可用于跳转页或错误页。

## 9. 页面与壳层设计

### 9.1 登录页

- 包含系统标题、用户名输入框、密码输入框、登录按钮。
- 使用 `Element Plus` 表单能力完成必填校验。
- 登录中显示按钮 loading，避免重复提交。
- 登录成功后按 `redirect -> 默认首页` 的优先级跳转。

### 9.2 后台主壳层

- 左侧：角色过滤后的菜单树。
- 顶部：系统标题、当前用户 `realName`、退出登录入口。
- 中间：`router-view` 内容区。
- 窄屏场景：允许侧边栏折叠，目标是“不崩、不遮挡”，不在 `FE-01` 做复杂后台响应式设计。

### 9.3 占位页

所有业务模块入口首版统一使用一个通用占位页展示以下信息：

- 模块标题
- 模块编号
- 当前路径
- 提示语“当前页面由对应并发模块继续开发”

这样可以避免为每个业务路由创建大量空实现页面，同时保持路由和菜单结构已就位。

### 9.4 403 页面

- 明确提示“当前账号无权访问该页面”。
- 提供返回首页按钮。

## 10. 认证状态设计

### 10.1 Store 状态

- `token`
- `roleCode`
- `realName`

### 10.2 Store 动作

- `login(payload)`：调用登录接口并写入状态
- `restore()`：应用启动时从本地持久化恢复状态
- `logout()`：清理状态并返回登录页
- `hasRole(routeRoles)`：判断当前角色是否在允许列表内

### 10.3 本地持久化

建议本地存储键名统一为：

- `attendance_token`
- `attendance_role_code`
- `attendance_real_name`

说明：键名显式、稳定，后续模块无需感知底层实现。

## 11. 请求层设计

### 11.1 请求实例

统一在 `utils/request` 中创建 `axios` 实例，作为全局请求入口。

### 11.2 请求拦截

- 如存在 `token`，自动追加请求头：`Authorization: Bearer <token>`。
- 登录接口本身不依赖已有 token。

### 11.3 响应拦截

- 遇到 `401` 或明确未登录响应时，清空认证状态并跳回 `/login`。
- 回跳时携带 `redirect` 参数，以便重新登录后恢复原目标页。
- 一般业务错误优先显示后端返回的 `message`。

### 11.4 mock 扩展策略

- 首版只对接真实登录接口。
- 认证 API 必须统一从 `api/auth` 暴露，避免登录页直接写死 `axios` 请求。
- 如后续需要本地 mock，只在 `api/auth` 或请求层增加分支，不改动页面、store、守卫主链路。

## 12. 路由守卫设计

### 12.1 守卫规则

1. 访问受保护路由且未登录：跳转 `/login?redirect=<原路径>`。
2. 已登录访问 `/login`：直接跳到角色默认首页。
3. 已登录但角色无权访问目标路由：跳转 `/403`。
4. 应用刷新时：先执行 `restore()`，再根据状态判断放行或拦截。

### 12.2 未知角色处理

- 若登录成功但 `roleCode` 不在支持列表中，立即清空认证状态。
- 提示“当前账号暂无系统访问权限”。
- 不进入后台壳层。

## 13. 错误处理

- 登录表单缺项：前端表单校验拦截，不发请求。
- 登录失败：优先展示后端 `message`；没有明确消息时显示“登录失败，请稍后重试”。
- token 失效：统一通过响应拦截清理状态并回到登录页。
- 手动访问无权限页面：进入 `/403`，不静默跳首页。
- 访问不存在页面：根据登录状态回退到登录页或当前角色默认首页。

## 14. 文件职责建议

- `package.json`：依赖与脚本定义
- `vite.config.js`：Vite 基础配置
- `src/main.js`：应用启动、注册路由/Pinia/Element Plus
- `src/App.vue`：顶层路由承载
- `src/api/auth.js`：登录请求
- `src/utils/request.js`：统一请求实例
- `src/utils/auth.js`：token 与用户信息读写
- `src/store/auth.js`：认证状态与动作
- `src/router/routes.js`：静态路由表
- `src/router/guard.js`：全局守卫
- `src/router/index.js`：路由实例组装
- `src/layout/MainLayout.vue`：后台壳层
- `src/views/login/LoginView.vue`：登录页
- `src/views/placeholder/ModulePlaceholderView.vue`：模块占位页
- `src/views/error/ForbiddenView.vue`：403 页面

## 15. 验收与最小验证

### 15.1 构建验证

- 执行 `npm run build` 成功。

### 15.2 功能验证

- 未登录访问后台任一路由会被拦截到 `/login`。
- 登录成功后可进入后台。
- `ADMIN` 和 `EMPLOYEE` 的菜单可见范围不同。
- 刷新页面后能恢复登录态。
- 访问无权限页面进入 `/403`。
- 退出登录后再次访问后台会被重新拦截。

## 16. 风险与后续演进

- 风险 1：后端未实现或字段与文档不一致时，首版只能保证结构和错误反馈，无法完成完整联调。
- 风险 2：若后续角色体系扩展为三类以上，需要同步补充路由 `meta.roles` 与默认首页映射。
- 风险 3：若后续需要更细粒度权限控制，应在现有静态路由方案上逐步演进，不应推翻登录、store 和请求层主链路。

后续 `FE-02 ~ FE-08` 接入时，只需在既有路由表中将占位页替换为真实页面，并保持既有 `meta` 约定不变。
