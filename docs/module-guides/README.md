# 前端模块开发指南索引

## 1. 使用方式

- 开发任一前端模块前，先读取：
  - `D:\Graduation project\frontend\AGENTS.md`
  - `D:\Graduation project\backend\docs\progress\前端并发开发模块清单.md`
  - `D:\Graduation project\backend\docs\api\API接口设计文档.md`
- 然后读取本目录对应的 `FE-xx-*.md` 文件。
- 每次只认领一个模块编号，减少多人同时改同一页面组的冲突。
- 页面字段以后端 API 文档为准，发现差异时优先回看契约。

## 2. 模块文件清单

1. `FE-01-公共壳层与认证模块开发指南.md`
2. `FE-02-概览与统计模块开发指南.md`
3. `FE-03-用户部门角色模块开发指南.md`
4. `FE-04-人脸采集模块开发指南.md`
5. `FE-05-考勤打卡与个人记录模块开发指南.md`
6. `FE-06-异常与预警模块开发指南.md`
7. `FE-07-人工复核模块开发指南.md`
8. `FE-08-系统配置模块开发指南.md`

补充文档：

- `前端模块开发新会话启动模板.md`

## 3. 推荐顺序

1. `FE-01`
2. `FE-03`
3. `FE-04`
4. `FE-05`
5. `FE-06`
6. `FE-07`
7. `FE-02`
8. `FE-08`

## 4. 共同约束

- 技术栈固定为 `Vue3 + Element Plus`。
- 当前仓库已有 `src/api`、`assets`、`components`、`layout`、`router`、`store`、`utils`、`views` 目录骨架。
- `FE-01` 负责补齐前端可运行基础壳层和认证能力。
- 页面实现尽量不跨模块侵入。
