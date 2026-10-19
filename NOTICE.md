# 来源与改造说明

本项目基于 MIT 许可的 **Yu-tao-Li/dsh-computer-use-win** 开发。

- 来源：https://github.com/Yu-tao-Li/dsh-computer-use-win
- 导入版本：0.4.3；导入提交：`822ca8e`（完整 Git 历史保留）。
- 更早上游：https://github.com/cgissing/windows-computer-use
- 原始版权：Copyright (c) 2026 Yu-tao-Li；Copyright (c) 2026 cgissing。
- 新增与改造代码：Copyright (c) 2026 shinji00222。

保留的原始资料与源代码位于 `upstream/`，用于追溯与迁移核对，不参与新版构建和运行。其相对路径仍以原项目为背景，不应把归档测试当作新版通过的测试。

新 TypeScript 工具目录派生自上游的工具 schema 和参数约定；C# 引擎参考上游对 UIA、DPI、输入释放、截图与停止的处理经验，按模块重新实现。原适配器和 PowerShell 引擎不会由新版运行时调用。

理念的区别：本项目侧重原生 C# 引擎、目标窗口绑定和操作结果验证，因此作为独立项目继续开发。这不表示原项目没有类似能力，也不表示本项目已经比原项目更成熟。

MIT 许可全文与全部原版权声明保留在根目录 `LICENSE`。再分发源码、插件包和二进制时请一并保留。

## 运行依赖

MCP TypeScript SDK（MIT）、Ajv（MIT）、TypeScript（Apache-2.0，仅构建）以及 Microsoft .NET/Windows SDK（按各自发行许可）。自包含发布目录包含 .NET 提供的许可文件；插件包还包含运行时 npm 依赖各自的许可证。Windows 系统 API 由操作系统提供。
