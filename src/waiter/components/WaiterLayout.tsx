import { Outlet, Navigate } from "react-router-dom";
import WaiterSidebar from "./WaiterSidebar";

export default function WaiterLayout() {
    const waiter = localStorage.getItem("waiter");

    if (!waiter) {
        return <Navigate to="/waiter" replace />;
    }

    return (
        <div className="flex min-h-screen bg-gray-100">
            <WaiterSidebar />
            <div className="flex-1 flex flex-col min-w-0">
                {/* Mobile top bar to spacing the floating Menu button */}
                <div className="lg:hidden h-14 bg-white border-b border-gray-200 flex items-center justify-end px-4 shadow-xs">
                    <span className="font-semibold text-gray-700 text-sm">Waiter Panel</span>
                </div>
                <main className="flex-1 overflow-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
