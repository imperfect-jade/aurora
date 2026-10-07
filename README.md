# Aurora

Aurora 是一个首先服务读者的中文个人学习笔记网站。内容按“分类 → 课程/专题 → 章节/笔记”组织，提供章节目录、深浅主题、玻璃拟态界面、静态中文搜索，以及带静态降级的地球/月球主视觉。

技术栈为 Astro、Unified/remark/rehype、Pagefind、Three.js、TypeScript、Sharp、Vitest 与 Playwright，最终由 GitHub Actions 构建并部署到 GitHub Pages。

## 内容边界

- 网站只读取 Obsidian Vault 的 `40 Published/Courses`、`40 Published/Reviews` 和 `40 Published/Tools`。
- 同步流程对 Vault 只读；网站维护流程不移动、修改或决定发布任何源笔记。
- 本仓库仅保存公开网页副本和网站代码。`source_user`、`source_web`、`source-index`、本地绝对路径、个人信息、凭据及其他敏感数据会阻断发布。
- 图片隐私与授权由内容作者负责；同步工具负责引用、完整性与网页优化，不执行图片内容审核。
- 搜索只索引标题、分类、课程/专题、摘要、标签和章节标题，不索引正文。

## 本地环境

需要 Node.js 24 与 npm。首次安装：

```powershell
npm ci
npx playwright install chromium
```

复制本地 Vault 配置，该文件不会进入 Git：

```powershell
Copy-Item config/vault.example.yml config/vault.local.yml
```

然后在 `config/vault.local.yml` 中设置 Vault 根目录。不要把本地绝对路径写入其他受版本控制文件。

## 常用命令

```powershell
npm run dev                         # 本地开发服务器
npm run sync                       # 从已发布目录生成公开副本
npm run typecheck                  # Astro 与 TypeScript 检查
npm test                           # 单元测试
npm run build                      # 静态构建并生成 Pagefind 索引
npm run test:e2e                   # Chromium 端到端测试
npm run validate                   # typecheck + 单元测试 + 生产构建
npm run preview                    # 预览最近一次生产构建
```

同步是原子替换：转换、链接、附件或安全检查失败时，不应以部分输出覆盖现有公开内容。生成目录中的内容不得手工编辑。

## 发布准备与授权

`npm run release:prepare -- --input <summary.json>` 只生成脱敏发布报告，不执行 commit、push 或部署。报告包含内容与 URL 变化、附件、校验结果、警告/阻断原因，并明确记录未执行 push/deploy。

默认每次部署都需要确认。只有用户明确授权的、精确匹配的低风险重复任务类别，才可进入自动部署路径。以下情况永远需要单独确认：

- 删除或撤回；
- slug/URL 变化；
- 分类结构移动；
- 大规模 diff 或回滚；
- 视觉、代码、依赖或 workflow 变化；
- 任意警告。

Schema、安全、链接、附件、路径、构建或测试错误属于硬阻断，不能用一般授权绕过。

## CI 与 GitHub Pages

`.github/workflows/ci.yml` 在 pull request 与 `main` 更新时运行完整校验和端到端测试。

`.github/workflows/deploy.yml` **仅支持 `workflow_dispatch` 手动触发**，不会因 push 自动部署。GitHub Pages 应配置为“GitHub Actions”来源；得到本次部署确认后，再在 Actions 页面手动运行该工作流。`dist/` 是构建产物，不提交到仓库。

站点预期地址为 <https://imperfect-jade.github.io/aurora/>。

## 资源说明

地球与月球纹理来源及许可见 `public/assets/celestial/ATTRIBUTION.md`。首页才会延迟加载 Three.js；减少动态偏好、WebGL 不可用或加载失败时使用静态图。
