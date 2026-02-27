import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { ArrowsDownUp as ArrowUpDown } from '@phosphor-icons/react/dist/ssr/ArrowsDownUp';
import { CaretLeft as ChevronLeft } from '@phosphor-icons/react/dist/ssr/CaretLeft';
import { CaretRight as ChevronRight } from '@phosphor-icons/react/dist/ssr/CaretRight';
import { FilmSlate as Film } from '@phosphor-icons/react/dist/ssr/FilmSlate';
import { MagnifyingGlass as Search } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';
import { Play } from '@phosphor-icons/react/dist/ssr/Play';
import type React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';

type Episode = {
  server_name: string;
  server_data: {
    slug: string;
    name: string;
    link_embed?: string;
    link_m3u8?: string;
  }[];
};

type EpisodeSelectorProps = {
  episodes: Episode[];
};

const EPISODE_PAGE_SIZE = 30;

const getEpisodeNumber = (value: string) => {
  const match = value.match(/\d+(?!.*\d)/);
  return match ? Number.parseInt(match[0], 10) : Number.NaN;
};

const getDefaultSortOrder = (episodes: Episode[]) => {
  const total = episodes.reduce((sum, episode) => sum + (episode?.server_data?.length ?? 0), 0);
  return total > 100 ? 'desc' : 'asc';
};

