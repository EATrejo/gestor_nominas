import axios from "axios";

// Crear una instancia de axios
const api = axios.create({
  baseURL: "http://localhost:8000/api/",
});

// Interceptor para adjuntar el token en cada request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token"); // <- usamos la misma clave que en AuthContext
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
