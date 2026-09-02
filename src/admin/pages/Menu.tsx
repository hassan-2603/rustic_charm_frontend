import { useState, useEffect } from "react";

import { getMenuItems } from "../services/menuService";
import { getLocalizedField } from "../../types";

import SectionHeader from "../components/SectionHeader";
import SearchBar from "../components/SearchBar";
import MenuFilters from "../components/MenuFilters";
import MenuTable from "../components/MenuTable";
import MenuDrawer from "../components/MenuDrawer";
import DeleteMenuModal from "../components/DeleteMenuModal";

export default function Menu() {
  const [search, setSearch] = useState("");

  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedVeg, setSelectedVeg] = useState("All Items");
  const [selectedAvailability, setSelectedAvailability] = useState("Availability");

  const [menuItems, setMenuItems] = useState<any[]>([]);

  const [drawerOpen, setDrawerOpen] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);

  const [selectedItem, setSelectedItem] = useState<any>(null);

  async function loadMenu() {
    const items = await getMenuItems();

    console.log("CUSTOMER MENU:", items);

    setMenuItems(items);
  }

  useEffect(() => {
    loadMenu();
  }, []);

  return (
    <div className="space-y-8">

      <SectionHeader
        title="Menu Management"
        subtitle="Manage all restaurant menu items"
      >
        <button
          onClick={() => {
            setSelectedItem(null);
            setDrawerOpen(true);
          }}
          className="bg-olive hover:bg-olive/90 text-white px-5 py-3 rounded-xl font-semibold transition"
        >
          + Add Item
        </button>
      </SectionHeader>

      <div className="bg-white rounded-2xl shadow-sm border p-6 space-y-5">

        <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">

          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search menu..."
          />

          <MenuFilters
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            selectedVeg={selectedVeg}
            onVegChange={setSelectedVeg}
            selectedAvailability={selectedAvailability}
            onAvailabilityChange={setSelectedAvailability}
          />

        </div>

        <MenuTable
          menuItems={menuItems.filter((item) => {
            const q = search.toLowerCase();

            const itemName = getLocalizedField(item.name, "English");
            const itemCategory = getLocalizedField(item.category, "English");

            const matchesSearch =
              itemName.toLowerCase().includes(q) ||
              itemCategory.toLowerCase().includes(q);

            const matchesCategory =
              selectedCategory === "All" ||
              itemCategory === selectedCategory;

            const matchesVeg =
              selectedVeg === "All Items" ||
              (selectedVeg === "Veg" && item.isVeg) ||
              (selectedVeg === "Non Veg" && !item.isVeg);

            const matchesAvailability =
              selectedAvailability === "Availability" ||
              (selectedAvailability === "Available" && item.available) ||
              (selectedAvailability === "Unavailable" && !item.available);

            return matchesSearch && matchesCategory && matchesVeg && matchesAvailability;
          })}
          onEdit={(item) => {
            setSelectedItem(item);
            setDrawerOpen(true);
          }}
          onDelete={(item) => {
            setSelectedItem(item);
            setDeleteOpen(true);
          }}
        />

      </div>

      <MenuDrawer
        open={drawerOpen}
        item={selectedItem}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedItem(null);
        }}
        onSaved={loadMenu}
      />

      <DeleteMenuModal
        open={deleteOpen}
        item={selectedItem}
        onClose={() => {
          setDeleteOpen(false);
          setSelectedItem(null);
        }}
        onDeleted={loadMenu}
      />

    </div>
  );
}