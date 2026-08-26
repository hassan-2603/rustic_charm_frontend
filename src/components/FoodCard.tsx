import React from 'react';
import { Star, Clock, Plus } from 'lucide-react';
import { MenuItem, Language, getLocalizedField, getMenuPriceLabel } from '../types';
import { TRANSLATIONS } from '../data/translations';

interface FoodCardProps {
  item: MenuItem;
  language: Language;
  onAddToCart: (item: MenuItem, quantity: number) => void;
  onClick: (item: MenuItem) => void;
  key?: string;
}

export default function FoodCard({ item, language, onAddToCart, onClick }: FoodCardProps) {
  const t = TRANSLATIONS[language];
  const localizedName = getLocalizedField(item.name, language, item);
  const localizedDesc = getLocalizedField(item.description, language, item);

  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening the details modal
    onAddToCart(item, 1);
  };

  const isPopular = item.rating >= 4.8;

  return (
    <div
      onClick={() => onClick(item)}
      className="group bg-white rounded-2xl overflow-hidden border border-light-gray/40 shadow-[0_2px_12px_-3px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_24px_-4px_rgba(85,107,47,0.06)] hover:border-gold/30 transition-all duration-500 flex flex-row md:flex-col h-[115px] sm:h-[135px] md:h-full cursor-pointer relative"
      id={`food-card-${item.id}`}
    >
      {/* Food Image container */}
      <div 
        className="relative flex-shrink-0 w-[115px] sm:w-[135px] md:w-full h-full md:aspect-[4/3] overflow-hidden" 
        id={`image-container-${item.id}`}
      >
        <img
          src={item.image || "/placeholder-food.jpg"}
          alt={localizedName}
          className="w-full h-full object-contain transform scale-100 group-hover:scale-[1.03] transition-transform duration-700 ease-out"
          loading="lazy"
          referrerPolicy="no-referrer"
          id={`food-card-img-${item.id}`}
        />

        {/* Veg/Non-Veg Badge - Desktop Only */}
        <div className="hidden md:flex absolute top-3.5 left-3.5 flex-col gap-1.5 items-start">
          {item.isVeg ? (
            <span className="bg-white/95 backdrop-blur-xs border border-emerald-500/30 text-emerald-700 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {t.veg}
            </span>
          ) : (
            <span className="bg-white/95 backdrop-blur-xs border border-red-500/20 text-red-700 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              {t.nonVeg}
            </span>
          )}
        </div>

        {/* Preparation Time Badge - Desktop Only */}
        <div className="hidden md:flex absolute bottom-3 left-3 bg-black/45 backdrop-blur-xs text-white text-[10px] font-medium tracking-wide px-2.5 py-1 rounded-md flex items-center gap-1.5 shadow-xs">
          <Clock className="w-3 h-3 text-gold" />
          {item.prepTime}
        </div>
      </div>

      {/* Food Info */}
      <div 
        className="flex-grow p-3 sm:p-4 md:p-5 flex flex-col justify-between" 
        id={`info-container-${item.id}`}
      >
        <div className="space-y-1 sm:space-y-1.5 md:space-y-2">
          {/* Tags row */}
          <div className="flex items-center flex-wrap gap-1.5 md:gap-2">
            {/* Veg / Non-veg dot/badge on Mobile */}
            <div className="md:hidden">
              {item.isVeg ? (
                <span className="border border-emerald-500/20 bg-emerald-50/50 text-emerald-700 text-[8px] sm:text-[9px] font-extrabold uppercase tracking-widest px-1.5 py-0.5 rounded-md flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {t.veg}
                </span>
              ) : (
                <span className="border border-red-500/10 bg-red-50/50 text-red-700 text-[8px] sm:text-[9px] font-extrabold uppercase tracking-widest px-1.5 py-0.5 rounded-md flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  {t.nonVeg}
                </span>
              )}
            </div>


            {/* Rating floating/visible on mobile & desktop */}
            <div className="flex items-center gap-0.5 text-[9px] sm:text-xs font-bold text-gold bg-gold/5 px-1.5 py-0.5 rounded-md ml-auto md:ml-0 md:absolute md:top-3.5 md:right-3.5 md:bg-white/95 md:shadow-2xs md:border md:border-gold/20">
              <Star className="w-3 h-3 fill-gold stroke-gold" />
              <span>{item.rating ? item.rating.toFixed(1) : "0.0"}</span>
            </div>
          </div>

          {/* Title and Description */}
          <div>
            <h3 className="font-elegant font-semibold text-xs sm:text-sm md:text-xl text-charcoal tracking-wide group-hover:text-olive transition-colors duration-300 leading-tight line-clamp-1 md:line-clamp-2">
              {localizedName}
            </h3>
            <p className="text-[10px] sm:text-xs text-soft-gray line-clamp-1 sm:line-clamp-2 leading-relaxed mt-0.5 md:mt-1.5">
              {localizedDesc}
            </p>
          </div>
        </div>

        {/* Bottom Section with Price, prep time and Add Button */}
        <div className="flex items-center justify-between pt-1.5 sm:pt-2 md:pt-3 border-t border-light-gray/20 mt-1 md:mt-auto">
          <div className="flex flex-col md:flex-row md:items-baseline md:gap-2">
            <span className="font-elegant text-sm sm:text-base md:text-xl font-bold text-charcoal">
              {getMenuPriceLabel(item)}
            </span>
            {/* Prep time visible on mobile below/beside price */}
            <span className="md:hidden flex items-center gap-1 text-[9px] sm:text-[10px] text-soft-gray mt-0.5">
              <Clock className="w-2.5 h-2.5 text-gold" />
              {item.prepTime}
            </span>
          </div>

          {/* Touch-optimized small Add Button */}
          <button
            onClick={handleAddClick}
            className="bg-cream hover:bg-olive text-olive hover:text-white border border-olive/20 hover:border-olive p-1.5 sm:p-2 md:p-2.5 rounded-full transition-all duration-300 flex items-center justify-center active:scale-90 hover:scale-105"
            title={t.addToCart}
            id={`add-btn-${item.id}`}
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
