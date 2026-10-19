<!-- maintain-file-logs schema=1 -->
# 文件导航

## 目录

- 当前子项
- 按需读取
- 历史查询

索引 revision：1。仅登记直接子项；原文件是当前内容事实来源。

## 当前子项

| 路径 | 类型 | 内容简介 | 何时读取 | 定位点/子索引 | 验证 |
| --- | --- | --- | --- | --- | --- |
| [client.js](client.js) | file | 通过宿主浏览器模块注册中英文工具模式卡片；编辑暂存，保存写入设置。 | 需要该入口的行为、配置或回归细节时，打开原文件核实。 | settings.plugin.item | partial |
| [dsh-plugin.mjs](dsh-plugin.mjs) | file | DSH 官方 MCP 桥适配器，注册持久化工具模式并串行重载子插件。 | 需要该入口的行为、配置或回归细节时，打开原文件核实。 | SettingsConfig | partial |
| [server.mjs](server.mjs) | file | 现有业务文件；本轮未复核完整正文和原始生成过程。 | 需要时打开原文件核实。 |  | unread |

## 按需读取

先检索路径/用途，再打开相关子索引或原文件片段。详细字段见 FILE_INDEX.json。unread/partial/stale 条目需要进一步核实。

## 历史查询

按路径或稳定 ID 搜索 FILE_HISTORY.jsonl；仅在需要追溯时读取命中事件。历史从首次登记开始，来源未知与未观察的中间版本不可推断。
