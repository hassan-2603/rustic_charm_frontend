import { ShoppingBag, ClipboardList } from 'lucide-react';
import { Language } from '../types';
import { TRANSLATIONS } from '../data/translations'
import LanguageSelector from './LanguageSelector';
import Logo from './Logo';

interface HeaderProps {
  currentLanguage: Language;
  currentTable: string | number | null;
  onLanguageChange: (lang: Language) => void;
  cartCount: number;
  hasActiveOrder: boolean;
  onCartClick: () => void;
  onOrdersClick: () => void;
}

export default function Header({
  currentLanguage,
  currentTable,
  onLanguageChange,
  cartCount,
  onCartClick,
  hasActiveOrder,
  onOrdersClick,
}: HeaderProps) {
  const t = TRANSLATIONS[currentLanguage] || TRANSLATIONS.English;
  return (
    <header
      className="sticky top-0 z-40 bg-cream/90 backdrop-blur-md border-b border-light-gray/40 transition-all duration-300"
      id="app-header"
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-0 min-h-20 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3" id="header-container">
        {/* Left Side: Minimal Brand Logo */}
        <Logo size="sm" variant="horizontal" className="flex-shrink-0" id="header-brand-logo" />

        {/* Center: Table Number Badge */}
        <div
          className="order-3 w-full sm:order-none sm:w-auto flex justify-center sm:justify-start bg-white px-3 sm:px-4 py-1.5 rounded-full border border-light-gray/60 shadow-2xs items-center gap-1.5 sm:gap-2 flex-shrink-0"
          id="header-table-badge"
        >
          <span className="w-2 h-2 rounded-full bg-olive animate-pulse" />
          <span className="font-sans font-semibold text-[10px] sm:text-xs tracking-wider text-charcoal uppercase whitespace-nowrap">
            {t.table} {currentTable ? currentTable : "--"}
          </span>
        </div>

        {/* Right Side: Language Dropdown + Cart Button */}
        <div
          className="ml-auto flex items-center gap-2 sm:gap-3.5 flex-shrink-0"
          id="header-actions"
        >
          {/* Dropdown Language Selector */}
          <LanguageSelector
            currentLanguage={currentLanguage}
            onLanguageChange={onLanguageChange}
            variant="dropdown"
          />

          {/* Cart Icon Trigger */}
          {/* Cart + Orders Buttons */}
          <div className="flex items-center gap-2">

            {/* Cart Button */}
            <button
              onClick={onCartClick}
              className="relative bg-white hover:bg-olive text-charcoal hover:text-white border border-light-gray/80 hover:border-olive p-2.5 rounded-full transition-all duration-300 flex items-center justify-center cursor-pointer shadow-xs active:scale-95 group"
              id="header-cart-trigger"
            >
              <ShoppingBag className="w-4.5 h-4.5 group-hover:scale-105 transition-transform" />

              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-olive text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center font-mono shadow-sm border border-cream">
                  {cartCount}
                </span>
              )}
            </button>

            {/* Orders Button */}
            <button
              onClick={onOrdersClick}
              disabled={!hasActiveOrder}
              className={`rounded-full p-2.5 transition-all duration-300 shadow-xs border ${hasActiveOrder
                  ? "bg-olive text-white border-olive hover:scale-105"
                  : "bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed opacity-70"
                }`}
            >
              <ClipboardList className="w-4.5 h-4.5" />
            </button>

          </div>
        </div>
      </div>
    </header>
  );
}
