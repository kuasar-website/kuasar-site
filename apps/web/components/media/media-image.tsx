import Image from "next/image";

import type { MediaImageData } from "@/lib/media/image.ts";

type MediaImageProps = {
  /** From `toMediaImage` — never build this by hand. */
  image: MediaImageData;
  /**
   * The `sizes` attribute: how wide the image renders at each breakpoint. Without it the
   * browser gets only 1x/2x candidates, which suits fixed-size images (portraits, logos).
   */
  sizes?: string;
  /**
   * A CSS aspect ratio such as "16 / 9" when the layout crops the image to a fixed shape.
   * The box is reserved at that ratio and the image covers it. Omit it to render at the
   * image's own ratio, reserved from its stored width and height.
   */
  aspectRatio?: string;
  /** The image is above the fold (hero, first card). Loads eagerly at high priority. */
  eager?: boolean;
  className?: string;
};

/**
 * The one image component every section uses. It always reserves the image's space before
 * the bytes arrive, so photographs never shift the layout (CLS < 0.1), in both locales.
 * Either the stored width and height set the ratio, or `aspectRatio` declares a box —
 * there is no path that renders an image unsized.
 *
 * URLs go through the Cloudflare edge loader (lib/media/cloudflare-loader.ts). No motion:
 * the image simply appears over the surface colour.
 */
export function MediaImage({ image, sizes, aspectRatio, eager = false, className }: MediaImageProps) {
  const loading = eager ? { loading: "eager" as const, fetchPriority: "high" as const } : {};

  if (aspectRatio) {
    return (
      <span className={`relative block overflow-hidden bg-surface ${className ?? ""}`} style={{ aspectRatio }}>
        <Image
          src={image.src}
          alt={image.alt}
          fill
          sizes={sizes ?? "100vw"}
          unoptimized={image.unoptimized}
          className="object-cover"
          {...loading}
        />
      </span>
    );
  }

  return (
    <Image
      src={image.src}
      alt={image.alt}
      width={image.width}
      height={image.height}
      sizes={sizes}
      unoptimized={image.unoptimized}
      className={`h-auto max-w-full bg-surface ${className ?? ""}`}
      {...loading}
    />
  );
}
