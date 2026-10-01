/**
 * Stored-pixel dimensions → displayed dimensions for EXIF-rotated photos.
 *
 * Kept apart from `strapi-server.ts` with no Strapi or `sharp` import of its own, so
 * `exif-dimensions.test.ts` can exercise it directly (`npm run test:media`, Tier A). Why this
 * exists at all, and why it must be re-checked on every Strapi upgrade, is in that file.
 */

export type Dimensions = { width: number | null; height: number | null };

export type UploadFile = {
  filepath?: string;
  getStream?: () => NodeJS.ReadableStream;
};

export type GetDimensions = (file: UploadFile) => Promise<Dimensions>;

type SharpMetadata = { orientation?: number };
type SharpInstance = NodeJS.WritableStream & { metadata: () => Promise<SharpMetadata> };
export type SharpFactory = (input?: string) => SharpInstance;

/** EXIF orientations 5–8 rotate the image by 90° (with or without a mirror). */
export function isQuarterTurn(orientation: number | undefined): boolean {
  return orientation !== undefined && orientation >= 5 && orientation <= 8;
}

export function displayDimensions(stored: Dimensions, orientation: number | undefined): Dimensions {
  return isQuarterTurn(orientation) ? { width: stored.height, height: stored.width } : stored;
}

/** Reads the EXIF orientation the same two ways Strapi reads metadata: from disk or a stream. */
export function readOrientation(sharp: SharpFactory, file: UploadFile): Promise<number | undefined> {
  if (file.filepath) {
    return sharp(file.filepath)
      .metadata()
      .then((meta) => meta.orientation);
  }

  if (!file.getStream) {
    return Promise.resolve(undefined);
  }

  const getStream = file.getStream;
  return new Promise((resolve, reject) => {
    const pipeline = sharp();
    pipeline.metadata().then((meta) => resolve(meta.orientation), reject);
    getStream().pipe(pipeline);
  });
}

/** Wraps Strapi's `getDimensions` so it returns displayed, not stored, dimensions. */
export function withDisplayDimensions(getDimensions: GetDimensions, sharp: SharpFactory): GetDimensions {
  return async (file) => displayDimensions(await getDimensions(file), await readOrientation(sharp, file));
}
