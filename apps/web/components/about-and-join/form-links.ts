const GOOGLE_FORM_HOSTS = new Set(["docs.google.com", "forms.gle"]);

function googleFormUrl(value: string): string {
  const url = new URL(value);

  if (
    url.protocol !== "https:" ||
    !GOOGLE_FORM_HOSTS.has(url.hostname) ||
    (url.hostname === "docs.google.com" && !url.pathname.startsWith("/forms/"))
  ) {
    throw new Error(`Invalid club Google Form URL: ${value}`);
  }

  return url.toString();
}

export const FORM_LINKS = {
  join: googleFormUrl(
    "https://docs.google.com/forms/d/e/1FAIpQLSdo2fCK7YnhP9mxPgYz2huINwwBYS-TvI0KUb5wrHKa65AfwQ/viewform?usp=publish-editor",
  ),
  connect: googleFormUrl(
    "https://docs.google.com/forms/d/e/1FAIpQLSd0fECESnoQvz2jK2Q5iNWt2_np0IhxrIr_IpQ4yCRN2kLhzw/viewform?usp=publish-editor",
  ),
} as const;
