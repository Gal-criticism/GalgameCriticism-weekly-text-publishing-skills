# bilibili-weekly-article

独立将期目录中的 Word 去注音文字稿、图包和封面制作成 B 站图文（Opus），支持素材解析、署名获取、本地预览、草稿与发布后的回读核验。

只需安装 `skills/bilibili-weekly-article`；无需安装其他平台 skill。输入直接来自用户的期目录，产出本平台草稿回执或已核验的公开文章链接。发布方式按用户授权及本技能的审核要求执行，其他平台操作由各自技能负责。

Agent 执行步骤、依赖与命令见 [SKILL.md](SKILL.md)，版式约定见 [layout-spec.md](references/layout-spec.md)。

## 安全试用与平台

Python 3.11+，支持 macOS 上的素材解析、本地预览及 B 站 API 流程。先在虚拟环境安装 `requirements.txt`，以 `--dry-run` 离线预演，再存线上草稿并人工审核。真实上传、存草稿和发布均须显式指定 `--account-id <目标UID>`；未完成标题/署名审核、存在警告或配图越界时停止。真实 build 和存草稿会上传图片，只有 dry-run 保证不访问网络。

不再支持 `--replace` 自动删除旧草稿。已有草稿/发布回执或未知提交时先人工核对，不通过删除回执盲目重发。完整步骤见 [SKILL.md](SKILL.md)。

期目录可同时放置「文章封面」和 16:10 自定义封面。保存 B 站草稿后，在编辑器检查正文和署名排版，设置 16:10 封面、原创声明及「每周Galgame新闻速递」文集，并重新打开核对草稿。
