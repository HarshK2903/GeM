import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  ArrowLeft, Edit, ShieldCheck, FileText, CheckCircle, Eye,
  AlertTriangle, XCircle, Clock, Play, Pause, RefreshCw, Copy, Award, Archive, 
  Calendar, BarChart3, Shield, Users, TrendingUp
} from 'lucide-react';
import type { Tender, Bid } from '@shared-types';

const Field = ({ label, value }: { label: string; value?: React.ReactNode }) => (
  <div className="grid grid-cols-2 gap-4 py-2.5 border-b border-border/40 last:border-0">
    <span className="text-muted-foreground text-sm">{label}</span>
    <span className="text-sm font-medium text-foreground">{value || '---'}</span>
  </div>
);

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <fieldset className="border border-border/60 rounded-md p-5 mb-6">
    <legend className="px-2 text-sm font-semibold text-primary">{title}</legend>
    {children}
  </fieldset>
);

export default function TenderDetailView() {
  const { tenderId } = useParams<{ tenderId: string }>();
  const navigate = useNavigate();

  const [tender, setTender] = useState<Tender | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bidsLoading, setBidsLoading] = useState(true);

  // Action Dialogs State
  const [actionDialog, setActionDialog] = useState<{type: string; title: string; message: string} | null>(null);
  const [actionReason, setActionReason] = useState('');
  
  // Extend Deadline Dialog State
  const [deadlineDialog, setDeadlineDialog] = useState(false);
  const [newDeadline, setNewDeadline] = useState('');

  useEffect(() => {
    if (!tenderId) return;
    fetchTenderDetails();
    fetchBids();
  }, [tenderId]);

  const fetchTenderDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await api.get(`/tenders/${tenderId}`);
      setTender(data);
    } catch (err: any) {
      console.error('Error fetching tender:', err);
      setError(err.response?.data?.message || 'Failed to fetch tender details.');
    } finally {
      setLoading(false);
    }
  };

  const fetchBids = async () => {
    try {
      setBidsLoading(true);
      const { data } = await api.get(`/tenders/${tenderId}/bids`);
      if (Array.isArray(data)) {
        setBids(data);
      } else if (data && Array.isArray(data.items)) {
        setBids(data.items);
      } else {
        setBids([]);
      }
    } catch (err: any) {
      console.error('Error fetching bids:', err);
    } finally {
      setBidsLoading(false);
    }
  };

  const handleStatusAction = async (action: string) => {
    try {
      await api.post(`/tenders/${tenderId}/status`, { action, reason: actionReason });
      const { data } = await api.get(`/tenders/${tenderId}`);
      setTender(data);
      setActionDialog(null);
      setActionReason('');
    } catch (err) {
      console.error('Action failed:', err);
    }
  };

  const handlePublish = async () => {
    try {
      await api.post(`/tenders/${tenderId}/publish`);
      const { data } = await api.get(`/tenders/${tenderId}`);
      setTender(data);
    } catch (err) {
      console.error('Failed to publish tender', err);
    }
  };

  const handleExtendDeadline = async () => {
    try {
      await api.post(`/tenders/${tenderId}/extend-deadline`, { new_deadline: newDeadline });
      setDeadlineDialog(false);
      fetchTenderDetails();
    } catch (err) {
      console.error('Failed to extend deadline:', err);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <Skeleton className="h-10 w-1/4" />
        <Skeleton className="h-[200px] w-full" />
        <Skeleton className="h-[300px] w-full" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    );
  }

  if (error || !tender) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="bg-destructive/10 text-destructive p-4 rounded-md flex flex-col items-center">
          <p className="font-medium mb-4">{error || 'Tender not found.'}</p>
          <Button onClick={() => navigate('/officer/tenders')} variant="outline">
            Back to Tenders
          </Button>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch(status.toLowerCase()) {
      case 'published': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'open': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'under_evaluation': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'awarded': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'suspended':
      case 'cancelled': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const lifecycleStages = ['draft', 'published', 'open', 'under_evaluation', 'awarded', 'closed'];
  const currentStageIndex = lifecycleStages.indexOf(tender.status.toLowerCase());

  const bidsUnderReview = bids.filter(b => b.status === 'submitted' || b.status === 'under_review').length;
  const bidsEvaluated = bids.filter(b => b.status === 'evaluated').length;
  const bidsApproved = bids.filter(b => b.status === 'approved').length;
  const bidsRejected = bids.filter(b => b.status === 'rejected').length;

  const deadlineMs = tender.submission_deadline ? new Date(tender.submission_deadline).getTime() : 0;
  const nowMs = Date.now();
  const daysRemaining = deadlineMs > nowMs ? Math.ceil((deadlineMs - nowMs) / (1000 * 60 * 60 * 24)) : 0;

  const statusHistory = [
    { action: 'Created', date: tender.created_at, by: tender.published_user_name || 'System' },
    ...(tender.published_at ? [{ action: 'Published', date: tender.published_at, by: tender.published_user_name || 'System' }] : []),
    // In a real app, these would come from an audit log endpoint
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Action Dialog */}
      <Dialog open={!!actionDialog} onOpenChange={(open) => !open && setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              {actionDialog?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-muted-foreground">{actionDialog?.message}</p>
            {['suspend', 'cancel'].includes(actionDialog?.type || '') && (
              <div className="space-y-2">
                <Label>Reason (Mandatory)</Label>
                <textarea 
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="Enter reason for this action..."
                  required
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button 
              variant={['suspend', 'cancel', 'close'].includes(actionDialog?.type || '') ? 'destructive' : 'default'}
              onClick={() => handleStatusAction(actionDialog?.type || '')}
              disabled={['suspend', 'cancel'].includes(actionDialog?.type || '') && !actionReason.trim()}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Extend Deadline Dialog */}
      <Dialog open={deadlineDialog} onOpenChange={setDeadlineDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extend Submission Deadline</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>New Deadline</Label>
              <Input 
                type="datetime-local" 
                value={newDeadline}
                onChange={(e) => setNewDeadline(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleExtendDeadline} disabled={!newDeadline}>
              Save New Deadline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Header section */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur py-4 border-b border-border/40 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/officer/tenders')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{tender.title}</h1>
              <Badge className={getStatusColor(tender.status)}>
                {tender.status.toUpperCase()}
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm mt-1">Ref: {tender.reference_number} • Dept: {tender.department}</p>
          </div>
        </div>
      </div>

      {/* Lifecycle Panel */}
      <div className="bg-card p-6 rounded-lg border shadow-sm space-y-6">
        <div className="flex flex-col gap-6">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <RefreshCw className="h-5 w-5 text-primary" /> Lifecycle Management
            </h3>
            <div className="relative flex justify-between">
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-border -z-10 -translate-y-1/2" />
              {lifecycleStages.map((stage, index) => {
                const isCompleted = currentStageIndex > index;
                const isCurrent = currentStageIndex === index;
                return (
                  <div key={stage} className="flex flex-col items-center gap-2 bg-card px-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                      isCompleted ? 'bg-primary border-primary text-primary-foreground' : 
                      isCurrent ? 'border-primary text-primary bg-background' : 
                      'border-muted bg-background text-muted-foreground'
                    }`}>
                      {isCompleted ? <CheckCircle className="h-4 w-4" /> : <span>{index + 1}</span>}
                    </div>
                    <span className={`text-xs font-medium uppercase ${isCurrent ? 'text-primary' : 'text-muted-foreground'}`}>
                      {stage.replace('_', ' ')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="flex flex-wrap gap-3 bg-muted/30 p-4 rounded-md border border-border/50">
            {tender.status === 'draft' && (
              <>
                <Button onClick={handlePublish}><CheckCircle className="h-4 w-4 mr-2"/> Publish</Button>
                <Button variant="outline" onClick={() => navigate(`/officer/tenders/${tenderId}/edit`)}><Edit className="h-4 w-4 mr-2"/> Edit Draft</Button>
                <Button variant="destructive" onClick={() => setActionDialog({type: 'cancel', title: 'Delete Draft', message: 'Are you sure you want to delete this draft?'})}><XCircle className="h-4 w-4 mr-2"/> Delete</Button>
              </>
            )}
            {tender.status === 'published' && (
              <>
                <Button onClick={() => setActionDialog({type: 'open', title: 'Open Bidding', message: 'This will allow vendors to submit bids.'})}><Play className="h-4 w-4 mr-2"/> Open for Bidding</Button>
                <Button variant="outline" onClick={() => navigate(`/officer/tenders/${tenderId}/edit`)}><Edit className="h-4 w-4 mr-2"/> Edit</Button>
                <Button variant="destructive" onClick={() => setActionDialog({type: 'cancel', title: 'Withdraw Tender', message: 'Withdraw this tender?'})}><XCircle className="h-4 w-4 mr-2"/> Withdraw</Button>
              </>
            )}
            {tender.status === 'open' && (
              <>
                <Button variant="outline" onClick={() => setActionDialog({type: 'suspend', title: 'Suspend Bidding', message: 'Temporarily pause bidding.'})}><Pause className="h-4 w-4 mr-2"/> Suspend</Button>
                <Button variant="outline" onClick={() => setDeadlineDialog(true)}><Clock className="h-4 w-4 mr-2"/> Extend Deadline</Button>
                <Button onClick={() => setActionDialog({type: 'under_evaluation', title: 'Close Bidding', message: 'Move to evaluation phase?'})}><CheckCircle className="h-4 w-4 mr-2"/> Close Bidding</Button>
              </>
            )}
            {tender.status === 'under_evaluation' && (
              <>
                <Button onClick={() => setActionDialog({type: 'awarded', title: 'Award Tender', message: 'Award this tender?'})}><Award className="h-4 w-4 mr-2"/> Award to Bidder</Button>
                <Button variant="outline" onClick={() => setActionDialog({type: 'open', title: 'Re-open Bidding', message: 'Re-open for new bids?'})}><Play className="h-4 w-4 mr-2"/> Re-open</Button>
                <Button variant="destructive" onClick={() => setActionDialog({type: 'cancel', title: 'Cancel Tender', message: 'Cancel this tender?'})}><XCircle className="h-4 w-4 mr-2"/> Cancel</Button>
              </>
            )}
            {tender.status === 'suspended' && (
              <>
                <Button onClick={() => setActionDialog({type: 'open', title: 'Resume Bidding', message: 'Resume accepting bids.'})}><Play className="h-4 w-4 mr-2"/> Resume</Button>
                <Button variant="destructive" onClick={() => setActionDialog({type: 'cancel', title: 'Cancel Tender', message: 'Cancel this tender?'})}><XCircle className="h-4 w-4 mr-2"/> Cancel</Button>
              </>
            )}
            {tender.status === 'awarded' && (
              <>
                <Button onClick={() => setActionDialog({type: 'closed', title: 'Close Tender', message: 'Mark as closed.'})}><CheckCircle className="h-4 w-4 mr-2"/> Close</Button>
                <Button variant="outline"><FileText className="h-4 w-4 mr-2"/> Generate LOA</Button>
              </>
            )}
            {['closed', 'cancelled', 'expired'].includes(tender.status) && (
              <>
                <Button variant="outline"><Archive className="h-4 w-4 mr-2"/> Archive</Button>
                <Button variant="outline"><Copy className="h-4 w-4 mr-2"/> Clone as New Tender</Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tender Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card p-4 rounded-lg border shadow-sm flex flex-col justify-center">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Users className="h-4 w-4" />
            <span className="text-sm font-medium">Total Bids</span>
          </div>
          <span className="text-2xl font-bold">{bids.length}</span>
        </div>
        <div className="bg-card p-4 rounded-lg border shadow-sm flex flex-col justify-center">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <BarChart3 className="h-4 w-4" />
            <span className="text-sm font-medium">Under Review</span>
          </div>
          <span className="text-2xl font-bold">{bidsUnderReview}</span>
        </div>
        <div className="bg-card p-4 rounded-lg border shadow-sm flex flex-col justify-center">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Clock className="h-4 w-4" />
            <span className="text-sm font-medium">Days Remaining</span>
          </div>
          <span className="text-2xl font-bold">{tender.status === 'open' ? daysRemaining : '---'}</span>
        </div>
        <div className="bg-card p-4 rounded-lg border shadow-sm flex flex-col justify-center">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <TrendingUp className="h-4 w-4" />
            <span className="text-sm font-medium">Est. Value</span>
          </div>
          <span className="text-xl font-bold truncate">₹{tender.estimated_value?.toLocaleString() || '---'}</span>
        </div>
      </div>

      <div className="bg-card text-card-foreground p-6 rounded-lg border shadow-sm space-y-6">
        
        <Section title="General Details">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-0">
            <Field label="Tender Reference Number" value={tender.reference_number} />
            <Field label="Tender Title" value={tender.title} />
            <Field label="Tender Type" value={tender.tender_type.replace('_', ' ')} />
            <Field label="Department" value={tender.department} />
            <Field label="Category" value={tender.category} />
            <Field label="Tender Denomination" value={tender.tender_denomination} />
            <Field label="Location Name" value={tender.location_name} />
            <Field label="Tender Scope" value={tender.tender_scope || tender.description} />
            <Field label="Commercial Bid Type" value={tender.commercial_bid_type} />
            <Field label="Tender Evaluation Method" value={tender.evaluation_method} />
            <Field label="Price List Type" value={tender.price_list_type} />
            <Field label="Estimated Value" value={tender.estimated_value ? `₹${tender.estimated_value.toLocaleString()}` : '---'} />
            <Field label="ECV / Non-ECV" value={tender.ecv_type} />
            <Field label="Denomination / Currency Type" value={tender.currency_type} />
            <Field label="Itemwise Technical Evaluation" value={tender.itemwise_technical_evaluation ? 'Yes' : 'No'} />
            <Field label="Highest Bidder Selection" value={tender.highest_bidder_selection ? 'Yes' : 'No'} />
            <Field label="Date Created" value={tender.created_at ? new Date(tender.created_at).toLocaleDateString() : '---'} />
            <Field label="Sample Remarks" value={tender.sample_remarks} />
            <Field label="File Number" value={tender.file_number} />
            <Field label="Procurement Entity Type" value={tender.procurement_entity_type} />
            <Field label="Multiple Currencies Allowed" value={tender.multiple_currencies_allowed ? 'Yes' : 'No'} />
          </div>
        </Section>
        
        <Section title="Policy & Compliance Required">
          <div className="flex flex-wrap gap-3 py-2">
            {tender.make_in_india_required && <Badge variant="secondary"><ShieldCheck className="h-3 w-3 mr-1" /> Make in India</Badge>}
            {tender.msme_required && <Badge variant="secondary"><ShieldCheck className="h-3 w-3 mr-1" /> MSME Priority</Badge>}
            {tender.startup_required && <Badge variant="secondary"><ShieldCheck className="h-3 w-3 mr-1" /> Startup Priority</Badge>}
            {tender.gem_registration_required && <Badge variant="secondary"><ShieldCheck className="h-3 w-3 mr-1" /> GeM Registration</Badge>}
            {!tender.make_in_india_required && !tender.msme_required && !tender.startup_required && !tender.gem_registration_required && (
              <span className="text-sm text-muted-foreground">No specific policy compliances flagged.</span>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-0 mt-4 border-t border-border/40 pt-2">
            <Field label="Minimum Turnover Required" value={tender.min_turnover ? `₹${tender.min_turnover.toLocaleString()}` : '---'} />
            <Field label="Local Content Percentage" value={tender.local_content_percentage ? `${tender.local_content_percentage}%` : '---'} />
          </div>
        </Section>

        <Section title="General Conditions of Eligibility">
          {(!tender.eligibility_conditions || tender.eligibility_conditions.length === 0) ? (
            <div className="py-2 border-b border-border/40 last:border-0">
              <span className="text-muted-foreground text-sm font-medium">Condition 1:</span>
              <span className="text-sm ml-4">---</span>
            </div>
          ) : (
            (tender.eligibility_conditions || []).map((cond: string, idx: number) => (
              <div key={idx} className="py-2 border-b border-border/40 last:border-0">
                <span className="text-muted-foreground text-sm font-medium">Condition {idx + 1}:</span>
                <span className="text-sm ml-4">{cond}</span>
              </div>
            ))
          )}
        </Section>

        <Section title="Technical Qualification Criteria">
          <div className="border rounded overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-16">S.No.</TableHead>
                  <TableHead>Criterion Type</TableHead>
                  <TableHead>Criterion Description</TableHead>
                  <TableHead>Required Documents</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(!tender.technical_criteria || tender.technical_criteria.length === 0) ? (
                  <TableRow>
                    <TableCell>1</TableCell>
                    <TableCell>---</TableCell>
                    <TableCell>---</TableCell>
                    <TableCell>---</TableCell>
                  </TableRow>
                ) : (
                  (tender.technical_criteria || []).map((tc, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell className="font-medium">{tc.criterion_type}</TableCell>
                      <TableCell>{tc.criterion_description}</TableCell>
                      <TableCell>{tc.criterion_documents}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Section>

        <Section title="Documents Required from Bidder">
          <div className="border rounded overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-16">S.No.</TableHead>
                  <TableHead>Document Type</TableHead>
                  <TableHead>Document Name</TableHead>
                  <TableHead className="text-right">Mandatory</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(!tender.required_documents_detailed || tender.required_documents_detailed.length === 0) ? (
                  <TableRow>
                    <TableCell>1</TableCell>
                    <TableCell>---</TableCell>
                    <TableCell>---</TableCell>
                    <TableCell className="text-right">---</TableCell>
                  </TableRow>
                ) : (
                  (tender.required_documents_detailed || []).map((doc, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell>{doc.document_type}</TableCell>
                      <TableCell>{doc.document_name}</TableCell>
                      <TableCell className="text-right">
                        {doc.is_mandatory ? <Badge>Yes</Badge> : <Badge variant="outline">No</Badge>}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Section>

        <Section title="Tender Group Items">
          <div className="border rounded overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-16">S.No.</TableHead>
                  <TableHead>Group Name</TableHead>
                  <TableHead>Mandatory Group</TableHead>
                  <TableHead>All Items Mandatory</TableHead>
                  <TableHead>No. of Items</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(!tender.tender_groups || tender.tender_groups.length === 0) ? (
                  <TableRow>
                    <TableCell>1</TableCell>
                    <TableCell>---</TableCell>
                    <TableCell>---</TableCell>
                    <TableCell>---</TableCell>
                    <TableCell>---</TableCell>
                  </TableRow>
                ) : (
                  (tender.tender_groups || []).map((group, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell className="font-medium">{group.group_name}</TableCell>
                      <TableCell>{group.is_mandatory ? 'Yes' : 'No'}</TableCell>
                      <TableCell>{group.all_items_mandatory ? 'Yes' : 'No'}</TableCell>
                      <TableCell>{group.items?.length || 0}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Section>

        <Section title="Delivery Schedule">
          <div className="border rounded overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-16">S.No.</TableHead>
                  <TableHead>Item Code</TableHead>
                  <TableHead>Object Name</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Scheduled Quantity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(!tender.delivery_schedule || tender.delivery_schedule.length === 0) ? (
                  <TableRow>
                    <TableCell>1</TableCell>
                    <TableCell>---</TableCell>
                    <TableCell>---</TableCell>
                    <TableCell>---</TableCell>
                    <TableCell className="text-right">---</TableCell>
                  </TableRow>
                ) : (
                  (tender.delivery_schedule || []).map((schedule, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell>{schedule.item_code}</TableCell>
                      <TableCell>{schedule.object_name}</TableCell>
                      <TableCell>{schedule.delivery_location || '---'}</TableCell>
                      <TableCell className="text-right">{schedule.scheduled_quantity}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Section>

        <Section title="Contact Information">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-0">
            <Field label="Contact Person Name" value={tender.contact_person_name} />
            <Field label="Designation" value={tender.contact_designation} />
            <Field label="Office Phone" value={tender.contact_phone} />
            <Field label="Mobile Phone" value={tender.contact_mobile} />
            <Field label="Email Address" value={tender.contact_email} />
            <Field label="Address" value={tender.contact_address} />
          </div>
        </Section>

        <Section title="Tender Amount Details">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-0">
            <Field label="EMD Amount (INR)" value={tender.emd_amount ? `₹${tender.emd_amount.toLocaleString()}` : '---'} />
            <Field label="Tender Fee (INR)" value={tender.tender_fee ? `₹${tender.tender_fee.toLocaleString()}` : '---'} />
            <Field label="Advance Deposit Amount (INR)" value={tender.advance_deposit_amount ? `₹${tender.advance_deposit_amount.toLocaleString()}` : '---'} />
            <Field label="Security Deposit %" value={tender.security_deposit_percentage ? `${tender.security_deposit_percentage}%` : '---'} />
            <Field label="Performance Security %" value={tender.performance_security_percentage ? `${tender.performance_security_percentage}%` : '---'} />
          </div>
        </Section>

        <Section title="Tender Schedule">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-0">
            <Field label="Submission Deadline" value={tender.submission_deadline ? new Date(tender.submission_deadline).toLocaleString() : '---'} />
            <Field label="Bid Validity Period" value={tender.bid_validity_period} />
            <Field label="Last Date & Time for Queries" value={tender.last_date_queries ? new Date(tender.last_date_queries).toLocaleString() : '---'} />
            <Field label="Last Date & Time for Receipt" value={tender.last_date_receipt ? new Date(tender.last_date_receipt).toLocaleString() : '---'} />
            <Field label="Pre-Bid Meeting Date" value={tender.pre_bid_meeting_date ? new Date(tender.pre_bid_meeting_date).toLocaleString() : '---'} />
            <Field label="Technical Bid Open Date" value={tender.technical_bid_open_date ? new Date(tender.technical_bid_open_date).toLocaleString() : '---'} />
            <Field label="Technical Bid Approver" value={tender.technical_bid_approver} />
            <Field label="Technical Bid Approved Date" value={tender.technical_bid_approved_date ? new Date(tender.technical_bid_approved_date).toLocaleString() : '---'} />
            <Field label="Financial Bid Opened Date" value={tender.financial_bid_opened_date ? new Date(tender.financial_bid_opened_date).toLocaleString() : '---'} />
            <Field label="Financial Bid Opened By" value={tender.financial_bid_opened_by} />
            <Field label="Financial Bid Approver" value={tender.financial_bid_approver} />
            <Field label="Financial Bid Approved Date" value={tender.financial_bid_approved_date ? new Date(tender.financial_bid_approved_date).toLocaleString() : '---'} />
            <Field label="Tender Awarded Date" value={tender.tender_awarded_date ? new Date(tender.tender_awarded_date).toLocaleString() : '---'} />
          </div>
        </Section>

        <Section title="Tender Published User Details">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-0">
            <Field label="Published User Name" value={tender.published_user_name} />
            <Field label="Published User Post" value={tender.published_user_post} />
          </div>
        </Section>

        <Section title="Additional Information">
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold mb-1 text-muted-foreground">Special Instructions</h4>
              <p className="text-sm whitespace-pre-line bg-muted/30 p-3 rounded-md border border-border/50">
                {tender.special_instructions || 'No special instructions provided.'}
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-1 text-muted-foreground">Terms and Conditions</h4>
              <p className="text-sm whitespace-pre-line bg-muted/30 p-3 rounded-md border border-border/50">
                {tender.terms_and_conditions || 'No additional terms and conditions provided.'}
              </p>
            </div>
          </div>
        </Section>

      </div>

      {/* Activity Log */}
      <div className="bg-card text-card-foreground p-6 rounded-lg border shadow-sm">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Activity Log
        </h2>
        <div className="space-y-4">
          {statusHistory.map((item, idx) => (
            <div key={idx} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="h-2 w-2 rounded-full bg-primary mt-1.5" />
                {idx < statusHistory.length - 1 && <div className="w-px h-full bg-border mt-1" />}
              </div>
              <div className="pb-4">
                <p className="font-medium text-sm">{item.action}</p>
                <div className="text-xs text-muted-foreground flex gap-2">
                  <span>{new Date(item.date).toLocaleString()}</span>
                  <span>•</span>
                  <span>{item.by}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bids Section */}
      <div id="bids-section" className="bg-card text-card-foreground p-6 rounded-lg border shadow-sm">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Bids Received
        </h2>
        
        {bidsLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : bids.length === 0 ? (
          <div className="text-center py-10 bg-muted/20 border border-dashed rounded-md">
            <p className="text-muted-foreground">No bids have been submitted yet.</p>
          </div>
        ) : (
          <div className="border rounded overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Bidder</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Submitted On</TableHead>
                  <TableHead>Compliance Score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...bids].sort((a, b) => (b.compliance_result?.overall_score || 0) - (a.compliance_result?.overall_score || 0)).map((bid) => (
                  <TableRow key={bid.id}>
                    <TableCell className="font-medium">{bid.bidder?.full_name || 'Unknown'}</TableCell>
                    <TableCell>{bid.bidder?.organization || '---'}</TableCell>
                    <TableCell>{new Date(bid.submitted_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {bid.compliance_result ? (
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-primary">{bid.compliance_result.overall_score.toFixed(1)}/100</span>
                          <Badge variant={
                            bid.compliance_result.risk_level === 'low' ? 'default' :
                            bid.compliance_result.risk_level === 'medium' ? 'secondary' :
                            'destructive'
                          }>
                            {bid.compliance_result.risk_level.toUpperCase()}
                          </Badge>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">Not Scored</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {bid.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/officer/compliance/${bid.id}`}>
                            <Shield className="h-4 w-4 mr-1" /> Review
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

    </div>
  );
}
