
import { Navigate, Outlet } from "react-router-dom";

export default function ProtectedRoute() {
    const token = localStorage.getItem("plant_doctor_token");

    return token ? <Outlet /> : <Navigate to="/login" replace />;
}
