'use client';

import { FilmSlate as Film, Television as Tv } from '@phosphor-icons/react/dist/ssr';
import type * as React from 'react';

import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';
import { cn } from '@/lib/utils';

export const movieCategories = [
  {
    _id: '9822be111d2ccc29c7172c78b8af8ff5',
    name: 'Hành Động',
    slug: 'hanh-dong',
  },
  {
    _id: 'd111447ee87ec1a46a31182ce4623662',
    name: 'Miền Tây',
    slug: 'mien-tay',
  },
  { _id: '0c853f6238e0997ee318b646bb1978bc', name: 'Trẻ Em', slug: 'tre-em' },
  { _id: 'f8ec3e9b77c509fdf64f0c387119b916', name: 'Lịch Sử', slug: 'lich-su' },
  {
    _id: '3a17c7283b71fa84e5a8d76fb790ed3e',
    name: 'Cổ Trang',
    slug: 'co-trang',
  },
  {
    _id: '1bae5183d681b7649f9bf349177f7123',
    name: 'Chiến Tranh',
    slug: 'chien-tranh',
  },
  {
    _id: '68564911f00849030f9c9c144ea1b931',
    name: 'Viễn Tưởng',
    slug: 'vien-tuong',
  },
  { _id: '4db8d7d4b9873981e3eeb76d02997d58', name: 'Kinh Dị', slug: 'kinh-di' },
  {
    _id: '1645fa23fa33651cef84428b0dcc2130',
    name: 'Tài Liệu',
    slug: 'tai-lieu',
  },
  { _id: '2fb53017b3be83cd754a08adab3e916c', name: 'Bí Ẩn', slug: 'bi-an' },
  {
    _id: '4b4457a1af8554c282dc8ac41fd7b4a1',
    name: 'Phim 18+',
    slug: 'phim-18',
  },
  {
    _id: 'bb2b4b030608ca5984c8dd0770f5b40b',
    name: 'Tình Cảm',
    slug: 'tinh-cam',
  },
  { _id: 'a7b065b92ad356387ef2e075dee66529', name: 'Tâm Lý', slug: 'tam-ly' },
  {
    _id: '591bbb2abfe03f5aa13c08f16dfb69a2',
    name: 'Thể Thao',
    slug: 'the-thao',
  },
  {
    _id: '66c78b23908113d478d8d85390a244b4',
    name: 'Phiêu Lưu',
    slug: 'phieu-luu',
  },
  { _id: '252e74b4c832ddb4233d7499f5ed122e', name: 'Âm Nhạc', slug: 'am-nhac' },
  {
    _id: 'a2492d6cbc4d58f115406ca14e5ec7b6',
    name: 'Gia Đình',
    slug: 'gia-dinh',
  },
  {
    _id: '01c8abbb7796a1cf1989616ca5c175e6',
    name: 'Học Đường',
    slug: 'hoc-duong',
  },
  {
    _id: 'ba6fd52e5a3aca80eaaf1a3b50a182db',
    name: 'Hài Hước',
    slug: 'hai-huoc',
  },
  { _id: '7a035ac0b37f5854f0f6979260899c90', name: 'Hình Sự', slug: 'hinh-su' },
  {
    _id: '578f80eb493b08d175c7a0c29687cbdf',
    name: 'Võ Thuật',
    slug: 'vo-thuat',
  },
  {
    _id: '0bcf4077916678de9b48c89221fcf8ae',
    name: 'Khoa Học',
    slug: 'khoa-hoc',
  },
  {
    _id: '2276b29204c46f75064735477890afd6',
    name: 'Thần Thoại',
    slug: 'than-thoai',
  },
  {
    _id: '37a7b38b6184a5ebd3c43015aa20709d',
    name: 'Chính Kịch',
    slug: 'chinh-kich',
  },
  {
    _id: '268385d0de78827ff7bb25c35036ee2a',
    name: 'Kinh Điển',
    slug: 'kinh-dien',
  },
];

function ListItem({
  title,
  children,
  href,
  icon: Icon,
  ...props
}: React.ComponentPropsWithoutRef<'li'> & {
  href: string;
  title: string;
  icon?: React.ElementType;
}) {
  return (
    <li {...props}>
      <NavigationMenuLink asChild>
        <a
          href={href}
          className={cn(
            'block select-none space-y-1 p-3 leading-none no-underline outline-hidden transition-colors',
            'hover:bg-[#DFE104] hover:text-black focus:bg-[#DFE104] focus:text-black',
            'border border-transparent',
          )}
        >
          <div className="flex items-center gap-2">
            {Icon && <Icon className="h-4 w-4" />}
            <div className="text-sm font-bold uppercase tracking-tighter leading-none">{title}</div>
          </div>
          <p className="line-clamp-2 text-sm leading-snug text-[#A1A1AA]">{children}</p>
        </a>
      </NavigationMenuLink>
    </li>
  );
}

