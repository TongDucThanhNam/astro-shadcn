"use client";

import { useEffect, useState } from "react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

interface Genre {
  slug: string;
  name: string;
  name_en?: string;
}

interface GenreDialogProps {
  children?: React.ReactNode;
}

export function GenreDialog({ children }: GenreDialogProps = {}) {
  const [genres, setGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open && genres.length === 0) {
      fetch("/api/genres")
        .then((res) => res.json())
        .then((data) => {
          setGenres(data.items || []);
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    }
  }, [open, genres.length]);

  return (
    <>
      <button
        type="button"
        className="block border-2 border-[#27272A] bg-[#27272A] px-3 py-1.5 sm:px-4 sm:py-2 md:px-5 md:py-2.5 text-[10px] sm:text-xs md:text-sm font-bold uppercase tracking-tighter text-[#A1A1AA] transition-all duration-300 hover:bg-[#FAFAFA] hover:text-black hover:scale-105 cursor-pointer w-full text-left"
        onClick={() => setOpen(true)}
      >
        Xem tất cả thể loại
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTitle className="sr-only">Tất cả thể loại</DialogTitle>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-[#09090B] border-[#27272A]">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4">
            {loading ? (
              <div className="col-span-full text-center py-8 text-[#71717A]">
                Đang tải...
              </div>
            ) : (
              genres.map((genre) => (
                <a
                  key={genre.slug}
                  href={`/danh-sach/the-loai/${genre.slug}`}
                  className="border-2 border-[#3F3F46] bg-[#09090B] px-3 py-2 text-sm font-bold uppercase tracking-tight text-[#FAFAFA] transition-all duration-300 hover:bg-[#DFE104] hover:border-[#DFE104] hover:text-black hover:scale-105"
                  onClick={() => setOpen(false)}
                >
                  {genre.name}
                </a>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
