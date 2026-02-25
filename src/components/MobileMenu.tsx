'use client';

import { CaretDown as ChevronDown } from '@phosphor-icons/react/dist/ssr/CaretDown';
import { CaretRight as ChevronRight } from '@phosphor-icons/react/dist/ssr/CaretRight';
import { List as Menu } from '@phosphor-icons/react/dist/ssr/List';
import * as React from 'react';

import { movieCategories } from '@/components/NavigationMenuDemo';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

type MenuItem = {
  title: string;
  href?: string;
  submenu?: MenuItem[];
};

const menuItems: MenuItem[] = [
  { title: 'Trang chủ', href: '/' },
  {
    title: 'Danh sách',
    submenu: [
      { title: 'Phim lẻ', href: '/danh-sach/phim-le' },
      { title: 'Phim bộ', href: '/danh-sach/phim-bo' },
      { title: 'TV Shows', href: '/danh-sach/tv-shows' },
      { title: 'Phim Vietsub', href: '/danh-sach/phim-vietsub' },
    ],
  },
  {
    title: 'Thể loại',
    submenu: movieCategories.map((category) => ({
      title: category.name,
      href: `/danh-sach/the-loai/${category.slug}`,
    })),
  },
];

interface MenuItemComponentProps {
  item: MenuItem;
  depth?: number;
  onNavigate: () => void;
}

const MenuItemComponent: React.FC<MenuItemComponentProps> = ({ item, depth = 0, onNavigate }) => {
  const [isOpen, setIsOpen] = React.useState(false);

  if (item.submenu) {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className={cn(
              'flex w-full items-center justify-between border border-transparent px-2 py-2.5 text-sm font-semibold uppercase tracking-[0.1em] text-[#E4E4E7] transition-colors duration-200 hover:border-[#2D2F35] hover:bg-[#111318] hover:text-[#DFE104]',
              depth > 0 && 'pl-4 text-xs tracking-[0.08em]',
            )}
          >
            {item.title}
            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pl-2">
          {item.submenu.map((subItem) => (
            <MenuItemComponent
              key={subItem.title}
              item={subItem}
              depth={depth + 1}
              onNavigate={onNavigate}
            />
          ))}
        </CollapsibleContent>
      </Collapsible>
    );
  }

  return (
    <a
      href={item.href}
      className={cn(
        'block border border-transparent px-2 py-2.5 text-sm font-semibold uppercase tracking-[0.1em] text-[#E4E4E7] transition-colors duration-200 hover:border-[#2D2F35] hover:bg-[#111318] hover:text-[#DFE104]',
        depth > 0 && 'pl-4 text-xs tracking-[0.08em] text-[#A1A1AA]',
      )}
      onClick={onNavigate}
    >
      {item.title}
    </a>
  );
};

export default function MobileMenu() {
  const [open, setOpen] = React.useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 border border-[#2D2F35] bg-[#111318]/85 text-[#FAFAFA] transition-colors duration-200 hover:border-[#DFE104] hover:bg-[#151821] hover:text-[#DFE104] lg:hidden"
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Mở menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="flex h-full w-[280px] flex-col overflow-y-auto border-r border-[#2D2F35] bg-[#09090B] p-0 text-white sm:w-[340px]"
      >
        <div className="border-b border-[#2D2F35] px-5 py-4 sticky top-0 bg-[#09090B] z-10">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#71717A]">AtroFlim</p>
        </div>
        <nav className="flex flex-col gap-1 px-3 py-4">
          {menuItems.map((item) => (
            <MenuItemComponent key={item.title} item={item} onNavigate={() => setOpen(false)} />
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
