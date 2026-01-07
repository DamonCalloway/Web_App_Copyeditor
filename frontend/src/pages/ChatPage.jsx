import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, Send, Loader2, Star, MoreHorizontal, 
  Trash2, FolderKanban, FileText, ChevronDown, Copy, Check,
  Brain, Globe, ChevronRight, Paperclip, X, File, Image, Edit2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { 
  getConversation, getMessages, sendMessage, deleteConversation,
  toggleStarConversation, getProject, getProjectFiles, getFeatureConfig,
  getProjects, updateConversation
} from "@/lib/api";
import { toast } from "sonner";

// Copy button component for messages
const CopyButton = ({ text }) => {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy");
    }
  };
  
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
      onClick={handleCopy}
      data-testid="copy-message-btn"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-green-500" />
      ) : (
        <Copy className="h-3.5 w-3.5 text-muted-foreground" />
      )}
    </Button>
  );
};

// Thinking block component - collapsible like Claude.ai
const ThinkingBlock = ({ thinking, thinkingTime }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  if (!thinking) return null;
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mb-3">
      <CollapsibleTrigger asChild>
        <button 
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-1 px-2 rounded-md hover:bg-secondary/50"
          data-testid="thinking-toggle"
        >
          <ChevronRight className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
          <Brain className="h-4 w-4" />
          <span>Thought process</span>
          {thinkingTime && (
            <span className="text-xs opacity-70">{thinkingTime}s</span>
          )}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 p-3 rounded-lg bg-secondary/30 border border-border/50 text-sm text-muted-foreground thinking-content">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {thinking}
          </ReactMarkdown>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default function ChatPage() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  
  const [conversation, setConversation] = useState(null);
  const [project, setProject] = useState(null);
  const [files, setFiles] = useState([]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [includeKB, setIncludeKB] = useState(true);
  const [extendedThinking, setExtendedThinking] = useState(false);
  const [webSearch, setWebSearch] = useState(false);
  const [featuresAvailable, setFeaturesAvailable] = useState(false);
  const [showProjectInfo, setShowProjectInfo] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const fileInputRef = useRef(null);
  const [allProjects, setAllProjects] = useState([]);
  const [showProjectSelector, setShowProjectSelector] = useState(false);

  // Allowed file types for chat attachments
  const ALLOWED_EXTENSIONS = [
    'md', 'txt', 'pdf', 'docx', 'json', 'xls', 'xlsx', 'csv',
    'png', 'jpg', 'jpeg', 'bmp', 'gif',
    'zip', 'rtf',
    'mpeg', 'mp3', 'mp4', 'mov', 'wav'
  ];

  useEffect(() => {
    loadChatData();
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadChatData = async () => {
    try {
      const [conv, msgs, featureConfig, projList] = await Promise.all([
        getConversation(conversationId),
        getMessages(conversationId),
        getFeatureConfig(),
        getProjects()
      ]);
      setConversation(conv);
      setMessages(msgs);
      setFeaturesAvailable(featureConfig.extended_thinking_available);
      setAllProjects(projList);
      
      // Load project and files
      if (conv.project_id) {
        const [proj, filesList] = await Promise.all([
          getProject(conv.project_id),
          getProjectFiles(conv.project_id)
        ]);
        setProject(proj);
        setFiles(filesList);
        // Set defaults from project settings
        setExtendedThinking(proj.extended_thinking_enabled || false);
        setWebSearch(proj.web_search_enabled || false);
      } else {
        setProject(null);
        setFiles([]);
      }
    } catch (error) {
      toast.error("Failed to load conversation");
      navigate("/projects");
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    const validFiles = selectedFiles.filter(file => {
      const ext = file.name.split('.').pop()?.toLowerCase();
      return ALLOWED_EXTENSIONS.includes(ext);
    });
    
    if (validFiles.length !== selectedFiles.length) {
      toast.error("Some files were skipped (unsupported format)");
    }
    
    if (validFiles.length > 0) {
      setAttachedFiles(prev => [...prev, ...validFiles]);
    }
    
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAttachedFile = (index) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (filename) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    const imageExts = ['png', 'jpg', 'jpeg', 'bmp', 'gif'];
    if (imageExts.includes(ext)) {
      return <Image className="h-4 w-4" />;
    }
    return <File className="h-4 w-4" />;
  };

  const handleSend = async () => {
    if ((!input.trim() && attachedFiles.length === 0) || sending) return;
    
    const userMessage = input.trim();
    const filesToSend = [...attachedFiles];
    setInput("");
    setAttachedFiles([]);
    setSending(true);
    
    // Build message content display
    const fileNames = filesToSend.map(f => f.name).join(", ");
    const displayContent = fileNames 
      ? (userMessage ? `${userMessage}\n\n📎 ${fileNames}` : `📎 ${fileNames}`)
      : userMessage;
    
    // Add user message immediately
    const tempUserMsg = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: displayContent,
      attachments: filesToSend.map(f => ({ name: f.name, type: f.type })),
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMsg]);
    
    try {
      const response = await sendMessage(conversationId, userMessage || "Please analyze the attached file(s).", {
        includeKnowledgeBase: includeKB,
        extendedThinking: featuresAvailable && extendedThinking,
        thinkingBudget: project?.thinking_budget || 10000,
        webSearch: featuresAvailable && webSearch,
        files: filesToSend
      });
      
      // Add assistant message with thinking if present
      const assistantMsg = {
        id: response.message_id,
        role: "assistant",
        content: response.response,
        thinking: response.thinking || null,
        thinking_time: response.thinking_time || null,
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to send message");
      // Remove temp message on error
      setMessages(prev => prev.filter(m => m.id !== tempUserMsg.id));
      setInput(userMessage);
      setAttachedFiles(filesToSend);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleToggleStar = async () => {
    try {
      const result = await toggleStarConversation(conversationId);
      setConversation({ ...conversation, starred: result.starred });
    } catch (error) {
      toast.error("Failed to update conversation");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this conversation?")) return;
    try {
      await deleteConversation(conversationId);
      navigate(`/projects/${project?.id || ""}`);
      toast.success("Conversation deleted");
    } catch (error) {
      toast.error("Failed to delete conversation");
    }
  };

  const handleChangeProject = async (projectId) => {
    try {
      await updateConversation(conversationId, { project_id: projectId === "none" ? null : projectId });
      setShowProjectSelector(false);
      loadChatData();
      toast.success("Project updated");
    } catch (error) {
      toast.error("Failed to update project");
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex overflow-hidden" data-testid="chat-page">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col chat-container">
        {/* Header */}
        <header className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate(`/projects/${project?.id}`)}
            data-testid="back-to-project"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{project?.name}</span>
              <span className="text-muted-foreground">/</span>
              <span className="text-sm font-medium truncate">{conversation?.name}</span>
            </div>
          </div>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleToggleStar}
                  data-testid="star-conversation-btn"
                >
                  <Star className={`h-4 w-4 ${conversation?.starred ? 'text-primary fill-primary' : ''}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {conversation?.starred ? 'Unstar' : 'Star'} conversation
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowProjectInfo(!showProjectInfo)}
            className="gap-1"
            data-testid="toggle-project-info"
          >
            <FolderKanban className="h-4 w-4" />
            <ChevronDown className={`h-3 w-3 transition-transform ${showProjectInfo ? 'rotate-180' : ''}`} />
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" data-testid="conversation-menu">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem 
                className="text-destructive"
                onClick={handleDelete}
                data-testid="delete-conversation"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete conversation
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Messages */}
        <ScrollArea className="flex-1">
          <div className="messages-area max-w-3xl mx-auto">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <h2 className="font-serif text-xl mb-2">Start a conversation</h2>
                <p className="text-muted-foreground text-sm">
                  Ask questions about your assessment materials or get help editing content.
                </p>
              </div>
            ) : (
              messages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`message group ${msg.role === 'user' ? 'message-user' : 'message-assistant'}`}
                  data-testid={`message-${msg.id}`}
                >
                  {/* Thinking block for assistant messages */}
                  {msg.role === 'assistant' && msg.thinking && (
                    <ThinkingBlock thinking={msg.thinking} thinkingTime={msg.thinking_time} />
                  )}
                  <div className="message-content">
                    {msg.role === 'assistant' ? (
                      <div className="prose-content">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <div className="prose-content">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <CopyButton text={msg.content} />
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="message-input-area">
          <div className="max-w-3xl mx-auto">
            {/* Feature Toggles */}
            <div className="flex items-center gap-4 mb-3 text-sm flex-wrap">
              {/* KB Toggle */}
              <div className="flex items-center gap-2">
                <Switch
                  id="include-kb"
                  checked={includeKB}
                  onCheckedChange={setIncludeKB}
                  data-testid="include-kb-toggle"
                />
                <Label htmlFor="include-kb" className="text-muted-foreground cursor-pointer">
                  Knowledge base ({files.filter(f => f.indexed).length})
                </Label>
              </div>
              
              {/* Extended Thinking Toggle */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2">
                      <Button
                        variant={extendedThinking ? "default" : "ghost"}
                        size="sm"
                        onClick={() => {
                          if (featuresAvailable) {
                            setExtendedThinking(!extendedThinking);
                          } else {
                            toast.info("Extended Thinking requires direct Anthropic API key");
                          }
                        }}
                        className={`gap-1.5 h-7 px-2 ${extendedThinking && featuresAvailable ? 'bg-primary text-primary-foreground' : ''} ${!featuresAvailable ? 'opacity-50' : ''}`}
                        data-testid="extended-thinking-toggle"
                      >
                        <Brain className={`h-3.5 w-3.5 ${extendedThinking && featuresAvailable ? 'animate-pulse' : ''}`} />
                        <span className="text-xs">Think</span>
                      </Button>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{featuresAvailable ? 'Extended Thinking: Claude shows reasoning process' : 'Requires direct Anthropic API key'}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              {/* Web Search Toggle */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2">
                      <Button
                        variant={webSearch ? "default" : "ghost"}
                        size="sm"
                        onClick={() => {
                          if (featuresAvailable) {
                            setWebSearch(!webSearch);
                          } else {
                            toast.info("Web Search requires direct Anthropic API key");
                          }
                        }}
                        className={`gap-1.5 h-7 px-2 ${webSearch && featuresAvailable ? 'bg-primary text-primary-foreground' : ''} ${!featuresAvailable ? 'opacity-50' : ''}`}
                        data-testid="web-search-toggle"
                      >
                        <Globe className={`h-3.5 w-3.5`} />
                        <span className="text-xs">Web</span>
                      </Button>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{featuresAvailable ? 'Web Search: Claude can search for current information' : 'Requires direct Anthropic API key'}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            {/* Attached Files Preview */}
            {attachedFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {attachedFiles.map((file, index) => (
                  <div 
                    key={index}
                    className="flex items-center gap-1.5 px-2 py-1 bg-secondary rounded-md text-sm"
                  >
                    {getFileIcon(file.name)}
                    <span className="truncate max-w-[150px]">{file.name}</span>
                    <button
                      onClick={() => removeAttachedFile(index)}
                      className="hover:text-destructive transition-colors"
                      data-testid={`remove-attachment-${index}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {/* Input with Paperclip */}
            <div className="relative flex items-end gap-2">
              {/* Hidden file input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                multiple
                accept=".md,.txt,.pdf,.docx,.json,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.bmp,.gif,.zip,.rtf,.mpeg,.mp3,.mp4,.mov,.wav"
                className="hidden"
              />
              
              {/* Paperclip button */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 flex-shrink-0"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={sending}
                      data-testid="attach-file-btn"
                    >
                      <Paperclip className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Attach files</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              {/* Text input */}
              <div className="relative flex-1">
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Message..."
                  className="chat-input pr-12"
                  rows={1}
                  disabled={sending}
                  data-testid="chat-input"
                />
                <Button
                  size="icon"
                  className="absolute right-2 bottom-2 h-8 w-8 rounded-full"
                  onClick={handleSend}
                  disabled={(!input.trim() && attachedFiles.length === 0) || sending}
                  data-testid="send-message-btn"
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Claude Sonnet 4.5 {featuresAvailable ? '• Direct API' : '• Emergent'}
              {extendedThinking && featuresAvailable && ' • Extended Thinking'}
              {webSearch && featuresAvailable && ' • Web Search'}
            </p>
          </div>
        </div>
      </div>

      {/* Project Info Panel */}
      {showProjectInfo && (
        <aside className="w-80 border-l border-border p-4 bg-card animate-slideIn" data-testid="project-info-panel">
          <ScrollArea className="h-full">
            <h3 className="font-medium mb-4">Project Info</h3>
            
            {/* Instructions */}
            {project?.instructions && (
              <div className="mb-4">
                <h4 className="text-sm text-muted-foreground mb-2">Instructions</h4>
                <div className="p-3 rounded-md bg-secondary/50 text-sm whitespace-pre-wrap max-h-48 overflow-auto">
                  {project.instructions}
                </div>
              </div>
            )}
            
            {/* Memory */}
            {project?.memory && (
              <div className="mb-4">
                <h4 className="text-sm text-muted-foreground mb-2">Memory</h4>
                <div className="p-3 rounded-md bg-secondary/50 text-sm whitespace-pre-wrap max-h-32 overflow-auto">
                  {project.memory}
                </div>
              </div>
            )}
            
            {/* Files */}
            <div>
              <h4 className="text-sm text-muted-foreground mb-2">
                Knowledge Base ({files.length} files)
              </h4>
              <div className="space-y-1">
                {files.slice(0, 10).map(file => (
                  <div key={file.id} className="flex items-center gap-2 text-sm py-1">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="truncate">{file.original_filename}</span>
                    <span className={`text-xs px-1 rounded ${file.indexed ? 'bg-green-500/20 text-green-500' : 'bg-yellow-500/20 text-yellow-500'}`}>
                      {file.indexed ? '✓' : '...'}
                    </span>
                  </div>
                ))}
                {files.length > 10 && (
                  <p className="text-xs text-muted-foreground">
                    +{files.length - 10} more files
                  </p>
                )}
              </div>
            </div>
          </ScrollArea>
        </aside>
      )}
    </div>
  );
}

export { ChatPage };
