# DSH Windows Computer Use · Windows 电脑控制插件

让 DSH 操作 Windows 桌面：读取控件、截图和文字，点击、输入，再确认结果。

这是基于 [Yu-tao-Li/dsh-computer-use-win](https://github.com/Yu-tao-Li/dsh-computer-use-win) 改造的独立项目。我们的侧重点有所不同：用 **C# 原生引擎 + TypeScript 接入层**，把目标窗口绑定、停止机制和结果验证放在前面。感谢原项目及更早上游 [cgissing/windows-computer-use](https://github.com/cgissing/windows-computer-use) 的工作，来源和许可见 [NOTICE.md](NOTICE.md)。

当前是 **0.1.0-preview.1 预览版**，面向 Windows x64 和愿意测试的 DSH Desktop 用户。

## 能做什么

- 读取 Windows 控件、查找窗口和按钮；UIA 不完整时可用 Windows OCR 或截图。
- 点击、双击、拖动、滚动、输入中文、快捷键、控件赋值和窗口管理。
- 操作前要求观察目标窗口。窗口移动、焦点变化、目标不明确或观察过期时拒绝盲目输入。
- 独立线程监听 Esc，停止后当前轮不能继续输入；新的用户请求可继续。
- 截图在内存中传输，默认不在磁盘保存。输入已发送与效果已确认分开返回。

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

先构建并打包，在 **Desktop 自带终端**安装生成的 `.tgz`（替换成实际绝对路径）：

```powershell
dsh plugin --profile desktop add "C:\path\to\dsh-windows-computer-use-0.1.0-preview.1.tgz"
```

完整退出并重开 DSH。插件配置提供操作提示和只读模式，客户端插件卡片解释操作与停止规则。工具名前缀为 `mcp__shin_desktop__windows_computer_use_`。

第一次可让 DSH：

> 列出窗口，确认测试用记事本的 HWND，观察后输入“你好”，再读取文本确认。只操作这个测试窗口。

两个电脑控制插件同时操作会争抢桌面，请在使用时只选择一套。此项目的跨进程互斥只约束本项目的引擎，无法约束其他软件。

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

- 本版没有后台消息输入和 WGC 捕获；后台窗口用 PrintWindow，失败时的屏幕裁剪会标记可能被遮挡。
- UIA 控件调用可能阻塞。超时会停止并回收工作进程，不自动重放输入；已经送达应用的动作无法撤回。
- OCR 依赖已安装的 Windows OCR 语言包。坐标匹配是文字定位，不代表理解按钮含义。
- 不控制 UAC 安全桌面，不自动提权；普通权限无法保证操作管理员应用。
- 从上游迁移后的元素 ID、返回结构、配置和包名均有变化，不能直接替换其内部调用。
- 自动化测试覆盖专用 WinForms 窗口和 MCP 通信，不代表所有应用、游戏或复杂网页都能稳定操作。

维护与验证入口见 [技能.md](技能.md)。
