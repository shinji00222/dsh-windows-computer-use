# DSH Windows Computer Use · Windows 电脑控制插件

让 DSH 操作 Windows 桌面：读取控件、截图和文字，点击、输入，再确认结果。

这是基于 [Yu-tao-Li/dsh-computer-use-win](https://github.com/Yu-tao-Li/dsh-computer-use-win) 改造的独立项目。我们的侧重点有所不同：用 **C# 原生引擎 + TypeScript 接入层**，把目标窗口绑定、停止机制和结果验证放在前面。感谢原项目及更早上游 [cgissing/windows-computer-use](https://github.com/cgissing/windows-computer-use) 的工作，来源和许可见 [NOTICE.md](NOTICE.md)。

当前源码是 **0.1.0-preview.4 开发预览版**（尚未发布；已发布安装包见 Releases），面向 Windows x64 和愿意测试的 DSH Desktop 用户。

## 能做什么

- 读取 Windows 控件、查找窗口和按钮；UIA 不完整时可用 Windows OCR 或截图。
- 点击、双击、拖动、滚动、输入中文、快捷键、控件赋值和窗口管理。
- 纯文本批量操作：读取控件编号，连续填写并回读，不需要图片模型；点击和按键后重新观察。
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
dsh plugin --profile desktop add "C:\path\to\dsh-windows-computer-use-0.1.0-preview.4.tgz"
```

完整退出并重开 DSH。插件配置提供操作提示和只读模式，客户端插件卡片解释操作与停止规则。工具名前缀为 `mcp__shin_desktop__windows_computer_use_`。

第一次可让 DSH：

> 列出窗口，确认测试用记事本的 HWND，观察后输入“你好”，再读取文本确认。只操作这个测试窗口。

两个电脑控制插件同时操作会争抢桌面，请在使用时只选择一套。此项目的跨进程互斥只约束本项目的引擎，无法约束其他软件。

## 纯文本 DS：读取控件、批量填写

默认使用 `observe_text → run_text_batch → 新的文字观察`。例如：

> 用文字控件工具读取这个测试表单，填写姓名和城市，核对填入的值，再单独提交并读取结果。不要使用截图批量工具。

一次最多 8 步，用观察结果中的 `reference` 指定控件。`fill` 只接受 `canFill=true` 的非密码输入框，用 UIA 赋值并回读；不支持的输入框不会自动改用盲打。每项最多 2000 字，不接受换行或 Tab。编号一分钟有效，只属于本次观察；新观察或执行后旧编号失效。

`click` 和所有 `keypress` 都结束当前批次，不能一口气跨页面。填写后返回的值证明控件值已改变，不代表网页已经接受或提交；提交结果必须再读取页面确认。控件结构无法完整检查时拒绝批量操作，可改用原有单步工具。

可用 `includeOcr=true` 补充文字识别，OCR 仅作为文字证据，不生成可点击编号。首版优先测试 Edge 普通表单，自绘界面不保证可用；不安装浏览器扩展、不连接 DOM，也不需要额外视觉 API。

## 一张截图，多个动作

在 DSH 选择支持图片输入的模型，然后可以说：

> 看一下这个表单，把姓名和备注填好。能确定的步骤连续做，提交前停下来给我看。

插件提供 `screenshot → run_batch → 最终截图`。批量动作使用截图里的像素坐标，自动换算窗口位置与缩放；最多 8 步，截图引用一分钟有效且只能用一次。填入已知文本、Tab 切换输入框等可放在同一组，不必每步截图。原有单步工具仍可用，批量暂支持点击、双击、移动、滚动、文字、快捷键和短等待。

跳转、提交、打开菜单等动作应设 `checkpoint: true`；滚动和 Enter 自动结束当前组。检测到窗口移动、焦点变化、标题或可读取控件变化、失败或 Esc 时停止剩余动作。结果包含已完成数量和最终截图，不能整组重放。

控件检查无法识别所有网页或画布变化，异步页面也可能稍后才跳转。因此“不确定下一步要做什么”时必须设检查点；不要把一张旧截图当作多页流程的依据。纯文本模型会收到 `VISION_MODEL_REQUIRED`，请切换支持图片的模型。

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
