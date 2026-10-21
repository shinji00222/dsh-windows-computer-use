# DSH Windows Computer Use · Windows 电脑控制插件

让 DSH 操作 Windows 桌面：读取控件、截图和文字，点击、输入，再确认结果。

这是基于 [Yu-tao-Li/dsh-computer-use-win](https://github.com/Yu-tao-Li/dsh-computer-use-win) 改造的独立项目。我们的侧重点有所不同：用 **C# 原生引擎 + TypeScript 接入层**，把目标窗口绑定、停止机制和结果验证放在前面。感谢原项目及更早上游 [cgissing/windows-computer-use](https://github.com/cgissing/windows-computer-use) 的工作，来源和许可见 [NOTICE.md](NOTICE.md)。

当前是 **0.1.0-preview.3 预览版**，面向 Windows x64 和愿意测试的 DSH Desktop 用户。

## 能做什么

- 读取 Windows 控件、查找窗口和按钮；UIA 不完整时可用 Windows OCR 或截图。
- 点击、双击、拖动、滚动、输入中文、快捷键、控件赋值和窗口管理。
- 看图批量操作：一张截图规划最多 8 个动作，一次执行后返回最终截图和逐步结果，减少模型往返。
- 操作前要求观察目标窗口。窗口移动、焦点变化、目标不明确或观察过期时拒绝盲目输入。
- 独立线程监听 Esc，停止后当前轮不能继续输入；新的用户请求可继续。
- 引擎通过内存返回截图，DSH 会将获准的图片保存为会话附件。输入已发送与效果已确认分开返回。

## 获取插件

安装包在 [GitHub Releases](https://github.com/shinji00222/dsh-windows-computer-use/releases) 提供。源码仓库不包含已编译的原生引擎，直接从 GitHub 源码安装不能替代下载预编译包或先构建。当前未发布到 npm，也不代表已被任何插件市场收录。

## 从源码构建

需要 Windows 10/11 x64、Node.js ≥22 和 .NET 10 SDK：

```powershell
npm ci
npm run build
npm test
npm run package:local
```

`DOTNET_EXE` 可指定 SDK 的 dotnet.exe。构建生成 `native/DesktopEngine.exe`，自包含引擎不要求使用者另外安装 .NET。打包结果在 `artifacts/`，安装时保留压缩包内的依赖目录。

## 接入 DSH Desktop

下载 Release 的 `.tgz`（也可自行构建），在 **Desktop 自带终端**安装，替换成实际绝对路径：

```powershell
dsh plugin --profile desktop add "C:\path\to\dsh-windows-computer-use-0.1.0-preview.3.tgz"
```

完整退出并重开 DSH。插件配置提供操作提示和只读模式，客户端插件卡片解释操作与停止规则。工具名前缀为 `mcp__shin_desktop__windows_computer_use_`。

第一次可让 DSH：

> 列出窗口，确认测试用记事本的 HWND，观察后输入“你好”，再读取文本确认。只操作这个测试窗口。

两个电脑控制插件同时操作会争抢桌面，请在使用时只选择一套。此项目的跨进程互斥只约束本项目的引擎，无法约束其他软件。

## 一张截图，多个动作

在 DSH 选择支持图片输入的模型，然后可以说：

> 看一下这个表单，把姓名和备注填好。能确定的步骤连续做，提交前停下来给我看。

插件提供 `screenshot → run_batch → 最终截图`。批量动作使用截图里的像素坐标，自动换算窗口位置与缩放；最多 8 步，截图引用一分钟有效且只能用一次。填入已知文本、Tab 切换输入框等可放在同一组，不必每步截图。原有单步工具仍可用，批量暂支持点击、双击、移动、滚动、文字、快捷键和短等待。

跳转、提交、打开菜单等动作应设 `checkpoint: true`；滚动和 Enter 自动结束当前组。检测到窗口移动、焦点变化、标题或可读取控件变化、失败或 Esc 时停止剩余动作。结果包含已完成数量和最终截图，不能整组重放。

控件检查无法识别所有网页或画布变化，异步页面也可能稍后才跳转。因此“不确定下一步要做什么”时必须设检查点；不要把一张旧截图当作多页流程的依据。纯文本模型会收到 `VISION_MODEL_REQUIRED`，请切换支持图片的模型。

## 跨轮操作记录（开发版，尚未发布）

可以要求 DSH：“查看这段对话之前的电脑操作，哪些已经发送，哪些还需要确认？”
只读工具 `operation_history` 返回本对话最近的操作，默认 20 条，最多 100 条；用返回的 `nextBeforeSequence` 作为 `beforeSequence` 继续向前翻页。普通工具结果中的 `operation.operationId` 可定位同一条记录。

记录包含人类轮次、开始/结束时间、批次完成和尝试数量、停止原因代码、截图引用及证据状态。`sent` 只表示输入已发送，`observed` 只表示该工具明确读回了其验证条件，`inspect_final_screenshot` 表示仍需检查原始结果图片；后续观察不会自动把之前的操作标记为成功。错误可能发生在部分输入之后，不能据此整组重放。

历史在插件进程内最多保留 500 条，按 DSH 对话隔离，重启后清空；较早记录可能被淘汰。它不额外保存输入文本、控件内容或图片字节。`imageReturned` 表示原始 MCP 响应附有图片，不保证宿主已保存附件；图片仍在原始工具结果中查看。历史截图引用仍受原有有效期和单次使用限制，继续操作必须重新观察。独立 MCP 的历史只属于当前连接，没有 DSH 轮次编号。

## 其他 MCP 客户端

```json
{
  "mcpServers": {
    "desktop-native": {
      "command": "node",
      "args": ["C:/path/to/dsh-windows-computer-use/dist/server.js"]
    }
  }
}
```

独立 MCP 没有 DSH 用户轮次信号，Esc 后需在明确收到新的用户请求时调用 `windows_computer_use_resume`。DSH 内禁止模型调用该工具恢复当前轮。

## 已知边界

- 激活窗口会等待目标处理消息；Windows 仍可能拒绝切换前台。遇到 `FOREGROUND_DENIED` 或 `FOCUS_CHANGED` 时停止输入，确认目标窗口后重新观察。
- 本版没有后台消息输入和 WGC 捕获；后台窗口用 PrintWindow，失败时的屏幕裁剪会标记可能被遮挡。
- UIA 控件调用可能阻塞。超时会停止并回收工作进程，不自动重放输入；已经送达应用的动作无法撤回。
- OCR 依赖已安装的 Windows OCR 语言包。坐标匹配是文字定位，不代表理解按钮含义。
- 不控制 UAC 安全桌面，不自动提权；普通权限无法保证操作管理员应用。
- 从上游迁移后的元素 ID、返回结构、配置和包名均有变化，不能直接替换其内部调用。
- 自动化测试覆盖专用 WinForms 窗口和 MCP 通信，不代表所有应用、游戏或复杂网页都能稳定操作。

维护与验证入口见 [技能.md](技能.md)。
