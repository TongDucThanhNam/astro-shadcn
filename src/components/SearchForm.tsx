import React, { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
    CommandDialog,
    CommandInput,
    CommandList,
    CommandGroup,
    CommandItem,
    CommandShortcut,
} from "@/components/ui/command"
import { Search, Film, Tv, Globe, Calendar } from "lucide-react"
import { cn } from "@/lib/utils"

const QUICK_LINKS = [
    { label: "Phim mới cập nhật", href: "/", icon: Film },
    { label: "Phim lẻ nổi bật", href: "/danh-sach/phim-le", icon: Film },
    { label: "Phim bộ", href: "/danh-sach/phim-bo", icon: Tv },
    { label: "TV Shows", href: "/danh-sach/tv-shows", icon: Tv },
    { label: "Phim Âu Mỹ", href: "/danh-sach/quoc-gia/au-my", icon: Globe },
    { label: "Phim 2024", href: "/danh-sach/nam/2024", icon: Calendar },
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

    const handleSelect = (href: string) => {
        window.location.href = href
        setOpen(false)
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && searchQuery.trim()) {
            navigateToSearch(searchQuery)
            setOpen(false)
        }
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
            <CommandDialog open={open} onOpenChange={setOpen}>
                <CommandInput
                    value={searchQuery}
                    onValueChange={setSearchQuery}
                    onKeyDown={handleKeyDown}
                    placeholder="Tìm phim, diễn viên, đạo diễn..."
                    className="bg-transparent"
                />
                <CommandList>
                    {searchQuery.trim() ? (
                        <CommandGroup heading="Kết quả tìm kiếm">
                            <CommandItem
                                onSelect={() => {
                                    navigateToSearch(searchQuery)
                                    setOpen(false)
                                }}
                                className="flex items-center gap-2"
                            >
                                <Search className="h-4 w-4" />
                                <span>Tìm &quot;{searchQuery}&quot;</span>
                                <CommandShortcut>Enter</CommandShortcut>
                            </CommandItem>
                        </CommandGroup>
                    ) : (
                        <CommandGroup heading="Liên kết nhanh">
                            {QUICK_LINKS.map((link) => {
                                const Icon = link.icon
                                return (
                                    <CommandItem
                                        key={link.href}
                                        onSelect={() => handleSelect(link.href)}
                                        className="flex items-center gap-2"
                                    >
                                        <Icon className="h-4 w-4" />
                                        <span>{link.label}</span>
                                    </CommandItem>
                                )
                            })}
                        </CommandGroup>
                    )}
                </CommandList>
            </CommandDialog>
        </>
    )
}

export default SearchForm
