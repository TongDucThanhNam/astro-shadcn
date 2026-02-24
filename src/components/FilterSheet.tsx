import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import type * as React from 'react';

interface FilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function FilterSheet({ isOpen, onClose, children }: FilterSheetProps) {
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent
        side="bottom"
        className="max-h-[90dvh] overflow-y-auto rounded-t-3xl border-2 border-t-4 border-[#3F3F46] border-t-[#DFE104] bg-[#09090B] px-4 pt-3 pb-6 sm:px-6 sm:pt-4 sm:pb-8"
      >
        <SheetHeader className="mb-5 text-left">
          <div className="mx-auto mb-3 h-1.5 w-16 rounded-full bg-[#3F3F46]" />
          <SheetTitle className="text-lg font-bold uppercase tracking-tight text-[#FAFAFA] sm:text-xl">
            Bộ lọc tìm kiếm
          </SheetTitle>
        </SheetHeader>
        {children}
      </SheetContent>
    </Sheet>
  );
}
