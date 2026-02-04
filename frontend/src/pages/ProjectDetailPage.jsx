import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, Plus, Upload, FileText, Image, File, Trash2, 
  Download, Edit2, Save, X, MessageSquare, Loader2, Eye, Settings, History
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
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
  getProjectConversations, createConversation, getFileDownloadUrl,
  getFileVersions, restoreFileVersion
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
  
  // LLM Parameters dialog
  const [showLlmParams, setShowLlmParams] = useState(false);
  const [temperature, setTemperature] = useState(0.7);
  const [topP, setTopP] = useState(0.9);
  const [maxTokens, setMaxTokens] = useState(4096);
  const [frequencyPenalty, setFrequencyPenalty] = useState(0);
  const [presencePenalty, setPresencePenalty] = useState(0);
  const [stopSequences, setStopSequences] = useState("");
  const [thinkingBudget, setThinkingBudget] = useState(10000);
  
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
      // Load LLM parameters
      setTemperature(proj.temperature ?? 0.7);
      setTopP(proj.top_p ?? 0.9);
      setMaxTokens(proj.max_tokens ?? 4096);
      setFrequencyPenalty(proj.frequency_penalty ?? 0);
      setPresencePenalty(proj.presence_penalty ?? 0);
      setStopSequences(proj.stop_sequences || "");
      setThinkingBudget(proj.thinking_budget ?? 10000);
    } catch (error) {
      toast.error("Failed to load project");
      navigate("/projects");
    } finally {
      setLoading(false);
    }
  };

  const saveLlmParams = async () => {
    try {
      await updateProject(projectId, {
        temperature,
        top_p: topP,
        max_tokens: maxTokens,
        frequency_penalty: frequencyPenalty,
        presence_penalty: presencePenalty,
        stop_sequences: stopSequences,
        thinking_budget: thinkingBudget
      });
      toast.success("LLM parameters saved");
      setShowLlmParams(false);
    } catch (error) {
      toast.error("Failed to save parameters");
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
    } else {
      // Always fetch the full file content for text-based files
      setLoadingFileContent(true);
      try {
        const response = await fetch(getFileDownloadUrl(file.id));
        const blob = await response.blob();
        
        // Handle PDFs differently - display in iframe
        if (file.file_type === 'PDF') {
          const url = URL.createObjectURL(blob);
          setFileContent({ type: 'pdf', url: url });
        } else {
          // For text files (TXT, MD, DOCX preview as text)
          const text = await blob.text();
          setFileContent({ type: 'text', content: text });
        }
      } catch (error) {
        // Fallback to content_preview if fetch fails
        if (file.content_preview) {
          setFileContent({ type: 'text', content: file.content_preview });
        } else {
          setFileContent({ type: 'text', content: 'Unable to load file content' });
        }
      } finally {
        setLoadingFileContent(false);
      }
    }
  };

  const closeFileViewer = () => {
    // Clean up blob URL if it was a PDF
    if (fileContent?.type === 'pdf' && fileContent?.url) {
      URL.revokeObjectURL(fileContent.url);
    }
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
            variant="outline"
            onClick={() => setShowLlmParams(true)}
            className="gap-2 text-blue-500 border-blue-500/50 hover:bg-blue-500/10 hover:text-blue-500"
            data-testid="llm-params-btn"
          >
            <Settings className="h-4 w-4" />
            LLM Parameters
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
                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-accent" onClick={() => setEditingMemory(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-accent" onClick={handleSaveMemory} data-testid="save-memory-btn">
                    <Save className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button variant="outline" size="sm" className="h-7 px-2" onClick={() => setEditingMemory(true)} data-testid="edit-memory-btn">
                  <Edit2 className="h-3.5 w-3.5 mr-1" />
                  <span className="text-xs">Edit</span>
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
                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-accent" onClick={() => setEditingInstructions(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-accent" onClick={handleSaveInstructions} data-testid="save-instructions-btn">
                    <Save className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button variant="outline" size="sm" className="h-7 px-2" onClick={() => setEditingInstructions(true)} data-testid="edit-instructions-btn">
                  <Edit2 className="h-3.5 w-3.5 mr-1" />
                  <span className="text-xs">Edit</span>
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
          <div className="flex-1 overflow-auto min-h-[400px] max-h-[70vh] border rounded-lg bg-secondary/30 p-4">
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
            ) : fileContent?.type === 'pdf' ? (
              <iframe
                src={fileContent.url}
                title={viewingFile?.original_filename}
                className="w-full h-full min-h-[500px] rounded"
                style={{ border: 'none' }}
              />
            ) : fileContent?.type === 'text' ? (
              <div className="file-content-viewer h-full overflow-y-scroll" style={{ scrollbarWidth: 'thin', scrollbarGutter: 'stable' }}>
                {viewingFile?.file_type === 'MD' ? (
                  <div className="prose-content prose-sm max-w-none">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        a: ({node, ...props}) => (
                          <a {...props} target="_blank" rel="noopener noreferrer" />
                        )
                      }}
                    >
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
            )}}
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

      {/* LLM Parameters Dialog */}
      <Dialog open={showLlmParams} onOpenChange={setShowLlmParams}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>LLM Parameters</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Adjust the LLM parameters for this project
            </p>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Temperature */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label>Temperature</Label>
                <span className="text-sm text-muted-foreground w-12 text-right">{temperature.toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">0.0</span>
                <Slider
                  value={[temperature]}
                  onValueChange={([v]) => setTemperature(v)}
                  min={0}
                  max={1}
                  step={0.01}
                  className="flex-1"
                />
                <span className="text-xs text-muted-foreground">1.0</span>
              </div>
            </div>

            {/* Top P */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label>Top P</Label>
                <span className="text-sm text-muted-foreground w-12 text-right">{topP.toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">0.0</span>
                <Slider
                  value={[topP]}
                  onValueChange={([v]) => setTopP(v)}
                  min={0}
                  max={1}
                  step={0.01}
                  className="flex-1"
                />
                <span className="text-xs text-muted-foreground">1.0</span>
              </div>
            </div>

            {/* Max Tokens */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label>Max Tokens</Label>
                <span className="text-sm text-muted-foreground w-16 text-right">{maxTokens}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">256</span>
                <Slider
                  value={[maxTokens]}
                  onValueChange={([v]) => setMaxTokens(v)}
                  min={256}
                  max={8192}
                  step={256}
                  className="flex-1"
                />
                <span className="text-xs text-muted-foreground">8192</span>
              </div>
            </div>

            {/* Thinking Budget */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label>Thinking Budget</Label>
                <span className="text-sm text-muted-foreground w-20 text-right">{thinkingBudget.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">1K</span>
                <Slider
                  value={[thinkingBudget]}
                  onValueChange={([v]) => setThinkingBudget(v)}
                  min={1000}
                  max={100000}
                  step={1000}
                  className="flex-1"
                />
                <span className="text-xs text-muted-foreground">100K</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Max tokens for extended thinking (when enabled)
              </p>
            </div>

            {/* Frequency Penalty */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label>Frequency Penalty</Label>
                <span className="text-sm text-muted-foreground w-12 text-right">{frequencyPenalty.toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">0.0</span>
                <Slider
                  value={[frequencyPenalty]}
                  onValueChange={([v]) => setFrequencyPenalty(v)}
                  min={0}
                  max={2}
                  step={0.01}
                  className="flex-1"
                />
                <span className="text-xs text-muted-foreground">2.0</span>
              </div>
            </div>

            {/* Presence Penalty */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label>Presence Penalty</Label>
                <span className="text-sm text-muted-foreground w-12 text-right">{presencePenalty.toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">0.0</span>
                <Slider
                  value={[presencePenalty]}
                  onValueChange={([v]) => setPresencePenalty(v)}
                  min={0}
                  max={2}
                  step={0.01}
                  className="flex-1"
                />
                <span className="text-xs text-muted-foreground">2.0</span>
              </div>
            </div>

            {/* Stop Sequences */}
            <div className="space-y-2">
              <Label>Stop Sequences</Label>
              <Input
                placeholder="Enter comma-separated stop sequences"
                value={stopSequences}
                onChange={(e) => setStopSequences(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Comma-separated list (e.g., "Human:", "\n\n")
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLlmParams(false)}>
              Cancel
            </Button>
            <Button onClick={saveLlmParams}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export { ProjectDetailPage };
