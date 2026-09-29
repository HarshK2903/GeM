import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Send, Search, MessageSquare, FileText, CheckCircle, XCircle, 
  Clock, User, Building, ArrowUpRight, Paperclip, Upload, 
  IndianRupee, Calendar, Shield, AlertTriangle, ChevronRight, FileWarning 
} from 'lucide-react';
import api from '@/lib/api';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

// Types mimicking the backend response
interface Conversation {
  id: string; // could be tender_id
  tender_id: string;
  tender_title: string;
  reference_number: string;
  department: string;
  officer_name: string;
  officer_id: string;
  latest_message: string;
  unread_count: number;
  bid_status: 'submitted' | 'under_review' | 'approved' | 'rejected' | 'draft';
  last_updated: string;
}

interface Message {
  id: string;
  sender_id: string;
  sender_role: 'bidder' | 'officer' | 'system';
  content: string;
  type: 'text' | 'document_request' | 'status_update' | 'system';
  status_update?: string;
  requested_doc?: string;
  doc_status?: 'pending' | 'uploaded';
  timestamp: string;
  read: boolean;
}

interface RightPanelData {
  tender: {
    title: string;
    department: string;
    type: string;
    estimated_value: number;
    status: string;
    submission_deadline: string;
    technical_bid_open_date: string;
    financial_bid_open_date: string;
    last_date_queries: string;
  };
  bid: {
    id: string;
    submitted_at: string;
    bid_amount: number;
    status: string;
    compliance_score?: number;
  };
  documents: {
    id: string;
    name: string;
    status: 'verified' | 'under_review' | 'rejected' | 'not_submitted';
    rejection_reason?: string;
  }[];
}

