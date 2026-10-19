<!-- maintain-file-logs schema=1 -->
# 文件导航

## 目录

- 当前子项
- 按需读取
- 历史查询

索引 revision：3。仅登记直接子项；原文件是当前内容事实来源。

## 当前子项

| 路径 | 类型 | 内容简介 | 何时读取 | 定位点/子索引 | 验证 |
| --- | --- | --- | --- | --- | --- |
| [.github](.github) | directory | 回归套件与测试夹具。 | 先读子索引，再定位原文件。 | [子索引](.github/FILE_LOG.md) | partial |
| [.gitignore](.gitignore) | file | 忽略依赖、已有缓存与目录日志事务临时文件。 | 需要该入口的行为、配置或回归细节时，打开原文件核实。 | .file-log.lock | partial |
| [CHANGELOG.md](CHANGELOG.md) | file | 按版本记录修复与兼容行为；0.4.1 补全设置卡片和原生 health。 | 需要该入口的行为、配置或回归细节时，打开原文件核实。 | ## 0.4.1 | partial |
| [LICENSE](LICENSE) | file | 现有业务文件；本輪未复核完整正文与原始生成过程。 | 按精确路径需要该文件时，先打开原文件核实。 |  | unread |
| [PUBLISH.md](PUBLISH.md) | file | 现有业务文件；本輪未复核完整正文与原始生成过程。 | 按精确路径需要该文件时，先打开原文件核实。 |  | unread |
| [README.en.md](README.en.md) | file | 与主 README 保持同页双语内容的兼容入口。 | 需要该入口的行为、配置或回归细节时，打开原文件核实。 | ## English | partial |
| [README.md](README.md) | file | 同页中英文安装、设置、操作与网易云演示；重要内容默认展开。 | 需要该入口的行为、配置或回归细节时，打开原文件核实。 | ## 简体中文 | partial |
| [THIRD_PARTY.md](THIRD_PARTY.md) | file | 现有业务文件；本輪未复核完整正文与原始生成过程。 | 按精确路径需要该文件时，先打开原文件核实。 |  | unread |
| [assets](assets) | directory | 业务子目录；尚未索引或复核正文。 | 按精确路径需要该文件时，先打开原文件核实。 |  | unread |
| [cordis.patch.yml](cordis.patch.yml) | file | 现有业务文件；本輪未复核完整正文与原始生成过程。 | 按精确路径需要该文件时，先打开原文件核实。 |  | unread |
| [docs](docs) | directory | 工具使用与开发说明。 | 先读子索引，再定位原文件。 | [子索引](docs/FILE_LOG.md) | partial |
| [mcp](mcp) | directory | MCP 服务、DSH 桥与浏览器设置入口。 | 先读子索引，再定位原文件。 | [子索引](mcp/FILE_LOG.md) | partial |
| [package-lock.json](package-lock.json) | file | 锁定 npm 开发依赖；本轮加入测试专用 React 19.2.0。 | 需要该入口的行为、配置或回归细节时，打开原文件核实。 | /version | partial |
| [package.json](package.json) | file | 0.4.1 元数据、DSH 双入口、兼容导出和开发依赖。 | 需要该入口的行为、配置或回归细节时，打开原文件核实。 | /version | partial |
| [publish](publish) | directory | 业务子目录；尚未索引或复核正文。 | 按精确路径需要该文件时，先打开原文件核实。 |  | unread |
| [scripts](scripts) | directory | Windows PowerShell 后端。 | 先读子索引，再定位原文件。 | [子索引](scripts/FILE_LOG.md) | partial |
| [test](test) | directory | 回归套件与测试夹具。 | 先读子索引，再定位原文件。 | [子索引](test/FILE_LOG.md) | partial |

## 按需读取

先检索路径/用途，再打开相关子索引或原文件片段。详细字段见 FILE_INDEX.json。unread/partial/stale 条目需要进一步核实。

## 历史查询

按路径或稳定 ID 搜索 FILE_HISTORY.jsonl；仅在需要追溯时读取命中事件。历史从首次登记开始，来源未知与未观察的中间版本不可推断。
