import { getOptimizedSectionData, type SectionRequest } from "@/lib/api-service";
import type { ListItem } from "@/lib/phimapi";

export type SectionLayout = "landscape" | "portrait";

export interface SectionConfig {
  key: string;
  title: string;
  subtitle: string;
  typeList: string;
  layout: SectionLayout;
  params: Record<string, string>;
}

export interface SectionData extends SectionConfig {
  items: ListItem[];
  error?: string;
}

export function formatYear(item: ListItem) {
  if (!item?.year) return null;
  return String(item.year);
}

export async function getSectionData(config: SectionConfig): Promise<SectionData> {
  const sectionRequest: SectionRequest = {
    key: config.key,
    typeList: config.typeList,
    params: config.params,
  };

  try {
    const result = await getOptimizedSectionData(sectionRequest);
    return {
      ...config,
      items: result.items ?? [],
      error: result.error,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Khong the tai du lieu.";
    return {
      ...config,
      items: [],
      error: message,
    };
  }
}
