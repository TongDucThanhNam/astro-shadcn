import type {
  Episode as ApiEpisode,
  EpisodeServerData,
  LatestMovieItemV1,
  LatestMoviesPagination,
  LatestMoviesResponseV1,
  ListItem,
  MovieDetail as ApiMovieDetail,
  MovieDetailResponse,
} from '@/lib/phimapi';

export type Paginate = LatestMoviesPagination;
export type Modify = { time: string };
export type Item = LatestMovieItemV1;
export type ResponseFlimType = LatestMoviesResponseV1;

export type Tmdb = ApiMovieDetail['tmdb'];
export type Imdb = ApiMovieDetail['imdb'];
export type Created = ApiMovieDetail['created'];
export type Modified = ApiMovieDetail['modified'];
export type Category = ApiMovieDetail['category'][number];
export type Country = ApiMovieDetail['country'][number];

export type MovieDetail = ApiMovieDetail;
export type ServerData = EpisodeServerData;
export type Episode = ApiEpisode;
export type MovieResponseDetail = MovieDetailResponse;

export type DanhSachItem = ListItem;
