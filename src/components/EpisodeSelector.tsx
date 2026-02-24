import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ArrowUpDown, ChevronLeft, ChevronRight, Film, Play, Search, SkipBack, SkipForward } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
} from "@/components/ui/pagination";
import { Toggle } from "@/components/ui/toggle";

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
  const total = episodes.reduce(
    (sum, episode) => sum + (episode?.server_data?.length ?? 0),
    0,
  );
  return total > 100 ? "desc" : "asc";
};

const EpisodeSelector: React.FC<EpisodeSelectorProps> = ({ episodes }) => {
  const firstServer = episodes[0]?.server_name ?? "";
  const [selectedServer, setSelectedServer] = useState<string>(firstServer);
  const [selectedEpisode, setSelectedEpisode] = useState<{
    id: string;
    label: string;
    linkEmbed?: string;
    linkM3u8?: string;
  } | null>(null);
  const [query, setQuery] = useState<string>("");
  const [pageByServer, setPageByServer] = useState<Record<string, number>>({});
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(() =>
    getDefaultSortOrder(episodes),
  );
  const userSortOverrideRef = useRef(false);

  const normalizedQuery = query.trim().toLowerCase();

  useEffect(() => {
    if (!episodes.length) {
      setSelectedServer("");
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
    () =>
      episodes.reduce(
        (total, episode) => total + (episode?.server_data?.length ?? 0),
        0,
      ),
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
      new CustomEvent("episodeSelected", {
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
      const detail = (event as CustomEvent<{
        ep: string;
        label?: string;
        linkEmbed?: string;
        linkM3u8?: string;
        serverName?: string;
      }>).detail;

      if (!detail?.ep || (!detail.linkEmbed && !detail.linkM3u8)) {
        return;
      }

      const matchedServerName =
        detail.serverName &&
        episodes.some((episode) => episode.server_name === detail.serverName)
          ? detail.serverName
          : episodes.find((episode) =>
              episode.server_data.some(
                (serverData) =>
                  serverData.slug === detail.ep &&
                  ((detail.linkM3u8 &&
                    serverData.link_m3u8 === detail.linkM3u8) ||
                    (detail.linkEmbed &&
                      serverData.link_embed === detail.linkEmbed)),
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

    window.addEventListener("episodeSelected", handleExternalEpisodeSelection);
    return () => {
      window.removeEventListener("episodeSelected", handleExternalEpisodeSelection);
    };
  }, [episodes, selectedServer]);

  useEffect(() => {
    setPageByServer((prev) => {
      const next = { ...prev };
      episodes.forEach((episode) => {
        const totalPages = Math.max(
          1,
          Math.ceil(episode.server_data.length / EPISODE_PAGE_SIZE),
        );
        const current = next[episode.server_name] ?? 1;
        if (current > totalPages) {
          next[episode.server_name] = totalPages;
        }
      });
      return next;
    });
  }, [episodes]);

  return (
    <Card className="mt-6 border-2 border-[#3F3F46] bg-[#09090B]">
      <CardHeader className="flex flex-col gap-3 border-b-2 border-[#3F3F46] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center border-2 border-[#DFE104] bg-[#DFE104]">
            <Film className="h-5 w-5 text-[#09090B]" />
          </div>
          <div>
            <CardTitle className="text-xl font-bold uppercase tracking-tighter text-[#FAFAFA]">
              Danh sách tập
            </CardTitle>
            <p className="text-xs font-bold uppercase tracking-wide text-[#A1A1AA]">
              {totalEpisodes} tập có sẵn
            </p>
          </div>
        </div>
        {selectedEpisode && (
          <div className="flex items-center gap-2 border-2 border-[#DFE104] bg-[#DFE104]/10 px-4 py-2">
            <Play className="h-4 w-4 text-[#DFE104]" />
            <span className="text-xs font-bold uppercase tracking-tighter text-[#DFE104]">
              Đang phát: {selectedEpisode.label}
            </span>
          </div>
        )}
      </CardHeader>
      <CardContent className="p-4">
        <Tabs
          value={selectedServer || firstServer}
          onValueChange={setSelectedServer}
          className="space-y-4"
        >
          <div className="flex flex-col gap-3 border-b-2 border-[#3F3F46] pb-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="w-full overflow-x-auto lg:w-auto">
              <TabsList className="flex w-max gap-1 bg-transparent p-0">
                {episodes.map((episode) => (
                  <TooltipProvider key={episode.server_name} delayDuration={150}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <TabsTrigger
                          value={episode.server_name}
                          className="border-2 border-[#3F3F46] bg-[#27272A] px-4 py-2 text-xs font-bold uppercase tracking-tight text-[#FAFAFA] transition-all duration-300 data-[state=active]:border-[#DFE104] data-[state=active]:bg-[#DFE104] data-[state=active]:text-[#09090B] hover:border-[#DFE104]/50"
                        >
                          {episode.server_name}
                        </TabsTrigger>
                      </TooltipTrigger>
                      <TooltipContent className="border-2 border-[#3F3F46] bg-[#27272A] text-xs font-bold uppercase tracking-tight text-[#FAFAFA]">
                        Chuyển nguồn {episode.server_name}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
              </TabsList>
            </div>

            <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto">
              <div className="relative flex-1 lg:max-w-48">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A1A1AA]" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Tìm tập..."
                  className="w-full border-2 border-[#3F3F46] bg-[#27272A] pl-10 text-xs font-bold uppercase tracking-tight text-[#FAFAFA] placeholder:text-[#A1A1AA] transition-colors focus:border-[#DFE104]"
                />
              </div>

              <Toggle
                pressed={sortOrder === "desc"}
                onPressedChange={(pressed) => {
                  userSortOverrideRef.current = true;
                  const nextOrder = pressed ? "desc" : "asc";
                  setSortOrder(nextOrder);
                  if (selectedServer) {
                    setPageByServer((prev) => ({
                      ...prev,
                      [selectedServer]: 1,
                    }));
                  }
                }}
                className="flex items-center justify-center gap-2 border-2 border-[#3F3F46] bg-[#27272A] px-3 py-2 text-xs font-bold uppercase tracking-tight text-[#FAFAFA] transition-all duration-300 hover:border-[#DFE104] hover:bg-[#DFE104] hover:text-[#09090B]"
                aria-label="Đổi thứ tự tập"
              >
                <ArrowUpDown className="h-4 w-4" />
                {sortOrder === "desc" ? "Mới → cũ" : "Cũ → mới"}
              </Toggle>
            </div>
          </div>

          {episodes.map((episode) => {
            const sortedServerData = [...episode.server_data].sort((a, b) => {
              const numberA = getEpisodeNumber(a.slug) || getEpisodeNumber(a.name);
              const numberB = getEpisodeNumber(b.slug) || getEpisodeNumber(b.name);

              if (!Number.isNaN(numberA) && !Number.isNaN(numberB)) {
                return sortOrder === "asc" ? numberA - numberB : numberB - numberA;
              }

              return sortOrder === "asc"
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
            const activePage = Math.min(
              pageByServer[episode.server_name] ?? 1,
              totalPages,
            );
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

            const firstEpisode = sortedServerData[0];
            const lastEpisode = sortedServerData[sortedServerData.length - 1];

            return (
              <TabsContent
                key={episode.server_name}
                value={episode.server_name}
                className={cn("space-y-4", isActiveServer ? "block" : "hidden")}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className="border-2 border-[#DFE104] bg-[#DFE104]/10 px-3 py-1 text-xs font-bold uppercase tracking-tighter text-[#DFE104]">
                      {totalEpisodeCount} TẬP
                    </Badge>
                    {normalizedQuery && (
                      <span className="text-xs font-bold uppercase tracking-tight text-[#A1A1AA]">
                        {filteredServerData.length} kết quả
                      </span>
                    )}
                    {!normalizedQuery && shouldPaginate && (
                      <span className="text-xs font-bold uppercase tracking-tight text-[#A1A1AA]">
                        Trang {activePage} / {totalPages}
                      </span>
                    )}
                  </div>
                  {!normalizedQuery && totalEpisodeCount > 1 && (
                    <div className="flex items-center gap-1">
                      <TooltipProvider delayDuration={150}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 border-2 border-[#3F3F46] bg-[#27272A] text-[#FAFAFA] transition-all duration-300 hover:border-[#DFE104] hover:bg-[#DFE104] hover:text-[#09090B]"
                              onClick={() => {
                                if (firstEpisode) {
                                  handleEpisodeSelect(
                                    firstEpisode.slug,
                                    firstEpisode.name,
                                    firstEpisode.link_embed,
                                    firstEpisode.link_m3u8,
                                    episode.server_name,
                                  );
                                }
                              }}
                            >
                              <SkipBack className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="border-2 border-[#3F3F46] bg-[#27272A] text-xs font-bold uppercase tracking-tight text-[#FAFAFA]">
                            Tập đầu tiên
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider delayDuration={150}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 border-2 border-[#3F3F46] bg-[#27272A] text-[#FAFAFA] transition-all duration-300 hover:border-[#DFE104] hover:bg-[#DFE104] hover:text-[#09090B]"
                              onClick={() => {
                                if (lastEpisode) {
                                  handleEpisodeSelect(
                                    lastEpisode.slug,
                                    lastEpisode.name,
                                    lastEpisode.link_embed,
                                    lastEpisode.link_m3u8,
                                    episode.server_name,
                                  );
                                }
                              }}
                            >
                              <SkipForward className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="border-2 border-[#3F3F46] bg-[#27272A] text-xs font-bold uppercase tracking-tight text-[#FAFAFA]">
                            Tập cuối cùng
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  )}
                </div>

                {visibleServerData.length ? (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
                    {visibleServerData.map((serverData) => {
                      const isSelected = selectedEpisode?.id === serverData.slug;
                      const canPlay = Boolean(
                        serverData.link_m3u8 || serverData.link_embed,
                      );

                      return (
                        <Button
                          key={serverData.slug}
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
                            "group relative h-12 w-full border-2 border-[#3F3F46] bg-[#27272A] px-3 text-xs font-bold uppercase tracking-tighter text-[#FAFAFA] transition-all duration-300 hover:scale-105 hover:border-[#DFE104] hover:bg-[#DFE104] hover:text-[#09090B]",
                            isSelected &&
                              "border-[#DFE104] bg-[#DFE104]/15 text-[#DFE104] hover:bg-[#DFE104] hover:text-[#09090B]",
                            !canPlay &&
                              "cursor-not-allowed border-[#3F3F46]/60 text-[#71717A] opacity-50 hover:border-[#3F3F46]/60 hover:bg-[#27272A] hover:text-[#71717A] hover:scale-100",
                          )}
                          variant="ghost"
                        >
                          <span className="truncate">{serverData.name}</span>
                          {isSelected && (
                            <div className="absolute right-2 top-1/2 -translate-y-1/2">
                              <Play className="h-3 w-3 fill-[#DFE104] text-[#DFE104]" />
                            </div>
                          )}
                        </Button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-3 border-2 border-[#3F3F46] bg-[#27272A]/50 py-8">
                    <Film className="h-10 w-10 text-[#71717A]" />
                    <div className="text-center">
                      <p className="text-sm font-bold uppercase tracking-tight text-[#A1A1AA]">
                        Không tìm thấy tập nào
                      </p>
                      <p className="text-xs text-[#71717A]">
                        Thử từ khóa khác hoặc chọn nguồn khác
                      </p>
                    </div>
                  </div>
                )}

                {shouldPaginate && !normalizedQuery && (
                  <div className="flex items-center justify-center border-t-2 border-[#3F3F46] pt-4">
                    <Pagination className="w-full">
                      <PaginationContent className="gap-1">
                        <PaginationItem>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-9 w-9 border-2 border-[#3F3F46] bg-[#27272A] text-[#FAFAFA] transition-all duration-300 hover:border-[#DFE104] hover:bg-[#DFE104] hover:text-[#09090B]"
                            onClick={() => {
                              if (activePage === 1) return;
                              setPageByServer((prev) => ({
                                ...prev,
                                [episode.server_name]: Math.max(activePage - 1, 1),
                              }));
                            }}
                            disabled={activePage === 1}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                        </PaginationItem>

                        {Array.from({ length: totalPages }).map((_, index) => {
                          const pageNumber = index + 1;
                          const showNumber =
                            pageNumber === 1 ||
                            pageNumber === totalPages ||
                            Math.abs(pageNumber - activePage) <= 1;

                          if (!showNumber) {
                            if (
                              pageNumber === activePage - 2 ||
                              pageNumber === activePage + 2
                            ) {
                              return (
                                <PaginationItem key={`ellipsis-${pageNumber}`}>
                                  <PaginationEllipsis className="border-2 border-[#3F3F46] bg-[#27272A] text-[#A1A1AA]" />
                                </PaginationItem>
                              );
                            }
                            return null;
                          }

                          return (
                            <PaginationItem key={pageNumber}>
                              <Button
                                size="icon"
                                variant="ghost"
                                className={cn(
                                  "h-9 w-9 border-2 border-[#3F3F46] bg-[#27272A] text-xs font-bold uppercase tracking-tighter text-[#FAFAFA] transition-all duration-300 hover:border-[#DFE104] hover:bg-[#DFE104] hover:text-[#09090B]",
                                  pageNumber === activePage && "border-[#DFE104] bg-[#DFE104] text-[#09090B]",
                                )}
                                onClick={() => {
                                  setPageByServer((prev) => ({
                                    ...prev,
                                    [episode.server_name]: pageNumber,
                                  }));
                                }}
                              >
                                {pageNumber}
                              </Button>
                            </PaginationItem>
                          );
                        })}

                        <PaginationItem>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-9 w-9 border-2 border-[#3F3F46] bg-[#27272A] text-[#FAFAFA] transition-all duration-300 hover:border-[#DFE104] hover:bg-[#DFE104] hover:text-[#09090B]"
                            onClick={() => {
                              if (activePage === totalPages) return;
                              setPageByServer((prev) => ({
                                ...prev,
                                [episode.server_name]: Math.min(
                                  activePage + 1,
                                  totalPages,
                                ),
                              }));
                            }}
                            disabled={activePage === totalPages}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default EpisodeSelector;
