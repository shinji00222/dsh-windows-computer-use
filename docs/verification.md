# 第一版验证记录

日期：2026-10-19。目标：Windows x64，Node.js ≥22，.NET 10，DSH Desktop 0.2.0-rc.2 / Electron 44。

## 实际执行

- `npm run build`：TypeScript 严格检查与 C# Release 自包含目录发布。
- `npm test`：19 项通过。操作仅针对本次创建的专用 WinForms 窗口。
- `tests/host-integration.mjs`：由已安装 DSH 的 Electron Node 模式执行，真实 Cordis 插件生命周期与官方 MCP 客户端注册工具、执行 C# health，并注册和渲染 React 插件说明卡片。使用独立内存上下文，未编辑用户 profile、调用模型或读取账号凭证。
- `npm audit --omit=dev`：无已知漏洞。
- `npm run package:local`：预编译引擎、运行依赖及许可打入 `.tgz`，生成 SHA-256 和文件清单；包内排除测试截图、日志、上游归档、PDB 和本机配置。
- `scripts/verify-dsh-package.mjs`：使用真实 Desktop CLI 把最终 `.tgz` 安装到项目 `work/isolated-dsh`，确认 bundle 自动启用及配置合成，再从该安装副本经过官方桥接加载全部 24 个工具。未触碰用户实际 DSH home。

## 真实窗口覆盖

### 2026-10-19 续验

同一源码首次复测 11/19 通过，失败包括 `FOREGROUND_DENIED`、后续 `FOCUS_CHANGED` 和 Esc 断言；根因尚未确定，不能归因于用户操作或声称已修复。随后未改运行时代码，连续四轮均 19/19 通过。前台输入依赖可交互桌面与目标焦点，拒绝激活时应停止并重新观察，不能自动重放输入。

加强 `tests/host-integration.mjs`：最终发行包在隔离 DSH profile 安装后，经真实官方 MCP 桥接观察专用窗口、激活、聚焦、发送中文、重新读取控件并核对完整文本、关闭专用窗口。返回 `unicodeInputReadback: true`。这证明发行包的宿主输入链路可运行，不代表模型自主完成任务或所有桌面条件下无失败。

原生窗口发现；无观察时拒绝输入；矛盾目标拒绝；UIA 控件发现与密码隐藏；窗口激活；中文 Unicode 输入回读；快捷键；剪贴板输入及原文本恢复核对；控件赋值回读；真实按钮点击后的标签变化；指针移动、双击、拖动和滚动事件；内存截图和缩放坐标；Windows OCR 可见文字与词框；不完整 UIA 遍历不推断元素消失；陈旧 token、越界坐标、窗口移动后的坐标拒绝；引擎跨进程互斥；取消后本轮拒绝再试；真实全局 Esc hook；新轮恢复；仅关闭专用窗口。

## 协议与边界

官方 MCP SDK 初始化、工具发现、真实 C# health、参数类型与未知字段拒绝、只读模式拒绝输入均已测试。宿主桥接独立验证，不把普通 Node 进程成功当成 DSH 成功。

未证明：所有桌面应用兼容性、所有 OCR 语言和字体、后台输入、WGC、UAC 安全桌面、完整真实模型任务成功率、用户当前 DSH 窗口中的设置交互。GitHub CI 的远端结果需单独核对，不把本机通过写成远端通过。

## 已处理的环境问题

- 单文件 .NET 引擎因本机临时解压目录权限失败；改用自包含目录发行，消除该启动依赖。
- 隐藏控制台启动会影响 WinForms 首次窗口显示；测试窗口显式显示并核对可见性。
- SetForegroundWindow 可受 Windows 前台锁限制；采用受限输入线程附加并确保释放，再核对实际前台。
- OCR 测试窗口的标签曾被裁切；修正窗口布局后从真实截图和 OCR 结果验证，而不是放宽到任意非空文本。
- PowerShell 直接调用 GUI EXE 的返回值不足以证明子进程通过；宿主测试改为 Node `spawnSync` 等待并核对真实退出状态与断言输出。
