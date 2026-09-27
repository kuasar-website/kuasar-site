import Link, { type LinkProps } from "next/link";
import type { ReactNode } from "react";
import styles from "./action-link.module.css";

export type ActionLinkVariant = "primary" | "secondary" | "text";

type ActionLinkProps = Omit<
  LinkProps,
  | "legacyBehavior"
  | "passHref"
  | "onClick"
  | "onMouseEnter"
  | "onNavigate"
  | "onTouchStart"
  | "transitionTypes"
> & {
  "aria-label"?: string;
  children: ReactNode;
  rel?: string;
  target?: "_blank" | "_parent" | "_self" | "_top";
  variant: ActionLinkVariant;
};

const variantClassName: Record<ActionLinkVariant, string> = {
  primary: styles.primary,
  secondary: styles.secondary,
  text: styles.text,
};

export function ActionLink({
  children,
  variant,
  ...linkProps
}: ActionLinkProps) {
  return (
    <Link
      {...linkProps}
      className={`${styles.action} ${variantClassName[variant]}`}
    >
      <span>{children}</span>
      {variant === "text" ? (
        <span aria-hidden="true" className={styles.arrow}>
          →
        </span>
      ) : null}
    </Link>
  );
}
