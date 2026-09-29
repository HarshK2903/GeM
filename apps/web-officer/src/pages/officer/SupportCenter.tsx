import React, { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { 
  Send, Search, MessageSquare, FileText, CheckCircle, XCircle, 
  Clock, User, Building, Shield, AlertTriangle, ChevronDown, 
  Paperclip, MoreVertical, ArrowUp, RefreshCw, File, Mail, Phone,
  Check, Info, HelpCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import api from '@/lib/api';

// ==========================================
// Types & Interfaces
// ==========================================

interface Tender {
  id: string;
  title: string;
  reference_number: string;
  status: string;
}

interface Conversation {
  user_id: string;
  bidder_name: string;
  organization: string;
  latest_message: string;
  timestamp: string;
  unread_count: number;
  bid_status: 'submitted' | 'under_review' | 'approved' | 'rejected' | 'draft' | 'clarification';
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  message_type: 'text' | 'document_request' | 'status_update' | 'system';
  created_at: string;
  is_read: boolean;
  metadata?: any;
}

interface DocumentStatus {
  name: string;
  status: 'verified' | 'pending' | 'rejected' | 'not_submitted';
}

interface BidderContext {
  profile: {
    name: string;
    email: string;
    phone: string;
    organization: string;
    registration_date: string;
    is_verified: boolean;
  };
  bid_summary: {
    bid_id: string;
    submission_date: string;
    bid_amount: number;
    status: string;
    compliance_score?: number;
  };
  documents: DocumentStatus[];
}

// ==========================================
// Main Component
// ==========================================

export default function SupportCenter() {
  // State: Selection
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [selectedTenderId, setSelectedTenderId] = useState<string>('');
  
  // State: Conversations list
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  
  // State: Chat
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  
  // State: Context Sidebar
  const [bidderContext, setBidderContext] = useState<BidderContext | null>(null);
  
  // State: Loaders
  const [isLoadingTenders, setIsLoadingTenders] = useState(true);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isLoadingContext, setIsLoadingContext] = useState(false);
  
  // State: Modals
  const [isDocRequestOpen, setIsDocRequestOpen] = useState(false);
  const [isStatusUpdateOpen, setIsStatusUpdateOpen] = useState(false);
  const [isTemplateOpen, setIsTemplateOpen] = useState(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Constants
  const ME_ID = 'officer_me'; // Mock officer ID for styling

  // ==========================================
  // Effects
  // ==========================================

  // Fetch Tenders on mount
  useEffect(() => {
    fetchTenders();
  }, []);

  // Fetch Conversations when Tender changes
  useEffect(() => {
    if (selectedTenderId) {
      fetchConversations(selectedTenderId);
    } else {
      setConversations([]);
      setFilteredConversations([]);
      setSelectedConversation(null);
    }
  }, [selectedTenderId]);

  // Filter conversations based on search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredConversations(conversations);
    } else {
      const lowerQ = searchQuery.toLowerCase();
      setFilteredConversations(
        conversations.filter(c => 
          c.bidder_name.toLowerCase().includes(lowerQ) || 
          c.organization.toLowerCase().includes(lowerQ)
        )
      );
    }
  }, [searchQuery, conversations]);

  // Fetch Messages & Context when Conversation changes
  useEffect(() => {
    if (selectedConversation && selectedTenderId) {
      fetchMessages(selectedTenderId, selectedConversation.user_id);
      fetchBidderContext(selectedTenderId, selectedConversation.user_id);
    } else {
      setMessages([]);
      setBidderContext(null);
    }
    // Polling disabled — re-enable when real API is live:
    // if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    // pollingIntervalRef.current = setInterval(() => {
    //   fetchMessagesSilent(selectedTenderId, selectedConversation.user_id);
    // }, 10000);
    // return () => { if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current); };
  }, [selectedConversation, selectedTenderId]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // ==========================================
  // Fetch Functions
  // ==========================================

  const fetchTenders = async () => {
    setIsLoadingTenders(true);
    try {
      const res = await api.get('/tenders');
      const data = res.data.items || res.data;
      setTenders(data);
      if (data && data.length > 0) {
        setSelectedTenderId(data[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch tenders:', error);
      // Fallback data
      const fallback: Tender[] = [
        { id: 't1', title: 'Construction of New Block at City Hospital', reference_number: 'PWD/2026/01', status: 'published' },
        { id: 't2', title: 'Supply of Medical Equipment Phase II', reference_number: 'MOH/2026/44', status: 'evaluation' },
        { id: 't3', title: 'IT Infrastructure Upgrade for Secretariat', reference_number: 'IT/2026/09', status: 'published' },
      ];
      setTenders(fallback);
      setSelectedTenderId(fallback[0].id);
    } finally {
      setIsLoadingTenders(false);
    }
  };

  const fetchConversations = async (tenderId: string) => {
    setIsLoadingConversations(true);
    try {
      const res = await api.get(`/support/conversations?tender_id=${tenderId}`);
      setConversations(res.data);
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
      // Fallback data
      const fallback: Conversation[] = [
        {
          user_id: 'u1',
          bidder_name: 'Rahul Sharma',
          organization: 'Apex Constructions Ltd.',
          latest_message: 'We have submitted the revised BOQ.',
          timestamp: '2m ago',
          unread_count: 2,
          bid_status: 'under_review'
        },
        {
          user_id: 'u2',
          bidder_name: 'Priya Patel',
          organization: 'MediEquip Solutions',
          latest_message: 'Is the EMD exemption applicable for MSMEs?',
          timestamp: '1h ago',
          unread_count: 0,
          bid_status: 'draft'
        },
        {
          user_id: 'u3',
          bidder_name: 'Amit Kumar',
          organization: 'TechFlow Systems',
          latest_message: 'Please find attached the OEM authorization.',
          timestamp: '1d ago',
          unread_count: 0,
          bid_status: 'submitted'
        }
      ];
      setConversations(fallback);
    } finally {
      setIsLoadingConversations(false);
    }
  };

  const fetchMessages = async (tenderId: string, userId: string) => {
    setIsLoadingMessages(true);
    try {
      const res = await api.get(`/support/messages?tender_id=${tenderId}&with_user=${userId}`);
      setMessages(res.data);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      // Fallback data
      const fallback: Message[] = [
        {
          id: 'm1',
          sender_id: userId,
          receiver_id: ME_ID,
          message: 'Hello, regarding the tender requirement for turnover, does it apply to individual consortium members?',
          message_type: 'text',
          created_at: new Date(Date.now() - 10000000).toISOString(),
          is_read: true
        },
        {
          id: 'm2',
          sender_id: ME_ID,
          receiver_id: userId,
          message: 'As per clause 4.2 of the tender document, the lead member must meet 50% of the turnover requirement, and other members must meet 25% each.',
          message_type: 'text',
          created_at: new Date(Date.now() - 8000000).toISOString(),
          is_read: true
        },
        {
          id: 'm3',
          sender_id: 'system',
          receiver_id: userId,
          message: 'Bidder submitted the technical proposal',
          message_type: 'system',
          created_at: new Date(Date.now() - 5000000).toISOString(),
          is_read: true
        },
        {
          id: 'm4',
          sender_id: userId,
          receiver_id: ME_ID,
          message: 'We have submitted the revised BOQ as requested.',
          message_type: 'text',
          created_at: new Date(Date.now() - 120000).toISOString(),
          is_read: true
        }
      ];
      setMessages(fallback);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const fetchMessagesSilent = async (tenderId: string, userId: string) => {
    try {
      const res = await api.get(`/support/messages?tender_id=${tenderId}&with_user=${userId}`);
      if (res.data && res.data.length > messages.length) {
        setMessages(res.data);
      }
    } catch (error) {
      // Silently fail during polling
    }
  };

  const fetchBidderContext = async (tenderId: string, userId: string) => {
    setIsLoadingContext(true);
    try {
      const res = await api.get(`/support/context?tender_id=${tenderId}&user_id=${userId}`);
      setBidderContext(res.data);
    } catch (error) {
      console.error('Failed to fetch bidder context:', error);
      // Fallback data
      setBidderContext({
        profile: {
          name: selectedConversation?.bidder_name || 'Rahul Sharma',
          email: 'rahul.sharma@apexconstructions.in',
          phone: '+91 98765 43210',
          organization: selectedConversation?.organization || 'Apex Constructions Ltd.',
          registration_date: '2023-05-12',
          is_verified: true
        },
        bid_summary: {
          bid_id: `BID-${tenderId.substring(0, 4).toUpperCase()}-9872`,
          submission_date: '2026-09-28T14:30:00Z',
          bid_amount: 45000000,
          status: selectedConversation?.bid_status || 'under_review',
          compliance_score: 85
        },
        documents: [
          { name: 'Udyam Certificate', status: 'verified' },
          { name: 'GST Certificate', status: 'verified' },
          { name: 'PAN Card', status: 'verified' },
          { name: 'ITR (Last 3 Years)', status: 'pending' },
          { name: 'Company Registration', status: 'verified' },
          { name: 'Balance Sheet', status: 'pending' },
          { name: 'ISO Certificate', status: 'not_submitted' },
          { name: 'EPFO Certificate', status: 'rejected' },
          { name: 'ESIC Certificate', status: 'not_submitted' },
          { name: 'EMD Receipt', status: 'verified' }
        ]
      });
    } finally {
      setIsLoadingContext(false);
    }
  };

  // ==========================================
  // Actions
  // ==========================================

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedConversation || !selectedTenderId) return;

    const newMessageText = messageInput.trim();
    setMessageInput('');
    setIsSending(true);

    // Optimistic UI update
    const optimisticMsg: Message = {
      id: `opt-${Date.now()}`,
      sender_id: ME_ID,
      receiver_id: selectedConversation.user_id,
      message: newMessageText,
      message_type: 'text',
      created_at: new Date().toISOString(),
      is_read: false
    };
    
    setMessages(prev => [...prev, optimisticMsg]);

    try {
      await api.post('/support/messages', {
        tender_id: selectedTenderId,
        receiver_id: selectedConversation.user_id,
        message: newMessageText,
        message_type: 'text'
      });
      // Poll to get actual message with ID
      fetchMessagesSilent(selectedTenderId, selectedConversation.user_id);
    } catch (error) {
      console.error('Failed to send message:', error);
      // In a real app we'd show an error state on the message
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // ==========================================
  // Render Helpers
  // ==========================================

  const renderStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'submitted':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">Submitted</Badge>;
      case 'under_review':
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">Under Review</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">Rejected</Badge>;
      case 'draft':
        return <Badge variant="outline" className="bg-gray-500/10 text-gray-600 border-gray-500/20">Draft</Badge>;
      case 'clarification':
        return <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/20">Clarification</Badge>;
      default:
        return <Badge variant="outline">{status.replace('_', ' ')}</Badge>;
    }
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getDocStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return <CheckCircle size={14} className="text-emerald-500" />;
      case 'pending':
        return <Clock size={14} className="text-amber-500" />;
      case 'rejected':
        return <XCircle size={14} className="text-red-500" />;
      case 'not_submitted':
        return <File size={14} className="text-gray-400" />;
      default:
        return <File size={14} className="text-gray-400" />;
    }
  };

  const getDocStatusLabel = (status: string) => {
    switch (status) {
      case 'verified': return 'Verified';
      case 'pending': return 'Pending Review';
      case 'rejected': return 'Rejected';
      case 'not_submitted': return 'Not Submitted';
      default: return 'Unknown';
    }
  };

  // ==========================================
  // Layout Rendering
  // ==========================================

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      
      {/* ------------------------------------------- */}
      {/* LEFT PANEL: Tender & Conversations */}
      {/* ------------------------------------------- */}
      <div className="w-[260px] flex-shrink-0 border-r border-border/60 flex flex-col bg-card/50">
        
        {/* Tender Selector */}
        <div className="p-4 border-b border-border/60">
          <Label className="text-xs text-muted-foreground mb-2 block font-medium uppercase tracking-wider">
            Select Tender
          </Label>
          {isLoadingTenders ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <div className="relative">
              <select 
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none cursor-pointer"
                value={selectedTenderId}
                onChange={(e) => setSelectedTenderId(e.target.value)}
              >
                {tenders.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.reference_number} - {t.title.length > 20 ? t.title.substring(0, 20) + '...' : t.title}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-3 h-4 w-4 opacity-50 pointer-events-none" />
            </div>
          )}
        </div>

        {/* Search */}
        <div className="p-3 border-b border-border/60">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              type="text" 
              placeholder="Search bidders..." 
              className="pl-9 h-9 bg-background/50"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {isLoadingConversations ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex gap-3 items-center">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 text-muted-foreground">
              <MessageSquare className="h-10 w-10 mb-3 opacity-20" />
              <p className="text-sm font-medium">No conversations yet</p>
              <p className="text-xs mt-1">Bidders have not initiated queries for this tender.</p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {filteredConversations.map(conv => (
                <button
                  key={conv.user_id}
                  onClick={() => setSelectedConversation(conv)}
                  className={`w-full text-left p-3 rounded-lg transition-colors flex flex-col gap-2 relative ${
                    selectedConversation?.user_id === conv.user_id 
                      ? 'bg-primary/10 border border-primary/30 shadow-sm' 
                      : 'hover:bg-accent border border-transparent'
                  }`}
                >
                  <div className="flex justify-between items-start w-full">
                    <div className="font-semibold text-sm truncate pr-2">
                      {conv.bidder_name}
                    </div>
                    <div className="text-[10px] text-muted-foreground whitespace-nowrap pt-0.5">
                      {conv.timestamp}
                    </div>
                  </div>
                  
                  <div className="text-xs text-muted-foreground truncate w-full flex items-center gap-1.5">
                    <Building size={12} />
                    <span className="truncate">{conv.organization}</span>
                  </div>

                  <div className="flex justify-between items-center w-full mt-1">
                    <div className="truncate text-xs text-foreground/80 pr-2">
                      {conv.latest_message.length > 45 ? conv.latest_message.substring(0, 45) + '...' : conv.latest_message}
                    </div>
                    {conv.unread_count > 0 && (
                      <Badge variant="default" className="h-5 w-5 p-0 flex items-center justify-center rounded-full bg-primary text-[10px]">
                        {conv.unread_count}
                      </Badge>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ------------------------------------------- */}
      {/* CENTER PANEL: Chat Window */}
      {/* ------------------------------------------- */}
      <div className="flex-1 flex flex-col min-w-0 bg-background relative">
        
        {!selectedConversation ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <MessageSquare size={28} className="opacity-50" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Support Center</h2>
            <p className="text-sm">Select a conversation from the left panel to start messaging.</p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="h-16 border-b border-border/60 flex items-center justify-between px-6 bg-card/30 flex-shrink-0 backdrop-blur-sm">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                  {selectedConversation.bidder_name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-sm font-semibold flex items-center gap-2">
                    {selectedConversation.bidder_name}
                    {renderStatusBadge(selectedConversation.bid_status)}
                  </h2>
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Building size={12} /> {selectedConversation.organization}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-8 text-xs">
                  View Bid Details
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical size={16} />
                </Button>
              </div>
            </div>

            {/* Chat Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-grid-black/[0.02] dark:bg-grid-white/[0.02]">
              {isLoadingMessages ? (
                <div className="flex flex-col gap-4">
                  <Skeleton className="h-16 w-[60%] rounded-2xl rounded-tl-sm" />
                  <Skeleton className="h-12 w-[40%] rounded-2xl rounded-tr-sm self-end" />
                  <Skeleton className="h-20 w-[70%] rounded-2xl rounded-tl-sm" />
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-50">
                  <p className="text-sm">No messages yet. Send a message to start the conversation.</p>
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const isOfficer = msg.sender_id === ME_ID;
                  const isSystem = msg.message_type === 'system';
                  const isDocRequest = msg.message_type === 'document_request';

                  if (isSystem) {
                    return (
                      <div key={msg.id || idx} className="flex justify-center my-6">
                        <div className="bg-muted/50 px-4 py-1.5 rounded-full border border-border text-xs text-muted-foreground flex items-center gap-2">
                          <Info size={12} />
                          {msg.message}
                        </div>
                      </div>
                    );
                  }

                  if (isDocRequest) {
                    return (
                      <div key={msg.id || idx} className={`flex w-full ${isOfficer ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] rounded-2xl p-4 border ${isOfficer ? 'bg-primary/5 border-primary/20 rounded-tr-sm' : 'bg-card border-border rounded-tl-sm'}`}>
                          <div className="flex items-center gap-2 mb-2 text-sm font-semibold text-primary">
                            <FileText size={16} /> Document Request
                          </div>
                          <p className="text-sm mb-3">{msg.message}</p>
                          <div className="bg-background rounded-md p-3 border border-border/50 text-sm flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <File size={16} className="text-muted-foreground" />
                              <span className="font-medium">{msg.metadata?.docName || 'Requested Document'}</span>
                            </div>
                            <Badge variant="outline" className="text-[10px]">Pending Upload</Badge>
                          </div>
                          <div className={`text-[10px] mt-2 flex items-center justify-end gap-1 ${isOfficer ? 'text-primary/70' : 'text-muted-foreground'}`}>
                            {formatTime(msg.created_at)}
                            {isOfficer && <Check size={12} className={msg.is_read ? 'text-primary' : 'opacity-50'} />}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={msg.id || idx} className={`flex w-full ${isOfficer ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
                      <div className="flex flex-col gap-1 max-w-[75%]">
                        <div className={`px-4 py-2.5 rounded-2xl shadow-sm relative text-sm ${
                          isOfficer 
                            ? 'bg-primary text-primary-foreground rounded-br-sm' 
                            : 'bg-card border border-border/50 rounded-bl-sm'
                        }`}>
                          <p className="whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                        </div>
                        <div className={`text-[10px] flex items-center gap-1 px-1 ${isOfficer ? 'justify-end text-muted-foreground' : 'justify-start text-muted-foreground'}`}>
                          {formatTime(msg.created_at)}
                          {isOfficer && (
                            <span className="flex">
                              <Check size={12} className={msg.is_read ? 'text-blue-500' : 'opacity-50'} />
                              {msg.is_read && <Check size={12} className="text-blue-500 -ml-2" />}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} className="h-1 w-full" />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-card/50 border-t border-border/60 flex flex-col gap-3">
              
              {/* Quick Actions Row */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
                <Button variant="secondary" size="sm" className="h-7 text-xs rounded-full px-3" onClick={() => setIsDocRequestOpen(true)}>
                  <Paperclip size={12} className="mr-1.5" /> Request Document
                </Button>
                <Button variant="secondary" size="sm" className="h-7 text-xs rounded-full px-3" onClick={() => setIsStatusUpdateOpen(true)}>
                  <Shield size={12} className="mr-1.5" /> Update Status
                </Button>
                <Button variant="secondary" size="sm" className="h-7 text-xs rounded-full px-3" onClick={() => setIsTemplateOpen(true)}>
                  <FileText size={12} className="mr-1.5" /> Send Template
                </Button>
              </div>

              {/* Text Input */}
              <div className="relative flex items-end gap-2 bg-background border border-input rounded-xl p-2 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background">
                <textarea
                  className="flex-1 min-h-[40px] max-h-[120px] w-full resize-none bg-transparent px-2 py-2 text-sm focus:outline-none custom-scrollbar"
                  placeholder="Type a message... (Shift+Enter for new line)"
                  rows={Math.min(4, messageInput.split('\n').length || 1)}
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isSending}
                />
                <Button 
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim() || isSending}
                  size="icon"
                  className="h-10 w-10 rounded-lg flex-shrink-0 mb-0.5"
                >
                  {isSending ? <RefreshCw size={18} className="animate-spin" /> : <ArrowUp size={18} />}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ------------------------------------------- */}
      {/* RIGHT PANEL: Bidder Context Sidebar */}
      {/* ------------------------------------------- */}
      {selectedConversation && (
        <div className="w-[280px] flex-shrink-0 border-l border-border/60 bg-card/30 flex flex-col overflow-hidden animate-in slide-in-from-right-4 duration-300">
          <div className="p-4 border-b border-border/60 bg-card backdrop-blur-md">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <User size={16} className="text-primary" /> Bidder Context
            </h3>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-5">
            {isLoadingContext || !bidderContext ? (
              <div className="space-y-4">
                <Skeleton className="h-32 w-full rounded-xl" />
                <Skeleton className="h-40 w-full rounded-xl" />
                <Skeleton className="h-64 w-full rounded-xl" />
              </div>
            ) : (
              <>
                {/* Profile Card */}
                <Card className="shadow-none border-border/50 bg-background/50">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm font-semibold">Profile</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 space-y-3 text-sm">
                    <div className="grid grid-cols-[20px_1fr] gap-2 items-start text-muted-foreground">
                      <User size={14} className="mt-0.5" />
                      <div>
                        <span className="text-foreground font-medium block">{bidderContext.profile.name}</span>
                        <span className="text-xs">Registered: {bidderContext.profile.registration_date}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-[20px_1fr] gap-2 items-center text-muted-foreground">
                      <Building size={14} />
                      <span className="text-foreground truncate">{bidderContext.profile.organization}</span>
                    </div>
                    <div className="grid grid-cols-[20px_1fr] gap-2 items-center text-muted-foreground">
                      <Mail size={14} />
                      <span className="text-foreground truncate">{bidderContext.profile.email}</span>
                    </div>
                    <div className="grid grid-cols-[20px_1fr] gap-2 items-center text-muted-foreground">
                      <Phone size={14} />
                      <span className="text-foreground">{bidderContext.profile.phone}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Bid Summary Card */}
                <Card className="shadow-none border-border/50 bg-background/50">
                  <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-semibold">Bid Summary</CardTitle>
                    {bidderContext.bid_summary.compliance_score && (
                      <Badge variant="secondary" className="bg-primary/10 text-primary font-bold">
                        {bidderContext.bid_summary.compliance_score}/100
                      </Badge>
                    )}
                  </CardHeader>
                  <CardContent className="p-4 pt-0 space-y-3">
                    <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-xs">
                      <div>
                        <p className="text-muted-foreground mb-1">Bid ID</p>
                        <p className="font-medium font-mono text-[10px] bg-muted/50 p-1 rounded truncate">
                          {bidderContext.bid_summary.bid_id}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">Submission Date</p>
                        <p className="font-medium truncate">
                          {new Date(bidderContext.bid_summary.submission_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="col-span-2 pt-2 border-t border-border/50">
                        <p className="text-muted-foreground mb-1">Status</p>
                        {renderStatusBadge(bidderContext.bid_summary.status)}
                      </div>
                      <div className="col-span-2 pt-2 border-t border-border/50">
                        <p className="text-muted-foreground mb-1">Bid Amount</p>
                        <p className="font-semibold text-lg text-emerald-600 dark:text-emerald-400">
                          ₹{bidderContext.bid_summary.bid_amount.toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Document Status Panel */}
                <fieldset className="border border-border/50 rounded-xl p-4 bg-background/50">
                  <legend className="px-2 text-sm font-semibold text-foreground">Document Status</legend>
                  <div className="space-y-2 mt-2">
                    {bidderContext.documents.map((doc, i) => (
                      <div key={i} className="flex items-center justify-between text-xs p-1.5 rounded hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-2 truncate pr-2">
                          {getDocStatusIcon(doc.status)}
                          <span className="truncate" title={doc.name}>{doc.name}</span>
                        </div>
                        <span className={`flex-shrink-0 font-medium ${
                          doc.status === 'verified' ? 'text-emerald-500' :
                          doc.status === 'rejected' ? 'text-red-500' :
                          doc.status === 'pending' ? 'text-amber-500' : 'text-gray-400'
                        }`}>
                          {getDocStatusLabel(doc.status)}
                        </span>
                      </div>
                    ))}
                  </div>
                </fieldset>

                {/* Quick Actions Panel */}
                <div className="space-y-2 pt-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Decision Actions</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="default" className="bg-emerald-600 hover:bg-emerald-700 text-white w-full h-9 text-xs">
                      Approve Bid
                    </Button>
                    <Button variant="destructive" className="w-full h-9 text-xs">
                      Reject Bid
                    </Button>
                  </div>
                  <Button variant="outline" className="w-full h-9 text-xs border-amber-500/50 text-amber-600 hover:bg-amber-500/10">
                    <HelpCircle size={14} className="mr-2" /> Request Clarification
                  </Button>
                  <Button variant="ghost" className="w-full h-9 text-xs text-muted-foreground hover:text-foreground">
                    <AlertTriangle size={14} className="mr-2" /> Flag for Review
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* Dialogs                                    */}
      {/* ========================================== */}

      {/* Document Request Dialog */}
      <Dialog open={isDocRequestOpen} onOpenChange={setIsDocRequestOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Request Document</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="doc-type">Document Type</Label>
              <select id="doc-type" className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                <option value="itr">Income Tax Return (ITR)</option>
                <option value="balance_sheet">Audited Balance Sheet</option>
                <option value="iso">ISO Certification</option>
                <option value="oem">OEM Authorization</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Request</Label>
              <textarea 
                id="reason" 
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                placeholder="Explain why this document is needed..."
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={() => {
              // Mock action
              setMessageInput((prev) => prev + " Please upload the requested document.");
              setIsDocRequestOpen(false);
            }}>Prepare Request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Update Dialog */}
      <Dialog open={isStatusUpdateOpen} onOpenChange={setIsStatusUpdateOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Update Bid Status</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>New Status</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="border-amber-500/50 text-amber-600 hover:bg-amber-500/10 justify-start">Under Review</Button>
                <Button variant="outline" className="border-purple-500/50 text-purple-600 hover:bg-purple-500/10 justify-start">Clarification</Button>
                <Button variant="outline" className="border-emerald-500/50 text-emerald-600 hover:bg-emerald-500/10 justify-start">Approved</Button>
                <Button variant="outline" className="border-red-500/50 text-red-600 hover:bg-red-500/10 justify-start">Rejected</Button>
              </div>
            </div>
            <div className="space-y-2 mt-2">
              <Label htmlFor="comments">Internal Comments (Optional)</Label>
              <textarea 
                id="comments" 
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                placeholder="Notes for audit trail..."
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button>Update Status</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Dialog */}
      <Dialog open={isTemplateOpen} onOpenChange={setIsTemplateOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Message Templates</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
            {[
              { title: 'Acknowledge Receipt', text: 'We acknowledge the receipt of your query. Our technical committee is reviewing it and will respond shortly.' },
              { title: 'Turnover Clarification', text: 'As per clause 4.2 of the tender document, the lead member must meet 50% of the turnover requirement, and other members must meet 25% each.' },
              { title: 'EMD Exemption', text: 'EMD exemption is only applicable for verified MSMEs registered for the exact category of goods/services being procured. Please submit your Udyam certificate.' },
              { title: 'Deadline Extension', text: 'The deadline for bid submission will not be extended. Please ensure all documents are uploaded before the cutoff time.' }
            ].map((tmpl, idx) => (
              <Card key={idx} className="cursor-pointer hover:border-primary transition-colors" onClick={() => {
                setMessageInput(tmpl.text);
                setIsTemplateOpen(false);
              }}>
                <CardHeader className="p-3 pb-1">
                  <CardTitle className="text-sm">{tmpl.title}</CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <p className="text-xs text-muted-foreground line-clamp-2">{tmpl.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
