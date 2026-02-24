import React from 'react'
import { navigate } from "astro:transitions/client"
import {Card, CardContent, CardFooter, CardHeader, CardTitle} from "@/components/ui/card"
import {Button} from "@/components/ui/button"
import {Film, Tv, PlayCircle, MonitorPlay} from 'lucide-react'

const movieTypes = [
    {title: 'Phim lẻ', icon: Film, type: 'phim-le'},
    {title: 'Phim bộ', icon: Tv, type: 'phim-bo'},
    {title: 'Hoạt hình', icon: PlayCircle, type: 'hoat-hinh'},
    {title: 'TV Shows', icon: MonitorPlay, type: 'tv-shows'},
]

export default function MovieTypeSelector() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {movieTypes.map((movieType) => (
                <Card key={movieType.type} className="flex flex-col">
                    <CardHeader>
                        <CardTitle className="flex items-center justify-center">
                            <movieType.icon className="w-8 h-8 mr-2"/>
                            {movieType.title}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-grow">
                        <p className="text-center text-muted-foreground">
                            Khám phá bộ sưu tập {movieType.title.toLowerCase()} đa dạng và hấp dẫn
                        </p>
                    </CardContent>
                    <CardFooter className="flex justify-center">
                        <Button
                            variant="outline"
                            onClick={() => navigate(`/danh-sach/${movieType.type}`)}
                        >
                            Xem danh sách
                        </Button>
                    </CardFooter>
                </Card>
            ))}
        </div>
    )
}