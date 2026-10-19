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
| [workflows](workflows) | directory | GitHub Windows 回归工作流。 | 定位 CI 环境、步骤和产物时。 | [子索引](workflows/FILE_LOG.md) | partial |

## 按需读取

先检索路径/用途，再打开相关子索引或原文件片段。详细字段见 FILE_INDEX.json。unread/partial/stale 条目需要进一步核实。

## 历史查询

按路径或稳定 ID 搜索 FILE_HISTORY.jsonl；仅在需要追溯时读取命中事件。历史从首次登记开始，来源未知与未观察的中间版本不可推断。
