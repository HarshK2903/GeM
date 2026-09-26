"""
Full AI Compliance Pipeline Orchestrator

This orchestrates the complete flow:
  1. OCR Extraction → Extract text + fields from uploaded documents
  2. Verification → Check extracted data against government registries
  3. Requirement Matching → Compare verified data against tender requirements
  4. Fraud Detection → Run collusion/anomaly checks
  5. Scoring → Compute multi-dimensional compliance scores
  6. Recommendation → AI-generated recommendation + reasoning trace

Supports partial re-runs (only re-process affected documents on clarification).
Emits progress events for real-time pipeline visualization.
"""

import asyncio
import logging
import time
from typing import Dict, List, Any, Callable, Optional

from app.ai.ocr import extract_text_from_image, extract_fields
from app.ai.verification import verify_all_documents
from app.ai.matching import match_requirements
from app.ai.scoring import compute_scores
from app.ai.fraud import detect_fraud
from app.ai.rag import generate_recommendation

logger = logging.getLogger("ai-svc.pipeline")


class PipelineResult:
    """Complete result of the AI compliance pipeline."""

    def __init__(self):
        self.bid_id = ""
        self.scores = None
        self.requirement_matches = []
        self.flags = []
        self.issues = []
        self.evidence = {}
        self.ai_recommendation = ""
        self.reasoning_trace = ""
        self.reasoning_structured = {}
        self.risk_level = "medium"
        self.pipeline_duration_ms = 0
        self.steps_completed = []
        self.fraud_result = None

    def to_dict(self) -> dict:
        scores_dict = self.scores.to_dict() if hasattr(self.scores, "to_dict") else (self.scores or {})
        return {
            "bid_id": self.bid_id,
            "scores": scores_dict,
            "overall_score": scores_dict.get("overall", 0),
            "eligibility_score": scores_dict.get("eligibility", 0),
            "compliance_score": scores_dict.get("compliance", 0),
            "risk_score": scores_dict.get("risk", 0),
            "completeness_score": scores_dict.get("completeness", 0),
            "quality_score": scores_dict.get("quality", 0),
            "risk_level": self.risk_level,
            "requirement_matches": {m.requirement_id: m.to_dict() for m in self.requirement_matches}
                if self.requirement_matches and hasattr(self.requirement_matches[0], "to_dict")
                else self.requirement_matches,
            "flags": self.flags,
            "issues": self.issues,
            "evidence": self.evidence,
            "ai_recommendation": self.ai_recommendation,
            "reasoning_trace": self.reasoning_trace,
            "reasoning_trace_structured": self.reasoning_structured,
            "pipeline_duration_ms": self.pipeline_duration_ms,
            "pipeline_steps_completed": self.steps_completed,
            "fraud_check": self.fraud_result.to_dict() if self.fraud_result else None,
        }


