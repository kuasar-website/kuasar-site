import type { ReactElement } from "react";
import type { Locale } from "../../lib/i18n/segments";
import type { MediaImageData } from "../../lib/media/image";
import type { SummitData, SummitEdition } from "../../lib/summit/data";
import { SUMMIT_TIME_ZONE } from "../../lib/summit/time";
import { formatDate } from "../../lib/time/date";
import { ActionLink } from "../ui/action-link";
import { SUMMIT_COPY } from "./copy";
import { SponsorshipPdfLink } from "./sponsorship-pdf-link";
import { SummitDayBadge } from "./summit-day-badge";
import styles from "./summit.module.css";

/**
 * How an image is drawn. Production passes MediaImage (components/summit/content.tsx);
 * tests pass a plain <img>. Either way the data came from toMediaImage.
 */
export type RenderImage = (image: MediaImageData, options: { sizes: string; aspectRatio?: string; eager?: boolean }) => ReactElement;

const Brand = ({ year }: { year: number }) => <><span lang="en">Galactic Summit</span> {year}</>;

function Facts({ edition, locale, badge }: { edition: SummitEdition; locale: Locale; badge: boolean }) {
  const copy = SUMMIT_COPY[locale];
  return <dl className={styles.facts}>
    <div>
      <dt>{copy.dateLabel}</dt>
      <dd>
        {edition.date
          ? <time dateTime={edition.date}>{formatDate(edition.date, locale, SUMMIT_TIME_ZONE)}</time>
          : copy.noDate}
        {badge && <> <SummitDayBadge date={edition.date} locale={locale} /></>}
      </dd>
    </div>
    {edition.location && <div><dt>{copy.locationLabel}</dt><dd>{edition.location}</dd></div>}
  </dl>;
}

/**
 * The Galactic Summit page body: one layout for every year. Per-year variation is
 * only data-accent, data-treatment and the background image (ADR 0002 decision 7;
 * openspec/changes/galactic-summit design.md D1–D9). Sponsors are deliberately
 * absent: the data never contains them.
 */
export function SummitView({ locale, data, renderImage }: { locale: Locale; data: SummitData; renderImage: RenderImage }) {
  const copy = SUMMIT_COPY[locale];
  const { current, others } = data;
  if (!current) {
    return <div className={styles.summit}>
      <h1 className={styles.title} lang="en">Galactic Summit</h1>
      <p className={styles.empty}>{copy.empty}</p>
    </div>;
  }
  const text = current.contentLocale;
  return <div className={styles.summit} data-accent={current.accentToken} data-treatment={current.heroTreatment}>
    <div className={styles.frame} data-treatment={current.heroTreatment}>
      {current.backgroundImage && renderImage(current.backgroundImage, { sizes: "100vw", aspectRatio: "auto", eager: true })}
    </div>
    <header className={styles.intro}>
      <span className={styles.rule} aria-hidden="true" />
      <h1 className={styles.title}><Brand year={current.year} /></h1>
      <Facts edition={current} locale={locale} badge />
      {current.purpose && <p className={styles.purpose} lang={text}>{current.purpose}</p>}
      <div className={styles.actions}>
        {current.registrationUrl
          ? <ActionLink variant="primary" href={current.registrationUrl} target="_blank" rel="noopener"
            aria-label={copy.registerName(current.year)}>{copy.register} <span aria-hidden="true">↗</span></ActionLink>
          : <p className={styles.soon}>{copy.registrationSoon}</p>}
        {current.sponsorshipPdf && <SponsorshipPdfLink href={current.sponsorshipPdf}
          label={copy.partner} accessibleName={copy.partnerName} />}
      </div>
    </header>

    {current.programme.length > 0 && <section className={styles.section} aria-labelledby="summit-programme">
      <h2 id="summit-programme" className={styles.heading}>{copy.programme}</h2>
      <ol className={styles.programme} aria-labelledby="summit-programme" lang={text}>
        {current.programme.map((item, i) => <li key={i}>
          {item.time && <span className={styles.time}>{item.time}</span>}
          {item.title && <span className={styles["item-title"]}>{item.title}</span>}
          {item.description && <span className={styles.description}>{item.description}</span>}
        </li>)}
      </ol>
    </section>}

    {current.speakers.length > 0 && <section className={styles.section} aria-labelledby="summit-speakers">
      <h2 id="summit-speakers" className={styles.heading}>{copy.speakers}</h2>
      <ul className={styles.speakers} aria-labelledby="summit-speakers">
        {current.speakers.map((speaker, i) => <li key={i} className={styles.speaker}>
          {speaker.portrait && <span className={styles.portrait}>{renderImage(speaker.portrait, { sizes: "96px", aspectRatio: "1 / 1" })}</span>}
          <span className={styles.name}>{speaker.name}</span>
          {speaker.role && <span className={styles.role}>{speaker.role}</span>}
        </li>)}
      </ul>
    </section>}

    {current.photos.length > 0 && <section className={styles.section} aria-labelledby="summit-photos">
      <h2 id="summit-photos" className={styles.heading}>{copy.photos}</h2>
      <ul className={styles.photos} aria-labelledby="summit-photos">
        {current.photos.map((photo) => <li key={photo.id}><figure>
          {renderImage(photo.image, { sizes: "(min-width: 768px) 33vw, 100vw" })}
        </figure></li>)}
      </ul>
    </section>}

    {current.contactAddress && <section className={styles.section} aria-labelledby="summit-contact">
      <h2 id="summit-contact" className={styles.heading}>{copy.contact}</h2>
      <p className={styles.contact} lang={text}>{current.contactAddress}</p>
    </section>}

    {others.length > 0 && <section className={styles.section} aria-labelledby="summit-archive">
      <h2 id="summit-archive" className={styles.heading}>{copy.archive}</h2>
      <ul className={styles.archive}>
        {others.map((edition) => <li key={edition.id}><article className={styles.edition}>
          <h3 className={styles["edition-title"]}><Brand year={edition.year} /></h3>
          <Facts edition={edition} locale={locale} badge={false} />
          {edition.purpose && <p className={styles.purpose} lang={edition.contentLocale}>{edition.purpose}</p>}
          {edition.photos.length > 0 && <ul className={styles.photos} aria-label={copy.archivePhotos(edition.year)}>
            {edition.photos.map((photo) => <li key={photo.id}><figure>
              {renderImage(photo.image, { sizes: "(min-width: 768px) 33vw, 100vw" })}
            </figure></li>)}
          </ul>}
        </article></li>)}
      </ul>
    </section>}
  </div>;
}