export function NavigationMenuDemo() {
  return (
    <NavigationMenu>
      <NavigationMenuItem>
        <NavigationMenuContent className="bg-[#09090B]">
          <ul className="grid gap-3 p-4 md:w-[400px] lg:w-[500px] lg:grid-cols-[.75fr_1fr]">
            <li className="row-span-3">
              <NavigationMenuLink asChild>
                <a
                  className={cn(
                    'flex h-full w-full flex-col justify-start border-2 border-[#3F3F46] p-4',
                    'hover:border-[#DFE104] hover:bg-[#DFE104] transition-all',
                  )}
                  href="/"
                >
                  <span className="flex items-center justify-start gap-3">
                    <Film className="h-6 w-6 text-[#DFE104]" />
                    <p className="mb-2 mt-4 text-lg font-bold uppercase tracking-tighter">
                      AstroFilm
                    </p>
                  </span>
                  <p className="text-sm leading-tight text-[#A1A1AA]">
                    Trang web xem phim online miễn phí, chất lượng cao với đa dạng thể loại và cập
                    nhật liên tục.
                  </p>
                </a>
              </NavigationMenuLink>
            </li>
            <ListItem href="/danh-sach/phim-le" title="Phim Lẻ" icon={Film}>
              Các phim chiếu rạp đầy đủ thể loại
            </ListItem>
            <ListItem href="/danh-sach/tv-shows" title="TV Shows" icon={Tv}>
              Các series truyền hình hấp dẫn
            </ListItem>
          </ul>
        </NavigationMenuContent>
      </NavigationMenuItem>

      {/* Categories */}
      <NavigationMenuItem>
        <NavigationMenuTrigger className="font-bold uppercase tracking-tighter">
          Thể loại
        </NavigationMenuTrigger>
        <NavigationMenuContent className="bg-[#09090B] p-0">
          <div className="flex min-w-[600px] flex-col overflow-hidden border-2 border-[#3F3F46] bg-[#09090B] sm:flex-row">
            <div className="flex shrink-0 flex-col gap-6 bg-[#27272A] p-6 sm:w-[220px]">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-[#A1A1AA]">
                  Khám phá
                </p>
                <ul className="mt-3 space-y-2">
                  <li>
                    <NavigationMenuLink asChild>
                      <a
                        href="/"
                        className="text-sm font-bold uppercase tracking-tighter text-[#FAFAFA] transition hover:text-[#DFE104]"
                      >
                        Feed V1
                      </a>
                    </NavigationMenuLink>
                  </li>
                  <li>
                    <NavigationMenuLink asChild>
                      <a
                        href="/?feed=v2"
                        className="text-sm font-bold uppercase tracking-tighter text-[#FAFAFA] transition hover:text-[#DFE104]"
                      >
                        Feed V2
                      </a>
                    </NavigationMenuLink>
                  </li>
                  <li>
                    <NavigationMenuLink asChild>
                      <a
                        href="/?feed=v3"
                        className="text-sm font-bold uppercase tracking-tighter text-[#FAFAFA] transition hover:text-[#DFE104]"
                      >
                        Feed V3
                      </a>
                    </NavigationMenuLink>
                  </li>
                </ul>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-[#A1A1AA]">
                  Featured
                </p>
                <ul className="mt-3 space-y-2">
                  <li>
                    <NavigationMenuLink asChild>
                      <a
                        href="/danh-sach/the-loai/hanh-dong"
                        className="text-sm font-bold uppercase tracking-tighter text-[#FAFAFA] transition hover:text-[#DFE104]"
                      >
                        Hành Động
                      </a>
                    </NavigationMenuLink>
                  </li>
                  <li>
                    <NavigationMenuLink asChild>
                      <a
                        href="/danh-sach/the-loai/tinh-cam"
                        className="text-sm font-bold uppercase tracking-tighter text-[#FAFAFA] transition hover:text-[#DFE104]"
                      >
                        Tình Cảm
                      </a>
                    </NavigationMenuLink>
                  </li>
                  <li>
                    <NavigationMenuLink asChild>
                      <a
                        href="/danh-sach/the-loai/co-trang"
                        className="text-sm font-bold uppercase tracking-tighter text-[#FAFAFA] transition hover:text-[#DFE104]"
                      >
                        Cổ Trang
                      </a>
                    </NavigationMenuLink>
                  </li>
                </ul>
              </div>
            </div>
            <div className="flex flex-1 flex-col p-6">
              <p className="text-sm font-bold uppercase tracking-tighter text-[#FAFAFA]">
                Thể loại
              </p>
              <ul className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
                {movieCategories.map((category) => (
                  <li key={category._id}>
                    <NavigationMenuLink asChild>
                      <a
                        href={`/danh-sach/the-loai/${category.slug}`}
                        className="text-sm text-[#A1A1AA] transition hover:text-[#DFE104]"
                      >
                        {category.name}
                      </a>
                    </NavigationMenuLink>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </NavigationMenuContent>
      </NavigationMenuItem>
    </NavigationMenu>
  );
}
