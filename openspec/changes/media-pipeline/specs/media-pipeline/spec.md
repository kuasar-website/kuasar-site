## Purpose

Defines how an uploaded image gets from the Strapi admin to a visitor on either locale. It is stored once on R2, served only from the custom media domain, resized at Cloudflare's edge, described by alt text in both English and Turkish, and rendered without layout shift. Strapi being down never takes an image offline.

## ADDED Requirements

### Requirement: Uploaded media is stored only on R2, as the original plus an admin-only thumbnail
An image uploaded through the Strapi Media Library SHALL be persisted only in the R2 bucket. The CMS instance SHALL NOT persist the upload or any derivative of it on its own filesystem. The CMS SHALL store the original bytes unmodified (not re-encoded, not rotated) and SHALL NOT generate responsive derivative formats, because resizing happens at the edge. The one exception is the CMS's own admin thumbnail, which the CMS always creates for its Media Library grid. The public site SHALL NOT reference that thumbnail or any stored derivative; it SHALL use only the original's URL.

#### Scenario: Upload persists the original and the admin thumbnail only
- **WHEN** an Editor uploads a photograph in a configured environment
- **THEN** the R2 bucket holds the original, byte-for-byte as uploaded, plus at most one admin thumbnail, and the stored file record lists no small, medium or large formats

#### Scenario: Site ignores the thumbnail
- **WHEN** a page in either locale renders an uploaded image
- **THEN** every emitted image URL is derived from the original's URL, never from the thumbnail's

#### Scenario: Rotated phone photo records display dimensions
- **WHEN** an Editor uploads a photo whose pixels are stored landscape with an EXIF orientation tag of 5–8 (a 90° rotation)
- **THEN** the stored width and height are the displayed (rotated) dimensions, so the reserved box has the photo's real aspect ratio

#### Scenario: Redeploying the CMS loses no image
- **WHEN** the CMS instance is redeployed or restarted after images were uploaded
- **THEN** every previously uploaded image still resolves at its media URL

#### Scenario: CMS down, images still served
- **WHEN** the CMS instance is asleep or unreachable
- **THEN** every image on the public site in both `/en` and `/tr` routes still loads, because no image URL points at the CMS host

### Requirement: Images are delivered only from the media custom domain
Every image URL the public site emits SHALL be on `https://media.kuasar.org`. The site SHALL NOT emit an image URL on `*.r2.dev`, on the `*.r2.cloudflarestorage.com` S3 endpoint, on the CMS host, or on Vercel's image optimiser path (`/_next/image`). If build-time content supplies an image URL on any other host, the build SHALL fail with an error naming the offending entry and field, rather than shipping it.

#### Scenario: Uploaded image resolves at the media domain
- **WHEN** an Editor uploads an image and the entry using it is published
- **THEN** the published page in both locales references that image under `https://media.kuasar.org/`, and the file's stored URL is also under that host

#### Scenario: r2.dev URL is refused at build
- **WHEN** build-time content contains an image whose URL is on `*.r2.dev`
- **THEN** the build fails with an error naming the entry and field and stating that images must be served from `media.kuasar.org`

#### Scenario: Raw S3 endpoint URL is refused at build
- **WHEN** build-time content contains an image whose URL is on `<account-id>.r2.cloudflarestorage.com` (for example, because `R2_PUBLIC_URL` was unset when it was uploaded)
- **THEN** the build fails with the same error, rather than publishing an unauthenticated-endpoint URL

#### Scenario: Vercel image optimisation is never used
- **WHEN** any statically generated page in either locale is rendered
- **THEN** no emitted `src` or `srcset` entry points at `/_next/image`

### Requirement: Images are resized at Cloudflare's edge from a bounded width set
Responsive image variants SHALL be produced by Cloudflare Image Transformations on the media domain, from the original in R2. Each emitted `srcset` SHALL draw only from one fixed, documented set of widths and a single quality value, so the number of unique transformations per image is bounded. The output format SHALL be one every supported browser can display. The edge may negotiate it per browser, or a single format may be fixed, whichever keeps the documented worst-case monthly count inside the free allowance.

