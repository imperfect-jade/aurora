interface PagefindResult {
  id: string;
  data(): Promise<{
    url: string;
    excerpt: string;
    meta: Record<string, string>;
  }>;
}

interface PagefindApi {
  search(query: string): Promise<{ results: PagefindResult[] }>;
}

let pagefindPromise: Promise<PagefindApi> | undefined;

function loadPagefind(base: string): Promise<PagefindApi> {
  pagefindPromise ??= import(/* @vite-ignore */ `${base}pagefind.js`).then(async (module) => {
    const api = module as PagefindApi & { init?: () => Promise<void> };
    await api.init?.();
    return api;
  });
  return pagefindPromise;
}

function appendResult(container: HTMLElement, result: Awaited<ReturnType<PagefindResult["data"]>>) {
  const link = document.createElement("a");
  link.className = "search-result glass-interactive";
  link.href = result.url;

  const title = document.createElement("strong");
  title.textContent = result.meta.title || "未命名笔记";
  const summary = document.createElement("span");
  summary.textContent = result.meta.summary || result.excerpt.replace(/<[^>]+>/g, "");
  link.append(title, summary);
  container.append(link);
}

function initializeSearch(root: HTMLElement) {
  const input = root.querySelector<HTMLInputElement>("[data-search-input]");
  const status = root.querySelector<HTMLElement>("[data-search-status]");
  const results = root.querySelector<HTMLElement>("[data-search-results]");
  const base = root.dataset.pagefindBase;
  if (!input || !status || !results || !base) return;

  let request = 0;
  input.addEventListener("input", async () => {
    const query = input.value.trim();
    const current = ++request;
    results.replaceChildren();
    if (!query) {
      status.textContent = "输入关键词开始搜索。";
      return;
    }

    status.textContent = "正在搜索…";
    try {
      const pagefind = await loadPagefind(base);
      const response = await pagefind.search(query);
      const items = await Promise.all(response.results.slice(0, 30).map((result) => result.data()));
      if (current !== request) return;
      if (!items.length) {
        status.textContent = `没有找到与“${query}”相关的笔记。`;
        return;
      }

      status.textContent = `找到 ${items.length} 条结果。`;
      const groups = new Map<string, typeof items>();
      for (const item of items) {
        const category = item.meta.category || "其他";
        groups.set(category, [...(groups.get(category) ?? []), item]);
      }
      for (const [category, groupItems] of groups) {
        const section = document.createElement("section");
        section.className = "search-group";
        const heading = document.createElement("h3");
        heading.textContent = category;
        const list = document.createElement("div");
        list.className = "search-result-list";
        groupItems.forEach((item) => appendResult(list, item));
        section.append(heading, list);
        results.append(section);
      }
    } catch {
      if (current !== request) return;
      status.textContent = "搜索索引暂时不可用，请稍后重试。";
    }
  });
}

document.querySelectorAll<HTMLElement>("[data-search-root]").forEach(initializeSearch);

const dialog = document.querySelector<HTMLDialogElement>("[data-search-dialog]");
const dialogInput = dialog?.querySelector<HTMLInputElement>("[data-search-input]");
const openDialog = () => {
  if (!dialog) return;
  if (!dialog.open) dialog.showModal();
  requestAnimationFrame(() => dialogInput?.focus());
};

document.querySelectorAll<HTMLElement>("[data-search-open]").forEach((trigger) => {
  trigger.addEventListener("click", (event) => {
    event.preventDefault();
    openDialog();
  });
});
dialog?.querySelector<HTMLElement>("[data-search-close]")?.addEventListener("click", () => dialog.close());
dialog?.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
  const target = event.target;
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || (target instanceof HTMLElement && target.isContentEditable)) return;
  event.preventDefault();
  openDialog();
});
