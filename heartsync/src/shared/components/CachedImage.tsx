import { Image, type ImageProps } from 'expo-image';

const DEFAULT_TRANSITION: NonNullable<ImageProps['transition']> = {
  duration: 160,
  effect: 'cross-dissolve',
  skipOnCacheHit: 'all',
};

/**
 * Shared remote-image primitive. Profile photos are immutable objects with
 * short-lived signed URLs, so memory + disk caching is both safe and much
 * faster than decoding them again whenever a screen remounts.
 */
export function CachedImage({
  cachePolicy = 'memory-disk',
  contentFit = 'cover',
  transition = DEFAULT_TRANSITION,
  ...props
}: ImageProps) {
  return <Image {...props} cachePolicy={cachePolicy} contentFit={contentFit} transition={transition} />;
}

export async function prefetchCachedImages(urls: string[]) {
  const uniqueUrls = [...new Set(urls.filter(Boolean))];
  if (uniqueUrls.length === 0) return;
  await Image.prefetch(uniqueUrls, { cachePolicy: 'memory-disk' });
}
