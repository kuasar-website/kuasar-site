import type { ReactNode } from "react";

import type { InlineNode, ParsedMissionBody } from "./markdown";
import styles from "./missions.module.css";

function inlineNodes(nodes: readonly InlineNode[], keyPrefix: string): ReactNode[] {
  return nodes.map((node, index) => {
    const key = `${keyPrefix}-${index}`;
    if (node.kind === "text") return node.value;
    if (node.kind === "strong") {
      return <strong key={key}>{inlineNodes(node.children, key)}</strong>;
    }
    if (node.kind === "emphasis") {
      return <em key={key}>{inlineNodes(node.children, key)}</em>;
    }

    const external = node.href.startsWith("https://");
    return (
      <a
        className={styles["inline-link"]}
        href={node.href}
        key={key}
        rel={external ? "noopener" : undefined}
        target={external ? "_blank" : undefined}
      >
        {inlineNodes(node.children, key)}
        <span aria-hidden="true">{external ? "↗" : "→"}</span>
      </a>
    );
  });
}

export function MissionProse({ parsed }: { readonly parsed: ParsedMissionBody }) {
  return (
    <div className={styles.prose}>
      {parsed.blocks.map((block, index) => {
        const key = `${block.kind}-${index}`;
        if (block.kind === "heading") {
          return block.level === 2 ? (
            <h2 key={key}>{inlineNodes(block.children, key)}</h2>
          ) : (
            <h3 key={key}>{inlineNodes(block.children, key)}</h3>
          );
        }
        if (block.kind === "paragraph") {
          return <p key={key}>{inlineNodes(block.children, key)}</p>;
        }
        return (
          <ul key={key}>
            {block.items.map((item, itemIndex) => (
              <li key={`${key}-${itemIndex}`}>
                {inlineNodes(item, `${key}-${itemIndex}`)}
              </li>
            ))}
          </ul>
        );
      })}
    </div>
  );
}
