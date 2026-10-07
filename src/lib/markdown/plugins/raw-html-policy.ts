import type { Html, Root } from "mdast";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";
import { assertSafeHtml } from "../../security/html-policy.ts";

export function remarkRawHtmlPolicy(
  allowedIframeHosts: readonly string[],
): Plugin<[], Root> {
  return () => (tree) => {
    visit(tree, "html", (node: Html) => {
      assertSafeHtml(node.value, allowedIframeHosts);
    });
  };
}
