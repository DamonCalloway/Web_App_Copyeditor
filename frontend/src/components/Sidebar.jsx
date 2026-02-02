import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Plus, MessageSquare, FolderKanban, Settings, 
  ChevronLeft, ChevronRight, Star, Sun, Moon, MoreVertical,
  Edit2, Trash2, FolderX, LogOut, User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useTheme } from "@/components/ThemeProvider";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { getRecentConversations, getProjects, createProject, createConversation, toggleStarConversation, deleteConversation, updateConversation } from "@/lib/api";
import { toast } from "sonner";

export const Sidebar = ({ collapsed, onToggle, currentPath }) => {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth();
  const [recentConversations, setRecentConversations] = useState([]);
  const [starredConversations, setStarredConversations] = useState([]);
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [convos, projs] = await Promise.all([
        getRecentConversations(15),
        getProjects()
      ]);
      setRecentConversations(convos.filter(c => !c.starred));
      setStarredConversations(convos.filter(c => c.starred));
      setProjects(projs.slice(0, 5));
    } catch (error) {
      console.error("Failed to load sidebar data:", error);
    }
  };

  const handleNewChat = async () => {
    try {
      // Get first project or create one
      let projectId;
      if (projects.length > 0) {
        projectId = projects[0].id;
      } else {
        const newProject = await createProject({ 
          name: "My First Project",
          description: "Default project for conversations"
        });
        projectId = newProject.id;
      }
      
      const conv = await createConversation(projectId, "New conversation");
      navigate(`/chat/${conv.id}`);
      loadData();
    } catch (error) {
      toast.error("Failed to create new chat");
    }
  };

  const handleToggleStarConv = async (convId, e) => {
    e.stopPropagation();
    try {
      await toggleStarConversation(convId);
      loadData();
    } catch (error) {
      toast.error("Failed to update conversation");
    }
  };

  const handleDeleteConv = async (convId, e) => {
    e.stopPropagation();
    if (!window.confirm("Delete this conversation?")) return;
    try {
      await deleteConversation(convId);
      loadData();
      toast.success("Conversation deleted");
    } catch (error) {
      toast.error("Failed to delete conversation");
    }
  };

  const handleRenameConv = async (convId, currentName) => {
    const newName = window.prompt("Rename conversation:", currentName);
    if (!newName || newName === currentName) return;
    try {
      await updateConversation(convId, { name: newName });
      loadData();
      toast.success("Conversation renamed");
    } catch (error) {
      toast.error("Failed to rename conversation");
    }
  };

  if (collapsed) {
    return (
      <aside className="sidebar sidebar-collapsed" data-testid="sidebar-collapsed">
        <div className="flex flex-col items-center py-4 gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={onToggle}
            data-testid="sidebar-expand-btn"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={handleNewChat}
            className="text-primary"
            data-testid="new-chat-btn-collapsed"
          >
            <Plus className="h-5 w-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate("/projects")}
            data-testid="projects-btn-collapsed"
          >
            <FolderKanban className="h-5 w-5" />
          </Button>
        </div>
      </aside>
    );
  }

  return (
    <aside className="sidebar" data-testid="sidebar">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <h1 className="text-2xl font-normal tracking-tight" style={{ fontFamily: "'Libre Baskerville', serif" }}>Clod Sarnit</h1>
        <Button 
          variant="ghost" 
          size="icon"
          onClick={onToggle}
          data-testid="sidebar-collapse-btn"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      {/* New Chat Button */}
      <div className="px-3 mb-2">
        <Button 
          onClick={handleNewChat}
          className="w-full justify-start gap-2 bg-primary/10 text-primary hover:bg-primary/20"
          variant="ghost"
          data-testid="new-chat-btn"
        >
          <Plus className="h-4 w-4" />
          New chat
        </Button>
      </div>

      <ScrollArea className="flex-1 px-2">
        {/* Navigation */}
        <nav className="space-y-1 mb-4">
          <div 
            className={`nav-item ${currentPath === '/chats' ? 'active' : ''}`}
            onClick={() => navigate("/chats")}
            data-testid="nav-chats"
          >
            <MessageSquare className="h-4 w-4" />
            <span>Chats</span>
          </div>
          <div 
            className={`nav-item ${currentPath === '/projects' || currentPath === '/' ? 'active' : ''}`}
            onClick={() => navigate("/projects")}
            data-testid="nav-projects"
          >
            <FolderKanban className="h-4 w-4" />
            <span>Projects</span>
          </div>
        </nav>

        <Separator className="my-3" />

        {/* Starred */}
        {starredConversations.length > 0 && (
          <div className="mb-4">
            <h3 className="px-3 mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Starred
            </h3>
            <div className="space-y-0.5">
              {starredConversations.map(conv => (
                <div
                  key={conv.id}
                  className={`conversation-item group flex items-center gap-2 ${currentPath === `/chat/${conv.id}` ? 'active' : ''}`}
                  onClick={() => navigate(`/chat/${conv.id}`)}
                  data-testid={`starred-conv-${conv.id}`}
                >
                  <Star className="h-3 w-3 text-primary flex-shrink-0" fill="currentColor" />
                  <span className="truncate flex-1">{conv.name}</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        data-testid={`conv-menu-${conv.id}`}
                      >
                        <MoreVertical className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleRenameConv(conv.id, conv.name)}>
                        <Edit2 className="h-4 w-4 mr-2" />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => handleToggleStarConv(conv.id, e)}>
                        <Star className="h-4 w-4 mr-2" />
                        Unstar
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-destructive"
                        onClick={(e) => handleDeleteConv(conv.id, e)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent */}
        <div className="mb-4">
          <h3 className="px-3 mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Recents
          </h3>
          <div className="space-y-0.5">
            {recentConversations.length === 0 ? (
              <p className="px-3 text-sm text-muted-foreground">No recent chats</p>
            ) : (
              recentConversations.map(conv => (
                <div
                  key={conv.id}
                  className={`conversation-item group flex items-center gap-2 ${currentPath === `/chat/${conv.id}` ? 'active' : ''}`}
                  onClick={() => navigate(`/chat/${conv.id}`)}
                  data-testid={`recent-conv-${conv.id}`}
                >
                  <span className="truncate flex-1">{conv.name}</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        data-testid={`conv-menu-${conv.id}`}
                      >
                        <MoreVertical className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleRenameConv(conv.id, conv.name)}>
                        <Edit2 className="h-4 w-4 mr-2" />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => handleToggleStarConv(conv.id, e)}>
                        <Star className="h-4 w-4 mr-2" />
                        Star
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-destructive"
                        onClick={(e) => handleDeleteConv(conv.id, e)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))
            )}
          </div>
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-3 border-t border-border">
        <div className="flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            data-testid="theme-toggle-btn"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate("/settings")}
            data-testid="settings-btn"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
};
