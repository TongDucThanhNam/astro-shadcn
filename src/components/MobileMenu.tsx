"use client"

import * as React from "react"
import { ChevronDown, ChevronRight, Menu } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { movieCategories } from "@/components/NavigationMenuDemo"

type MenuItem = {
  title: string
  href?: string
  submenu?: MenuItem[]
}

const menuItems: MenuItem[] = [
  { title: "Trang chủ", href: "/" },
  {
    title: "Danh sách",
    submenu: [
      { title: "Phim lẻ", href: "/danh-sach/phim-le" },
      { title: "Phim bộ", href: "/danh-sach/phim-bo" },
      { title: "TV Shows", href: "/danh-sach/tv-shows" },
      { title: "Phim Vietsub", href: "/danh-sach/phim-vietsub" },
    ],
  },
  {
    title: "Thể loại",
    submenu: movieCategories.map((category) => ({
      title: category.name,
      href: `/danh-sach/the-loai/${category.slug}`,
    })),
  },
]

interface MenuItemComponentProps {
  item: MenuItem
  depth?: number
  onNavigate: () => void
}

const MenuItemComponent: React.FC<MenuItemComponentProps> = ({
  item,
  depth = 0,
  onNavigate,
}) => {
  const [isOpen, setIsOpen] = React.useState(false)

  if (item.submenu) {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <button
            className={cn(
              "flex w-full items-center justify-between py-2 text-base font-medium transition-colors hover:text-primary",
              depth > 0 && "pl-4",
            )}
          >
            {item.title}
            {isOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
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
    )
  }

  return (
    <a
      href={item.href}
      className={cn(
        "block py-2 text-base transition-colors hover:text-primary",
        depth > 0 && "pl-4",
      )}
      onClick={onNavigate}
    >
      {item.title}
    </a>
  )
}

export default function MobileMenu() {
  const [open, setOpen] = React.useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Mở menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[260px] bg-slate-950 text-white sm:w-[320px]">
        <nav className="mt-6 flex flex-col space-y-2">
          {menuItems.map((item) => (
            <MenuItemComponent
              key={item.title}
              item={item}
              onNavigate={() => setOpen(false)}
            />
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  )
}
