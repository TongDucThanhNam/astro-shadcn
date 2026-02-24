import { CACHE_CONFIGS } from './cache';
import { getCachedValue, setCachedValue } from './server-cache';
import { PhimApiClientError, getListByType, type ListItem, type QueryInput } from '@/lib/phimapi';

export interface SectionRequest {
  key: string;
  typeList: string;
  params: Record<string, string>;
}

export interface SectionResponse {
  key: string;
  items: ListItem[];
  error?: string;
}

export interface BatchedResponse {
  sections: SectionResponse[];
}

export async function fetchBatchedSections(requests: SectionRequest[]): Promise<BatchedResponse> {
  const promises = requests.map(async (req) => {
    try {
      const query = req.params as QueryInput;
      const cacheKey = `section:${req.typeList}?${new URLSearchParams(req.params).toString()}`;
      const cached = getCachedValue<SectionResponse>(cacheKey);
      if (cached) {
        return cached;
      }

      const data = await getListByType(req.typeList, query);
      const result: SectionResponse = {
        key: req.key,
        items: data.data.items,
      };

      setCachedValue(cacheKey, result, CACHE_CONFIGS.SECTION_DATA.maxAge);
      return result;
    } catch (error: unknown) {
      const message =
        error instanceof PhimApiClientError ? error.message : 'Khong the tai du lieu.';
      return {
        key: req.key,
        items: [],
        error: message,
      };
    }
  });

  const sections = await Promise.all(promises);
  return { sections };
}

export async function getOptimizedSectionData(config: SectionRequest): Promise<SectionResponse> {
  const result = await fetchBatchedSections([config]);
  return result.sections[0];
}
