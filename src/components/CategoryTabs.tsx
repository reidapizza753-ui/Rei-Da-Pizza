import React from "react";
import { Category } from "../types";

interface CategoryTabsProps {
  categories: Category[];
  selectedCategoryId: string;
  onSelectCategory: (id: string) => void;
}

export default function CategoryTabs({
  categories,
  selectedCategoryId,
  onSelectCategory,
}: CategoryTabsProps) {
  // Sort by order parameter
  const sortedCategories = [...categories]
    .filter((c) => c.active)
    .sort((a, b) => a.order - b.order);

  return (
    <div className="w-full bg-[#1A1A1A] py-4 sticky top-[64px] md:top-[64px] z-30 border-b border-white/5 shadow-lg px-4 backdrop-blur-md glass">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Kinetic Horizontal Scroll Container with scrollbar hidden classes */}
        <div className="flex space-x-3 overflow-x-auto no-scrollbar pb-1 pt-0.5 w-full scrollbar-hide">
          {sortedCategories.map((category) => {
            const isSelected = category.id === selectedCategoryId;
            return (
              <button
                key={category.id}
                onClick={() => onSelectCategory(category.id)}
                className={`flex-shrink-0 px-5 py-2 rounded-full text-xs md:text-sm font-bold tracking-wide transition-all duration-200 cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? "bg-[#8B0000] text-white border border-[#D4AF37]/40 shadow-lg scale-[1.03]"
                    : "bg-zinc-800 text-zinc-405 text-zinc-400 hover:bg-zinc-700 hover:text-white"
                }`}
                id={`tab-category-${category.id}`}
              >
                {category.name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
