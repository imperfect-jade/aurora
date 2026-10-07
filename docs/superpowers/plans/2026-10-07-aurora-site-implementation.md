# Aurora 网站实施计划

> 实施本计划时使用 `superpowers:executing-plans`；涉及功能和修复时遵循测试先行。未经用户确认不得 push 或部署。

**目标：** 构建一个从公开 Obsidian 笔记生成、以读者为中心、支持玻璃拟态双主题和 GitHub Pages 部署的 Astro 静态网站。

**架构：** `scripts/sync-content` 只读扫描 Vault，经过 schema、转换、安全和附件管线写入仓库内生成区；Astro 读取经过净化的内容集合生成页面；Pagefind 在构建后建立元数据索引；Three.js 仅在首页按需加载。

**技术：** Astro、TypeScript、Unified/remark/rehype、Zod、Sharp、Pagefind、Three.js、Vitest、Playwright、GitHub Actions。

---

## Task 1：初始化工程与测试基线

**文件：** `package.json`、`astro.config.mjs`、`tsconfig.json`、`vitest.config.ts`、`playwright.config.ts`、`.gitignore`、`src/`、`tests/`

1. 先添加一个会失败的 smoke test，要求站点配置具有 `site` 与 `/aurora` base。
2. 安装并锁定已批准依赖；不要自动升级到未确认版本。
3. 创建最小 Astro 页面与配置，使测试通过。
4. 加入 `typecheck`、`test`、`test:e2e`、`build`、`preview` 脚本。
5. 运行 `npm run typecheck && npm test && npm run build`。

## Task 2：定义内容模型和分类注册表

**文件：** `src/content.config.ts`、`config/categories.yml`、`src/lib/content/schema.ts`、`tests/content/schema.test.ts`、`tests/fixtures/content/`

1. 用 fixtures 写失败测试：合法笔记通过；缺少 slug/summary/category、未知分类、重复 slug、非法 status 失败。
2. 实现公开字段白名单与 Zod schema。
3. 实现分类注册表加载及父子关系校验。
4. 确认 `source_user`、`source_web`、`source-index` 和未知字段不会进入公开对象。

## Task 3：实现公开安全门

**文件：** `src/lib/security/public-content.ts`、`src/lib/security/html-policy.ts`、`src/lib/security/sensitive-scan.ts`、`tests/security/`

1. 为本地绝对路径、密钥模式、个人信息模式、危险 HTML、路径逃逸创建失败测试。
2. 实现输出白名单，而非输入黑名单。
3. 净化 HTML：拒绝禁用标签、事件属性和危险协议；iframe 依据允许域名配置。
4. 报告仅返回规则 ID、文件和脱敏片段。
5. 测试不得打印真实敏感内容。

## Task 4：实现 Obsidian Markdown 转换

**文件：** `src/lib/markdown/pipeline.ts`、`src/lib/markdown/plugins/`、`tests/markdown/`、`tests/fixtures/markdown/`

1. 分别为 wiki 链接/锚点、callout、表格、脚注、代码、LaTeX、Mermaid、章节嵌入、安全 HTML 写失败 fixture 测试。
2. 建立 Unified 管线，并让链接解析依赖公开内容索引。
3. 指向未发布目标、循环嵌入或不存在章节时硬阻断。
4. 输出稳定 HTML 与结构化 headings，供页内目录使用。

## Task 5：实现只读同步与附件管线

**文件：** `scripts/sync-content.ts`、`src/lib/sync/`、`config/vault.example.yml`、`tests/sync/`

1. 使用临时 fixture Vault 写失败测试，验证只扫描 `40 Published` 且绝不写源目录。
2. 实现路径解析、内容指纹、增量 manifest 和原子生成目录替换。
3. 仅复制被引用附件；用 Sharp 生成合理尺寸和格式的网页版本。
4. 缺失、歧义、损坏附件或越界路径必须失败。
5. 将机器本地 Vault 配置放在 gitignored 文件中，示例配置不得包含个人路径。

