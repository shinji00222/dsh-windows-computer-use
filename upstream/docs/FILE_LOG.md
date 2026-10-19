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
| [.npmignore](.npmignore) | file | 排除目录日志与日志锁，避免将开发导航文件发布到 npm。 | 需要该入口的行为、配置或回归细节时，打开原文件核实。 | FILE_LOG.md | partial |
| [dev-notes.md](dev-notes.md) | file | 现有业务文件；本轮未复核完整正文和原始生成过程。 | 需要时打开原文件核实。 |  | unread |
| [tool-context.md](tool-context.md) | file | 精简／全能模式、宿主设置路径、保存与按需工具加载说明。 | 需要该入口的行为、配置或回归细节时，打开原文件核实。 | 工具模式 | partial |
| [wiki](wiki) | directory | 业务子目录，尚未索引。 | 需要时打开原文件核实。 |  | unread |

## 按需读取

先检索路径/用途，再打开相关子索引或原文件片段。详细字段见 FILE_INDEX.json。unread/partial/stale 条目需要进一步核实。

## 历史查询

按路径或稳定 ID 搜索 FILE_HISTORY.jsonl；仅在需要追溯时读取命中事件。历史从首次登记开始，来源未知与未观察的中间版本不可推断。
