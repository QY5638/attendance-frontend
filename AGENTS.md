# 前端项目开发规范

当前开发目录为 `D:\Graduation project\frontend`。

## 语言与输出

- 默认使用中文回答。
- 代码注释使用中文。
- 回答尽量简洁，先给结论，再给必要说明。

## 技术栈

- 使用 `Vue3 + Element Plus`。
- 优先沿用现有目录结构：`views`、`components`、`api`、`store`、`router`。
- 修改前端前先阅读相关实现，优先最小必要改动。

## 协同约束

- 涉及接口、字段、鉴权、角色权限时，先读取：
  - `D:\Graduation project\backend\docs\api\API接口设计文档.md`
  - `D:\Graduation project\backend\docs\requirements\需求规格说明书.md`
- 不主动修改后端代码、SQL 或后端文档，除非任务明确要求。

## 风险操作

- 安装或卸载依赖、删除文件、批量替换、创建提交、推送、PR 前先确认。

## 验证规则

- 完成改动后，优先运行与本次改动直接相关的最小验证。
- 优先覆盖页面加载、构建检查、接口联调。
