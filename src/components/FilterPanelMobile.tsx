import { navigate } from 'astro:transitions/client';
import { FilterSheet } from '@/components/FilterSheet';
import * as React from 'react';

interface Option {
  name: string;
  slug: string;
}

interface FilterPanelMobileProps {
  basePath: string;
  currentType: string;
  years: number[];
  categoryOptions: Option[];
  countryOptions: Option[];
  sortField: string;
  sortType: string;
  category: string;
  country: string;
  year: string;
  limit: number;
}

export function FilterPanelMobile({
  basePath,
  currentType,
  years,
  categoryOptions,
  countryOptions,
  sortField,
  sortType,
  category,
  country,
  year,
  limit,
}: FilterPanelMobileProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [formData, setFormData] = React.useState({
    sortField,
    sortType,
    category,
    country,
    year,
    limit,
  });

  const buildUrlWithoutFilter = React.useCallback(
    (excludeKey?: string) => {
      const url = new URL(window.location.href);
      const params = new URLSearchParams(url.search);

      if (excludeKey) {
        params.delete(excludeKey);
      } else {
        params.delete('category');
        params.delete('country');
        params.delete('year');
        params.delete('limit');
      }

      params.set('page', '1');

      const queryString = params.toString();
      return queryString
        ? `${basePath}/${currentType}?${queryString}`
        : `${basePath}/${currentType}`;
    },
    [basePath, currentType],
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const params = new URLSearchParams();
    params.set('page', '1');
    params.set('sort_field', formData.sortField || '');
    params.set('sort_type', formData.sortType || '');

    if (formData.category) params.set('category', formData.category);
    if (formData.country) params.set('country', formData.country);
    if (formData.year) params.set('year', formData.year);
    params.set('limit', String(formData.limit || 10));

    setIsOpen(false);
    navigate(`${basePath}/${currentType}?${params.toString()}`);
  };

  const handleReset = () => {
    setFormData({
      sortField: 'modified.time',
      sortType: 'desc',
      category: '',
      country: '',
      year: '',
      limit: 10,
    });
    navigate(`${basePath}/${currentType}?page=1&sort_field=modified.time&sort_type=desc&limit=10`);
    setIsOpen(false);
  };

  React.useEffect(() => {
    const url = new URL(window.location.href);
    const params = new URLSearchParams(url.search);

    setFormData({
      sortField: params.get('sort_field') || sortField,
      sortType: params.get('sort_type') || sortType,
      category: params.get('category') || category,
      country: params.get('country') || country,
      year: params.get('year') || year,
      limit: Number(params.get('limit')) || limit,
    });
  }, [sortField, sortType, category, country, year, limit]);

  React.useEffect(() => {
    for (const btn of document.querySelectorAll('button[data-filter-key]')) {
      const button = btn as HTMLButtonElement;
      const filterKey = button.getAttribute('data-filter-key');
      if (filterKey && filterKey !== 'sort') {
        button.addEventListener('click', () => {
          navigate(buildUrlWithoutFilter(filterKey));
        });
      }
    }

    const clearAllButton = document.getElementById('clearAllFilters');
    if (clearAllButton) {
      clearAllButton.addEventListener('click', () => {
        navigate(buildUrlWithoutFilter());
      });
    }
  }, [buildUrlWithoutFilter]);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="md:hidden inline-flex items-center gap-2 border-2 border-[#3F3F46] bg-[#27272A] px-4 py-2.5 text-xs font-bold uppercase tracking-tighter text-[#FAFAFA] transition-all duration-300 active:scale-95 hover:border-[#DFE104] hover:bg-[#DFE104] hover:text-black shadow-sm"
      >
        <svg
          className="h-4 w-4"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M3 4h10M3 8h7M3 12h4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span>Bộ lọc</span>
      </button>

      <FilterSheet isOpen={isOpen} onClose={() => setIsOpen(false)}>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-[#DFE104]">
              <svg
                className="h-4 w-4"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M2 4h12M2 8h12M2 12h8"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              Sắp xếp & hiển thị
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="sortFieldMobile"
                  className="text-xs font-semibold uppercase tracking-tighter text-[#A1A1AA]"
                >
                  Sắp xếp theo
                </label>
                <select
                  id="sortFieldMobile"
                  name="sortField"
                  value={formData.sortField}
                  onChange={(e) => setFormData({ ...formData, sortField: e.target.value })}
                  className="w-full border-2 border-[#3F3F46] bg-[#27272A] px-3 py-3 text-[15px] text-[#FAFAFA] transition-all duration-300 focus:border-[#DFE104] focus:shadow-[0_0_0_2px_rgba(223,225,4,0.3)] focus:outline-none active:scale-[0.99]"
                >
                  <option value="modified.time">Ngày cập nhật</option>
                  <option value="_id">ID phim</option>
                  <option value="year">Năm phát hành</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="sortTypeMobile"
                  className="text-xs font-semibold uppercase tracking-tighter text-[#A1A1AA]"
                >
                  Thứ tự
                </label>
                <select
                  id="sortTypeMobile"
                  name="sortType"
                  value={formData.sortType}
                  onChange={(e) => setFormData({ ...formData, sortType: e.target.value })}
                  className="w-full border-2 border-[#3F3F46] bg-[#27272A] px-3 py-3 text-[15px] text-[#FAFAFA] transition-all duration-300 focus:border-[#DFE104] focus:shadow-[0_0_0_2px_rgba(223,225,4,0.3)] focus:outline-none active:scale-[0.99]"
                >
                  <option value="desc">Mới nhất</option>
                  <option value="asc">Cũ nhất</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="yearMobile"
                  className="text-xs font-semibold uppercase tracking-tighter text-[#A1A1AA]"
                >
                  Năm phát hành
                </label>
                <select
                  id="yearMobile"
                  name="year"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                  className="w-full border-2 border-[#3F3F46] bg-[#27272A] px-3 py-3 text-[15px] text-[#FAFAFA] transition-all duration-300 focus:border-[#DFE104] focus:shadow-[0_0_0_2px_rgba(223,225,4,0.3)] focus:outline-none active:scale-[0.99]"
                >
                  <option value="">Tất cả</option>
                  {years.map((y) => (
                    <option key={y} value={String(y)}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="limitMobile"
                  className="text-xs font-semibold uppercase tracking-tighter text-[#A1A1AA]"
                >
                  Số lượng/trang
                </label>
                <select
                  id="limitMobile"
                  name="limit"
                  value={formData.limit}
                  onChange={(e) => setFormData({ ...formData, limit: Number(e.target.value) })}
                  className="w-full border-2 border-[#3F3F46] bg-[#27272A] px-3 py-3 text-[15px] text-[#FAFAFA] transition-all duration-300 focus:border-[#DFE104] focus:shadow-[0_0_0_2px_rgba(223,225,4,0.3)] focus:outline-none active:scale-[0.99]"
                >
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="30">30</option>
                  <option value="40">40</option>
                  <option value="50">50</option>
                  <option value="60">60</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-[#DFE104]">
              <svg
                className="h-4 w-4"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <circle cx="5" cy="5" r="2" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="11" cy="11" r="2" stroke="currentColor" strokeWidth="1.5" />
                <path
                  d="M7 5h2M9 11h2"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              Bộ lọc nội dung
            </h3>
            <div className="grid grid-cols-1 gap-3">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="categoryMobile"
                  className="text-xs font-semibold uppercase tracking-tighter text-[#A1A1AA]"
                >
                  Thể loại
                </label>
                <select
                  id="categoryMobile"
                  name="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full border-2 border-[#3F3F46] bg-[#27272A] px-3 py-3 text-[15px] text-[#FAFAFA] transition-all duration-300 focus:border-[#DFE104] focus:shadow-[0_0_0_2px_rgba(223,225,4,0.3)] focus:outline-none active:scale-[0.99]"
                >
                  <option value="">Tất cả</option>
                  {categoryOptions.map((option) => (
                    <option key={option.slug} value={option.slug}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="countryMobile"
                  className="text-xs font-semibold uppercase tracking-tighter text-[#A1A1AA]"
                >
                  Quốc gia
                </label>
                <select
                  id="countryMobile"
                  name="country"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  className="w-full border-2 border-[#3F3F46] bg-[#27272A] px-3 py-3 text-[15px] text-[#FAFAFA] transition-all duration-300 focus:border-[#DFE104] focus:shadow-[0_0_0_2px_rgba(223,225,4,0.3)] focus:outline-none active:scale-[0.99]"
                >
                  <option value="">Tất cả</option>
                  {countryOptions.map((option) => (
                    <option key={option.slug} value={option.slug}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="languageMobile"
                  className="text-xs font-semibold uppercase tracking-tighter text-[#52525B]"
                >
                  Ngôn ngữ
                </label>
                <select
                  id="languageMobile"
                  disabled
                  className="relative w-full cursor-not-allowed border-2 border-dashed border-[#3F3F46]/50 bg-[#18181B] px-3 py-3 text-[15px] text-[#52525B]"
                >
                  <option value="">Sắp ra mắt...</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex w-full items-center justify-center gap-1.5 border-2 border-[#3F3F46] bg-transparent px-4 py-3.5 text-xs font-bold uppercase tracking-tighter text-[#FAFAFA] transition-all duration-300 hover:border-white hover:bg-white hover:text-black active:scale-95"
            >
              <svg
                className="h-3.5 w-3.5 transition-transform group-hover:-rotate-180"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M2 8h12M8 3l5 5-5 5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Đặt lại
            </button>
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-1.5 bg-[#DFE104] px-4 py-3.5 text-xs font-bold uppercase tracking-tighter text-black transition-all duration-300 hover:scale-105 hover:shadow-[0_0_20px_rgba(223,225,4,0.5)] active:scale-[0.98]"
            >
              <svg
                className="h-3.5 w-3.5 transition-transform group-hover:scale-110"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M3 8l3 3 7-7"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Áp dụng
            </button>
          </div>
        </form>
      </FilterSheet>
    </>
  );
}
