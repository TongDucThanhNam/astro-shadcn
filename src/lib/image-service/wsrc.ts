import type { ExternalImageService, ImageTransform } from 'astro';
import { isRemoteImage } from 'astro/assets/utils';

type WsrvServiceConfig = {
  baseUrl?: string;
  imageOrigin?: string;
  defaultQuality?: number;
  defaultFormat?: string;
};

const DEFAULT_BASE_URL = 'https://wsrv.nl/?url=';
const DEFAULT_IMAGE_ORIGIN = 'https://phimimg.com/';
const DEFAULT_QUALITY = 80;
const DEFAULT_FORMAT = 'webp';

const ensureTrailingSlash = (value: string) => (value.endsWith('/') ? value : `${value}/`);

const resolveSource = (src: ImageTransform['src'], imageOrigin: string) => {
  if (typeof src === 'string') {
    if (src.startsWith('http')) {
      return src;
    }

    if (src.startsWith('//')) {
      return `https:${src}`;
    }

    const normalizedOrigin = ensureTrailingSlash(imageOrigin);
    const sanitized = src.replace(/^\/+/, '');
    return `${normalizedOrigin}${sanitized}`;
  }

  return src.src;
};

const pickDimensions = (options: ImageTransform) => {
  const { width, height } = options;

  if (width && height) {
    return { width, height };
  }

  if (typeof options.src === 'object') {
    return {
      width: options.src.width,
      height: options.src.height,
    };
  }

  return { width, height };
};

const createTransform = (
  options: ImageTransform,
  width: number,
  height: number,
): ImageTransform => {
  const { widths, densities, ...rest } = options;

  return {
    ...rest,
    width,
    height,
  };
};

const service: ExternalImageService<WsrvServiceConfig> = {
  async validateOptions(options, imageConfig) {
    if (!options.src) {
      throw new Error('Image source is required for wsrv service.');
    }

    if (!isRemoteImage(options.src) && typeof options.src !== 'object') {
      throw new Error('Unsupported image source type for wsrv service.');
    }

    const config = imageConfig.service.config ?? {};

    const normalized = { ...options };
    normalized.quality ??= config.defaultQuality ?? DEFAULT_QUALITY;
    normalized.format ??= config.defaultFormat ?? DEFAULT_FORMAT;

    const { width, height } = pickDimensions(normalized);
    normalized.width = width;
    normalized.height = height;

    return normalized;
  },
  getHTMLAttributes(options) {
    const { src, widths, densities, format, quality, ...rest } = options;

    return {
      ...rest,
      loading: rest.loading ?? 'lazy',
      decoding: rest.decoding ?? 'async',
    };
  },
  getSrcSet(options) {
    if (!options.width || !options.height) {
      return [];
    }

    const aspectRatio = options.width / options.height;
    const targetFormat = options.format ?? DEFAULT_FORMAT;
    const widths = options.widths ?? [];

    if (!widths.length) {
      return [];
    }

    const uniqueWidths = Array.from(new Set(widths)).sort((a, b) => a - b);

    return uniqueWidths.map((width) => {
      const height = Math.round(width / aspectRatio);
      return {
        transform: createTransform(options, width, height),
        descriptor: `${width}w`,
        attributes: {
          type: `image/${targetFormat}`,
        },
      };
    });
  },
  getURL(options, imageConfig) {
    const config = imageConfig.service.config ?? {};
    const baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
    const imageOrigin = config.imageOrigin ?? DEFAULT_IMAGE_ORIGIN;

    const source = resolveSource(options.src, imageOrigin);
    const params = new URLSearchParams();

    if (options.width) params.set('w', String(options.width));
    if (options.height) params.set('h', String(options.height));
    if (options.quality != null) params.set('q', String(options.quality));
    if (options.format) params.set('output', options.format);
    if (options.fit) params.set('fit', options.fit);
    if (options.position) params.set('crop', options.position);

    const query = params.toString();
    const separator = baseUrl.includes('?') ? '&' : '?';

    return `${baseUrl}${encodeURIComponent(source)}${query ? `${separator}${query}` : ''}`;
  },
};

export default service;
