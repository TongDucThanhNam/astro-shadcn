import React, { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Search } from "lucide-react"
import { cn } from "@/lib/utils"

const QUICK_LINKS = [
    { label: "Phim mới cập nhật", href: "/" },
    { label: "Phim lẻ nổi bật", href: "/danh-sach/phim-le" },
    { label: "Phim bộ", href: "/danh-sach/phim-bo" },
    { label: "TV Shows", href: "/danh-sach/tv-shows" },
    { label: "Phim Âu Mỹ", href: "/danh-sach/quoc-gia/au-my" },
]

interface SearchFormProps {
    variant?: "default" | "icon"
}

const SearchForm: React.FC<SearchFormProps> = ({ variant = "default" }) => {
    const isIconVariant = variant === "icon"
    const [open, setOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
                event.preventDefault()
                setOpen((prev) => !prev)
            }
        }

        window.addEventListener("keydown", handleKeyDown)
        return () => window.removeEventListener("keydown", handleKeyDown)
    }, [])

    const navigateToSearch = (query: string) => {
        const trimmed = query.trim()
        if (!trimmed) return
        window.location.href = `/tim-kiem/${encodeURIComponent(trimmed)}`
    }

    const handleSearch = () => {
        navigateToSearch(searchQuery)
        setOpen(false)
    }

    return (
        <>
            <Button
                variant={isIconVariant ? "ghost" : "outline"}
                size={isIconVariant ? "icon" : "default"}
                className={cn(
                    "border-white/10 bg-white/5 text-white hover:bg-white/10",
                    isIconVariant
                        ? "h-10 w-10 rounded-full"
                        : "w-full justify-start gap-2"
                )}
                onClick={() => setOpen(true)}
            >
                <Search className="h-4 w-4" />
                {isIconVariant ? (
                    <span className="sr-only">Tìm kiếm</span>
                ) : (
                    <>
                        <span className="flex-1 text-left text-sm">Tìm phim, diễn viên...</span>
                        <span className="hidden text-xs text-white/60 md:inline">⌘K</span>
                    </>
                )}
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="w-full max-w-md bg-slate-900">
                    <DialogHeader>
                        <DialogTitle>Tìm kiếm phim</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="flex gap-2">
                            <Input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        handleSearch()
                                    }
                                }}
                                placeholder="Nhập tên phim hoặc từ khóa..."
                                className="flex-1"
                                autoFocus
                            />
                            <Button onClick={handleSearch} disabled={!searchQuery.trim()}>
                                <Search className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="space-y-2">
                            <p className="text-sm text-gray-500">Liên kết nhanh:</p>
                            <div className="grid gap-2">
                                {QUICK_LINKS.map((link) => (
                                    <Button
                                        key={link.href}
                                        variant="outline"
                                        className="justify-start text-left"
                                        onClick={() => {
                                            window.location.href = link.href
                                            setOpen(false)
                                        }}
                                    >
                                        {link.label}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}

export default SearchForm
