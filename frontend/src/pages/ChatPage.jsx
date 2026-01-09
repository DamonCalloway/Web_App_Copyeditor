import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, Send, Loader2, Star, MoreHorizontal, 
  Trash2, FolderKanban, FileText, ChevronDown, Copy, Check,
  Brain, Globe, ChevronRight, ChevronLeft, Paperclip, X, File, Image, Edit2, ArrowDown
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
  getProjects, updateConversation, updateProject
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
  const scrollContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  
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
  const [allProjects, setAllProjects] = useState([]);
  const [showProjectSelector, setShowProjectSelector] = useState(false);
  const [editingInstructions, setEditingInstructions] = useState(false);
  const [editingMemory, setEditingMemory] = useState(false);
  const [instructionsText, setInstructionsText] = useState("");
  const [memoryText, setMemoryText] = useState("");
  const [showFullMemory, setShowFullMemory] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [llmProvider, setLlmProvider] = useState("anthropic");
  const [availableProviders, setAvailableProviders] = useState(["anthropic"]);

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
    // Auto-scroll to bottom when messages load or update
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = (smooth = false) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
  };

  const handleScroll = (e) => {
    const element = e.target;
    const isAtBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 50;
    setShowScrollButton(!isAtBottom);
  };

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
      setAvailableProviders(featureConfig.available_providers || ["anthropic"]);
      setAllProjects(projList);
      
      // Load project and files
      if (conv.project_id) {
        const [proj, filesList] = await Promise.all([
          getProject(conv.project_id),
          getProjectFiles(conv.project_id)
        ]);
        setProject(proj);
        setFiles(filesList);
        setInstructionsText(proj.instructions || "");
        setMemoryText(proj.memory || "");
        setLlmProvider(proj.llm_provider || "anthropic");
        // Set defaults from project settings
        setExtendedThinking(proj.extended_thinking_enabled || false);
        setWebSearch(proj.web_search_enabled || false);
      } else {
        setProject(null);
        setFiles([]);
        setInstructionsText("");
        setMemoryText("");
        setLlmProvider("anthropic");
      }
    } catch (error) {
      toast.error("Failed to load conversation");
      navigate("/projects");
    } finally {
      setLoading(false);
    }
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

  const handleSaveInstructions = async () => {
    if (!project) return;
    try {
      await updateProject(project.id, { instructions: instructionsText });
      setEditingInstructions(false);
      setProject({ ...project, instructions: instructionsText });
      toast.success("Instructions updated");
    } catch (error) {
      toast.error("Failed to update instructions");
    }
  };

  const handleSaveMemory = async () => {
    if (!project) return;
    try {
      await updateProject(project.id, { memory: memoryText });
      setEditingMemory(false);
      setProject({ ...project, memory: memoryText });
      toast.success("Memory updated");
    } catch (error) {
      toast.error("Failed to update memory");
    }
  };

  const truncateMemory = (text, maxLines = 20) => {
    if (!text) return "";
    const lines = text.split('\n');
    if (lines.length <= maxLines) return text;
    return lines.slice(0, maxLines).join('\n');
  };

  const handleProviderChange = async (newProvider) => {
    if (!project) {
      toast.error("Please associate chat with a project first");
      return;
    }
    try {
      await updateProject(project.id, { llm_provider: newProvider });
      setLlmProvider(newProvider);
      
      // Auto-disable Web Search for all Bedrock providers (not supported)
      // Auto-disable Extended Thinking only for Mistral (Claude supports it)
      if (newProvider.startsWith("bedrock")) {
        setWebSearch(false);
        if (newProvider === "bedrock-mistral") {
          setExtendedThinking(false);
        }
      }
      
      const providerName = 
        newProvider === "bedrock-claude" ? "AWS Bedrock (Claude)" :
        newProvider === "bedrock-mistral" ? "AWS Bedrock (Mistral)" :
        "Anthropic Direct API";
      toast.success(`Switched to ${providerName}`);
      loadChatData();
    } catch (error) {
      toast.error("Failed to update provider");
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
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowProjectInfo(!showProjectInfo)}
                  className="gap-1"
                  data-testid="toggle-project-info"
                >
                  {showProjectInfo ? (
                    <ChevronRight className="h-3 w-3" />
                  ) : (
                    <ChevronLeft className="h-3 w-3" />
                  )}
                  <FolderKanban className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {showProjectInfo ? 'Close Project Info' : 'View Project Info'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
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
        <div className="flex-1 relative overflow-hidden">
          <ScrollArea className="h-full" onScrollCapture={handleScroll}>
            <div className="messages-area max-w-3xl mx-auto" ref={scrollContainerRef}>
              {messages.length === 0 ? (
                <div className="text-center py-12">
                  <h2 className="font-serif text-xl mb-2">Start a conversation</h2>
                  <p className="text-muted-foreground text-sm">
                    Ask questions about your assessment materials or get help editing content.
                  </p>
                </div>
              ) : (
                <>
                  {messages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`message group ${msg.role === 'user' ? 'message-user' : 'message-assistant'}`}
                  data-testid={`message-${msg.id}`}
                >
                  {/* Thinking block for assistant messages */}
                  {msg.role === 'assistant' && msg.thinking && (
                    <ThinkingBlock thinking={msg.thinking} thinkingTime={msg.thinking_time} />
                  )}
                  <div className="message-content text-foreground">
                    {msg.role === 'assistant' ? (
                      <div className="prose-content text-foreground">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <div className="prose-content text-foreground">
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
              ))}
              <div ref={messagesEndRef} />
            </>
            )}
          </div>
        </ScrollArea>
        
        {/* Scroll to Bottom Button */}
        {showScrollButton && (
          <Button
            variant="secondary"
            size="icon"
            className="absolute bottom-4 right-4 h-10 w-10 rounded-full shadow-lg hover:shadow-xl transition-all z-10"
            onClick={() => scrollToBottom(true)}
            data-testid="scroll-to-bottom-btn"
          >
            <ArrowDown className="h-5 w-5" />
          </Button>
        )}
      </div>

        {/* Input Area */}
        <div className="message-input-area">
          <div className="max-w-3xl mx-auto">
            {/* Project Indicator */}
            {project && (
              <div className="flex items-center justify-center mb-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => setShowProjectSelector(true)}
                        data-testid="project-indicator-btn"
                      >
                        <FolderKanban className="h-3.5 w-3.5 text-primary" />
                        <span>{project.name}</span>
                        <Edit2 className="h-3 w-3 opacity-50" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      Click to change project
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
            {!project && (
              <div className="flex items-center justify-center mb-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setShowProjectSelector(true)}
                  data-testid="add-project-btn"
                >
                  <FolderKanban className="h-3.5 w-3.5" />
                  <span>Add to project</span>
                </Button>
              </div>
            )}
            
            {/* LLM Provider Selector */}
            {availableProviders.length > 1 && project && (
              <div className="flex items-center justify-center gap-2 mb-3">
                <Label htmlFor="llm-provider" className="text-xs text-muted-foreground">LLM Provider:</Label>
                <Select value={llmProvider} onValueChange={handleProviderChange}>
                  <SelectTrigger className="w-[220px] h-8 text-xs" data-testid="llm-provider-selector">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="anthropic">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                        <span>Anthropic Direct API</span>
                      </div>
                    </SelectItem>
                    {availableProviders.includes("bedrock-claude") && (
                      <SelectItem value="bedrock-claude">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                          <span>AWS Bedrock (Claude)</span>
                        </div>
                      </SelectItem>
                    )}
                    {availableProviders.includes("bedrock-mistral") && (
                      <SelectItem value="bedrock-mistral">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                          <span>AWS Bedrock (Mistral)</span>
                        </div>
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <span className={`text-xs px-2 py-1 rounded ${
                  llmProvider === "bedrock-claude" ? "bg-orange-500/20 text-orange-500" :
                  llmProvider === "bedrock-mistral" ? "bg-purple-500/20 text-purple-500" :
                  "bg-blue-500/20 text-blue-500"
                }`}>
                  {llmProvider.startsWith("bedrock") ? "AWS" : "Direct"}
                </span>
              </div>
            )}
            
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
                          // Extended Thinking is available for Anthropic Direct and Bedrock Claude (not Mistral)
                          if (llmProvider === "bedrock-mistral") {
                            toast.info("Extended Thinking not available for Mistral");
                            return;
                          }
                          if (featuresAvailable || llmProvider === "bedrock-claude") {
                            setExtendedThinking(!extendedThinking);
                          } else {
                            toast.info("Extended Thinking requires Anthropic API key or Bedrock Claude");
                          }
                        }}
                        className={`gap-1.5 h-7 px-2 ${extendedThinking && (featuresAvailable || llmProvider === "bedrock-claude") ? 'bg-primary text-primary-foreground' : ''} ${llmProvider === "bedrock-mistral" || (!featuresAvailable && llmProvider !== "bedrock-claude") ? 'opacity-50' : ''}`}
                        disabled={llmProvider === "bedrock-mistral" || (!featuresAvailable && llmProvider !== "bedrock-claude")}
                        data-testid="extended-thinking-toggle"
                      >
                        <Brain className={`h-3.5 w-3.5 ${extendedThinking && (featuresAvailable || llmProvider === "bedrock-claude") ? 'animate-pulse' : ''} ${llmProvider === "bedrock-mistral" ? 'opacity-50' : ''}`} />
                        <span className="text-xs">Think</span>
                      </Button>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{llmProvider === "bedrock-mistral" 
                      ? "Extended Thinking not available for Mistral" 
                      : ((featuresAvailable || llmProvider === "bedrock-claude") ? 'Extended Thinking: Claude shows reasoning process' : 'Requires Anthropic API key or Bedrock Claude')}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              {/* Web Search Toggle - Only available for direct Anthropic API */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2">
                      <Button
                        variant={webSearch ? "default" : "ghost"}
                        size="sm"
                        onClick={() => {
                          if (llmProvider.startsWith("bedrock")) {
                            toast.info("Web Search only available with Anthropic Direct API");
                            return;
                          }
                          if (featuresAvailable) {
                            setWebSearch(!webSearch);
                          } else {
                            toast.info("Web Search requires direct Anthropic API key");
                          }
                        }}
                        className={`gap-1.5 h-7 px-2 ${webSearch && featuresAvailable ? 'bg-primary text-primary-foreground' : ''} ${llmProvider.startsWith("bedrock") || !featuresAvailable ? 'opacity-50' : ''}`}
                        disabled={llmProvider.startsWith("bedrock") || !featuresAvailable}
                        data-testid="web-search-toggle"
                      >
                        <Globe className={`h-3.5 w-3.5 ${llmProvider.startsWith("bedrock") ? 'opacity-50' : ''}`} />
                        <span className="text-xs">Web</span>
                      </Button>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{llmProvider.startsWith("bedrock") 
                      ? "Web Search only available with Anthropic Direct API" 
                      : (featuresAvailable ? 'Web Search: Claude can search for current information' : 'Requires direct Anthropic API key')}</p>
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
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm text-muted-foreground">Instructions</h4>
                {!editingInstructions && project?.instructions && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setEditingInstructions(true)}
                    data-testid="edit-instructions-btn"
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
              {editingInstructions ? (
                <div className="space-y-2">
                  <Textarea
                    value={instructionsText}
                    onChange={(e) => setInstructionsText(e.target.value)}
                    className="min-h-[120px] text-sm"
                    placeholder="Add project instructions..."
                    data-testid="instructions-textarea"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveInstructions} data-testid="save-instructions">
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setInstructionsText(project?.instructions || "");
                        setEditingInstructions(false);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-md bg-secondary/50 text-sm whitespace-pre-wrap max-h-48 overflow-auto">
                  {project?.instructions || <span className="text-muted-foreground italic">No instructions</span>}
                </div>
              )}
            </div>
            
            {/* Memory */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm text-muted-foreground">Memory</h4>
                {!editingMemory && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setEditingMemory(true)}
                    data-testid="edit-memory-btn"
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
              {editingMemory ? (
                <div className="space-y-2">
                  <Textarea
                    value={memoryText}
                    onChange={(e) => setMemoryText(e.target.value)}
                    className="min-h-[120px] text-sm"
                    placeholder="Add project memory/context..."
                    data-testid="memory-textarea"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveMemory} data-testid="save-memory">
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setMemoryText(project?.memory || "");
                        setEditingMemory(false);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="p-3 rounded-md bg-secondary/50 text-sm whitespace-pre-wrap max-h-48 overflow-auto">
                    {project?.memory ? (
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
                      <span className="text-muted-foreground italic">No memory</span>
                    )}
                  </div>
                </>
              )}
            </div>
            
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

      {/* Project Selector Dialog */}
      <Dialog open={showProjectSelector} onOpenChange={setShowProjectSelector}>
        <DialogContent data-testid="project-selector-dialog" aria-describedby="project-selector-description">
          <DialogHeader>
            <DialogTitle className="font-serif">Change Project</DialogTitle>
            <p id="project-selector-description" className="text-sm text-muted-foreground">
              Associate this conversation with a different project
            </p>
          </DialogHeader>
          <div className="py-4">
            <Select
              value={project?.id || "none"}
              onValueChange={handleChangeProject}
            >
              <SelectTrigger data-testid="project-selector">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Project</SelectItem>
                {allProjects.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProjectSelector(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export { ChatPage };