export default function SupportCenter() {
  const navigate = useNavigate();

  // State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);

  const [activeTenderId, setActiveTenderId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  
  const [rightPanelData, setRightPanelData] = useState<RightPanelData | null>(null);
  const [isLoadingRightPanel, setIsLoadingRightPanel] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch conversations
  useEffect(() => {
    const fetchConversations = async () => {
      setIsLoadingConversations(true);
      try {
        // Mock fallback if API fails
        const mockConversations: Conversation[] = [
          {
            id: 't-123',
            tender_id: 't-123',
            tender_title: 'Procurement of High-End Servers for Datacenter',
            reference_number: 'GEM/2026/B/10001',
            department: 'Ministry of IT',
            officer_name: 'Rajesh Kumar',
            officer_id: 'o-1',
            latest_message: 'Please upload the missing Annexure C.',
            unread_count: 2,
            bid_status: 'under_review',
            last_updated: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
          },
          {
            id: 't-124',
            tender_id: 't-124',
            tender_title: 'Annual Maintenance Contract for ACs',
            reference_number: 'GEM/2026/B/10002',
            department: 'Department of Public Works',
            officer_name: 'Anita Desai',
            officer_id: 'o-2',
            latest_message: 'Your bid has been technically approved.',
            unread_count: 0,
            bid_status: 'approved',
            last_updated: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
          }
        ];
        
        try {
          const res = await api.get('/support/conversations');
          const data = res.data.items || res.data;
          setConversations(data.length ? data : mockConversations);
          setFilteredConversations(data.length ? data : mockConversations);
          if ((data.length || mockConversations.length) && !activeTenderId) {
            setActiveTenderId(data.length ? data[0].tender_id : mockConversations[0].tender_id);
          }
        } catch (e) {
          setConversations(mockConversations);
          setFilteredConversations(mockConversations);
          if (!activeTenderId) setActiveTenderId(mockConversations[0].tender_id);
        }
      } catch (error) {
        console.error('Failed to load conversations', error);
      } finally {
        setIsLoadingConversations(false);
      }
    };
    fetchConversations();
  }, []);

  // Search filter
  useEffect(() => {
    if (!searchQuery) {
      setFilteredConversations(conversations);
    } else {
      const lowerQ = searchQuery.toLowerCase();
      setFilteredConversations(conversations.filter(c => 
        c.tender_title.toLowerCase().includes(lowerQ) || 
        c.reference_number.toLowerCase().includes(lowerQ) ||
        c.officer_name.toLowerCase().includes(lowerQ)
      ));
    }
  }, [searchQuery, conversations]);

  // Fetch messages and right panel data when active tender changes
  useEffect(() => {
    if (!activeTenderId) return;

    const activeConv = conversations.find(c => c.tender_id === activeTenderId);

    // Mock messages for demo
    const mockMessages: Message[] = [
      {
        id: 'm-1',
        sender_id: 'system',
        sender_role: 'system',
        content: 'Bid submitted successfully. Wait for officer review.',
        type: 'system',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
        read: true,
      },
      {
        id: 'm-2',
        sender_id: activeConv?.officer_id || 'o-1',
        sender_role: 'officer',
        content: 'We noticed the GST certificate is slightly blurry. Could you please re-upload a clearer version?',
        type: 'text',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        read: true,
      },
      {
        id: 'm-3',
        sender_id: 'me',
        sender_role: 'bidder',
        content: 'Sure, I will upload a better scanned copy right away.',
        type: 'text',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 23).toISOString(),
        read: true,
      },
      {
        id: 'm-4',
        sender_id: activeConv?.officer_id || 'o-1',
        sender_role: 'officer',
        content: 'Please upload Annexure C document.',
        type: 'document_request',
        requested_doc: 'Annexure C - Declaration',
        doc_status: 'pending',
        timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
        read: false,
      }
    ];

    // Mock right panel data
    const mockRightPanel: RightPanelData = {
      tender: {
        title: activeConv?.tender_title || 'Tender Title',
        department: activeConv?.department || 'Department',
        type: 'Open Tender',
        estimated_value: 5000000,
        status: 'Evaluation',
        submission_deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5).toISOString(),
        technical_bid_open_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
        financial_bid_open_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString(),
        last_date_queries: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2).toISOString(),
      },
      bid: {
        id: 'BID-99281',
        submitted_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
        bid_amount: 4950000,
        status: activeConv?.bid_status || 'under_review',
        compliance_score: 92,
      },
      documents: [
        { id: 'd-1', name: 'Udyam Certificate', status: 'verified' },
        { id: 'd-2', name: 'GST Registration', status: 'verified' },
        { id: 'd-3', name: 'PAN Card', status: 'verified' },
        { id: 'd-4', name: 'Income Tax Returns (3 yrs)', status: 'verified' },
        { id: 'd-5', name: 'Company Registration', status: 'under_review' },
        { id: 'd-6', name: 'Annexure C - Declaration', status: 'not_submitted' },
      ]
    };

    // Initial load — show loading states, fetch everything
    const initialLoad = async () => {
      setIsLoadingMessages(true);
      setIsLoadingRightPanel(true);
      try {
        // Load messages — use mock data directly (API will be used when backend is live)
        setMessages(mockMessages);
        setRightPanelData(mockRightPanel);

        // Mark as read in local state
        setConversations(prev => prev.map(c => 
          c.tender_id === activeTenderId ? { ...c, unread_count: 0 } : c
        ));
      } catch (err) {
        console.error('Failed to load detail', err);
      } finally {
        setIsLoadingMessages(false);
        setIsLoadingRightPanel(false);
        scrollToBottom();
      }
    };
    initialLoad();

    // No polling needed with mock data — when real API is live, uncomment:
    // const pollMessages = async () => {
    //   try {
    //     const res = await api.get(`/support/messages?tender_id=${activeTenderId}`);
    //     if (res.data) setMessages(res.data.items || res.data);
    //   } catch { /* silent */ }
    // };
    // const interval = setInterval(pollMessages, 10000);
    // return () => clearInterval(interval);
  }, [activeTenderId]); // Intentionally omitting conversations from dep to avoid loop

  // Auto scroll
  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle Send
  const handleSendMessage = async () => {
    if (!messageInput.trim() || !activeTenderId) return;
    
    const activeConv = conversations.find(c => c.tender_id === activeTenderId);
    
    const newMessage: Message = {
      id: `m-temp-${Date.now()}`,
      sender_id: 'me',
      sender_role: 'bidder',
      content: messageInput.trim(),
      type: 'text',
      timestamp: new Date().toISOString(),
      read: false,
    };
    
    setMessages(prev => [...prev, newMessage]);
    setMessageInput('');
    
    // Adjust height back
    if (textareaRef.current) {
      textareaRef.current.style.height = '40px';
    }

    try {
      await api.post('/support/messages', {
        tender_id: activeTenderId,
        receiver_id: activeConv?.officer_id,
        message: newMessage.content
      });
    } catch (e) {
      console.error('Failed to send message', e);
      // Could show toast error here
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageInput(e.target.value);
    e.target.style.height = '40px';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  // Formatters
  const formatTime = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatRelative = (isoString: string) => {
    const d = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(isoString);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch(status) {
      case 'approved': return 'default';
      case 'rejected': return 'destructive';
      case 'under_review': return 'secondary';
      default: return 'outline';
    }
  };
  
  const getDocStatusBadge = (status: string) => {
    switch(status) {
      case 'verified': return <Badge className="bg-emerald-500/15 text-emerald-500 border-none shadow-none text-[10px] uppercase">Verified</Badge>;
      case 'under_review': return <Badge className="bg-amber-500/15 text-amber-500 border-none shadow-none text-[10px] uppercase">Review</Badge>;
      case 'rejected': return <Badge className="bg-red-500/15 text-red-500 border-none shadow-none text-[10px] uppercase">Rejected</Badge>;
      case 'not_submitted': return <Badge className="bg-slate-500/15 text-slate-400 border-none shadow-none text-[10px] uppercase">Missing</Badge>;
      default: return null;
    }
  };

  const totalUnread = conversations.reduce((acc, c) => acc + c.unread_count, 0);
  const activeConversation = conversations.find(c => c.tender_id === activeTenderId);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      
      {/* LEFT PANEL */}
      <div className="w-[260px] flex-shrink-0 border-r border-border/60 flex flex-col bg-card/30">
        <div className="p-4 border-b border-border/60">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              Conversations
            </h2>
            {totalUnread > 0 && (
              <Badge variant="default" className="h-5 px-1.5 text-xs bg-amber-500 hover:bg-amber-600 text-white">
                {totalUnread} new
              </Badge>
            )}
          </div>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
            <Input 
              placeholder="Search tenders, officers..." 
              className="pl-9 h-9 bg-background"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {isLoadingConversations ? (
            <div className="p-4 space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex flex-col gap-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-sm flex flex-col items-center gap-3">
              <MessageSquare className="w-8 h-8 opacity-20" />
              <p>You haven't started any conversations yet.</p>
              <p className="text-xs">Submit a bid to start communicating with officers.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {filteredConversations.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => setActiveTenderId(conv.tender_id)}
                  className={`w-full text-left p-4 transition-colors hover:bg-muted/50 border-l-4 ${
                    activeTenderId === conv.tender_id 
                      ? 'border-l-primary bg-muted/30' 
                      : 'border-l-transparent'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1 gap-2">
                    <p className="font-semibold text-sm line-clamp-1 flex-1 text-foreground">
                      {conv.tender_title}
                    </p>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap pt-1">
                      {formatRelative(conv.last_updated)}
                    </span>
                  </div>
                  <p className="text-xs font-mono text-muted-foreground mb-2">
                    {conv.reference_number}
                  </p>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                    <User className="w-3 h-3" />
                    <span className="truncate">{conv.officer_name}</span>
                  </div>
                  <div className="flex justify-between items-end gap-2">
                    <p className="text-xs text-muted-foreground line-clamp-1 italic max-w-[180px]">
                      {conv.latest_message}
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[9px] h-4 px-1 uppercase scale-90 origin-right">
                        {conv.bid_status.replace('_', ' ')}
                      </Badge>
                      {conv.unread_count > 0 && (
                        <Badge className="bg-amber-500 hover:bg-amber-600 text-[10px] h-4 w-4 p-0 flex items-center justify-center rounded-full">
                          {conv.unread_count}
                        </Badge>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* CENTER PANEL */}
      <div className="flex-1 flex flex-col bg-background relative min-w-0">
        {activeTenderId && activeConversation ? (
          <>
            {/* Center Header */}
            <div className="h-[72px] border-b border-border/60 px-6 flex items-center justify-between bg-card/30 shrink-0">
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-foreground truncate max-w-[400px]">
                    {activeConversation.tender_title}
                  </h3>
                  <Badge variant={getStatusBadgeVariant(activeConversation.bid_status)} className="capitalize text-xs">
                    {activeConversation.bid_status.replace('_', ' ')}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                  <span className="font-mono">{activeConversation.reference_number}</span>
                  <span className="flex items-center gap-1"><User className="w-3 h-3"/> {activeConversation.officer_name}</span>
                  <span className="flex items-center gap-1"><Building className="w-3 h-3"/> {activeConversation.department}</span>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2"
                onClick={() => navigate(`/bidder/tenders/${activeConversation.tender_id}`)}
              >
                View Tender
                <ArrowUpRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
              {isLoadingMessages ? (
                <div className="flex flex-col gap-6 items-center justify-center h-full text-muted-foreground">
                  <Skeleton className="w-8 h-8 rounded-full mb-4 animate-pulse" />
                  <p className="text-sm">Loading conversation history...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <MessageSquare className="w-12 h-12 opacity-20 mb-4" />
                  <p>No messages yet.</p>
                  <p className="text-sm mt-2">Send a message to contact the officer regarding your bid.</p>
                </div>
              ) : (
                messages.map((msg, i) => {
                  const showDate = i === 0 || new Date(msg.timestamp).toDateString() !== new Date(messages[i - 1].timestamp).toDateString();
                  
                  return (
                    <div key={msg.id} className="flex flex-col">
                      {showDate && (
                        <div className="flex justify-center my-4">
                          <span className="text-[10px] font-medium text-muted-foreground bg-muted/30 px-3 py-1 rounded-full uppercase tracking-wider">
                            {formatDate(msg.timestamp)}
                          </span>
                        </div>
                      )}
                      
                      {msg.type === 'system' ? (
                        <div className="flex justify-center my-2">
                          <div className="bg-muted/50 border border-border/50 text-muted-foreground text-xs px-4 py-2 rounded-md flex items-center gap-2 max-w-[80%] text-center">
                            <Shield className="w-3.5 h-3.5" />
                            {msg.content}
                          </div>
                        </div>
                      ) : msg.type === 'status_update' ? (
                        <div className="flex justify-center my-2">
                          <div className="bg-primary/10 border border-primary/20 text-primary text-xs px-4 py-2 rounded-md flex items-center gap-2">
                            <CheckCircle className="w-3.5 h-3.5" />
                            {msg.content}
                          </div>
                        </div>
                      ) : (
                        <div className={`flex flex-col max-w-[75%] ${msg.sender_role === 'bidder' ? 'self-end items-end' : 'self-start items-start'} mb-4`}>
                          
                          {msg.sender_role !== 'bidder' && (
                            <span className="text-[10px] text-muted-foreground ml-2 mb-1 flex items-center gap-1">
                              <User className="w-3 h-3"/> {activeConversation.officer_name}
                            </span>
                          )}

                          {msg.type === 'document_request' ? (
                            <Card className="bg-card border-border shadow-sm mb-1">
                              <CardContent className="p-4 flex flex-col gap-3">
                                <p className="text-sm">{msg.content}</p>
                                <div className="bg-muted/40 p-3 rounded-md flex items-center justify-between border border-border/50 gap-4">
                                  <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="bg-primary/10 p-2 rounded text-primary">
                                      <FileWarning className="w-5 h-5" />
                                    </div>
                                    <div className="truncate">
                                      <p className="text-sm font-medium truncate">{msg.requested_doc}</p>
                                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">Document Required</p>
                                    </div>
                                  </div>
                                  <Button size="sm" variant={msg.doc_status === 'uploaded' ? 'secondary' : 'default'} className="shrink-0 gap-2">
                                    {msg.doc_status === 'uploaded' ? <CheckCircle className="w-4 h-4"/> : <Upload className="w-4 h-4" />}
                                    {msg.doc_status === 'uploaded' ? 'Uploaded' : 'Upload'}
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          ) : (
                            <div className={`rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                              msg.sender_role === 'bidder' 
                                ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                                : 'bg-card border border-border/60 text-foreground rounded-tl-sm'
                            }`}>
                              {msg.content}
                            </div>
                          )}
                          
                          <div className={`text-[10px] mt-1 flex items-center gap-1 text-muted-foreground ${
                            msg.sender_role === 'bidder' ? 'mr-2' : 'ml-2'
                          }`}>
                            {formatTime(msg.timestamp)}
                            {msg.sender_role === 'bidder' && (
                              <span className="ml-1 text-[10px]">
                                {msg.read ? <span className="text-primary tracking-tighter">✓✓</span> : <span>✓</span>}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-border/60 bg-card/30">
              <div className="flex items-end gap-2">
                <Button variant="ghost" size="icon" className="shrink-0 h-10 w-10 text-muted-foreground hover:text-foreground">
                  <Paperclip className="w-5 h-5" />
                </Button>
                
                <div className="flex-1 relative bg-background border border-border/60 rounded-xl overflow-hidden focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-all">
                  <textarea
                    ref={textareaRef}
                    value={messageInput}
                    onChange={handleInput}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your message..."
                    className="w-full max-h-[120px] bg-transparent resize-none outline-none py-3 px-4 text-sm scrollbar-thin flex items-center"
                    style={{ height: '44px' }}
                    rows={1}
                  />
                </div>
                
                <Button 
                  size="icon" 
                  className="shrink-0 h-10 w-10 rounded-xl bg-primary hover:bg-primary/90"
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim()}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex justify-between items-center mt-2 px-14">
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="h-7 text-[10px] px-2 py-0 border-dashed text-muted-foreground">
                    <Upload className="w-3 h-3 mr-1" /> Quick Upload Document
                  </Button>
                </div>
                <span className="text-[10px] text-muted-foreground hidden sm:block">
                  Press Enter to send, Shift+Enter for newline
                </span>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
            <MessageSquare className="w-16 h-16 opacity-10 mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">Support Center</h3>
            <p className="max-w-md">Select a conversation from the left panel to view messages, or start a new bid to open a communication channel with procurement officers.</p>
          </div>
        )}
      </div>

      {/* RIGHT PANEL */}
      <div className="w-[280px] flex-shrink-0 border-l border-border/60 bg-card/20 flex flex-col overflow-y-auto scrollbar-thin">
        {activeTenderId ? (
          isLoadingRightPanel || !rightPanelData ? (
            <div className="p-5 space-y-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="space-y-3">
                  <Skeleton className="h-6 w-1/2" />
                  <Skeleton className="h-24 w-full" />
                </div>
              ))}
            </div>
          ) : (
            <div className="p-5 space-y-6 pb-20">
              
              {/* Tender Overview */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Tender Context</h3>
                <Card className="bg-background shadow-sm">
                  <CardContent className="p-4 space-y-4">
                    <div>
                      <p className="text-sm font-semibold line-clamp-2 leading-tight mb-1">
                        {rightPanelData.tender.title}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Building className="w-3 h-3" />
                        {rightPanelData.tender.department}
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-y-3 gap-x-2">
                      <div>
                        <p className="text-[10px] text-muted-foreground mb-0.5">Type</p>
                        <p className="text-xs font-medium capitalize">{rightPanelData.tender.type.replace('_', ' ')}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground mb-0.5">Value</p>
                        <p className="text-xs font-medium text-emerald-500 flex items-center">
                          <IndianRupee className="w-3 h-3 mr-0.5" />
                          {rightPanelData.tender.estimated_value ? rightPanelData.tender.estimated_value.toLocaleString('en-IN') : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Separator className="opacity-50" />

              {/* Bid Status */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">My Bid Overview</h3>
                <Card className="bg-background shadow-sm border-l-4 border-l-primary">
                  <CardContent className="p-4 space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-[10px] text-muted-foreground mb-0.5">Bid ID</p>
                        <p className="text-xs font-mono font-medium">{rightPanelData.bid.id}</p>
                      </div>
                      <Badge variant={getStatusBadgeVariant(rightPanelData.bid.status)} className="capitalize text-[10px] h-5">
                        {rightPanelData.bid.status.replace('_', ' ')}
                      </Badge>
                    </div>

                    <div>
                      <p className="text-[10px] text-muted-foreground mb-0.5">Submitted On</p>
                      <p className="text-xs font-medium flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 text-muted-foreground" />
                        {formatDate(rightPanelData.bid.submitted_at)}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-border/40">
                      <p className="text-[10px] text-muted-foreground mb-0.5">Quoted Amount</p>
                      <p className="text-sm font-semibold text-foreground">
                        {formatCurrency(rightPanelData.bid.bid_amount)}
                      </p>
                    </div>

                    {rightPanelData.bid.compliance_score && (
                      <div className="pt-2 border-t border-border/40">
                        <div className="flex justify-between items-end mb-1">
                          <p className="text-[10px] text-muted-foreground">AI Compliance Score</p>
                          <span className="text-xs font-bold text-primary">{rightPanelData.bid.compliance_score}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary rounded-full transition-all" 
                            style={{ width: `${rightPanelData.bid.compliance_score}%` }} 
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Separator className="opacity-50" />

              {/* Documents Status */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Document Status</h3>
                  <Badge variant="secondary" className="text-[9px] h-4">{rightPanelData.documents.length}</Badge>
                </div>
                <Card className="bg-background shadow-sm overflow-hidden">
                  <div className="divide-y divide-border/40 max-h-[250px] overflow-y-auto scrollbar-thin">
                    {rightPanelData.documents.map(doc => (
                      <div key={doc.id} className="p-3 flex items-start justify-between gap-3 hover:bg-muted/20 transition-colors group">
                        <div className="flex items-start gap-2 min-w-0">
                          <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <p className="text-xs font-medium truncate group-hover:text-primary transition-colors" title={doc.name}>
                              {doc.name}
                            </p>
                            {doc.status === 'rejected' && (
                              <p className="text-[10px] text-red-500 mt-1 line-clamp-1">
                                {doc.rejection_reason || 'Needs clear copy'}
                              </p>
                            )}
                            {doc.status === 'not_submitted' && (
                              <Button variant="link" className="h-auto p-0 text-[10px] mt-0.5 text-primary">Upload now</Button>
                            )}
                          </div>
                        </div>
                        <div className="shrink-0">
                          {getDocStatusBadge(doc.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              <Separator className="opacity-50" />

              {/* Important Dates */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Important Dates</h3>
                <Card className="bg-background shadow-sm">
                  <CardContent className="p-4 space-y-4">
                    
                    <div className="flex gap-3">
                      <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center shrink-0">
                        <Clock className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground leading-none mb-1">Submission Deadline</p>
                        <p className="text-xs font-medium">{formatDate(rightPanelData.tender.submission_deadline)}</p>
                      </div>
                    </div>
                    
                    <div className="flex gap-3">
                      <div className="w-6 h-6 rounded bg-muted flex items-center justify-center shrink-0">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground leading-none mb-1">Tech Bid Opening</p>
                        <p className="text-xs font-medium">{formatDate(rightPanelData.tender.technical_bid_open_date)}</p>
                      </div>
                    </div>
                    
                    <div className="flex gap-3">
                      <div className="w-6 h-6 rounded bg-muted flex items-center justify-center shrink-0">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground leading-none mb-1">Financial Bid Opening</p>
                        <p className="text-xs font-medium">{formatDate(rightPanelData.tender.financial_bid_open_date)}</p>
                      </div>
                    </div>

                  </CardContent>
                </Card>
              </div>

            </div>
          )
        ) : (
          <div className="h-full flex items-center justify-center p-6 text-center opacity-50">
            <p className="text-sm text-muted-foreground">Context panel will appear here when a conversation is selected.</p>
          </div>
        )}
      </div>

    </div>
  );
}
