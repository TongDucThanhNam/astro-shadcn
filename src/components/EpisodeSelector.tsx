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
import { ArrowUpDown, Play, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
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
    userSortOverrideRef.current = false
  }, [episodes]);

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
    if (userSortOverrideRef.current) return;
    setSortOrder(getDefaultSortOrder(episodes));
  }, [episodes]);

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
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-lg font-bold uppercase tracking-tighter text-[#FAFAFA]">
            Các tập
          </CardTitle>
          <p className="text-sm text-[#A1A1AA]">
            Chọn nguồn phát và tập muốn xem. Tổng cộng {totalEpisodes} tập.
          </p>
        </div>
        {selectedEpisode && (
          <div className="flex items-center gap-2 border-2 border-[#DFE104] bg-[#DFE104]/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#DFE104]">
            <Play className="h-4 w-4" /> Đang phát {selectedEpisode.label}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs
          value={selectedServer || firstServer}
          onValueChange={setSelectedServer}
          className="space-y-6"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex w-full items-center gap-2 overflow-x-auto border-2 border-[#3F3F46] bg-[#27272A] p-1 lg:w-auto">
                    <TabsList className="flex w-max gap-1 bg-transparent p-0">
                      {episodes.map((episode) => (
                        <TabsTrigger
                          key={episode.server_name}
                          value={episode.server_name}
                          className="px-4 py-2 text-sm font-bold uppercase tracking-wide data-[state=active]:bg-[#DFE104] data-[state=active]:text-[#09090B]"
                        >
                          {episode.server_name}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="border-2 border-[#3F3F46] bg-[#27272A] text-[#FAFAFA]">
                  Chuyển giữa các nguồn phát khi gặp lỗi hoặc muốn tốc độ tốt hơn.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <label className="relative w-full lg:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A1A1AA]" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tìm theo tên tập hoặc số tập"
                className="w-full border-2 border-[#3F3F46] bg-[#27272A] pl-10 text-sm text-[#FAFAFA] placeholder:text-[#A1A1AA]"
              />
            </label>

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
              className="flex w-full items-center justify-center gap-2 border-2 border-[#3F3F46] bg-[#27272A] px-4 py-2 text-sm font-bold uppercase tracking-wide text-[#FAFAFA] transition hover:border-[#DFE104] hover:bg-[#DFE104] hover:text-[#09090B] lg:w-auto"
              aria-label="Đổi thứ tự tập"
            >
              <ArrowUpDown className="h-4 w-4" />
              {sortOrder === "desc" ? "Tập mới → cũ" : "Tập cũ → mới"}
            </Toggle>
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

            return (
              <TabsContent
                key={episode.server_name}
                value={episode.server_name}
                className={cn("space-y-4", isActiveServer ? "block" : "hidden")}
              >
                <div className="flex items-center gap-2">
                  <Badge className="bg-[#27272A] text-xs font-bold uppercase tracking-wide text-[#FAFAFA]">
                    {totalEpisodeCount} tập
                  </Badge>
                  {normalizedQuery && (
                    <span className="text-sm text-[#A1A1AA]">
                      {filteredServerData.length} kết quả khớp với "{query}"
                    </span>
                  )}
                </div>

                {visibleServerData.length ? (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
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
                            "h-11 w-full justify-between border-2 border-[#3F3F46] bg-[#27272A] px-4 text-sm font-bold uppercase tracking-wide text-[#FAFAFA] transition-all duration-300 hover:border-[#DFE104] hover:bg-[#DFE104] hover:text-[#09090B]",
                            isSelected &&
                              "border-[#DFE104] bg-[#DFE104]/15 text-[#DFE104] hover:border-[#DFE104] hover:bg-[#DFE104] hover:text-[#09090B]",
                            !canPlay &&
                              "cursor-not-allowed border-[#3F3F46]/60 text-[#71717A] opacity-50 hover:border-[#3F3F46]/60 hover:bg-[#27272A] hover:text-[#71717A]",
                          )}
                          variant="ghost"
                        >
                          <span className="truncate">
                            {serverData.name}
                          </span>
                          {isSelected ? (
                            <Badge className="bg-[#DFE104]/20 text-xs font-bold uppercase tracking-wide text-[#DFE104]">
                              Đang xem
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="border-[#3F3F46] bg-transparent text-xs text-[#A1A1AA]"
                            >
                              {serverData.slug.replace(/^[^\d]*/g, "") || "#"}
                            </Badge>
                          )}
                        </Button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="border-2 border-[#3F3F46] bg-[#27272A]/50 p-6 text-center text-sm text-[#A1A1AA]">
                    Không tìm thấy tập nào khớp với "{query}" trong nguồn {episode.server_name}.
                  </div>
                )}

                {shouldPaginate && !normalizedQuery && (
                  <Pagination className="pt-2">
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          href="#"
                          onClick={(event) => {
                            event.preventDefault();
                            if (activePage === 1) return;
                            setPageByServer((prev) => ({
                              ...prev,
                              [episode.server_name]: Math.max(activePage - 1, 1),
                            }));
                          }}
                          className="text-sm text-[#FAFAFA] border-[#3F3F46]"
                          aria-disabled={activePage === 1}
                          tabIndex={activePage === 1 ? -1 : 0}
                        />
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
                                <PaginationEllipsis />
                              </PaginationItem>
                            );
                          }
                          return null;
                        }

                        return (
                          <PaginationItem key={pageNumber}>
                            <PaginationLink
                              href="#"
                              isActive={pageNumber === activePage}
                              onClick={(event) => {
                                event.preventDefault();
                                setPageByServer((prev) => ({
                                  ...prev,
                                  [episode.server_name]: pageNumber,
                                }));
                              }}
                              className={pageNumber === activePage ? "bg-[#DFE104] text-[#09090B]" : "text-[#FAFAFA] border-[#3F3F46]"}
                            >
                              {pageNumber}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      })}

                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          onClick={(event) => {
                            event.preventDefault();
                            if (activePage === totalPages) return;
                            setPageByServer((prev) => ({
                              ...prev,
                              [episode.server_name]: Math.min(
                                activePage + 1,
                                totalPages,
                              ),
                            }));
                          }}
                          className="text-sm text-[#FAFAFA] border-[#3F3F46]"
                          aria-disabled={activePage === totalPages}
                          tabIndex={activePage === totalPages ? -1 : 0}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
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
