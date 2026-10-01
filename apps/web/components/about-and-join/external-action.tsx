import { ActionLink } from "@/components/ui";

import styles from "./page.module.css";

type ExternalActionProps = {
  readonly accessibleLabel: string;
  readonly body: string;
  readonly heading: string;
  readonly href: string;
  readonly label: string;
  readonly notice: string;
};

export function ExternalAction({
  accessibleLabel,
  body,
  heading,
  href,
  label,
  notice,
}: ExternalActionProps) {
  return (
    <aside className={styles["action-panel"]}>
      <h2>{heading}</h2>
      <p>{body}</p>
      <div className={styles.action}>
        <ActionLink
          aria-label={accessibleLabel}
          href={href}
          rel="noopener"
          target="_blank"
          variant="primary"
        >
          {label} <span aria-hidden="true">↗</span>
        </ActionLink>
      </div>
      <p className={styles["external-notice"]}>{notice}</p>
    </aside>
  );
}
