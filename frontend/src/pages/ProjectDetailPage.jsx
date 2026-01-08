import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, Plus, Upload, FileText, Image, File, Trash2, 
  Download, Edit2, Save, X, MessageSquare, Loader2, Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { 
  getProject, updateProject, getProjectFiles, uploadFile, deleteFile,
  getProjectConversations, createConversation, getFileDownloadUrl
} from "@/lib/api";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const FileIcon = ({ type }) => {
  const iconMap = {
    'PDF': <FileText className="h-5 w-5 text-red-500" />,
    'TXT': <FileText className="h-5 w-5 text-gray-500" />,
    'MD': <FileText className="h-5 w-5 text-blue-500" />,
    'DOCX': <FileText className="h-5 w-5 text-blue-600" />,
    'DOC': <FileText className="h-5 w-5 text-blue-600" />,
    'PNG': <Image className="h-5 w-5 text-green-500" />,
    'JPG': <Image className="h-5 w-5 text-green-500" />,
    'BMP': <Image className="h-5 w-5 text-green-500" />,
  };
  return iconMap[type] || <File className="h-5 w-5" />;
};

const formatFileSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function ProjectDetailPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  const [project, setProject] = useState(null);
  const [files, setFiles] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("files");
  
  // Edit states
  const [editingInstructions, setEditingInstructions] = useState(false);
  const [editingMemory, setEditingMemory] = useState(false);
  const [instructionsText, setInstructionsText] = useState("");
  const [memoryText, setMemoryText] = useState("");
  const [showFullMemory, setShowFullMemory] = useState(false);
  
  // New conversation dialog
  const [showNewConv, setShowNewConv] = useState(false);
  const [newConvName, setNewConvName] = useState("");
  
  // File viewer
  const [viewingFile, setViewingFile] = useState(null);
  const [fileContent, setFileContent] = useState(null);
  const [loadingFileContent, setLoadingFileContent] = useState(false);

  useEffect(() => {
    loadProjectData();
  }, [projectId]);

  const loadProjectData = async () => {
    try {
      const [proj, filesList, convs] = await Promise.all([
        getProject(projectId),
        getProjectFiles(projectId),
        getProjectConversations(projectId)
      ]);
      setProject(proj);
      setFiles(filesList);
      setConversations(convs);
      setInstructionsText(proj.instructions || "");
      setMemoryText(proj.memory || "");
    } catch (error) {
      toast.error("Failed to load project");
      navigate("/projects");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const uploadFiles = Array.from(e.target.files);
    if (uploadFiles.length === 0) return;
    
    setUploading(true);
    try {
      for (const file of uploadFiles) {
        await uploadFile(projectId, file);
      }
      await loadProjectData();
      toast.success(`${uploadFiles.length} file(s) uploaded`);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to upload file");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteFile = async (fileId) => {
    if (!window.confirm("Delete this file?")) return;
    try {
      await deleteFile(fileId);
      setFiles(files.filter(f => f.id !== fileId));
      toast.success("File deleted");
    } catch (error) {
      toast.error("Failed to delete file");
    }
  };

  const handleSaveInstructions = async () => {
    try {
      await updateProject(projectId, { instructions: instructionsText });
      setProject({ ...project, instructions: instructionsText });
      setEditingInstructions(false);
      toast.success("Instructions saved");
    } catch (error) {
      toast.error("Failed to save instructions");
    }
  };

  const handleSaveMemory = async () => {
    try {
      await updateProject(projectId, { memory: memoryText });
      setProject({ ...project, memory: memoryText });
      setEditingMemory(false);
      toast.success("Memory saved");
    } catch (error) {
      toast.error("Failed to save memory");
    }
  };

  const truncateMemory = (text, maxLines = 20) => {
    if (!text) return "";
    const lines = text.split('\n');
    if (lines.length <= maxLines) return text;
    return lines.slice(0, maxLines).join('\n');
  };

  const handleCreateConversation = async () => {
    try {
      const conv = await createConversation(projectId, newConvName || "New conversation");
      setShowNewConv(false);
      setNewConvName("");
      navigate(`/chat/${conv.id}`);
    } catch (error) {
      toast.error("Failed to create conversation");
    }
  };

  const handleViewFile = async (file) => {
    // Don't open viewer for images - show them directly
    const isImage = ['PNG', 'JPG', 'BMP'].includes(file.file_type);
    
    setViewingFile(file);
    setFileContent(null);
    
    if (isImage) {
      // For images, we'll display them using the download URL
      setFileContent({ type: 'image', url: getFileDownloadUrl(file.id) });
    } else if (file.content_preview) {
      // Use the indexed content preview
      setFileContent({ type: 'text', content: file.content_preview });
    } else {
      // Try to fetch the file content
      setLoadingFileContent(true);
      try {
        const response = await fetch(getFileDownloadUrl(file.id));
        const text = await response.text();
        setFileContent({ type: 'text', content: text });
      } catch (error) {
        setFileContent({ type: 'text', content: 'Unable to load file content' });
      } finally {
        setLoadingFileContent(false);
      }
    }
  };

  const closeFileViewer = () => {
    setViewingFile(null);
    setFileContent(null);
  };

  const calculateCapacity = () => {
    const totalSize = files.reduce((sum, f) => sum + f.file_size, 0);
    const maxSize = 100 * 1024 * 1024; // 100MB
    return Math.min((totalSize / maxSize) * 100, 100);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="flex-1 flex overflow-hidden" data-testid="project-detail-page">
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center gap-4 px-6 py-4 border-b border-border">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate("/projects")}
            data-testid="back-to-projects"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-serif text-xl font-semibold">{project.name}</h1>
            {project.description && (
              <p className="text-sm text-muted-foreground">{project.description}</p>
            )}
          </div>
          <Button 
            onClick={() => setShowNewConv(true)}
            className="gap-2"
            data-testid="start-chat-btn"
          >
            <MessageSquare className="h-4 w-4" />
            Start Chat
          </Button>
        </header>

        {/* Tabs Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-6 mt-4 w-fit">
            <TabsTrigger value="files" data-testid="files-tab">Files</TabsTrigger>
            <TabsTrigger value="conversations" data-testid="conversations-tab">Conversations</TabsTrigger>
          </TabsList>

          <TabsContent value="files" className="flex-1 overflow-auto px-6 py-4">
            {/* Upload Area */}
            <div 
              className="border-2 border-dashed border-border rounded-lg p-8 mb-6 text-center hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
              data-testid="file-upload-area"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                multiple
                accept=".pdf,.txt,.md,.docx,.doc,.png,.jpg,.jpeg,.bmp"
                className="hidden"
              />
              {uploading ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Uploading...</span>
                </div>
              ) : (
                <>
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PDF, TXT, MD, DOCX, PNG, JPG, BMP
                  </p>
                </>
              )}
            </div>

            {/* Capacity Bar */}
            <div className="mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">{files.length} files</span>
                <span className="text-muted-foreground">{calculateCapacity().toFixed(0)}% capacity used</span>
              </div>
              <Progress value={calculateCapacity()} className="h-1" />
            </div>

            {/* Files Grid */}
            {files.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No files uploaded yet
              </p>
            ) : (
              <div className="file-grid">
                {files.map(file => (
                  <div 
                    key={file.id} 
                    className="file-card group cursor-pointer" 
                    onClick={() => handleViewFile(file)}
                    data-testid={`file-${file.id}`}
                  >
                    <div className="flex items-start gap-3">
                      <FileIcon type={file.file_type} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.original_filename}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(file.file_size)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${file.indexed ? 'bg-green-500/20 text-green-500' : 'bg-yellow-500/20 text-yellow-500'}`}>
                        {file.indexed ? 'Indexed' : 'Pending'}
                      </span>
                      <div className="flex-1" />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => { e.stopPropagation(); }}
                        asChild
                      >
                        <a href={getFileDownloadUrl(file.id)} download data-testid={`download-file-${file.id}`}>
                          <Download className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={(e) => { e.stopPropagation(); handleDeleteFile(file.id); }}
                        data-testid={`delete-file-${file.id}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="conversations" className="flex-1 overflow-auto px-6 py-4">
            <Button 
              onClick={() => setShowNewConv(true)} 
              className="mb-4 gap-2"
              data-testid="new-conversation-btn"
            >
              <Plus className="h-4 w-4" />
              New Conversation
            </Button>
            
            {conversations.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No conversations yet
              </p>
            ) : (
              <div className="space-y-2">
                {conversations.map(conv => (
                  <div
                    key={conv.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary cursor-pointer transition-colors"
                    onClick={() => navigate(`/chat/${conv.id}`)}
                    data-testid={`conversation-${conv.id}`}
                  >
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{conv.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(conv.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Right Panel - Instructions & Memory */}
      <aside className="project-panel p-4" data-testid="project-panel">
        <ScrollArea className="h-full">
          {/* Memory Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium">Memory</h3>
              {editingMemory ? (
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingMemory(false)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleSaveMemory} data-testid="save-memory-btn">
                    <Save className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingMemory(true)} data-testid="edit-memory-btn">
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              Context that persists across all conversations
            </p>
            {editingMemory ? (
              <Textarea
                value={memoryText}
                onChange={(e) => setMemoryText(e.target.value)}
                rows={6}
                placeholder="Add project context, user preferences, or any information that should persist..."
                className="text-sm"
                data-testid="memory-textarea"
              />
            ) : (
              <div className="p-3 rounded-md bg-secondary/50 text-sm whitespace-pre-wrap min-h-[100px] max-h-64 overflow-auto">
                {project.memory ? (
                  <>
                    {showFullMemory ? project.memory : truncateMemory(project.memory, 20)}
                    {project.memory.split('\n').length > 20 && (
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 mt-2 text-xs"
                        onClick={() => setShowFullMemory(!showFullMemory)}
                        data-testid="toggle-memory-btn"
                      >
                        {showFullMemory ? 'Show less' : 'Show more...'}
                      </Button>
                    )}
                  </>
                ) : (
                  <span className="text-muted-foreground">No memory set</span>
                )}
              </div>
            )}
          </div>

          {/* Instructions Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium">Instructions</h3>
              {editingInstructions ? (
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingInstructions(false)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleSaveInstructions} data-testid="save-instructions-btn">
                    <Save className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingInstructions(true)} data-testid="edit-instructions-btn">
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              System prompt for AI in this project
            </p>
            {editingInstructions ? (
              <Textarea
                value={instructionsText}
                onChange={(e) => setInstructionsText(e.target.value)}
                rows={10}
                placeholder="Enter instructions for how the AI should behave in this project..."
                className="text-sm"
                data-testid="instructions-textarea"
              />
            ) : (
              <div className="p-3 rounded-md bg-secondary/50 text-sm min-h-[150px] whitespace-pre-wrap">
                {project.instructions || <span className="text-muted-foreground">No instructions set</span>}
              </div>
            )}
          </div>

          {/* Files Summary */}
          <div>
            <h3 className="text-sm font-medium mb-2">Files</h3>
            <p className="text-xs text-muted-foreground mb-2">
              {files.length} files in knowledge base
            </p>
            <div className="capacity-bar">
              <div 
                className="capacity-bar-fill" 
                style={{ width: `${calculateCapacity()}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {files.filter(f => f.indexed).length} indexed
            </p>
          </div>
        </ScrollArea>
      </aside>

      {/* New Conversation Dialog */}
      <Dialog open={showNewConv} onOpenChange={setShowNewConv}>
        <DialogContent data-testid="new-conversation-dialog" aria-describedby="new-conversation-description">
          <DialogHeader>
            <DialogTitle className="font-serif">New Conversation</DialogTitle>
            <p id="new-conversation-description" className="text-sm text-muted-foreground">Start a conversation with AI using your project's knowledge base</p>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="convName">Name (optional)</Label>
            <Input
              id="convName"
              value={newConvName}
              onChange={(e) => setNewConvName(e.target.value)}
              placeholder="Conversation name"
              className="mt-2"
              data-testid="new-conversation-name"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewConv(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateConversation} data-testid="create-conversation-submit">
              Start
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* File Viewer Dialog */}
      <Dialog open={!!viewingFile} onOpenChange={(open) => !open && closeFileViewer()}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col" data-testid="file-viewer-dialog" aria-describedby="file-viewer-description">
          <DialogHeader>
            <DialogTitle className="font-serif flex items-center gap-2">
              {viewingFile && <FileIcon type={viewingFile.file_type} />}
              {viewingFile?.original_filename}
            </DialogTitle>
            <p id="file-viewer-description" className="text-sm text-muted-foreground">
              {viewingFile && formatFileSize(viewingFile.file_size)} • {viewingFile?.file_type}
              {viewingFile?.indexed && ' • Indexed'}
            </p>
          </DialogHeader>
          <div className="flex-1 overflow-auto min-h-[400px] border rounded-lg bg-secondary/30 p-4">
            {loadingFileContent ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : fileContent?.type === 'image' ? (
              <div className="flex items-center justify-center h-full">
                <img 
                  src={fileContent.url} 
                  alt={viewingFile?.original_filename}
                  className="max-w-full max-h-full object-contain rounded"
                />
              </div>
            ) : fileContent?.type === 'text' ? (
              <div className="file-content-viewer">
                {viewingFile?.file_type === 'MD' ? (
                  <div className="prose-content prose-sm max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {fileContent.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed">
                    {fileContent.content}
                  </pre>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground text-center">No preview available</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" asChild>
              <a href={viewingFile ? getFileDownloadUrl(viewingFile.id) : '#'} download>
                <Download className="h-4 w-4 mr-2" />
                Download
              </a>
            </Button>
            <Button onClick={closeFileViewer}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export { ProjectDetailPage };
