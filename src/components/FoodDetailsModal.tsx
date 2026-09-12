import { useState, useEffect } from 'react';
import { X, Minus, Plus, Clock, Star, Flame } from 'lucide-react';
import { MenuItem, Language, getLocalizedField, getMenuPriceOptions } from '../types';
import { TRANSLATIONS } from '../data/translations';
import { motion } from 'motion/react';

interface FoodDetailsModalProps {
  item: MenuItem | null;
  language: Language;
  onClose: () => void;
  onAddToCart: (item: MenuItem, quantity: number, specialInstructions: string, selectedPriceOption?: { quantity: number; amount: number }) => void;
}

export default function FoodDetailsModal({ item, language, onClose, onAddToCart }: FoodDetailsModalProps) {
    console.log("MODAL ITEM:", item);

  const [quantity, setQuantity] = useState(1);
  const [instructions, setInstructions] = useState('');
  const [selectedPriceOption, setSelectedPriceOption] = useState<{ quantity: number; amount: number } | null>(null);
  const t = TRANSLATIONS[language] || TRANSLATIONS.English;
  const localizedName = item ? getLocalizedField(item.name, language, item) : "";
  const localizedDesc = item ? getLocalizedField(item.description, language, item) : "";

  // Reset local state when item changes
  useEffect(() => {
    if (item) {
      const options = getMenuPriceOptions(item);
      setQuantity(1);
      setInstructions('');
      setSelectedPriceOption(options[0] ?? null);
    }
  }, [item]);

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!item) return null;

  const handleIncrement = () => setQuantity((prev) => prev + 1);
  const handleDecrement = () => setQuantity((prev) => (prev > 1 ? prev - 1 : 1));

  const handleAddSubmit = () => {
    onAddToCart(item, quantity, instructions, selectedPriceOption ?? undefined);
    onClose();
  };
  console.log("image is:",item.image);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4" id="details-modal-overlay">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-charcoal/40 backdrop-blur-xs transition-opacity" 
        onClick={onClose} 
        id="details-modal-backdrop"
      />

      {/* Modal Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ type: 'spring', damping: 25, stiffness: 220 }}
        className="relative bg-[#FAF8F3] w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl z-10 border border-light-gray flex flex-col max-h-[90vh]"
        id="details-modal-card"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 bg-white/80 hover:bg-white text-charcoal hover:text-olive p-2 rounded-full shadow-md transition-all duration-300 backdrop-blur-sm"
          id="details-modal-close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="overflow-y-auto flex-grow" id="details-modal-scrollable">
          {/* Main Hero Image */}
          <div className="relative aspect-video w-full" id="details-modal-hero">
            <img
              src={item.image || "/placeholder-food.jpg"}
              alt={localizedName}
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-charcoal/50 via-transparent to-transparent" />
            <div className="absolute bottom-6 left-6 right-6 text-white">
              <span className="bg-gold text-charcoal text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full mb-2.5 inline-block shadow-sm">
                {item.category}
              </span>
              <h2 className="font-elegant font-bold text-2xl md:text-3xl tracking-wide drop-shadow-xs">
                {localizedName}
              </h2>
            </div>
          </div>

          {/* Modal Content */}
          <div className="p-6 md:p-8 space-y-6" id="details-modal-content-body">
            {/* Badges / Meta Info */}
            <div className="flex flex-wrap items-center gap-4 py-3 px-4 bg-white rounded-2xl border border-light-gray/40">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-gold">
                <Star className="w-4 h-4 fill-gold stroke-gold" />
                <span>{(item.rating ?? 4.5).toFixed(1)} / 5.0</span>
              </div>
              <div className="w-[1px] h-4 bg-light-gray" />
              <div className="flex items-center gap-1.5 text-xs text-soft-gray font-medium">
                <Clock className="w-4 h-4 text-olive" />
                <span>{t.prepTime}: {item.prepTime ?? "15-20 min"}</span>
              </div>
              
              {/* Spice level indicator if spiceLevel > 0 */}
              {(item.spiceLevel ?? 0) > 0 && (
                <>
                  <div className="w-[1px] h-4 bg-light-gray" />
                  <div className="flex items-center gap-1 text-xs text-soft-gray font-medium">
                    <Flame className="w-4 h-4 text-red-500" />
                    <span>{t.spiceLevel}:</span>
                    <span className="flex items-center gap-0.5 ml-1">
                      {Array.from({ length: item.spiceLevel ?? 0 }).map((_, i) => (
                        <Flame key={i} className="w-3.5 h-3.5 fill-red-500 text-red-500" />
                      ))}
                    </span>
                  </div>
                </>
              )}
            </div>

            {item && getMenuPriceOptions(item).length > 1 && (
              <div className="space-y-3">
                <h3 className="font-serif italic text-base text-charcoal/80 tracking-wide font-semibold">Choose Portion</h3>
                <div className="grid gap-2">
                  {getMenuPriceOptions(item).map((option, index) => (
                    <button
                      key={`${option.quantity}-${option.amount}-${index}`}
                      type="button"
                      onClick={() => setSelectedPriceOption(option)}
                      className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left ${selectedPriceOption?.quantity === option.quantity && selectedPriceOption?.amount === option.amount ? 'border-olive bg-olive/5 text-olive' : 'border-light-gray bg-white text-charcoal'}`}
                    >
                      <span>{option.quantity} {option.unit?.trim() ? option.unit.trim() : (option.quantity === 1 ? 'piece' : 'pieces')}</span>
                      <span className="font-semibold">₹{option.amount}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            <div className="space-y-2">
              <p className="text-sm md:text-base text-charcoal/90 leading-relaxed font-light">
                {localizedDesc}
              </p>
            </div>

            {/* Ingredients */}
            <div className="space-y-3">
              <h3 className="font-serif italic text-base text-charcoal/80 tracking-wide font-semibold">
                {t.ingredients}
              </h3>
              <div className="flex flex-wrap gap-2">
                {(item.ingredients ?? []).map((ing, i) => (
                  <span
                    key={i}
                    className="bg-white border border-light-gray/60 px-3 py-1.5 rounded-lg text-xs font-medium text-charcoal tracking-wide"
                  >
                    {ing}
                  </span>
                ))}
              </div>
            </div>

            {/* Special Instructions */}
            <div className="space-y-3">
              <label className="block font-serif italic text-base text-charcoal/80 tracking-wide font-semibold" htmlFor="special-instructions-input">
                {t.specialInstructions}
              </label>
              <textarea
                id="special-instructions-input"
                rows={3}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder={t.specialInstructionsPlaceholder}
                className="w-full bg-white border border-light-gray rounded-xl p-4 text-xs font-medium focus:ring-1 focus:ring-gold focus:border-gold outline-none transition-all placeholder:text-soft-gray/60"
              />
            </div>
          </div>
        </div>

        {/* Modal Footer / Add to Cart Controls */}
        <div className="p-4 sm:p-6 md:p-8 bg-white border-t border-light-gray/60 flex flex-col sm:flex-row items-center justify-between gap-4 mt-auto">
          {/* Quantity Selector */}
          <div className="flex items-center border border-light-gray rounded-full bg-cream p-1.5 w-full sm:w-auto justify-between sm:justify-start gap-4" id="details-quantity-selector">
            <button
              onClick={handleDecrement}
              disabled={quantity <= 1}
              className={`p-2 rounded-full transition-colors ${
                quantity <= 1 ? 'text-soft-gray/30' : 'text-charcoal hover:bg-white'
              }`}
              id="details-qty-decrease"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="font-mono font-bold text-base text-charcoal px-3 w-8 text-center">
              {quantity}
            </span>
            <button
              onClick={handleIncrement}
              className="p-2 rounded-full text-charcoal hover:bg-white transition-colors"
              id="details-qty-increase"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Add to Cart button */}
          <button
            onClick={handleAddSubmit}
            className="w-full sm:w-auto flex-grow sm:flex-grow-0 bg-olive hover:bg-olive-dark text-white font-semibold text-sm tracking-widest uppercase px-8 py-4 rounded-full transition-all duration-300 shadow-md hover:shadow-lg active:scale-98 flex items-center justify-center gap-2"
            id="details-add-to-cart-submit"
          >
            <span>{t.addToCart}</span>
            <span className="opacity-50">|</span>
            <span className="font-mono font-medium">₹{(((selectedPriceOption?.amount ?? item.price ?? 0) * quantity)).toFixed(0)}</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
