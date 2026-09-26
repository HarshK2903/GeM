"""
Fraud & Collusion Detection Module

Implements rule-based heuristics to detect fraud, collusion, and suspicious patterns.
"""

import logging
from typing import Dict, List, Any
import datetime
import re

logger = logging.getLogger("ai-svc.fraud")


class FraudCheckResult:
    def __init__(self):
        self.is_suspicious = False
        self.risk_score = 0.0  # 0-100, higher = more suspicious
        self.flags: List[Dict] = []
        self.checks_performed: List[Dict] = []

    def to_dict(self):
        return {
            "is_suspicious": self.is_suspicious,
            "risk_score": min(self.risk_score, 100.0),
            "flags": self.flags,
            "checks_performed": self.checks_performed,
        }


async def detect_fraud(
    documents: List[Dict],
    verification_results: Dict[str, Any],
    bid_data: Dict[str, Any] = None,
    bidder_data: Dict[str, Any] = None,
    tender_requirements: Dict[str, Any] = None,
) -> FraudCheckResult:
    """
    Run fraud and collusion detection checks.
    """
    result = FraudCheckResult()
    bid_data = bid_data or {}
    bidder_data = bidder_data or {}
    tender_requirements = tender_requirements or {}
    
    # Extract common data for cross-document consistency
    extracted_data_list = [doc.get("extracted_data", {}) for doc in documents if doc.get("extracted_data")]
    
    # 1. Document Freshness Check
    freshness_impact = 0
    freshness_status = "pass"
    stale_docs = []
    
    current_date = datetime.datetime.now()
    for doc in documents:
        extracted = doc.get("extracted_data", {})
        # Look for dates in common fields
        date_str = extracted.get("registration_date") or extracted.get("issued_date") or extracted.get("date_of_registration")
        if date_str:
            try:
                # Try parsing DD/MM/YYYY or DD-MM-YYYY
                doc_date = None
                if "/" in date_str:
                    doc_date = datetime.datetime.strptime(date_str, "%d/%m/%Y")
                elif "-" in date_str:
                    doc_date = datetime.datetime.strptime(date_str, "%d-%m-%Y")
                
                if doc_date and (current_date - doc_date).days > 180:
                    stale_docs.append(doc.get("doc_type", "unknown"))
            except ValueError:
                pass
                
    if stale_docs:
        freshness_impact = 15
        freshness_status = "warn"
        result.flags.append({
            "type": "warning",
            "category": "document_freshness",
            "severity": "medium",
            "description": f"Documents older than 6 months: {', '.join(stale_docs)}",
            "evidence": {"stale_docs": stale_docs}
        })
        
    result.risk_score += freshness_impact
    result.checks_performed.append({
        "name": "document_freshness",
        "status": freshness_status,
        "score_impact": freshness_impact,
        "description": "Checks if submitted documents are older than 6 months."
    })
    
    # 2. Cross-Document Consistency
    consistency_impact = 0
    consistency_status = "pass"
    
    entity_names = []
    pan_numbers = []
    
    for extracted in extracted_data_list:
        name = extracted.get("enterprise_name") or extracted.get("legal_name") or extracted.get("name") or extracted.get("company_name")
        if name:
            entity_names.append(name.lower().strip())
        pan = extracted.get("pan_number")
        if pan:
            pan_numbers.append(pan.upper().strip())
            
    # Check for name mismatch (simple exact match ignoring case/spaces for now)
    unique_names = set(entity_names)
    if len(unique_names) > 1:
        consistency_impact += 20
        consistency_status = "fail"
        result.flags.append({
            "type": "error",
            "category": "consistency",
            "severity": "high",
            "description": "Entity names do not match across documents",
            "evidence": {"names": list(unique_names)}
        })
        
    unique_pans = set(pan_numbers)
    if len(unique_pans) > 1:
        consistency_impact += 10
        if consistency_status == "pass":
            consistency_status = "fail"
        result.flags.append({
            "type": "error",
            "category": "consistency",
            "severity": "high",
            "description": "PAN numbers do not match across documents",
            "evidence": {"pans": list(unique_pans)}
        })
        
    result.risk_score += consistency_impact
    result.checks_performed.append({
        "name": "cross_doc_consistency",
        "status": consistency_status,
        "score_impact": consistency_impact,
        "description": "Verifies that entity names and PANs are consistent across all documents."
    })
    
    # 3. Bid Amount Analysis
    bid_impact = 0
    bid_status = "pass"
    
    estimated_value = float(tender_requirements.get("estimated_value", 0) or bid_data.get("estimated_value", 0))
    bid_amount = float(bid_data.get("bid_amount", 0))
    
    if estimated_value and bid_amount:
        ratio = bid_amount / estimated_value
        if ratio < 0.5:
            bid_impact += 25
            bid_status = "warn"
            result.flags.append({
                "type": "warning",
                "category": "abnormally_low_bid",
                "severity": "high",
                "description": f"Bid amount is {ratio:.0%} of estimated value (abnormally low)",
                "evidence": {"ratio": ratio}
            })
        elif ratio > 1.5:
            bid_impact += 15
            bid_status = "warn"
            result.flags.append({
                "type": "warning",
                "category": "inflated_bid",
                "severity": "medium",
                "description": f"Bid amount is {ratio:.0%} of estimated value (inflated)",
                "evidence": {"ratio": ratio}
            })
            
        # Suspiciously round number
        if bid_amount > 0 and bid_amount % 100000 == 0:
            bid_impact += 5
            if bid_status == "pass":
                bid_status = "warn"
            result.flags.append({
                "type": "warning",
                "category": "round_number_bid",
                "severity": "low",
                "description": "Bid amount is a suspiciously round number",
                "evidence": {"amount": bid_amount}
            })
            
    result.risk_score += bid_impact
    result.checks_performed.append({
        "name": "bid_amount_analysis",
        "status": bid_status,
        "score_impact": bid_impact,
        "description": "Checks if the bid amount is abnormally low, high, or suspiciously round."
    })
    
    # 4. Verification Failure Pattern
    failure_impact = 0
    failure_status = "pass"
    
    failed_docs = 0
    critical_mismatch = False
    for doc_type, vr in verification_results.items():
        if isinstance(vr, dict):
            status = vr.get("status")
        else:
            status = getattr(vr, "status", None)
            
        if status in ("failed", "not_found", "mismatch", "expired"):
            failed_docs += 1
            failure_impact += 10
            
            if doc_type in ("pan", "gst") and status == "mismatch":
                critical_mismatch = True
                failure_impact += 20
                
    if critical_mismatch:
        failure_status = "fail"
        result.flags.append({
            "type": "error",
            "category": "critical_mismatch",
            "severity": "high",
            "description": "Critical mismatch on core documents (PAN/GST)",
            "evidence": {}
        })
    elif failed_docs > 0:
        failure_status = "warn"
        
    result.risk_score += failure_impact
    result.checks_performed.append({
        "name": "verification_failure_pattern",
        "status": failure_status,
        "score_impact": failure_impact,
        "description": "Analyzes patterns of failures across document verifications."
    })
    
    # 5. Completeness Red Flags
    completeness_impact = 0
    completeness_status = "pass"
    
    required_docs = tender_requirements.get("required_documents", [])
    submitted_doc_types = [doc.get("doc_type") for doc in documents]
    
    if required_docs:
        missing = [doc for doc in required_docs if doc not in submitted_doc_types]
        missing_ratio = len(missing) / len(required_docs)
        if missing_ratio > 0.3:
            completeness_impact += 15
            completeness_status = "fail"
            result.flags.append({
                "type": "error",
                "category": "incomplete_submission",
                "severity": "high",
                "description": f"Missing >30% of required documents: {', '.join(missing)}",
                "evidence": {"missing": missing}
            })
            
    result.risk_score += completeness_impact
    result.checks_performed.append({
        "name": "completeness_red_flags",
        "status": completeness_status,
        "score_impact": completeness_impact,
        "description": "Checks if a significant portion of required documents are missing."
    })
    
    # 6. Registry Status Flags
    registry_impact = 0
    registry_status = "pass"
    
    # Check blacklist first
    blacklist_info = verification_results.get("blacklist", {})
    if isinstance(blacklist_info, dict):
        bl_status = blacklist_info.get("status")
    else:
        bl_status = getattr(blacklist_info, "status", None)
        
    if bl_status == "blacklisted":
        registry_impact += 30
        registry_status = "fail"
        result.flags.append({
            "type": "error",
            "category": "blacklisted",
            "severity": "critical",
            "description": "Entity is blacklisted on the government portal",
            "evidence": {}
        })
        
    # Check defaulter
    is_defaulter = False
    for doc_type, vr in verification_results.items():
        if isinstance(vr, dict):
            mismatches = vr.get("mismatches", [])
        else:
            mismatches = getattr(vr, "mismatches", [])
            
        for mismatch in mismatches:
            if "defaulter" in str(mismatch).lower():
                is_defaulter = True
                
    if is_defaulter:
        registry_impact += 25
        if registry_status == "pass":
            registry_status = "fail"
        result.flags.append({
            "type": "error",
            "category": "registry_defaulter",
            "severity": "high",
            "description": "Entity is marked as a defaulter in one or more registries",
            "evidence": {}
        })
        
    result.risk_score += registry_impact
    result.checks_performed.append({
        "name": "registry_status_flags",
        "status": registry_status,
        "score_impact": registry_impact,
        "description": "Checks registry data for blacklist or defaulter status."
    })
    
    # Wrap up
    result.risk_score = min(result.risk_score, 100.0)
    result.is_suspicious = result.risk_score >= 30
    
    logger.info(f"Fraud check complete: suspicious={result.is_suspicious}, score={result.risk_score}")
    return result
