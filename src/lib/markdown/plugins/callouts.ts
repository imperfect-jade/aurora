import type { Blockquote, Paragraph, Root, Text } from "mdast";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";

const calloutMarker = /^\[!([a-z][a-z0-9-]*)\](?:[+-])?(?:\s+([^\n]+))?(?:\n|$)/i;

export const remarkObsidianCallouts: Plugin<[], Root> = () => (tree) => {
  visit(tree, "blockquote", (node: Blockquote) => {
    const firstParagraph = node.children[0];
    if (!firstParagraph || firstParagraph.type !== "paragraph") return;
    const firstText = firstParagraph.children[0];

    if (!firstText || firstText.type !== "text") return;

    const match = firstText.value.match(calloutMarker);
    if (!match) return;

    const kind = match[1].toLowerCase();
    const title = match[2]?.trim() || kind;
    firstText.value = firstText.value.slice(match[0].length);

    if (firstText.value.length === 0) {
      firstParagraph.children.shift();
    }
    if (firstParagraph.children.length === 0) {
      node.children.shift();
    }

    const titleText: Text = { type: "text", value: title };
    const titleNode: Paragraph = {
      type: "paragraph",
      data: {
        hProperties: { className: ["callout-title"] },
      },
      children: [titleText],
    };

    node.data = {
      hName: "aside",
      hProperties: {
        className: ["callout", `callout-${kind}`],
        "data-callout": kind,
      },
    };
    node.children.unshift(titleNode);
  });
};
