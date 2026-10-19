# 工具加载 / Tool loading

外层提供“精简 / 全部 / 自定义”三种加载方案，默认选“全部”。选择“自定义”后展开缩进的逐项清单，可按项或按组勾选。切换方案保留自定义清单；保存后在当前动作结束时生效，重启保留方案和清单。精简方案固定加载 10 项，全部方案加载 24 项；自定义按用户清单加载，允许全部关闭。

Choose Lite / All / Custom in the outer preset selector; All is the default. Custom reveals the indented per-tool checklist. Switching presets preserves your custom selection. Save applies changes after the current action finishes; the preset and custom list survive restart. Lite loads 10 tools, All loads 24, and Custom loads the selected set, including an empty set.

## 简体中文

未保存过新方案字段时，已有 24 项清单显示“全部”，其他已有清单显示“自定义”，保留先前选择。显式方案字段为 `toolPreset`，自定义清单为 `enabledTools`。

DSH 0.2 使用插件条目 ID `mcp-dsh-computer-use-win` 的实时 Config 表单，旧宿主保留可配置插件卡片与 `windows-computer-use` 命名空间。适配器继续使用官方 `@deepseek-ai/dsh-mcp-client`，不需要手动新增第二个 `wincu` MCP 服务。

清单分为“屏幕与内容”“鼠标与键盘”“窗口与控件”“等待与工具管理”四组，共 23 项桌面工具及管理工具 `windows_computer_use_tools`。取消勾选的工具不再出现在 MCP 列表中，直接调用也返回 `TOOL_DISABLED_IN_SETTINGS`。agent 无法通过管理工具重新开启用户关闭的工具；管理工具本身也可关闭。原工具名称、调用参数和后台实现保留。

发现工具操作示例（在 DSH 中名称为 `mcp__wincu__windows_computer_use_tools`）：

```json
{"operation":"list"}
{"operation":"describe","names":["drag"]}
{"operation":"enable","names":["drag"]}
{"operation":"disable","names":["drag"]}
{"operation":"reset"}
```

如果保留管理工具，`list` 返回目录及 `enabled`、`available` 状态。`describe` 只读取一个工具的完整说明和原始参数定义，不启动 PowerShell 或读取桌面。`enable` 只能加载用户已允许的工具；`disable` 临时卸载定义；`reset` 恢复用户保存的启动集合。名称可写短名或完整原名。运行时加载状态仅属于当前 MCP worker，不改写用户设置。

这是按需注入工具定义，不是删除后端功能或模型自动判断语义。标准 MCP `notifications/tools/list_changed` 通知客户端刷新；已验证官方 DSH 桥的注册、调用、移除流程。其他客户端若不处理该通知，需要显式刷新工具列表、重连，或使用全能模式。已有对话中的说明、调用结果和历史消息不会因卸载而消失。

直接使用独立 MCP / `wcu-mcp` 时默认全部加载。未设置 `WCU_ENABLED_TOOLS` 时，`WCU_TOOL_MODE=lite` 保留原九项常用工具及管理工具，`full` 加载全部工具。可用 `WCU_ENABLED_TOOLS` 的 JSON 数组指定集合，例如 `["screenshot","wait"]`；显式选择优先于旧 mode，允许 `[]`，非法名称会报错。独立服务无第三方运行时依赖；DSH 适配器使用宿主已有的 Schemastery 与官方 MCP 桥。

0.4.0 同样序列化的 `tools/list`：0.3.1 是 43,495 字符；精简模式 9,046 字符（减少 79.2%），全能模式 20,259 字符（减少 53.4%）。字符数可复核；token 数必须由目标模型的分词器和真实宿主请求测量。参数 schema 的约束与执行校验没有删减，只缩短注入模型的说明。

## English

Choose Lite / All / Custom in Settings → Computer Use. All is the default; only Custom reveals the indented checklist. Preset changes preserve custom selections, and Save persists the preset and list across restart. Lite loads 10 tools and All loads 24.

Unchecked tools are omitted from discovery, and direct calls return `TOOL_DISABLED_IN_SETTINGS`. The agent cannot re-enable user-disabled tools through management. Management itself can also be disabled. Its `list` response includes `enabled` and `available`; `describe` reads one full contract without starting PowerShell; `disable` temporarily unloads an allowed tool; `enable` reloads allowed tools only; `reset` restores the user's startup selection. Runtime management never overwrites the saved configuration.

The examples above accept short or complete original names. Standard MCP tool-list change notifications update the official DSH registry. Other clients must support notifications, explicitly refresh/reconnect, or use Full. Unloading cannot remove instructions or results already recorded in conversation history.

Standalone MCP defaults to all tools. Without `WCU_ENABLED_TOOLS`, `WCU_TOOL_MODE=lite` retains nine common tools plus management, while `full` loads all tools. An explicit JSON array in `WCU_ENABLED_TOOLS`, such as `["screenshot","wait"]`, takes precedence and permits an empty selection. Unknown names fail validation. The standalone server has no third-party runtime dependencies. The DSH adapter consumes the host's existing Schemastery and MCP bridge as optional peers.

Measured `tools/list` for 0.4.0: 43,495 characters in 0.3.1, 9,046 in Lite and 20,259 in Full. Token counts depend on the target tokenizer and host request. Type, enum, bounds, required-property and default validation remains intact; only model-facing prose is shortened.
