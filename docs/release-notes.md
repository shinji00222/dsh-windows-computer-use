# 0.1.0-preview.1

版本分类：**预览版**。适用于 Windows x64、DSH Desktop 0.2.0-rc.2 的测试用户。

这是基于 dsh-computer-use-win 改造的第一版，采用 C# 桌面引擎和 TypeScript 接入，重点是目标窗口绑定、Esc 停止和操作后的证据核对。原项目及更早上游署名和 MIT 许可均保留。

## 安装与升级

下载 Release 的 `.tgz`，在 DSH Desktop 自带终端执行：

```powershell
dsh plugin --profile desktop add "C:\path\to\dsh-windows-computer-use-0.1.0-preview.1.tgz"
```

完整退出并重开 DSH。包内含运行依赖和自包含 C# 引擎，不要求安装 .NET SDK；支持中文和带空格路径。只选择一套电脑控制插件执行任务，避免争抢桌面。

## 兼容性

与上游有兼容性变化：独立包名、新元素 ID 和返回结构；没有后台消息输入和 WGC 捕获。不要把它当成上游配置的原位升级。

## 已验证与风险

本机验证范围见 [verification.md](verification.md)。覆盖专用真实窗口、MCP 通信和实际 DSH Electron/Cordis/MCP 桥接，未验证所有应用，也未替换用户正在运行的 DSH 配置。

UIA 可能被目标应用阻塞；超时不自动重放输入。截图的屏幕裁剪可能受遮挡，返回值会标明。OCR 依赖 Windows 语言包，识别效果受字体和布局影响。Esc 可停止后续输入，已经送达应用的操作无法撤回。

当前自编译的 Windows 引擎没有代码签名。

这是早期预览版，先在测试文档或专用窗口使用。GitHub 公布不等于 npm 发布或插件市场收录。
