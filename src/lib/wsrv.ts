const IMAGE_ORIGIN = 'https://phimimg.com/';
const WSRV_BASE_URL = 'https://wsrv.nl/?url=';
const DEFAULT_QUALITY = 80;
const DEFAULT_FORMAT = 'webp';

type WsrvImageOptions = {
  width?: number;
  height?: number;
  quality?: number;
  format?: string;
  fit?: string;
  crop?: string;
};

export const resolveImageUrl = (source?: string | null) => {
  if (!source) return null;

  if (source.startsWith('http')) {
    return source;
  }

  if (source.startsWith('//')) {
    return `https:${source}`;
  }

  const sanitized = source.replace(/^\/+/, '');
  return `${IMAGE_ORIGIN}${sanitized}`;
};

const isWsrvUrl = (source: string) => {
  try {
    const parsed = new URL(source);
    return parsed.hostname === 'wsrv.nl';
  } catch {
    return false;
  }
};

export const createWsrvImageUrl = (source?: string | null, options: WsrvImageOptions = {}) => {
  const resolvedSource = resolveImageUrl(source);
  if (!resolvedSource) return null;
  if (isWsrvUrl(resolvedSource)) return resolvedSource;

  const { width, height, fit, crop, quality = DEFAULT_QUALITY, format = DEFAULT_FORMAT } = options;

  const params = new URLSearchParams();
  if (width) params.set('w', String(width));
  if (height) params.set('h', String(height));
  if (quality) params.set('q', String(quality));
  if (format) params.set('output', format);
  if (fit) params.set('fit', fit);
  if (crop) params.set('crop', crop);

  const query = params.toString();
  const separator = WSRV_BASE_URL.includes('?') ? '&' : '?';
  return `${WSRV_BASE_URL}${encodeURIComponent(resolvedSource)}${query ? `${separator}${query}` : ''}`;
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
