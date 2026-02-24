import { z } from 'zod';

const statusSchema = z.union([z.boolean(), z.string()]);
const timestampSchema = z.object({ time: z.string() });

const tmdbSchema = z.object({
  type: z.string().nullable(),
  id: z.string().nullable(),
  season: z.number().nullable(),
  vote_average: z.number(),
  vote_count: z.number(),
});

const imdbSchema = z.object({
  id: z.string().nullable(),
});

const classificationSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
});

const normalizedStringArraySchema = z
  .union([z.array(z.string()), z.string()])
  .transform((value) => (Array.isArray(value) ? value : [value]));

export const listItemSchema = z.object({
  tmdb: tmdbSchema,
  imdb: imdbSchema,
  created: timestampSchema,
  modified: timestampSchema,
  _id: z.string(),
  name: z.string(),
  slug: z.string(),
  origin_name: z.string(),
  type: z.string(),
  poster_url: z.string(),
  thumb_url: z.string(),
  sub_docquyen: z.boolean(),
  chieurap: z.boolean(),
  time: z.string(),
  episode_current: z.string(),
  quality: z.string(),
  lang: z.string(),
  year: z.number(),
  category: z.array(classificationSchema),
  country: z.array(classificationSchema),
});

const seoOnPageSchema = z.object({
  og_type: z.string(),
  titleHead: z.string(),
  descriptionHead: z.string(),
  og_image: z.array(z.string()).nullable().optional(),
  og_url: z.string(),
});

const breadCrumbSchema = z.object({
  name: z.string(),
  slug: z.string().optional(),
  isCurrent: z.boolean(),
  position: z.number(),
});

const paginationSchema = z.object({
  totalItems: z.number(),
  totalItemsPerPage: z.number(),
  currentPage: z.number(),
  totalPages: z.number(),
  updateToday: z.number().optional(),
});

const listParamsSchema = z.object({
  type_slug: z.string(),
  slug: z.string().optional(),
  keyword: z.string().optional(),
  filterCategory: z.array(z.string()),
  filterCountry: z.array(z.string()),
  filterYear: normalizedStringArraySchema,
  filterType: normalizedStringArraySchema,
  sortField: z.string(),
  sortType: z.string(),
  pagination: paginationSchema,
});

const listDataSchema = z.object({
  seoOnPage: seoOnPageSchema,
  breadCrumb: z.array(breadCrumbSchema),
  titlePage: z.string(),
  items: z.array(listItemSchema),
  params: listParamsSchema,
  type_list: z.string(),
  APP_DOMAIN_FRONTEND: z.string(),
  APP_DOMAIN_CDN_IMAGE: z.string(),
});

const searchDataSchema = listDataSchema.extend({
  items: z
    .array(listItemSchema)
    .nullable()
    .transform((items) => items ?? []),
});

export const listResponseSchema = z.object({
  status: statusSchema,
  msg: z.string(),
  data: listDataSchema,
});

export const searchResponseSchema = z.object({
  status: statusSchema,
  msg: z.string(),
  data: searchDataSchema,
});

const latestItemBaseSchema = z.object({
  tmdb: tmdbSchema,
  imdb: imdbSchema,
  modified: timestampSchema,
  _id: z.string(),
  name: z.string(),
  slug: z.string(),
  origin_name: z.string(),
  poster_url: z.string(),
  thumb_url: z.string(),
  year: z.number(),
});

export const latestV1ItemSchema = latestItemBaseSchema;

export const latestV2ItemSchema = latestItemBaseSchema.extend({
  status: z.string(),
  episode_current: z.string(),
});

export const latestV3ItemSchema = latestItemBaseSchema.extend({
  type: z.string(),
  sub_docquyen: z.boolean(),
  time: z.string(),
  episode_current: z.string(),
  quality: z.string(),
  lang: z.string(),
  category: z.array(classificationSchema),
  country: z.array(classificationSchema),
});

const latestResponseBaseSchema = z.object({
  status: z.boolean(),
  msg: z.string(),
  pagination: paginationSchema,
});

export const latestV1ResponseSchema = latestResponseBaseSchema.extend({
  items: z.array(latestV1ItemSchema),
});

export const latestV2ResponseSchema = latestResponseBaseSchema.extend({
  items: z.array(latestV2ItemSchema),
});

export const latestV3ResponseSchema = latestResponseBaseSchema.extend({
  items: z.array(latestV3ItemSchema),
});

export const taxonomyItemSchema = z.object({
  _id: z.string(),
  name: z.string(),
  slug: z.string(),
});

export const taxonomyListSchema = z.array(taxonomyItemSchema);

export const episodeServerDataSchema = z.object({
  name: z.string(),
  slug: z.string(),
  filename: z.string(),
  link_embed: z.string(),
  link_m3u8: z.string(),
});

export const episodeSchema = z.object({
  server_name: z.string(),
  server_data: z.array(episodeServerDataSchema),
});

export const movieDetailSchema = z.object({
  tmdb: tmdbSchema,
  imdb: imdbSchema,
  created: timestampSchema,
  modified: timestampSchema,
  _id: z.string(),
  name: z.string(),
  slug: z.string(),
  origin_name: z.string(),
  content: z.string(),
  type: z.string(),
  status: z.string(),
  poster_url: z.string(),
  thumb_url: z.string(),
  is_copyright: z.boolean(),
  sub_docquyen: z.boolean(),
  chieurap: z.boolean(),
  trailer_url: z.string(),
  time: z.string(),
  episode_current: z.string(),
  episode_total: z.string(),
  quality: z.string(),
  lang: z.string(),
  notify: z.string().optional(),
  showtimes: z.string().optional(),
  year: z.number(),
  view: z.number(),
  actor: z.array(z.string()),
  director: z.array(z.string()),
  category: z.array(classificationSchema),
  country: z.array(classificationSchema),
});

export const movieDetailResponseSchema = z.object({
  status: z.boolean(),
  msg: z.string(),
  movie: movieDetailSchema,
  episodes: z.array(episodeSchema).default([]),
});

export const tmdbMovieResponseSchema = movieDetailResponseSchema;

export type ListResponse = z.infer<typeof listResponseSchema>;
export type SearchResponse = z.infer<typeof searchResponseSchema>;
export type ListItem = z.infer<typeof listItemSchema>;
export type LatestMoviesResponseV1 = z.infer<typeof latestV1ResponseSchema>;
export type LatestMoviesResponseV2 = z.infer<typeof latestV2ResponseSchema>;
export type LatestMoviesResponseV3 = z.infer<typeof latestV3ResponseSchema>;
export type LatestMovieItemV1 = z.infer<typeof latestV1ItemSchema>;
export type LatestMovieItemV2 = z.infer<typeof latestV2ItemSchema>;
export type LatestMovieItemV3 = z.infer<typeof latestV3ItemSchema>;
export type LatestMoviesPagination = z.infer<typeof paginationSchema>;
export type TaxonomyItem = z.infer<typeof taxonomyItemSchema>;
export type MovieDetail = z.infer<typeof movieDetailSchema>;
export type MovieDetailResponse = z.infer<typeof movieDetailResponseSchema>;
export type Episode = z.infer<typeof episodeSchema>;
export type EpisodeServerData = z.infer<typeof episodeServerDataSchema>;
