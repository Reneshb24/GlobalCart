import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import App from "./App";
import AdminPortal from "./admin/AdminPortal";
import VendorPortal from "./vendor/VendorPortal";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/admin/*" element={<AdminPortal />} />
        <Route path="/vendor/*" element={<VendorPortal />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
