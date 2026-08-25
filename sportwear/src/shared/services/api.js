import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("sz_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("sz_token");
      localStorage.removeItem("sz_usuario");
      window.location.href = "/login";
    }
    if (error.message === "Network Error" || error.message.includes("ERR_CONNECTION_REFUSED")) {
      return Promise.reject({
        message: 'No se pudo conectar con el servidor.',
        code: 'ECONNREFUSED',
        response: { data: null, status: 503 }
      });
    }
    return Promise.reject(error);
  }
);

export default api;