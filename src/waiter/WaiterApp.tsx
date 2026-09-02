import { Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Rating from "./pages/Rating";
import OrderByCaptain from "./pages/OrderByCaptain";
import Tables from "./pages/Tables";
import TableOrders from "./pages/TableOrders";
import WaiterLayout from "./components/WaiterLayout";

export default function WaiterApp() {
  return (
    <Routes>
      <Route
        path="/"
        element={<Login />}
      />
      <Route element={<WaiterLayout />}>
        <Route
          path="dashboard"
          element={<Dashboard />}
        />
        <Route
          path="rating"
          element={<Rating />}
        />
        <Route
          path="order-by-captain"
          element={<OrderByCaptain />}
        />
        <Route
          path="tables"
          element={<Tables />}
        />
        <Route
          path="tables/:tableId"
          element={<TableOrders />}
        />
      </Route>
    </Routes>
  );
}