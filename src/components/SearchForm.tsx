import React, { useEffect, useState, useCallback } from 'react';
import { navigate } from 'astro:transitions/client';
import { Button } from '@/components/ui/button';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandGroup,
  CommandItem,
  CommandShortcut,
} from '@/components/ui/command';
import { Search, Film, Tv, Globe, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

const QUICK_LINKS = [
  { label: 'Phim mới cập nhật', href: '/', icon: Film },
  { label: 'Phim lẻ nổi bật', href: '/danh-sach/phim-le', icon: Film },
  { label: 'Phim bộ', href: '/danh-sach/phim-bo', icon: Tv },
  { label: 'TV Shows', href: '/danh-sach/tv-shows', icon: Tv },
  { label: 'Phim Âu Mỹ', href: '/danh-sach/quoc-gia/au-my', icon: Globe },
  { label: 'Phim 2024', href: '/danh-sach/nam/2024', icon: Calendar },
];

interface SearchFormProps {
  variant?: 'default' | 'icon' | 'header';
  className?: string;
}

const SearchForm: React.FC<SearchFormProps> = ({ variant = 'default', className }) => {
  const isIconVariant = variant === 'icon';
  const isHeaderVariant = variant === 'header';
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const navigateToSearch = (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    navigate(`/tim-kiem/${encodeURIComponent(trimmed)}`);
  };

  const handleSelect = (href: string) => {
    navigate(href);
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      navigateToSearch(searchQuery);
      setOpen(false);
    }
  };

  return (
    <>
      <Button
        variant={isIconVariant ? 'ghost' : 'outline'}
        size={isIconVariant ? 'icon' : 'default'}
        className={cn(
          'text-white transition-colors duration-200',
          isIconVariant
            ? 'h-10 w-10 border border-[#2D2F35] bg-[#111318]/85 hover:border-[#DFE104] hover:bg-[#151821] hover:text-[#DFE104]'
            : isHeaderVariant
              ? 'h-11 w-full justify-start gap-2 border border-[#2D2F35] bg-[#111318]/92 px-3 hover:border-[#5A5C66] hover:bg-[#151821]'
              : 'w-full justify-start gap-2 border-white/10 bg-white/5 hover:bg-white/10',
          className,
        )}
        onClick={() => setOpen(true)}
      >
        <Search className={cn('h-4 w-4', isHeaderVariant ? 'text-[#71717A]' : 'text-current')} />
        {isIconVariant ? (
          <span className="sr-only">Tìm kiếm</span>
        ) : (
          <>
            <span
              className={cn(
                'flex-1 text-left text-sm',
                isHeaderVariant
                  ? 'font-semibold uppercase tracking-[0.08em] text-[#A1A1AA]'
                  : 'text-current',
              )}
            >
              Tìm phim, diễn viên...
            </span>
            <span
              className={cn(
                'hidden text-xs md:inline',
                isHeaderVariant
                  ? 'border-l border-[#2D2F35] pl-3 font-bold uppercase tracking-[0.12em] text-[#71717A]'
                  : 'text-white/60',
              )}
            >
              ⌘K
            </span>
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
                  navigateToSearch(searchQuery);
                  setOpen(false);
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
                const Icon = link.icon;
                return (
                  <CommandItem
                    key={link.href}
                    onSelect={() => handleSelect(link.href)}
                    className="flex items-center gap-2"
                  >
                    <Icon className="h-4 w-4" />
                    <span>{link.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
};

export default SearchForm;