const EpisodeSelector: React.FC<EpisodeSelectorProps> = ({ episodes }) => {
  const firstServer = episodes[0]?.server_name ?? '';
  const [selectedServer, setSelectedServer] = useState<string>(firstServer);
  const [selectedEpisode, setSelectedEpisode] = useState<{
    id: string;
    label: string;
    linkEmbed?: string;
    linkM3u8?: string;
  } | null>(null);
  const [query, setQuery] = useState<string>('');
  const [pageByServer, setPageByServer] = useState<Record<string, number>>({});
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(() => getDefaultSortOrder(episodes));
  const userSortOverrideRef = useRef(false);

  const normalizedQuery = query.trim().toLowerCase();

  useEffect(() => {
    if (!episodes.length) {
      setSelectedServer('');
      return;
    }

    if (!episodes.some((episode) => episode.server_name === selectedServer)) {
      setSelectedServer(firstServer);
    }
  }, [episodes, firstServer, selectedServer]);

  useEffect(() => {
    if (!selectedServer) return;
    setPageByServer((prev) => ({ ...prev, [selectedServer]: prev[selectedServer] ?? 1 }));
  }, [selectedServer]);

  useEffect(() => {
    if (!normalizedQuery) return;
    setPageByServer((prev) => ({ ...prev, [selectedServer]: 1 }));
  }, [normalizedQuery, selectedServer]);

  const totalEpisodes = useMemo(
    () => episodes.reduce((total, episode) => total + (episode?.server_data?.length ?? 0), 0),
    [episodes],
  );

  const handleEpisodeSelect = (
    id: string,
    label: string,
    linkEmbed?: string,
    linkM3u8?: string,
    serverName?: string,
  ) => {
    if (!linkEmbed && !linkM3u8) {
      return;
    }
    setSelectedEpisode({ id, label, linkEmbed, linkM3u8 });
    window.dispatchEvent(
      new CustomEvent('episodeSelected', {
        detail: { ep: id, label, linkEmbed, linkM3u8, serverName },
      }),
    );
  };

  useEffect(() => {
    userSortOverrideRef.current = false;
    if (!userSortOverrideRef.current) {
      setSortOrder(getDefaultSortOrder(episodes));
    }
  }, [episodes.length, episodes]);

  useEffect(() => {
    const handleExternalEpisodeSelection = (event: Event) => {
      const detail = (
        event as CustomEvent<{
          ep: string;
          label?: string;
          linkEmbed?: string;
          linkM3u8?: string;
          serverName?: string;
        }>
      ).detail;

      if (!detail?.ep || (!detail.linkEmbed && !detail.linkM3u8)) {
        return;
      }

      const matchedServerName =
        detail.serverName && episodes.some((episode) => episode.server_name === detail.serverName)
          ? detail.serverName
          : episodes.find((episode) =>
              episode.server_data.some(
                (serverData) =>
                  serverData.slug === detail.ep &&
                  ((detail.linkM3u8 && serverData.link_m3u8 === detail.linkM3u8) ||
                    (detail.linkEmbed && serverData.link_embed === detail.linkEmbed)),
              ),
            )?.server_name;

      if (matchedServerName && matchedServerName !== selectedServer) {
        setSelectedServer(matchedServerName);
      }

      setSelectedEpisode({
        id: detail.ep,
        label: detail.label ?? `Tập ${detail.ep}`,
        linkEmbed: detail.linkEmbed,
        linkM3u8: detail.linkM3u8,
      });
    };

    window.addEventListener('episodeSelected', handleExternalEpisodeSelection);
    return () => {
      window.removeEventListener('episodeSelected', handleExternalEpisodeSelection);
    };
  }, [episodes, selectedServer]);

  useEffect(() => {
    setPageByServer((prev) => {
      const next = { ...prev };
      episodes.forEach((episode) => {
        const totalPages = Math.max(1, Math.ceil(episode.server_data.length / EPISODE_PAGE_SIZE));
        const current = next[episode.server_name] ?? 1;
        if (current > totalPages) {
          next[episode.server_name] = totalPages;
        }
      });
      return next;
    });
  }, [episodes]);

  return (
    <div className="space-y-0">
      {/* Header Block */}
      <div className="border border-border bg-[#0E0E11] p-4 flex items-center gap-4 mb-4">
        <div className="w-10 h-10 bg-accent text-accent-foreground flex items-center justify-center flex-shrink-0">
          <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
            <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12zM10 9h8v2h-8zm0 3h4v2h-4zm0-6h8v2h-8z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-lg uppercase tracking-tight text-foreground">
            Danh Sách Tập
          </h4>
          <p className="text-xs text-muted-foreground uppercase">{totalEpisodes} Tập có sẵn</p>
        </div>
        {selectedEpisode && (
          <div className="hidden sm:flex items-center gap-2 border border-accent bg-accent/10 px-4 py-2">
            <Play className="h-4 w-4 text-accent" />
            <span className="text-xs font-bold uppercase tracking-tighter text-accent whitespace-nowrap">
              Đang phát: {selectedEpisode.label}
            </span>
          </div>
        )}
      </div>

      <Tabs
        value={selectedServer || firstServer}
        onValueChange={setSelectedServer}
        className="space-y-0"
      >
        {/* Server Tabs + Search + Sort */}
        <div className="flex flex-col gap-3 mb-6 lg:flex-row lg:flex-wrap lg:justify-between lg:items-center">
          <div className="w-full overflow-x-auto lg:w-auto">
            <TabsList className="flex w-max gap-2 bg-transparent p-0 h-auto">
              {episodes.map((episode) => (
                <TabsTrigger
                  key={episode.server_name}
                  value={episode.server_name}
                  className="border border-border bg-transparent px-4 py-2 text-sm font-bold uppercase tracking-tight text-muted-foreground rounded-none transition-colors duration-0 data-[state=active]:border-foreground data-[state=active]:text-foreground hover:text-foreground"
                >
                  #{episode.server_name}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <div className="flex gap-2">
            <div className="border border-border flex items-center px-3 py-2">
              <Search className="w-4 h-4 text-muted-foreground mr-2 flex-shrink-0" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="TÌM TẬP..."
                className="bg-transparent outline-none text-sm uppercase placeholder:text-muted-foreground/50 w-28 sm:w-32 text-foreground font-bold tracking-tight"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                userSortOverrideRef.current = true;
                const nextOrder = sortOrder === 'desc' ? 'asc' : 'desc';
                setSortOrder(nextOrder);
                if (selectedServer) {
                  setPageByServer((prev) => ({ ...prev, [selectedServer]: 1 }));
                }
              }}
              className={cn(
                'font-bold px-4 py-2 text-sm uppercase tracking-tight flex items-center gap-2 transition-colors duration-0 border whitespace-nowrap',
                sortOrder === 'desc'
                  ? 'bg-accent text-accent-foreground border-accent hover:bg-transparent hover:text-accent'
                  : 'bg-transparent text-accent border-accent hover:bg-accent hover:text-accent-foreground',
              )}
            >
              <ArrowUpDown className="h-4 w-4" />
              {sortOrder === 'desc' ? '↓↑ MỚI → CŨ' : '↑↓ CŨ → MỚI'}
            </button>
          </div>
        </div>

        {episodes.map((episode) => {
          const sortedServerData = [...episode.server_data].sort((a, b) => {
            const numberA = getEpisodeNumber(a.slug) || getEpisodeNumber(a.name);
            const numberB = getEpisodeNumber(b.slug) || getEpisodeNumber(b.name);

            if (!Number.isNaN(numberA) && !Number.isNaN(numberB)) {
              return sortOrder === 'asc' ? numberA - numberB : numberB - numberA;
            }

            return sortOrder === 'asc'
              ? a.name.localeCompare(b.name)
              : b.name.localeCompare(a.name);
          });

          const filteredServerData = sortedServerData.filter((server) => {
            if (!normalizedQuery) return true;
            return (
              server.name.toLowerCase().includes(normalizedQuery) ||
              server.slug.toLowerCase().includes(normalizedQuery)
            );
          });

          const isActiveServer = (selectedServer || firstServer) === episode.server_name;
          const totalEpisodeCount = episode.server_data.length;
          const shouldPaginate = !normalizedQuery && totalEpisodeCount > EPISODE_PAGE_SIZE;
          const totalPages = shouldPaginate
            ? Math.ceil(totalEpisodeCount / EPISODE_PAGE_SIZE)
            : 1;
          const activePage = Math.min(pageByServer[episode.server_name] ?? 1, totalPages);
          const paginatedServerData = shouldPaginate
            ? sortedServerData.slice(
                (activePage - 1) * EPISODE_PAGE_SIZE,
                activePage * EPISODE_PAGE_SIZE,
              )
            : sortedServerData;

          const visibleServerData = normalizedQuery
            ? filteredServerData
            : shouldPaginate
              ? paginatedServerData
              : filteredServerData;

          return (
            <TabsContent
              key={episode.server_name}
              value={episode.server_name}
              className={cn('mt-0', isActiveServer ? 'block' : 'hidden')}
            >
              {/* Top Pagination Bar */}
              <div className="flex justify-between items-center border-b border-border pb-4 mb-4">
                <div className="flex gap-3 sm:gap-4 text-sm font-bold uppercase items-center">
                  <span className="text-accent border border-accent px-2 py-0.5 text-xs sm:text-sm">
                    {totalEpisodeCount} TẬP
                  </span>
                  {normalizedQuery ? (
                    <span className="text-muted-foreground text-xs sm:text-sm">
                      {filteredServerData.length} kết quả
                    </span>
                  ) : shouldPaginate ? (
                    <span className="text-muted-foreground text-xs sm:text-sm">
                      Trang {activePage} / {totalPages}
                    </span>
                  ) : null}
                </div>
                {shouldPaginate && !normalizedQuery && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="border border-border w-8 h-8 flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-accent-foreground hover:border-accent transition-colors duration-0 disabled:opacity-30"
                      onClick={() => {
                        if (activePage > 1) {
                          setPageByServer((prev) => ({
                            ...prev,
                            [episode.server_name]: activePage - 1,
                          }));
                        }
                      }}
                      disabled={activePage === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      className="border border-border w-8 h-8 flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-accent-foreground hover:border-accent transition-colors duration-0 disabled:opacity-30"
                      onClick={() => {
                        if (activePage < totalPages) {
                          setPageByServer((prev) => ({
                            ...prev,
                            [episode.server_name]: activePage + 1,
                          }));
                        }
                      }}
                      disabled={activePage === totalPages}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Episode Grid — Brutalist 1px border lines */}
              {visibleServerData.length ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-[1px] bg-border border border-border mb-8">
                  {visibleServerData.map((serverData) => {
                    const isSelected = selectedEpisode?.id === serverData.slug;
                    const canPlay = Boolean(serverData.link_m3u8 || serverData.link_embed);

                    return (
                      <button
                        key={serverData.slug}
                        type="button"
                        onClick={() =>
                          handleEpisodeSelect(
                            serverData.slug,
                            serverData.name,
                            serverData.link_embed,
                            serverData.link_m3u8,
                            episode.server_name,
                          )
                        }
                        disabled={!canPlay}
                        className={cn(
                          'bg-background text-muted-foreground py-3 text-sm font-bold uppercase relative overflow-hidden hover:bg-accent hover:text-accent-foreground transition-colors duration-0',
                          isSelected && 'bg-accent text-accent-foreground',
                          !canPlay &&
                            'opacity-30 cursor-not-allowed hover:bg-background hover:text-muted-foreground',
                        )}
                      >
                        <span className="truncate block px-2">{serverData.name}</span>
                        {isSelected && (
                          <Play className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3" />
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-3 border border-border py-8 mb-8">
                  <Film className="h-10 w-10 text-muted-foreground/50" />
                  <div className="text-center">
                    <p className="text-sm font-bold uppercase tracking-tight text-muted-foreground">
                      Không tìm thấy tập nào
                    </p>
                    <p className="text-xs text-muted-foreground/60">
                      Thử từ khóa khác hoặc chọn nguồn khác
                    </p>
                  </div>
                </div>
              )}

              {/* Bottom Pagination — Brutalist square numbered buttons */}
              {shouldPaginate && !normalizedQuery && (
                <div className="flex justify-center gap-[2px]">
                  <button
                    type="button"
                    className="border border-border w-10 h-10 flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-accent-foreground hover:border-accent transition-colors duration-0 disabled:opacity-30"
                    onClick={() => {
                      if (activePage > 1)
                        setPageByServer((prev) => ({
                          ...prev,
                          [episode.server_name]: activePage - 1,
                        }));
                    }}
                    disabled={activePage === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {Array.from({ length: totalPages }).map((_, index) => {
                    const pageNumber = index + 1;
                    const showNumber =
                      pageNumber === 1 ||
                      pageNumber === totalPages ||
                      Math.abs(pageNumber - activePage) <= 1;

                    if (!showNumber) {
                      if (pageNumber === activePage - 2 || pageNumber === activePage + 2) {
                        return (
                          <span
                            key={`ellipsis-${pageNumber}`}
                            className="w-10 h-10 flex items-center justify-center text-muted-foreground"
                          >
                            ...
                          </span>
                        );
                      }
                      return null;
                    }

                    return (
                      <button
                        key={pageNumber}
                        type="button"
                        className={cn(
                          'w-10 h-10 flex items-center justify-center font-bold text-sm transition-colors duration-0 border',
                          pageNumber === activePage
                            ? 'bg-accent border-accent text-accent-foreground'
                            : 'border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground hover:border-accent',
                        )}
                        onClick={() =>
                          setPageByServer((prev) => ({
                            ...prev,
                            [episode.server_name]: pageNumber,
                          }))
                        }
                      >
                        {pageNumber}
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    className="border border-border w-10 h-10 flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-accent-foreground hover:border-accent transition-colors duration-0 disabled:opacity-30"
                    onClick={() => {
                      if (activePage < totalPages)
                        setPageByServer((prev) => ({
                          ...prev,
                          [episode.server_name]: activePage + 1,
                        }));
                    }}
                    disabled={activePage === totalPages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
};

export default EpisodeSelector;
