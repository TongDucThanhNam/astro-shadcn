const IMAGE_ORIGIN = 'https://phimimg.com/';

const ensureTrailingSlash = (value: string) => (value.endsWith('/') ? value : `${value}/`);

export const resolveImageUrl = (source?: string | null) => {
  if (!source) return null;

  if (source.startsWith('http')) {
    return source;
  }

  if (source.startsWith('//')) {
    return `https:${source}`;
  }

  const normalizedOrigin = ensureTrailingSlash(IMAGE_ORIGIN);
  const sanitized = source.replace(/^\/+/, '');
  return `${normalizedOrigin}${sanitized}`;
};

export const imagePresets = {
  hero: {
    dimension: { width: 1200, height: 675 },
    widths: [640, 800, 1200, 1600],
    sizes: '(max-width: 640px) 100vw, (max-width: 768px) 90vw, (max-width: 1024px) 80vw, 1200px',
    quality: 75,
  },
  poster: {
    dimension: { width: 320, height: 480 },
    widths: [160, 240, 320, 480],
    sizes: '(max-width: 640px) 45vw, (max-width: 768px) 22vw, (max-width: 1024px) 18vw, 320px',
    quality: 80,
  },
  thumbnail: {
    dimension: { width: 300, height: 450 },
    widths: [150, 300, 450],
    sizes: '(max-width: 640px) 45vw, (max-width: 768px) 22vw, (max-width: 1024px) 18vw, 300px',
    quality: 80,
  },
};
