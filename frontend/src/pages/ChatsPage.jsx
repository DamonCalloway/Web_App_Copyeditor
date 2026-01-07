import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquare, Star, MoreVertical, Trash2, FolderKanban, Edit2, Archive, FolderX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getAllConversations, deleteConversation, toggleStarConversation, updateConversation, getProjects } from "@/lib/api";
import { toast } from "sonner";

export default function ChatsPage() {
  const navigate = useNavigate();
  const [chats, setChats] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingChat, setEditingChat] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", project_id: "" });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [chatsData, projectsData] = await Promise.all([
        getAllConversations(),
        getProjects()
      ]);
      setChats(chatsData);
      setProjects(projectsData);
    } catch (error) {
      toast.error("Failed to load chats");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStar = async (chatId, e) => {
    e.stopPropagation();
    try {
      await toggleStarConversation(chatId);
      loadData();
    } catch (error) {
      toast.error("Failed to update chat");
    }
  };

  const handleDelete = async (chatId, e) => {
    e.stopPropagation();
    if (!window.confirm("Delete this conversation?")) return;
    try {
      await deleteConversation(chatId);
      setChats(chats.filter(c => c.id !== chatId));
      toast.success("Conversation deleted");
    } catch (error) {
      toast.error("Failed to delete conversation");
    }
  };

  const handleEditClick = (chat, e) => {
    e.stopPropagation();
    setEditingChat(chat);
    setEditForm({ name: chat.name, project_id: chat.project_id || "" });
  };

  const handleSaveEdit = async () => {
    if (!editForm.name.trim()) {
      toast.error("Conversation name is required");
      return;
    }
    try {
      await updateConversation(editingChat.id, editForm);
      setEditingChat(null);
      loadData();
      toast.success("Conversation updated");
    } catch (error) {
      toast.error("Failed to update conversation");
    }
  };

  const handleRemoveFromProject = async (chatId, e) => {
    e.stopPropagation();
    if (!window.confirm("Remove this chat from its project?")) return;
    try {
      await updateConversation(chatId, { project_id: null });
      loadData();
      toast.success("Chat removed from project");
    } catch (error) {
      toast.error("Failed to update chat");
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  const starredChats = chats.filter(c => c.starred);
  const recentChats = chats.filter(c => !c.starred);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center" data-testid="chats-page-loading">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-8" data-testid="chats-page">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <MessageSquare className="h-8 w-8 text-muted-foreground" />
        <h1 className="font-serif text-3xl font-semibold">Chats</h1>
      </div>

      {chats.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">No conversations yet</p>
          <Button onClick={() => navigate("/projects")}>
            Go to Projects
          </Button>
        </div>
      ) : (
        <ScrollArea className="h-[calc(100vh-200px)]">
          {/* Starred */}
          {starredChats.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4 px-2">
                Starred
              </h2>
              <div className="space-y-2">
                {starredChats.map(chat => (
                  <div
                    key={chat.id}
                    className="group flex items-center gap-3 p-4 rounded-lg bg-card border border-border hover:bg-accent/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/chat/${chat.id}`)}
                    data-testid={`chat-card-${chat.id}`}
                  >
                    <Star className="h-4 w-4 text-primary fill-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{chat.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {chat.project_name} • Updated {formatDate(chat.updated_at)}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          data-testid={`chat-menu-${chat.id}`}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => handleToggleStar(chat.id, e)}>
                          <Star className="h-4 w-4 mr-2" />
                          Unstar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => handleEditClick(chat, e)}>
                          <Edit2 className="h-4 w-4 mr-2" />
                          Rename
                        </DropdownMenuItem>
                        {chat.project_id && (
                          <DropdownMenuItem onClick={(e) => handleRemoveFromProject(chat.id, e)}>
                            <FolderX className="h-4 w-4 mr-2" />
                            Remove from project
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={(e) => handleDelete(chat.id, e)}
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
          {recentChats.length > 0 && (
            <div>
              <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4 px-2">
                Recent
              </h2>
              <div className="space-y-2">
                {recentChats.map(chat => (
                  <div
                    key={chat.id}
                    className="group flex items-center gap-3 p-4 rounded-lg bg-card border border-border hover:bg-accent/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/chat/${chat.id}`)}
                    data-testid={`chat-card-${chat.id}`}
                  >
                    <MessageSquare className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{chat.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {chat.project_name} • Updated {formatDate(chat.updated_at)}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          data-testid={`chat-menu-${chat.id}`}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => handleToggleStar(chat.id, e)}>
                          <Star className="h-4 w-4 mr-2" />
                          Star
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => handleEditClick(chat, e)}>
                          <Edit2 className="h-4 w-4 mr-2" />
                          Rename
                        </DropdownMenuItem>
                        {chat.project_id && (
                          <DropdownMenuItem onClick={(e) => handleRemoveFromProject(chat.id, e)}>
                            <FolderX className="h-4 w-4 mr-2" />
                            Remove from project
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={(e) => handleDelete(chat.id, e)}
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
        </ScrollArea>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingChat} onOpenChange={() => setEditingChat(null)}>
        <DialogContent data-testid="edit-chat-dialog" aria-describedby="edit-chat-description">
          <DialogHeader>
            <DialogTitle className="font-serif">Edit Conversation</DialogTitle>
            <p id="edit-chat-description" className="text-sm text-muted-foreground">
              Update the conversation name or change its project association
            </p>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="chat-name">Name</Label>
              <Input
                id="chat-name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="Conversation name"
                data-testid="edit-chat-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="chat-project">Project</Label>
              <Select
                value={editForm.project_id || "none"}
                onValueChange={(value) => setEditForm({ ...editForm, project_id: value === "none" ? null : value })}
              >
                <SelectTrigger data-testid="edit-chat-project">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Project</SelectItem>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingChat(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} data-testid="save-chat-edit">
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export { ChatsPage };
