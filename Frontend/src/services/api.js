
import axios from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "http://127.0.0.1:8000",
    timeout: 60000,
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem("plant_doctor_token");

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
});

export async function signupUser({ name, email, password }) {
    const response = await api.post("/api/auth/signup", {
        name,
        email,
        password,
    });

    return response.data;
}

export async function loginUser({ email, password }) {
    const response = await api.post("/api/auth/login", {
        email,
        password,
    });

    const data = response.data;
    const token = data.access_token || data.token;

    if (!token) {
        throw new Error("The server did not return an authentication token.");
    }

    localStorage.setItem("plant_doctor_token", token);

    return data;
}

export async function getCurrentUser() {
    const response = await api.get("/api/auth/me");
    return response.data.user;
}

export async function logoutUser() {
    localStorage.removeItem("plant_doctor_token");
}

export default api;
