import { useEffect, useState } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, useNavigate, useParams, useLocation } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { Sidebar } from "@/components/Sidebar";
import { ProjectsPage } from "@/pages/ProjectsPage";
import { ProjectDetailPage } from "@/pages/ProjectDetailPage";
import { ChatPage } from "@/pages/ChatPage";
import { ChatsPage } from "@/pages/ChatsPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { LoginPage } from "@/pages/LoginPage";
import { AuthCallback } from "@/pages/AuthCallback";
import { AuthProvider, ProtectedRoute } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/components/ThemeProvider";

function AppRouter() {
  const location = useLocation();
  
  // Check URL fragment (not query params) for session_id - must be synchronous
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }
  
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/*" element={<ProtectedContent />} />
    </Routes>
  );
}

function ProtectedContent() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();

  return (
    <ProtectedRoute>
      <div className="app-container" data-testid="app-container">
        <Sidebar 
          collapsed={sidebarCollapsed} 
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          currentPath={location.pathname}
        />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<ProjectsPage />} />
            <Route path="/chats" element={<ChatsPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
            <Route path="/chat/:conversationId" element={<ChatPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
        <Toaster position="bottom-right" />
      </div>
    </ProtectedRoute>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="assessment-editor-theme">
      <BrowserRouter>
        <AuthProvider>
          <AppRouter />
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
