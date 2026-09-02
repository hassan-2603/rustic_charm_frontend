import { useEffect, useState } from "react";
import { getCategories } from "../services/categoryService";
import { getLocalizedField } from "../../types";

type Props = {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  selectedVeg: string;
  onVegChange: (veg: string) => void;
  selectedAvailability: string;
  onAvailabilityChange: (availability: string) => void;
};

export default function MenuFilters({
  selectedCategory,
  onCategoryChange,
  selectedVeg,
  onVegChange,
  selectedAvailability,
  onAvailabilityChange,
}: Props) {
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    async function loadCategories() {
      const data = await getCategories();
      setCategories(data);
    }

    loadCategories();
  }, []);

  return (
    <div className="flex flex-wrap gap-3">

      <select
        value={selectedCategory}
        onChange={(e) => onCategoryChange(e.target.value)}
        className="px-4 py-3 rounded-xl border border-gray-300 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-olive/30"
      >
        <option value="All">All Categories</option>

        {categories.map((cat) => (
          <option key={cat.id} value={getLocalizedField(cat.name, "English")}>
            {getLocalizedField(cat.name, "English")}
          </option>
        ))}
      </select>

      <select
        value={selectedVeg}
        onChange={(e) => onVegChange(e.target.value)}
        className="px-4 py-3 rounded-xl border border-gray-300 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-olive/30"
      >
        <option value="All Items">All Items</option>
        <option value="Veg">Veg</option>
        <option value="Non Veg">Non Veg</option>
      </select>

      <select
        value={selectedAvailability}
        onChange={(e) => onAvailabilityChange(e.target.value)}
        className="px-4 py-3 rounded-xl border border-gray-300 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-olive/30"
      >
        <option value="Availability">Availability</option>
        <option value="Available">Available</option>
        <option value="Unavailable">Unavailable</option>
      </select>

    </div>
  );
}