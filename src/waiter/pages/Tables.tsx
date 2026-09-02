import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listenTables } from "../services/waiterService";
import { DEFAULT_TABLE_AREAS, getAreaLabel } from "../../utils/tableUtils";

export default function Tables() {
    const [tables, setTables] = useState<any[]>([]);

    useEffect(() => {
        const unsubscribe = listenTables(setTables);
        return () => unsubscribe();
    }, []);

    const groupedTables = useMemo(() => {
        const uniqueAreaLabels = new Set<string>();
        DEFAULT_TABLE_AREAS.forEach(a => uniqueAreaLabels.add(a.label));
        tables.forEach(t => {
            const lbl = t.areaLabel || t.area;
            if (lbl) uniqueAreaLabels.add(lbl);
        });

        const grouped: Record<string, any[]> = {};
        uniqueAreaLabels.forEach((label) => { grouped[label] = []; });
        tables.forEach((table) => {
            const lbl = table.areaLabel || table.area || "Unassigned";
            if (!grouped[lbl]) grouped[lbl] = [];
            grouped[lbl].push(table);
        });
        return grouped;
    }, [tables]);

    return (
        <div className="p-4 sm:p-6 lg:p-8 bg-gray-100 min-h-screen">
            <h1 className="text-4xl font-bold mb-8">Tables</h1>

            <div className="space-y-8">
                {Object.entries(groupedTables).map(([areaLabel, areaTables]) => {
                    if (areaTables.length === 0) return null;
                    return (
                        <div key={areaLabel} className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xl font-semibold text-gray-900 border-b pb-2">
                                    {areaLabel}
                                </h3>
                            </div>
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                                {areaTables.map((table) => {
                                    const isOccupied = table.occupied || (table.status && table.status.toLowerCase() === "occupied");
                                    return (
                                        <Link
                                            key={table.id}
                                            to={`/waiter/tables/${table.id}`}
                                            className={`
                        aspect-square rounded-xl flex flex-col items-center justify-center p-4 
                        border shadow-sm transform transition-transform hover:scale-105 active:scale-95
                        ${isOccupied ? "bg-yellow-100 text-yellow-900 border-yellow-300" : "bg-white text-gray-900 border-gray-200"}
                      `}
                                        >
                                            <span className="text-2xl font-bold">
                                                {table.tableNumber}
                                            </span>
                                            <span className={`text-xs font-medium mt-1 px-2 py-0.5 rounded-full ${isOccupied ? 'bg-yellow-200' : 'bg-gray-100'}`}>
                                                {table.status}
                                            </span>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
