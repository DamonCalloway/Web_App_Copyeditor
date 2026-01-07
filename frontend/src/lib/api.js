import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API,
  headers: {
    "Content-Type": "application/json",
  },
});

// Projects
export const getProjects = async (search = "", starredOnly = false) => {
  const params = new URLSearchParams();
  if (search) params.append("search", search);
  if (starredOnly) params.append("starred_only", "true");
  const response = await api.get(`/projects?${params.toString()}`);
  return response.data;
};

export const getProject = async (projectId) => {
  const response = await api.get(`/projects/${projectId}`);
  return response.data;
};

export const createProject = async (data) => {
  const response = await api.post("/projects", data);
  return response.data;
};

export const updateProject = async (projectId, data) => {
  const response = await api.put(`/projects/${projectId}`, data);
  return response.data;
};

export const deleteProject = async (projectId) => {
  const response = await api.delete(`/projects/${projectId}`);
  return response.data;
};

export const toggleStarProject = async (projectId) => {
  const response = await api.put(`/projects/${projectId}/star`);
  return response.data;
};

// Files
export const getProjectFiles = async (projectId) => {
  const response = await api.get(`/projects/${projectId}/files`);
  return response.data;
};

export const uploadFile = async (projectId, file) => {
  const formData = new FormData();
  formData.append("file", file);
  const response = await api.post(`/projects/${projectId}/files`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const deleteFile = async (fileId) => {
  const response = await api.delete(`/files/${fileId}`);
  return response.data;
};

export const getFileDownloadUrl = (fileId) => {
  return `${API}/files/${fileId}/download`;
};

// Conversations
export const getProjectConversations = async (projectId) => {
  const response = await api.get(`/projects/${projectId}/conversations`);
  return response.data;
};

export const getRecentConversations = async (limit = 10) => {
  const response = await api.get(`/conversations/recent?limit=${limit}`);
  return response.data;
};

export const createConversation = async (projectId, name = "New conversation") => {
  const response = await api.post("/conversations", { project_id: projectId, name });
  return response.data;
};

export const getConversation = async (conversationId) => {
  const response = await api.get(`/conversations/${conversationId}`);
  return response.data;
};

export const updateConversation = async (conversationId, data) => {
  const response = await api.put(`/conversations/${conversationId}`, data);
  return response.data;
};

export const getAllConversations = async (starred = null, archived = false) => {
  const params = new URLSearchParams();
  if (starred !== null) params.append("starred", starred);
  if (archived !== null) params.append("archived", archived);
  const response = await api.get(`/conversations?${params.toString()}`);
  return response.data;
};

export const deleteConversation = async (conversationId) => {
  const response = await api.delete(`/conversations/${conversationId}`);
  return response.data;
};

export const toggleStarConversation = async (conversationId) => {
  const response = await api.put(`/conversations/${conversationId}/star`);
  return response.data;
};

// Messages
export const getMessages = async (conversationId) => {
  const response = await api.get(`/conversations/${conversationId}/messages`);
  return response.data;
};

// Chat
export const sendMessage = async (conversationId, message, options = {}) => {
  const { 
    includeKnowledgeBase = true, 
    extendedThinking = false, 
    thinkingBudget = 10000, 
    webSearch = false,
    files = []
  } = options;
  
  // If there are files, use FormData
  if (files && files.length > 0) {
    const formData = new FormData();
    formData.append("conversation_id", conversationId);
    formData.append("message", message);
    formData.append("include_knowledge_base", includeKnowledgeBase);
    formData.append("extended_thinking", extendedThinking);
    formData.append("thinking_budget", thinkingBudget);
    formData.append("web_search", webSearch);
    
    files.forEach((file) => {
      formData.append("files", file);
    });
    
    const response = await api.post("/chat/with-files", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  }
  
  // Standard JSON request without files
  const response = await api.post("/chat", {
    conversation_id: conversationId,
    message,
    include_knowledge_base: includeKnowledgeBase,
    extended_thinking: extendedThinking,
    thinking_budget: thinkingBudget,
    web_search: webSearch,
  });
  return response.data;
};

// Storage
export const getStorageConfig = async () => {
  const response = await api.get("/storage/config");
  return response.data;
};

// Feature Config
export const getFeatureConfig = async () => {
  const response = await api.get("/config/features");
  return response.data;
};

export const updateStorageConfig = async (config) => {
  const response = await api.post("/storage/config", config);
  return response.data;
};

export default api;
