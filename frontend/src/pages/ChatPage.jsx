import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, Send, Loader2, Star, MoreHorizontal, 
  Trash2, FolderKanban, FileText, ChevronDown, Copy, Check,
  Brain, Globe, ChevronRight, ChevronLeft, Paperclip, X, File, Image, Edit2, ArrowDown, Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark, oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useTheme } from "@/components/ThemeProvider";
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
const ThinkingBlock = ({ thinking, thinkingTime, currentTheme }) => {
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
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            components={{
              code({ node, inline, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '');
                return !inline && match ? (
                  <SyntaxHighlighter
                    style={currentTheme === 'dark' ? oneDark : oneLight}
                    language={match[1]}
                    PreTag="div"
                    customStyle={{
                      margin: '0.5rem 0',
                      borderRadius: '0.5rem',
                      fontSize: '0.8rem',
                    }}
                    {...props}
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                ) : (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              }
            }}
          >
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
  const { theme } = useTheme();
  
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
  const [bedrockWebSearchAvailable, setBedrockWebSearchAvailable] = useState(false);
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
  const [showSettings, setShowSettings] = useState(false);
  const [temperature, setTemperature] = useState(0.7);
  const [topP, setTopP] = useState(0.9);
  const [showThinkingWarning, setShowThinkingWarning] = useState(false);

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
      setBedrockWebSearchAvailable(featureConfig.bedrock_web_search_available || false);
      setAvailableProviders(featureConfig.available_providers || ["anthropic"]);
      setAllProjects(projList);
      
      // Load Think/Web settings from conversation (persisted per conversation)
      // These override project defaults
      if (conv.extended_thinking !== undefined) {
        setExtendedThinking(conv.extended_thinking);
      }
      if (conv.web_search !== undefined) {
        setWebSearch(conv.web_search);
      }
      
      // Load LLM provider from conversation (persisted per conversation)
      if (conv.llm_provider) {
        setLlmProvider(conv.llm_provider);
      }
      
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
        setTemperature(proj.temperature ?? 0.7);
        setTopP(proj.top_p ?? 0.9);
        
        // Use project's LLM provider only if conversation doesn't have one set yet
        if (!conv.llm_provider) {
          setLlmProvider(proj.llm_provider || "anthropic");
        }
        
        // Only use project defaults if conversation doesn't have settings yet
        if (conv.extended_thinking === undefined && conv.web_search === undefined) {
          setExtendedThinking(proj.extended_thinking_enabled || false);
          setWebSearch(proj.web_search_enabled || false);
        }
      } else {
        setProject(null);
        setFiles([]);
        setInstructionsText("");
        setMemoryText("");
        setLlmProvider("anthropic");
        setTemperature(0.7);
        setTopP(0.9);
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
    const imageExts = ['png', 'jpg', 'jpeg', 'bmp', 'gif', 'webp'];
    if (imageExts.includes(ext)) {
      return <Image className="h-4 w-4 text-blue-500" />;
    }
    return <File className="h-4 w-4 text-muted-foreground" />;
  };

  // Check if file is an image
  const isImageFile = (filename) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    return ['png', 'jpg', 'jpeg', 'bmp', 'gif', 'webp'].includes(ext);
  };

  // Create thumbnail URL for image files
  const getFileThumbnail = (file) => {
    if (isImageFile(file.name)) {
      return URL.createObjectURL(file);
    }
    return null;
  };

  // Get file extension for badge display
  const getFileExtension = (filename) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    return ext ? ext.toUpperCase() : 'FILE';
  };

  // Truncate filename for display
  const truncateFilename = (filename, maxLength = 20) => {
    const ext = filename.split('.').pop();
    const nameWithoutExt = filename.slice(0, filename.lastIndexOf('.'));
    if (nameWithoutExt.length <= maxLength) return filename;
    return `${nameWithoutExt.slice(0, maxLength)}...${ext ? '.' + ext : ''}`;
  };

  const handleSend = async () => {
    if ((!input.trim() && attachedFiles.length === 0) || sending) return;
    
    const userMessage = input.trim();
    const filesToSend = [...attachedFiles];
    setInput("");
    setAttachedFiles([]);
    setSending(true);
    
    // Reset textarea height after sending
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    
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

  // Save Think/Web settings to conversation (persisted)
  const saveConversationSettings = async (settings) => {
    try {
      await updateConversation(conversationId, settings);
    } catch (error) {
      console.error("Failed to save conversation settings:", error);
    }
  };

  const handleProviderChange = async (newProvider) => {
    try {
      // Save LLM provider to conversation (not project)
      await updateConversation(conversationId, { llm_provider: newProvider });
      setLlmProvider(newProvider);
      
      // Auto-disable features based on provider capabilities
      let newThinking = extendedThinking;
      let newWebSearch = webSearch;
      
      // Extended Thinking and Web Search are only available for:
      // - Anthropic Direct API (if has direct API key)
      // - Bedrock Claude (thinking yes, web search if Tavily configured)
      const supportsThinking = newProvider === "anthropic" || newProvider === "bedrock-claude";
      const supportsWebSearch = (newProvider === "anthropic" && featuresAvailable) || 
                                (newProvider === "bedrock-claude" && bedrockWebSearchAvailable);
      
      if (!supportsThinking) {
        newThinking = false;
        setExtendedThinking(false);
      }
      if (!supportsWebSearch) {
        newWebSearch = false;
        setWebSearch(false);
      }
      
      // Save the updated settings
      await saveConversationSettings({ extended_thinking: newThinking, web_search: newWebSearch });
      
      const providerNames = {
        "anthropic": "Anthropic Direct API",
        "bedrock-claude": "AWS Bedrock (Claude)",
        "bedrock-mistral": "AWS Bedrock (Mistral)",
        "bedrock-llama3": "AWS Bedrock (Llama 3)",
        "bedrock-qwen3": "AWS Bedrock (Qwen3 VL)",
        "bedrock-titan": "AWS Bedrock (Titan)",
        "openai-gpt5": "OpenAI GPT-5",
        "gemini": "Google Gemini"
      };
      toast.success(`Switched to ${providerNames[newProvider] || newProvider}`);
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
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowSettings(true)}
                  data-testid="chat-settings-btn"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Model Settings
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
                  {messages.map((msg) => {
                // Parse attachments from user messages
                let messageText = msg.content;
                let attachments = [];
                
                if (msg.role === 'user' && msg.content.includes('📎')) {
                  const parts = msg.content.split('\n\n📎 ');
                  messageText = parts[0];
                  if (parts[1]) {
                    attachments = parts[1].split(', ').map(name => name.trim());
                  }
                }
                
                return (
                <div 
                  key={msg.id} 
                  className={`message group ${msg.role === 'user' ? 'message-user' : 'message-assistant'}`}
                  data-testid={`message-${msg.id}`}
                >
                  {/* Thinking block for assistant messages */}
                  {msg.role === 'assistant' && msg.thinking && (
                    <ThinkingBlock thinking={msg.thinking} thinkingTime={msg.thinking_time} currentTheme={theme} />
                  )}
                  
                  {/* Attachment cards for user messages - Claude-style square cards */}
                  {msg.role === 'user' && attachments.length > 0 && (
                    <div className="flex flex-wrap gap-3 mb-3">
                      {attachments.map((filename, idx) => {
                        const ext = filename.split('.').pop()?.toLowerCase();
                        const isImage = ['png', 'jpg', 'jpeg', 'bmp', 'gif', 'webp'].includes(ext);
                        const fileExt = ext ? ext.toUpperCase() : 'FILE';
                        
                        return (
                          <div 
                            key={idx}
                            className="attachment-card-sent w-[140px] h-[160px] flex flex-col bg-white/15 rounded-lg overflow-hidden backdrop-blur-sm"
                            data-testid={`sent-attachment-${idx}`}
                          >
                            {/* Preview Area - Top section */}
                            <div className="flex-1 bg-white/10 flex items-center justify-center overflow-hidden p-2">
                              {isImage ? (
                                <Image className="h-10 w-10 text-primary-foreground/70" />
                              ) : (
                                <FileText className="h-10 w-10 text-primary-foreground/70" />
                              )}
                            </div>
                            
                            {/* File Info - Bottom section */}
                            <div className="p-2 border-t border-white/20">
                              {/* Filename */}
                              <p className="text-xs font-medium text-primary-foreground truncate mb-1.5" title={filename}>
                                {filename.length > 16 ? filename.slice(0, 16) + '...' : filename}
                              </p>
                              
                              {/* File Type Badge */}
                              <div className="inline-flex items-center px-2 py-0.5 bg-white/20 border border-white/30 rounded text-[10px] font-medium text-primary-foreground uppercase">
                                {fileExt}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  
                  <div className="message-content text-foreground">
                    {msg.role === 'assistant' ? (
                      <div className="prose-content text-foreground">
                        <ReactMarkdown 
                          remarkPlugins={[remarkGfm]}
                          components={{
                            code({ node, inline, className, children, ...props }) {
                              const match = /language-(\w+)/.exec(className || '');
                              return !inline && match ? (
                                <SyntaxHighlighter
                                  style={theme === 'dark' ? oneDark : oneLight}
                                  language={match[1]}
                                  PreTag="div"
                                  customStyle={{
                                    margin: '0.5rem 0',
                                    borderRadius: '0.5rem',
                                    fontSize: '0.875rem',
                                  }}
                                  {...props}
                                >
                                  {String(children).replace(/\n$/, '')}
                                </SyntaxHighlighter>
                              ) : (
                                <code className={className} {...props}>
                                  {children}
                                </code>
                              );
                            }
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <div className="prose-content text-foreground">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {messageText}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <CopyButton text={msg.content} />
                  </div>
                </div>
              );
              })}
              <div ref={messagesEndRef} />
            </>
            )}
          </div>
        </ScrollArea>
        
        {/* Scroll to Bottom Button - centered with white circle */}
        {showScrollButton && (
          <Button
            variant="outline"
            size="icon"
            className="absolute bottom-4 left-1/2 -translate-x-1/2 h-10 w-10 rounded-full shadow-lg hover:shadow-xl transition-all z-10 bg-white dark:bg-zinc-800 border-2 border-border"
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
                    {availableProviders.includes("bedrock-llama3") && (
                      <SelectItem value="bedrock-llama3">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                          <span>AWS Bedrock (Llama 3)</span>
                        </div>
                      </SelectItem>
                    )}
                    {availableProviders.includes("bedrock-qwen3") && (
                      <SelectItem value="bedrock-qwen3">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-cyan-500"></div>
                          <span>AWS Bedrock (Qwen3 VL)</span>
                        </div>
                      </SelectItem>
                    )}
                    {availableProviders.includes("bedrock-titan") && (
                      <SelectItem value="bedrock-titan">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                          <span>AWS Bedrock (Titan)</span>
                        </div>
                      </SelectItem>
                    )}
                    {availableProviders.includes("openai-gpt5") && (
                      <SelectItem value="openai-gpt5">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500"></div>
                          <span>OpenAI GPT-5</span>
                        </div>
                      </SelectItem>
                    )}
                    {availableProviders.includes("gemini") && (
                      <SelectItem value="gemini">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-red-500"></div>
                          <span>Google Gemini</span>
                        </div>
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <span className={`text-xs px-2 py-1 rounded ${
                  llmProvider === "bedrock-claude" ? "bg-orange-500/20 text-orange-500" :
                  llmProvider === "bedrock-mistral" ? "bg-purple-500/20 text-purple-500" :
                  llmProvider === "bedrock-llama3" ? "bg-indigo-500/20 text-indigo-500" :
                  llmProvider === "bedrock-qwen3" ? "bg-cyan-500/20 text-cyan-500" :
                  llmProvider === "bedrock-titan" ? "bg-amber-500/20 text-amber-500" :
                  llmProvider === "openai-gpt5" ? "bg-green-500/20 text-green-500" :
                  llmProvider === "gemini" ? "bg-red-500/20 text-red-500" :
                  "bg-blue-500/20 text-blue-500"
                }`}>
                  {llmProvider.startsWith("bedrock") ? "AWS" : 
                   llmProvider === "openai-gpt5" ? "OpenAI" :
                   llmProvider === "gemini" ? "Google" : "Direct"}
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
                        onClick={async () => {
                          // Extended Thinking is only available for Anthropic Direct and Bedrock Claude
                          const supportsThinking = llmProvider === "anthropic" || llmProvider === "bedrock-claude";
                          const thinkingEnabled = (featuresAvailable && llmProvider === "anthropic") || llmProvider === "bedrock-claude";
                          
                          if (!supportsThinking) {
                            toast.info("Extended Thinking only available for Claude models");
                            return;
                          }
                          if (thinkingEnabled) {
                            const newValue = !extendedThinking;
                            
                            // Show warning when enabling Think on Bedrock Claude
                            if (newValue && llmProvider === "bedrock-claude") {
                              setShowThinkingWarning(true);
                              return;
                            }
                            
                            let newWebSearch = webSearch;
                            setExtendedThinking(newValue);
                            
                            // On Bedrock Claude, Think and Web Search conflict - disable the other
                            if (newValue && llmProvider === "bedrock-claude" && webSearch) {
                              newWebSearch = false;
                              setWebSearch(false);
                            }
                            
                            // Save to conversation (persisted)
                            await saveConversationSettings({ extended_thinking: newValue, web_search: newWebSearch });
                          } else {
                            toast.info("Extended Thinking requires Anthropic API key or Bedrock Claude");
                          }
                        }}
                        className={`gap-1.5 h-7 px-2 ${extendedThinking && (featuresAvailable || llmProvider === "bedrock-claude") ? 'bg-primary text-primary-foreground' : ''} ${(llmProvider !== "anthropic" && llmProvider !== "bedrock-claude") || (!featuresAvailable && llmProvider === "anthropic") ? 'opacity-50' : ''}`}
                        disabled={(llmProvider !== "anthropic" && llmProvider !== "bedrock-claude") || (!featuresAvailable && llmProvider === "anthropic")}
                        data-testid="extended-thinking-toggle"
                      >
                        <Brain className={`h-3.5 w-3.5 ${extendedThinking && (featuresAvailable || llmProvider === "bedrock-claude") ? 'animate-pulse' : ''}`} />
                        <span className="text-xs">Think</span>
                      </Button>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{(llmProvider !== "anthropic" && llmProvider !== "bedrock-claude")
                      ? "Extended Thinking only available for Claude models" 
                      : ((featuresAvailable || llmProvider === "bedrock-claude") ? 'Extended Thinking: Claude shows reasoning process' : 'Requires Anthropic API key or Bedrock Claude')}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              {/* Web Search Toggle - Available for Anthropic Direct API or Bedrock Claude with Tavily */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2">
                      <Button
                        variant={webSearch ? "default" : "ghost"}
                        size="sm"
                        onClick={async () => {
                          // Web search available for:
                          // 1. Direct Anthropic API (featuresAvailable)
                          // 2. Bedrock Claude with Tavily configured (bedrockWebSearchAvailable)
                          const canUseWebSearch = (featuresAvailable && llmProvider === "anthropic") || 
                            (llmProvider === "bedrock-claude" && bedrockWebSearchAvailable);
                          
                          if (llmProvider !== "anthropic" && llmProvider !== "bedrock-claude") {
                            toast.info("Web Search only available for Claude models");
                            return;
                          }
                          if (canUseWebSearch) {
                            const newValue = !webSearch;
                            let newThinking = extendedThinking;
                            setWebSearch(newValue);
                            
                            // On Bedrock Claude, Think and Web Search conflict - disable the other
                            if (newValue && llmProvider === "bedrock-claude" && extendedThinking) {
                              newThinking = false;
                              setExtendedThinking(false);
                              toast.info("Extended Thinking disabled - cannot use both with Bedrock");
                            }
                            
                            // Save to conversation (persisted)
                            await saveConversationSettings({ extended_thinking: newThinking, web_search: newValue });
                          } else if (llmProvider === "bedrock-claude" && !bedrockWebSearchAvailable) {
                            toast.info("Web Search requires Tavily API key to be configured");
                          } else {
                            toast.info("Web Search requires Anthropic API key or Tavily API key");
                          }
                        }}
                        className={`gap-1.5 h-7 px-2 ${webSearch && (featuresAvailable || (llmProvider === "bedrock-claude" && bedrockWebSearchAvailable)) ? 'bg-primary text-primary-foreground' : ''} ${(llmProvider !== "anthropic" && llmProvider !== "bedrock-claude") || (!featuresAvailable && !(llmProvider === "bedrock-claude" && bedrockWebSearchAvailable)) ? 'opacity-50' : ''}`}
                        disabled={(llmProvider !== "anthropic" && llmProvider !== "bedrock-claude") || (!featuresAvailable && !(llmProvider === "bedrock-claude" && bedrockWebSearchAvailable))}
                        data-testid="web-search-toggle"
                      >
                        <Globe className="h-3.5 w-3.5" />
                        <span className="text-xs">Web</span>
                      </Button>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{llmProvider === "bedrock-mistral" 
                      ? "Web Search not available for Mistral" 
                      : (llmProvider === "bedrock-claude" 
                        ? (bedrockWebSearchAvailable ? 'Web Search: Claude can search via Tavily' : 'Requires Tavily API key')
                        : (featuresAvailable ? 'Web Search: Claude can search for current information' : 'Requires Anthropic or Tavily API key'))}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            {/* Attached Files Preview - Claude-style square cards */}
            {attachedFiles.length > 0 && (
              <div className="flex flex-wrap gap-3 mb-3 px-1">
                {attachedFiles.map((file, index) => {
                  const thumbnail = getFileThumbnail(file);
                  const isImage = isImageFile(file.name);
                  const fileExt = getFileExtension(file.name);
                  
                  return (
                    <div 
                      key={index}
                      className="relative group"
                      data-testid={`attachment-card-${index}`}
                    >
                      {/* Square Card Container */}
                      <div className="attachment-card w-[140px] h-[160px] flex flex-col bg-card border border-border rounded-lg overflow-hidden hover:border-primary/50 transition-colors">
                        {/* Preview Area - Top 60% */}
                        <div className="flex-1 bg-muted/30 flex items-center justify-center overflow-hidden p-2">
                          {thumbnail ? (
                            <img 
                              src={thumbnail} 
                              alt={file.name}
                              className="max-h-full max-w-full object-contain rounded"
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center">
                              <FileText className="h-10 w-10 text-muted-foreground/50" />
                            </div>
                          )}
                        </div>
                        
                        {/* File Info - Bottom section */}
                        <div className="p-2 border-t border-border/50">
                          {/* Filename */}
                          <p className="text-xs font-medium text-foreground truncate mb-1.5" title={file.name}>
                            {truncateFilename(file.name, 16)}
                          </p>
                          
                          {/* File Type Badge */}
                          <div className="inline-flex items-center px-2 py-0.5 border border-border rounded text-[10px] font-medium text-muted-foreground uppercase">
                            {fileExt}
                          </div>
                        </div>
                        
                        {/* Remove button - overlay on hover */}
                        <button
                          onClick={() => removeAttachedFile(index)}
                          className="absolute top-1 right-1 p-1 rounded-full bg-background/80 border border-border opacity-0 group-hover:opacity-100 hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-all"
                          data-testid={`remove-attachment-${index}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
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
              
              {/* Text input - auto-expanding */}
              <div className="relative flex-1">
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    // Auto-resize textarea
                    e.target.style.height = 'auto';
                    e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Message..."
                  className="chat-input pr-12 min-h-[44px] max-h-[200px] resize-none overflow-y-auto"
                  rows={1}
                  disabled={sending}
                  data-testid="chat-input"
                  style={{ height: 'auto' }}
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

      {/* Model Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-md" data-testid="settings-dialog" aria-describedby="settings-description">
          <DialogHeader>
            <DialogTitle className="font-serif">Settings</DialogTitle>
            <p id="settings-description" className="text-sm text-muted-foreground">
              Adjust the AI model parameters for this project
            </p>
          </DialogHeader>
          <div className="py-4 space-y-6">
            {/* Temperature */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Temperature</Label>
                <span className="text-sm text-muted-foreground">{temperature.toFixed(1)}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Adjust the creativity level of the AI's responses. Lower values make the text more predictable; higher values make it more creative but could impact accuracy.
              </p>
              <Slider
                value={[temperature]}
                onValueChange={(value) => setTemperature(value[0])}
                min={0.0}
                max={1.0}
                step={0.1}
                className="w-full"
                data-testid="temperature-slider"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0.0</span>
                <span>1.0</span>
              </div>
            </div>

            {/* Top P */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Top P</Label>
                <span className="text-sm text-muted-foreground">{topP.toFixed(1)}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Limit the diversity of the AI's output by considering only the most probable words. Lower values result in more predictable responses; higher values allow for a broader range of word choices and greater variation.
              </p>
              <Slider
                value={[topP]}
                onValueChange={(value) => setTopP(value[0])}
                min={0.0}
                max={1.0}
                step={0.1}
                className="w-full"
                data-testid="top-p-slider"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0.0</span>
                <span>1.0</span>
              </div>
            </div>

            {/* Note about Extended Thinking */}
            {extendedThinking && (
              <p className="text-xs text-amber-500 bg-amber-500/10 p-2 rounded">
                Note: Temperature and Top P settings are ignored when Extended Thinking is enabled.
              </p>
            )}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="link"
              className="text-sm"
              onClick={() => {
                setTemperature(0.7);
                setTopP(0.9);
              }}
              data-testid="reset-settings"
            >
              Reset to default settings
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowSettings(false)}>
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (!project) {
                    toast.error("Please associate chat with a project first");
                    return;
                  }
                  try {
                    await updateProject(project.id, { temperature, top_p: topP });
                    setProject({ ...project, temperature, top_p: topP });
                    setShowSettings(false);
                    toast.success("Settings saved");
                  } catch (error) {
                    toast.error("Failed to save settings");
                  }
                }}
                data-testid="save-settings"
              >
                Save Changes
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bedrock Extended Thinking Warning Dialog */}
      <AlertDialog open={showThinkingWarning} onOpenChange={setShowThinkingWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <span className="text-yellow-500">⚠️</span> Extended Thinking Limitation
            </AlertDialogTitle>
            <AlertDialogDescription className="text-left space-y-2">
              <p>
                Turning on Extended Thinking will <strong>block Claude's access to all files in the Project knowledge base</strong>.
              </p>
              <p className="text-muted-foreground text-sm">
                This is a limitation of the AWS Bedrock API — it cannot use tools (like knowledge base retrieval) and Extended Thinking simultaneously.
              </p>
              <p className="text-muted-foreground text-sm">
                Consider using <strong>Anthropic Direct API</strong> if you need both features together.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                setExtendedThinking(true);
                let newWebSearch = webSearch;
                if (webSearch) {
                  newWebSearch = false;
                  setWebSearch(false);
                }
                await saveConversationSettings({ extended_thinking: true, web_search: newWebSearch });
                setShowThinkingWarning(false);
              }}
            >
              Enable Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export { ChatPage };