#### Scenario: srcset uses edge transformation URLs
- **WHEN** a page renders an image in either locale
- **THEN** each `srcset` candidate is a `https://media.kuasar.org/cdn-cgi/image/<options>/<key>` URL whose width is a member of the documented width set

#### Scenario: Unknown widths are not requested
- **WHEN** a component asks for an image at a width outside the documented set
- **THEN** the emitted URL uses a width from the set, never an arbitrary width that would mint a new unique transformation

### Requirement: Exceeding the free transformation allowance degrades to originals, not to broken images
When Cloudflare refuses to create a new transformation (including after the monthly free allowance of 5,000 unique transformations is used up on the Free plan), the visitor SHALL receive the original image from the media domain instead of an error. Transformations already cached SHALL continue to be served. Exceeding the allowance SHALL NOT incur a charge.

#### Scenario: Allowance exhausted mid-month
- **WHEN** the zone has used its 5,000 free unique transformations this month and a visitor requests an image width that has not been transformed before
- **THEN** the visitor is redirected to and shown the original image at `https://media.kuasar.org/<key>`, and the image renders at its declared size without layout shift

#### Scenario: Cached transformation after the allowance
- **WHEN** the allowance is exhausted and a visitor requests a width transformed earlier in the month
- **THEN** the transformed image is served as normal

### Requirement: Every image carries alt text in both locales
Every image-type media field on the seven Strapi collections SHALL carry an English alt text and a Turkish alt text alongside the image. An Editor SHALL NOT be able to publish an entry in any locale while an attached image lacks either alt text. The chosen image SHALL be stored once, not once per locale. The page SHALL render the alt text matching the route's locale. Optional images remain optional: when no image is attached, no alt text is required. Video and document fields are not image fields and are excluded.

#### Scenario: Publish blocked without Turkish alt
- **WHEN** an Editor attaches an image to an entry, fills the English alt text, leaves the Turkish alt text empty, and publishes
- **THEN** the CMS rejects the publish and names the missing field

#### Scenario: Publish blocked without English alt
- **WHEN** an Editor attaches an image, fills the Turkish alt text, leaves the English alt text empty, and publishes
- **THEN** the CMS rejects the publish and names the missing field

#### Scenario: Locale-matched alt on the page
- **WHEN** a published entry's image has English alt "Launch of Apogee-1 at dawn" and Turkish alt "Apogee-1'in şafakta fırlatılışı"
- **THEN** the `/en` page renders the English alt text and the `/tr` page renders the Turkish alt text, with Turkish characters intact

#### Scenario: Image chosen once for both locales
- **WHEN** an Editor attaches an image while editing the `en` locale and then switches to `tr`
- **THEN** the same image is attached in `tr` without being picked again

#### Scenario: Optional image left empty
- **WHEN** an Editor publishes an Alumni entry with no photo
- **THEN** the publish succeeds with no alt text required, and the page renders the card without an image or an empty `alt`

#### Scenario: Gallery with zero, one and many images
- **WHEN** a gallery field (Nebula Night `photos`, Galactic Summit `photos`) holds zero, one, or fifty images
- **THEN** every image present carries both alt texts before publish succeeds, and a gallery with zero images publishes without any alt text

### Requirement: Images render with declared dimensions and no layout shift
Every rendered image SHALL reserve its space before it loads, using the width and height recorded for the original upload or an explicitly declared aspect-ratio box. An image whose dimensions are unknown SHALL NOT be rendered unsized. Pages rendering real photographs SHALL have a Cumulative Layout Shift below 0.1 in both locales.

#### Scenario: Space reserved before load
- **WHEN** a page with photographs is loaded on a throttled connection in either locale
- **THEN** each image's box has its final size before its bytes arrive, and content below it does not move when it loads

#### Scenario: CLS with real photographs
- **WHEN** a page rendering real uploaded photographs of mixed orientations is measured with Lighthouse in `/en` and `/tr`
- **THEN** Cumulative Layout Shift is below 0.1 on each

#### Scenario: Dimensions missing
- **WHEN** build-time content supplies an image without width and height and the component was not given an aspect-ratio box
- **THEN** the build fails naming the entry, rather than rendering an unsized image
