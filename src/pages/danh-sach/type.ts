import type {
  Episode,
  EpisodeServerData,
  LatestMovieItemV1,
  LatestMoviesPagination,
  LatestMoviesResponseV1,
  ListItem,
  ListResponse,
  MovieDetail,
  MovieDetailResponse,
  SearchResponse,
} from "@/lib/phimapi";

export type PhimMoiCapNhatResponse = LatestMoviesResponseV1;
export type PhimMoiCapNhatItem = LatestMovieItemV1;
export type PhimDetailResponse = MovieDetailResponse;
export type PhimDetailItem = MovieDetail;
export type CategoryItem = MovieDetail["category"][number];
export type CountryItem = MovieDetail["country"][number];
export type Episodes = Episode;
export type EpisodeItem = EpisodeServerData;
export type Pagination = LatestMoviesPagination;

export type DanhSachResponse = ListResponse;
export type SeoOnPage = ListResponse["data"]["seoOnPage"];
export type BreadCrumb = ListResponse["data"]["breadCrumb"][number];
export type DanhSachItem = ListItem;
export type DanhSachParams = ListResponse["data"]["params"];
export type TheLoaiParams = DanhSachParams;
export type QuocGiaParams = DanhSachParams;
export type NamParams = DanhSachParams;

export type TheLoaiResponse = ListResponse;
export type TimKiemResponse = SearchResponse;
export type QuocGiaResponse = ListResponse;
export type NamResponse = ListResponse;
