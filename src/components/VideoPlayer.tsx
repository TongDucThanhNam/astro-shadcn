import React, { useEffect, useState, useRef } from 'react';
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { AdvancedPlayer } from "./AdvancedPlayer";

const VideoPlayer: React.FC = () => {
    const [selectedEpisode, setSelectedEpisode] = useState<{
        ep: string;
        linkEmbed: string;
        linkM3u8?: string;
    } | null>(null);
    const videoSectionRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleEpisodeSelected = (event: Event) => {
            const detail = (event as CustomEvent<{
                ep: string;
                linkEmbed: string;
                linkM3u8?: string;
            }>).detail;

            setSelectedEpisode(detail);

            if (videoSectionRef.current) {
                setTimeout(() => {
                    videoSectionRef.current?.scrollIntoView({
                        behavior: 'smooth',
                        block: 'nearest',
                        inline: 'nearest',
                    });
                }, 100);
            }
        };

        window.addEventListener('episodeSelected', handleEpisodeSelected);

        return () => {
            window.removeEventListener('episodeSelected', handleEpisodeSelected);
        };
    }, []);

    return (
        <div ref={videoSectionRef} className="container mx-auto space-y-4 px-0">
            <AspectRatio ratio={16 / 9} className="rounded-lg border-2 border-gray-300 shadow-lg">
                {selectedEpisode && (
                    <iframe
                            src={selectedEpisode.linkEmbed}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="h-full w-full rounded-lg"
                        ></iframe>
                )}
            </AspectRatio>
        </div>
    );
};

export default VideoPlayer;