async def run_pipeline(
    bid_id: str,
    tender_id: str,
    documents: List[Dict[str, Any]],
    tender_requirements: Dict[str, Any],
    bid_data: Dict[str, Any] = None,
    bidder_data: Dict[str, Any] = None,
    partial_rerun: bool = False,
    rerun_doc_types: List[str] = None,
    progress_callback: Optional[Callable] = None,
) -> PipelineResult:
    """
    Run the full AI compliance pipeline.

    Args:
        bid_id: UUID of the bid being evaluated
        tender_id: UUID of the tender
        documents: List of document info dicts (doc_type, file_path, etc.)
        tender_requirements: Parsed tender requirements
        bid_data: Bid details (amount, etc.)
        bidder_data: Bidder profile data
        partial_rerun: If True, only re-process specified doc types
        rerun_doc_types: Which doc types to re-verify (for clarification flow)
        progress_callback: Async function called with (step_name, status, progress%, message)
    """
    result = PipelineResult()
    result.bid_id = bid_id
    bid_data = bid_data or {}
    bidder_data = bidder_data or {}
    start_time = time.time()

    async def emit_progress(step: str, status: str, progress: float, details: dict = None):
        if details is None:
            details = {}
        import json
        message = json.dumps(details)
        step_entry = {"name": step, "status": status, "duration_ms": 0}
        if progress_callback:
            await progress_callback(bid_id, step, status, progress, message)
        logger.info(f"Pipeline [{bid_id[:8]}] {step}: {status} ({progress:.0f}%) — {message}")
        return step_entry

    try:
        # ============================================
        # Step 1: OCR Extraction
        # ============================================
        step = await emit_progress("ocr", "started", 0, {"total_documents": len(docs_to_process)})

        docs_to_process = documents
        if partial_rerun and rerun_doc_types:
            docs_to_process = [d for d in documents if d.get("doc_type") in rerun_doc_types]

        extracted_data = {}
        total_fields = 0
        for i, doc in enumerate(docs_to_process):
            doc_type = doc.get("doc_type", "other")
            file_path = doc.get("file_path", "")

            raw_text, confidence = extract_text_from_image(file_path)
            fields = extract_fields(raw_text, doc_type)
            total_fields += len(fields)

            extracted_data[doc_type] = fields
            result.evidence[doc_type] = {
                "doc_type": doc_type,
                "status": "extracted",
                "data": fields,
                "confidence": confidence,
                "source": doc.get("original_filename", ""),
            }

            progress = ((i + 1) / len(docs_to_process)) * 20
            await emit_progress("ocr", "processing", progress, {"document": doc.get("original_filename", doc_type), "index": i, "total": len(docs_to_process)})

        step["status"] = "completed"
        step["duration_ms"] = int((time.time() - start_time) * 1000)
        result.steps_completed.append(step)
        await emit_progress("ocr", "completed", 20, {"documents_processed": len(extracted_data), "fields_extracted": total_fields})

        # ============================================
        # Step 2: Verification
        # ============================================
        verify_start = time.time()
        await emit_progress("verification", "started", 20, "Verifying against government registries...")

        verification_docs = [
            {
                "doc_type": doc_type,
                "extracted_data": fields,
            }
            for doc_type, fields in extracted_data.items()
        ]

        verification_results_raw = await verify_all_documents(
            verification_docs,
            progress_callback=emit_progress
        )

        # Convert to dict format
        verification_results = {}
        for doc_type, vr in verification_results_raw.items():
            verification_results[doc_type] = {
                "status": vr.status,
                "registry_data": vr.registry_data,
                "mismatches": vr.mismatches,
                "errors": vr.errors,
                "verified_at": vr.verified_at,
            }
            # Update evidence
            if doc_type in result.evidence:
                result.evidence[doc_type]["status"] = vr.status
                result.evidence[doc_type]["verification"] = verification_results[doc_type]

        step2 = {"name": "verification", "status": "completed",
                  "duration_ms": int((time.time() - verify_start) * 1000)}
        result.steps_completed.append(step2)
        await emit_progress("verification", "completed", 45, f"Verified {len(verification_results)} documents")

        # ============================================
        # Step 3: Requirement Matching
        # ============================================
        match_start = time.time()
        await emit_progress("matching", "started", 45, "Matching requirements against evidence...")

        requirement_matches = match_requirements(
            tender_requirements, verification_results, extracted_data
        )
        result.requirement_matches = requirement_matches

        step3 = {"name": "matching", "status": "completed",
                  "duration_ms": int((time.time() - match_start) * 1000)}
        result.steps_completed.append(step3)
        await emit_progress("matching", "completed", 60, f"Matched {len(requirement_matches)} requirements")

        # ============================================
        # Step 4: Fraud Detection
        # ============================================
        fraud_start = time.time()
        await emit_progress("fraud_detection", "started", 60, {"checks": ["document_freshness", "cross_doc_consistency", "bid_amount_analysis", "verification_failure_pattern", "completeness_red_flags", "registry_status_flags"]})

        fraud_result = await detect_fraud(
            documents=documents,
            verification_results=verification_results,
            bid_data=bid_data,
            bidder_data=bidder_data,
            tender_requirements=tender_requirements,
        )
        result.fraud_result = fraud_result

        # Emit events for each check
        for i, check in enumerate(fraud_result.checks_performed):
            pct = 60 + ((i + 1) / len(fraud_result.checks_performed)) * 10
            await emit_progress("fraud_detection", "check_complete", pct, {
                "check": check.get("name"),
                "status": check.get("status"),
                "impact": check.get("score_impact")
            })

        # Add fraud flags to main flags
        for flag in fraud_result.flags:
            result.flags.append({
                "type": flag.get("type", "warning"),
                "message": f"[Fraud Check] {flag.get('description', '')}",
                "field": flag.get("category", ""),
                "recommendation": "",
            })

        step4 = {"name": "fraud_detection", "status": "completed",
                  "duration_ms": int((time.time() - fraud_start) * 1000)}
        result.steps_completed.append(step4)
        await emit_progress("fraud_detection", "completed", 70, {"risk_score": fraud_result.risk_score, "is_suspicious": fraud_result.is_suspicious})

        # ============================================
        # Step 5: Scoring
        # ============================================
        score_start = time.time()
        await emit_progress("scoring", "started", 70, {})

        scores = compute_scores(
            requirement_matches=requirement_matches,
            verification_results=verification_results,
            extracted_data=extracted_data,
            tender_requirements=tender_requirements,
        )
        result.scores = scores
        result.risk_level = scores.risk_level
        result.flags.extend(scores.flags)
        result.issues.extend(scores.issues)

        # Emit events for each dimension
        scores_dict = scores.to_dict() if hasattr(scores, "to_dict") else scores
        await emit_progress("scoring", "dimension", 75, {"name": "eligibility", "score": scores_dict.get("eligibility", 0)})
        await emit_progress("scoring", "dimension", 80, {"name": "compliance", "score": scores_dict.get("compliance", 0)})
        await emit_progress("scoring", "dimension", 82, {"name": "risk", "score": scores_dict.get("risk", 0)})

        step5 = {"name": "scoring", "status": "completed",
                  "duration_ms": int((time.time() - score_start) * 1000)}
        result.steps_completed.append(step5)
        await emit_progress("scoring", "completed", 85, {"overall": scores_dict.get("overall", 0), "risk_level": scores_dict.get("risk_level", "medium")})

        # ============================================
        # Step 6: AI Recommendation
        # ============================================
        rec_start = time.time()
        await emit_progress("recommendation", "started", 85, {"model": "llama-3.3-70b-versatile"})

        matches_dict = [m.to_dict() for m in requirement_matches]
        recommendation, reasoning_trace, reasoning_structured = generate_recommendation(
            scores=scores_dict,
            requirement_matches=matches_dict,
            flags=result.flags,
            issues=result.issues,
            evidence=result.evidence,
            tender_info=tender_requirements,
            department=tender_requirements.get("department", ""),
        )

        result.ai_recommendation = recommendation
        result.reasoning_trace = reasoning_trace
        result.reasoning_structured = reasoning_structured

        step6 = {"name": "recommendation", "status": "completed",
                  "duration_ms": int((time.time() - rec_start) * 1000)}
        result.steps_completed.append(step6)
        
        decision = reasoning_structured.get("recommendation", "N/A")
        confidence = reasoning_structured.get("steps", [{}])[0].get("confidence", 0.0) if reasoning_structured.get("steps") else 0.0
        await emit_progress("recommendation", "completed", 100, {"decision": decision, "confidence": confidence})

    except Exception as e:
        logger.error(f"Pipeline error for bid {bid_id}: {e}", exc_info=True)
        await emit_progress("error", "failed", 0, str(e))

    result.pipeline_duration_ms = int((time.time() - start_time) * 1000)
    logger.info(f"Pipeline completed for bid {bid_id} in {result.pipeline_duration_ms}ms")

    return result
