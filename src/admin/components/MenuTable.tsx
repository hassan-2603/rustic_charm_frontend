import {
  Pencil,
  Trash2,
} from "lucide-react";
import { getLocalizedField, getMenuPriceLabel } from "../../types";

interface Props {
  menuItems: any[];
  onEdit: (item: any) => void;
  onDelete: (item: any) => void;
}

export default function MenuTable({
  menuItems,
  onEdit,
  onDelete,
}: Props) {
  return (
    <div className="overflow-x-auto">

      <table className="w-full">

        <thead className="border-b">

          <tr className="text-left text-gray-500 text-sm">

            <th className="py-4">Image</th>

            <th>Name</th>

            <th>Category</th>

            <th>Price</th>

            <th>Veg</th>

            <th>Available</th>

            <th></th>

          </tr>

        </thead>

        <tbody>

          {menuItems.map((item) => (

            <tr
              key={item.id}
              className="border-b hover:bg-gray-50 transition"
            >

              <td className="py-4">

                <img
                  src={item.image || "/placeholder-food.jpg"}
                  alt={getLocalizedField(item.name, "English")}
                  className="w-14 h-14 rounded-xl object-contain"
                />

              </td>

              <td className="font-semibold">
                {getLocalizedField(item.name, "English")}
              </td>

              <td>{getLocalizedField(item.category, "English")}</td>

              <td>{getMenuPriceLabel(item)}</td>

              <td>
                {item.isVeg ? "🟢 Veg" : "🔴 Non Veg"}
              </td>

              <td>
                {item.available ? "✅" : "❌"}
              </td>

              <td>

                <div className="flex gap-3 justify-end">

                  <button
                    onClick={() => onEdit(item)}
                  >
                    <Pencil
                      size={18}
                      className="text-blue-600"
                    />
                  </button>

                  <button
                    onClick={() => onDelete(item)}
                  >
                    <Trash2
                      size={18}
                      className="text-red-600"
                    />
                  </button>

                </div>

              </td>

            </tr>

          ))}

        </tbody>

      </table>

    </div>
  );
}