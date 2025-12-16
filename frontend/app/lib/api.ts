import axios from "axios";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:9000/api/v1";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach auth token only on client
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Helper to safely get userId on client
const getUserId = () => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("user");
};

// ---------------- AUTH ----------------

export const login = async (email: string, password: string) => {
  const response = await api.post("/login", { email, password });
  return response.data;
};

export const register = async (
  username: string,
  email: string,
  password: string
) => {
  const response = await api.post("/register", { username, email, password });
  return response.data;
};

// ---------------- NOTIFICATIONS ----------------

export const createNotification = async (data: {

  type: "single" | "group";
  title: string;
  message: string;
  createdBy?: string;
  recipientUserId?: string;
  recipientGroupId?: string;
  scheduledFor?: string | null;
}) => {
  const response = await api.post("/create/notifications", data);
  return response.data;
};

export const getSentNotifications = async (page = 1, limit = 20) => {
  const userId = getUserId();
  const response = await api.get("/notifications/sent", {
    params: { page, limit, userId },
  });
  return response.data;
};

export const getReceivedNotifications = async (page = 1, limit = 20) => {
  const userId = getUserId();
  const response = await api.get("/notifications/received", {
    params: { page, limit, userId },
  });
  return response.data;
};

export const updateNotification = async (
  id: string,
  data: { title?: string; message?: string; scheduledFor?: string | null }
) => {
  const response = await api.patch(`/notifications/${id}`, data);
  return response.data;
};

export const cancelNotification = async (id: string) => {
  const response = await api.delete(`/notifications/${id}`);
  return response.data;
};

// ---------------- DASHBOARD ----------------

export const getDashboardOverview = async () => {
  const userId = getUserId();
  const response = await api.get("/get/notifystats", {
    params: { userId: userId?.toString() },
  });
  return response.data;
};
export const getQueueStatus = async () => {
  const userId = getUserId();
  const response = await api.get("/getqueue/stats", {
    params: { userId: userId?.toString() },
  });
  return response.data;
};
export const getQueueStats = async () => {
  const response = await api.get("/dashboard/queue/stats");
  return response.data;
};

export const getWebSocketStats = async () => {
  const response = await api.get("/dashboard/websocket/stats");
  return response.data;
};

export const getNotificationStats = async () => {
  const response = await api.get("/dashboard/notifications/stats");
  return response.data;
};

export const getRecentJobs = async (status: string, limit = 10) => {
  const response = await api.get("/dashboard/queue/jobs", {
    params: { status, limit },
  });
  return response.data;
};

export const fetchAllUsers = async () => {
  const res = await api.get("/all/users");
  return res.data;
};

export const createGroup = async (data: {
  name: string;
  description?: string;
  members: string[];
  createdBy: string | null;
}) => {
  const response = await api.post("/create/group", data);
  return response.data;
};

export const fetchGroupsByUser = async (userId: string) => {
  const response = await api.get(`/get/groups?userId=${userId}`);
  return response.data;
};


export default api;