## Task 6：实现读者优先的页面与玻璃设计系统

**文件：** `src/styles/tokens.css`、`src/styles/global.css`、`src/components/`、`src/layouts/`、`src/pages/`、`tests/e2e/navigation.spec.ts`、`tests/e2e/theme.spec.ts`

1. 先写页面与可访问性失败测试：分类到课程/专题到笔记、桌面三栏、移动抽屉、目录锚点、键盘操作。
2. 创建统一玻璃 token，深浅主题分别定义色彩、阴影、背景和对比度。
3. 实现首页、分类页、课程/专题页、笔记页和 404。
4. 正文不显示进度、适合人群、预计范围、反链或 PDF 阅读器。
5. 支持系统主题、手动切换和本地偏好；浅色主题不得使用简单反色。

## Task 7：实现首页星空与真实感天体

**文件：** `src/components/home/CelestialScene.astro`、`src/scripts/celestial-scene.ts`、`public/assets/celestial/`、`tests/e2e/motion.spec.ts`

1. 写测试验证 Three.js 只在首页加载，深色为地球、浅色为月球，减少动态和 WebGL 失败时使用静态图。
2. 使用经过许可且本地存储的纹理；记录来源与许可。
3. 实现低速自转、柔和光照、按设备能力限制 DPR 和暂停不可见页面渲染。
4. 检查移动端帧率、资源体积及静态回退。

## Task 8：实现仅元数据的中文搜索

**文件：** `src/lib/search/document.ts`、`src/pages/search.astro`、`src/components/SearchDialog.astro`、`scripts/build-search.ts`、`tests/search/`

1. 写失败测试，证明标题、分类、课程/专题名、headings、summary、tags 可搜索，而正文独有词不可搜索。
2. 生成独立搜索文档并由 Pagefind 索引。
3. 实现键盘快捷键、搜索对话框、结果分组与无结果状态。
4. 在生产构建中验证索引不包含正文和私有 frontmatter。

## Task 9：实现变更报告与部署授权策略

**文件：** `src/lib/release/policy.ts`、`src/lib/release/report.ts`、`scripts/prepare-release.ts`、`config/release-policy.yml`、`tests/release/`

1. 写表驱动测试覆盖：普通更新、警告、删除/撤回、slug 变化、分类移动、大 diff、依赖/工作流/视觉代码变化、回滚。
2. 将硬阻断、警告、信息分级；任何警告转为人工部署。
3. 自动授权只对用户明确批准的低风险任务类别生效，不能扩展到相似但不同的类别。
4. 生成脱敏报告：内容变化、URL 变化、附件、校验、构建与需要确认的原因。
5. 不在脚本中执行未经确认的 push。

## Task 10：配置 CI、GitHub Pages 与发布验证

**文件：** `.github/workflows/ci.yml`、`.github/workflows/deploy.yml`、`public/robots.txt`、`src/pages/sitemap.xml.ts`、`README.md`

1. CI 对 pull/push 执行 typecheck、单元测试、构建和必要的端到端测试。
2. Pages workflow 从源码构建，不提交 `dist`；权限最小化，并支持手动触发。
3. 文档化本地配置、预览、同步、校验、人工确认和部署流程。
4. 完整运行：`npm ci`、`npm run typecheck`、`npm test`、`npm run build`、`npm run test:e2e`。
5. 用静态服务器验证 `/aurora/` base 下的资源、路由、主题、搜索和 404。
6. 输出首发报告，停在 push/deploy 之前等待用户确认。

## 实施纪律

- 每个 task 都遵循 Red → Green → Refactor，并在小步通过后提交本地原子 commit。
- 不修改 Vault；所有 Vault 测试使用 fixture 或只读扫描。
- 不顺手升级依赖、改变设计或扩大自动部署授权。
- 碰到规格歧义、警告或高风险操作时暂停并向用户汇报。
- 完成后使用 `superpowers:verification-before-completion` 和 `superpowers:requesting-code-review`。
