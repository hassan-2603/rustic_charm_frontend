import { Outlet } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";

interface AdminLayoutProps {
  onLogout?: () => void;
}

export default function AdminLayout({ onLogout }: AdminLayoutProps) {
  return (
    <div className="flex min-h-screen bg-gray-100 w-full max-w-full overflow-x-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 max-w-full overflow-x-hidden">
        <Topbar onLogout={onLogout} />

        <main className="flex-1 p-3 sm:p-6 lg:p-8 overflow-y-auto overflow-x-hidden max-w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
}