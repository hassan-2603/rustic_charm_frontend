import { useState, useEffect } from 'react';
import { X, Minus, Plus, ShoppingBag, Trash2, Edit } from 'lucide-react';
import { CartItem, Language, getLocalizedField } from '../types';
import { TRANSLATIONS } from '../data/translations';
import { motion, AnimatePresence } from 'motion/react';

interface CartDrawerProps {
  isOpen: boolean;
  cartItems: CartItem[];
  language: Language;
  onClose: () => void;
  onUpdateQuantity: (itemId: string, newQty: number) => void;
  onRemoveItem: (itemId: string) => void;
  onPlaceOrder: () => void;
  isPlacingOrder: boolean;
}

export default function CartDrawer({
  isOpen,
  cartItems,
  language,
  onClose,
  onUpdateQuantity,
  onRemoveItem,
  onPlaceOrder,
  isPlacingOrder,
}: CartDrawerProps) {
  const t = TRANSLATIONS[language];
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Calculate prices
  const subtotal = cartItems.reduce((acc, item) => acc + ((item.selectedPriceOption?.amount ?? item.menuItem.price ?? 0) * item.quantity), 0);
  const total = subtotal;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden" id="cart-drawer-wrapper">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-charcoal/40 backdrop-blur-xs transition-opacity"
            id="cart-drawer-backdrop"
          />

          {/* Slider/Sheet Container */}
          <div 
            className={
              isMobile 
                ? "absolute inset-x-0 bottom-0 top-auto w-full h-[82vh] flex flex-col z-50" 
                : "absolute inset-y-0 right-0 max-w-full flex pl-10"
            } 
            id="cart-drawer-panel-container"
          >
            <motion.div
              initial={isMobile ? { y: '100%', x: 0 } : { x: '100%', y: 0 }}
              animate={{ x: 0, y: 0 }}
              exit={isMobile ? { y: '100%', x: 0 } : { x: '100%', y: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 240 }}
              className={`w-full ${
                isMobile 
                  ? "bg-[#FAF8F3] shadow-[0_-8px_32px_rgba(0,0,0,0.08)] rounded-t-[2.5rem] h-full" 
                  : "max-w-md bg-[#FAF8F3] shadow-2xl border-l border-light-gray h-full"
              } flex flex-col`}
              id="cart-drawer-panel"
            >
              {/* iOS-Style Sheet Drag Handle - Mobile Only */}
              {isMobile && (
                <div className="w-12 h-1.5 bg-light-gray/80 rounded-full mx-auto my-3 flex-shrink-0" id="bottom-sheet-handle" />
              )}

              {/* Header */}
              <div className={`px-4 sm:px-6 py-4 bg-white border-b border-light-gray flex items-center justify-between ${isMobile ? 'rounded-t-[1.5rem]' : ''}`} id="cart-drawer-header">
                <div className="flex items-center gap-2.5 text-olive">
                  <ShoppingBag className="w-5 h-5" />
                  <h2 className="font-elegant font-semibold text-xl text-charcoal tracking-wide">
                    {t.cartTitle}
                  </h2>
                  <span className="bg-olive/10 text-olive text-xs font-bold px-2.5 py-1 rounded-full font-mono ml-1">
                    {cartItems.reduce((acc, item) => acc + item.quantity, 0)}
                  </span>
                </div>
                <button
                  onClick={onClose}
                  className="text-soft-gray hover:text-charcoal p-1.5 rounded-full hover:bg-cream transition-colors"
                  id="cart-drawer-close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Cart List */}
              <div className="flex-grow overflow-y-auto p-4 sm:p-6 space-y-4" id="cart-drawer-items-list">
                {cartItems.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-12" id="cart-empty-state">
                    <div className="bg-white p-6 rounded-full border border-light-gray/60 shadow-sm text-soft-gray/40">
                      <ShoppingBag className="w-12 h-12 stroke-1" />
                    </div>
                    <div className="max-w-[250px]">
                      <h3 className="font-serif italic text-base text-charcoal/80 font-semibold mb-1">
                        {t.cartEmpty}
                      </h3>
                      <p className="text-xs text-soft-gray leading-relaxed">
                        {TRANSLATIONS[language].subtitle}
                      </p>
                    </div>
                  </div>
                ) : (
                  cartItems.map((item) => {
                    const itemLocalizedName = getLocalizedField(item.menuItem.name, language, item.menuItem);
                    return (
                      <div
                        key={item.menuItem.id}
                        className="bg-white rounded-2xl p-3 sm:p-4 border border-light-gray/40 shadow-xs flex flex-col sm:flex-row gap-3.5"
                        id={`cart-item-${item.menuItem.id}`}
                      >
                        {/* Item Image */}
                        <img
                          src={item.menuItem.image || "/placeholder-food.jpg"}
                          alt={itemLocalizedName}
                          className="w-full sm:w-16 h-40 sm:h-16 rounded-xl object-contain border border-light-gray/40 flex-shrink-0"
                          referrerPolicy="no-referrer"
                        />

                        {/* Info & Adjustments */}
                        <div className="flex-grow flex flex-col justify-between">
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="font-elegant font-semibold text-sm text-charcoal leading-tight tracking-wide">
                                {itemLocalizedName}
                              </h4>
                            <button
                              onClick={() => onRemoveItem(item.menuItem.id)}
                              className="text-soft-gray hover:text-red-600 p-1 rounded transition-colors"
                              title="Remove item"
                              id={`cart-remove-${item.menuItem.id}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          {item.specialInstructions && (
                            <p className="text-[10px] text-amber-700 bg-amber-50 rounded-md py-1 px-2 border border-amber-100 mt-1 italic flex items-start gap-1 leading-normal">
                              <Edit className="w-2.5 h-2.5 mt-0.5 flex-shrink-0" />
                              <span className="line-clamp-2">{item.specialInstructions}</span>
                            </p>
                          )}
                        </div>

                        {/* Adjuster & Price */}
                        <div className="flex items-center justify-between mt-3.5">
                          <div className="flex items-center border border-light-gray rounded-lg bg-cream p-1 gap-2.5">
                            <button
                              onClick={() => onUpdateQuantity(item.menuItem.id, item.quantity - 1)}
                              className="p-1 rounded text-charcoal hover:bg-white transition-colors"
                              id={`cart-qty-dec-${item.menuItem.id}`}
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="font-mono text-xs font-bold text-charcoal w-4 text-center">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => onUpdateQuantity(item.menuItem.id, item.quantity + 1)}
                              className="p-1 rounded text-charcoal hover:bg-white transition-colors"
                              id={`cart-qty-inc-${item.menuItem.id}`}
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                          <span className="font-mono text-sm font-semibold text-charcoal">
                            ₹{(((item.selectedPriceOption?.amount ?? item.menuItem.price ?? 0) * item.quantity)).toFixed(0)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              </div>

              {/* Footer Calculations */}
              {cartItems.length > 0 && (
                <div className="p-4 sm:p-6 bg-white border-t border-light-gray/60 space-y-4" id="cart-drawer-footer">
                  <div className="space-y-2.5" id="cart-drawer-math">
                    <div className="flex justify-between text-xs text-soft-gray font-medium">
                      <span>{t.subtotal}</span>
                      <span className="font-mono">₹{subtotal.toFixed(0)}</span>
                    </div>
                    <div className="h-[1px] bg-light-gray/60" />
                    <div className="flex justify-between text-base text-charcoal font-semibold">
                      <span className="font-serif italic">{t.total}</span>
                      <span className="font-mono text-olive">₹{total.toFixed(0)}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 pt-2">
                    <button
                      onClick={onPlaceOrder}
                      disabled={isPlacingOrder}
                      className={`w-full text-white font-semibold text-xs tracking-widest uppercase py-4 rounded-full transition-all duration-300 shadow-md flex items-center justify-center gap-2 ${
                        isPlacingOrder
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-olive hover:bg-olive-dark hover:shadow-lg active:scale-98'
                      }`}
                      id="cart-drawer-submit-btn"
                    >
                      {isPlacingOrder ? "Placing Order..." : t.placeOrder}
                    </button>
                    <button
                      onClick={onClose}
                      className="w-full border border-light-gray hover:border-gold text-charcoal hover:text-gold font-medium text-xs tracking-widest uppercase py-3.5 rounded-full transition-all duration-300 bg-cream/10 flex items-center justify-center"
                      id="cart-drawer-continue-shopping-btn"
                    >
                      {t.continueShopping}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
