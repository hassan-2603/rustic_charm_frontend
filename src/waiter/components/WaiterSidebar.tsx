import { useState } from "react";
import { LayoutDashboard, Star, LogOut, Menu, X, ClipboardList } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";

const links = [
    { icon: LayoutDashboard, label: "Dashboard", to: "/waiter/dashboard" },
    { icon: ClipboardList, label: "Order by Captain", to: "/waiter/order-by-captain" },
    { icon: Star, label: "Rating", to: "/waiter/rating" },
];

export default function WaiterSidebar() {
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();
    const waiter = JSON.parse(sessionStorage.getItem("waiter") || "{}");

    const handleLogout = () => {
        sessionStorage.removeItem("waiter");
        navigate("/waiter");
    };

    const renderLinks = () => (
        <nav className="mt-4 flex flex-col justify-between flex-1">
            <div className="flex flex-col">
                {links.map((link) => {
                    const Icon = link.icon;
                    return (
                        <NavLink
                            key={link.label}
                            to={link.to}
                            onClick={() => setOpen(false)}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-6 py-4 transition ${isActive
                                    ? "bg-yellow-500 text-black font-semibold"
                                    : "hover:bg-gray-700"
                                }`
                            }
                        >
                            <Icon size={20} />
                            {link.label}
                        </NavLink>
                    );
                })}
            </div>
            <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-6 py-4 transition hover:bg-gray-700 text-red-400 mt-auto border-t border-gray-700"
            >
                <LogOut size={20} />
                Logout
            </button>
        </nav>
    );

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="lg:hidden fixed top-3 left-3 z-50 flex items-center gap-2 rounded-full bg-[#1f2937] px-3 py-2 text-white shadow-lg"
            >
                <Menu size={18} />
                <span className="text-sm font-semibold">Menu</span>
            </button>

            <aside className="hidden lg:flex w-64 shrink-0 bg-[#1f2937] text-white min-h-screen flex-col">
                <div className="w-full h-full flex flex-col flex-1">
                    <div className="p-6 text-2xl font-bold border-b border-gray-700">
                        Rustic Charm
                        <div className="text-sm font-normal text-gray-400">
                            Waiter Dashboard
                        </div>
                        {waiter.name && (
                            <div className="text-xs font-normal text-green-400 mt-1 uppercase tracking-wider">
                                ● {waiter.name}
                            </div>
                        )}
                    </div>
                    {renderLinks()}
                </div>
            </aside>

            {open && (
                <div className="lg:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setOpen(false)}>
                    <div
                        className="h-full w-72 max-w-[85vw] bg-[#1f2937] text-white shadow-2xl flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b border-gray-700 p-4">
                            <div>
                                <div className="text-lg font-bold">Rustic Charm</div>
                                <div className="text-sm text-gray-400">Waiter Dashboard</div>
                                {waiter.name && (
                                    <div className="text-xs text-green-400 mt-0.5 uppercase tracking-wider">
                                        ● {waiter.name}
                                    </div>
                                )}
                            </div>
                            <button onClick={() => setOpen(false)} className="rounded-full p-2 hover:bg-gray-700">
                                <X size={18} />
                            </button>
                        </div>
                        {renderLinks()}
                    </div>
                </div>
            )}
        </>
    );
}
