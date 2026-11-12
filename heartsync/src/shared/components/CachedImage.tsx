import { Image, type ImageProps } from 'expo-image';

const DEFAULT_TRANSITION: NonNullable<ImageProps['transition']> = {
  duration: 160,
  effect: 'cross-dissolve',
  skipOnCacheHit: 'all',
};

function sourceIdentity(source: ImageProps['source']) {
  if (typeof source === 'string' || typeof source === 'number') return String(source);
  if (!source || Array.isArray(source) || typeof source !== 'object') return undefined;
  const remote = source as { cacheKey?: string; uri?: string };
  return remote.cacheKey || remote.uri;
}

/**
 * Shared remote-image primitive. Profile photos are immutable objects with
 * short-lived signed URLs, so memory + disk caching is both safe and much
 * faster than decoding them again whenever a screen remounts.
 */
export function CachedImage({
  cachePolicy = 'memory-disk',
  contentFit = 'cover',
  recyclingKey,
  source,
  transition = DEFAULT_TRANSITION,
  ...props
}: ImageProps) {
  const identity = sourceIdentity(source);
  return <Image key={identity} {...props} source={source} cachePolicy={cachePolicy} contentFit={contentFit}
    recyclingKey={identity ?? recyclingKey} transition={transition} />;
}

export async function prefetchCachedImages(urls: string[]) {
  const uniqueUrls = [...new Set(urls.filter(Boolean))];
  if (uniqueUrls.length === 0) return;
  await Image.prefetch(uniqueUrls, { cachePolicy: 'memory-disk' });
}
