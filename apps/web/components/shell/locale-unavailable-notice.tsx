"use client";

import { useSearchParams } from "next/navigation";

import styles from "./site-shell.module.css";

type LocaleUnavailableNoticeProps = {
  readonly message: string;
};

export function LocaleUnavailableNotice({
  message,
}: LocaleUnavailableNoticeProps) {
  const searchParams = useSearchParams();

  if (searchParams.get("notice") !== "unavailable") {
    return null;
  }

  return (
    <p className={styles["locale-notice"]} role="status">
      {message}
    </p>
  );
}
