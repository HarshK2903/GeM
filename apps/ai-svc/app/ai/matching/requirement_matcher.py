"""
Requirement ↔ Evidence Matcher

Compares tender eligibility requirements against verified bidder evidence.
Produces a per-requirement match status: met / unmet / partial.
"""

import logging
from typing import Dict, List, Any

logger = logging.getLogger("ai-svc.matching")


class MatchResult:
    def __init__(self, requirement_id: str, requirement_text: str, status: str,
                 evidence_summary: str = "", source_document: str = "", confidence: float = 0.0):
        self.requirement_id = requirement_id
        self.requirement_text = requirement_text
        self.status = status  # "met" | "unmet" | "partial"
        self.evidence_summary = evidence_summary
        self.source_document = source_document
        self.confidence = confidence

    def to_dict(self) -> dict:
        return {
            "requirement_id": self.requirement_id,
            "requirement_text": self.requirement_text,
            "status": self.status,
            "evidence_summary": self.evidence_summary,
            "source_document": self.source_document,
            "confidence": self.confidence,
        }


def match_requirements(
    tender_requirements: Dict[str, Any],
    verification_results: Dict[str, Any],
    extracted_data: Dict[str, Dict[str, str]],
) -> List[MatchResult]:
    """
    Match tender requirements against verified bidder evidence.

    Args:
        tender_requirements: Parsed tender eligibility requirements
        verification_results: Results from verification orchestrator (doc_type -> result)
        extracted_data: OCR-extracted data per document (doc_type -> fields)

    Returns:
        List of MatchResult for each requirement
    """
    matches = []

    # --- Check required document submissions ---
    required_docs = tender_requirements.get("required_documents", [])
    for doc_type in required_docs:
        verification = verification_results.get(doc_type)
        extracted = extracted_data.get(doc_type, {})

        if not verification:
            matches.append(MatchResult(
                requirement_id=f"doc_{doc_type}",
                requirement_text=f"{doc_type.upper()} document submission required",
                status="unmet",
                evidence_summary=f"No {doc_type} document submitted",
                confidence=1.0,
            ))
        elif verification.get("status") == "verified":
            matches.append(MatchResult(
                requirement_id=f"doc_{doc_type}",
                requirement_text=f"{doc_type.upper()} document submission required",
                status="met",
                evidence_summary=f"{doc_type} verified against government registry",
                source_document=doc_type,
                confidence=0.95,
            ))
        elif verification.get("status") == "mismatch":
            mismatches = verification.get("mismatches", [])
            matches.append(MatchResult(
                requirement_id=f"doc_{doc_type}",
                requirement_text=f"{doc_type.upper()} document submission required",
                status="partial",
                evidence_summary=f"{doc_type} has mismatches: {'; '.join(mismatches)}",
                source_document=doc_type,
                confidence=0.6,
            ))
        else:
            matches.append(MatchResult(
                requirement_id=f"doc_{doc_type}",
                requirement_text=f"{doc_type.upper()} document submission required",
                status="unmet",
                evidence_summary=f"{doc_type} verification status: {verification.get('status', 'unknown')}",
                source_document=doc_type,
                confidence=0.8,
            ))

    # --- Check MSME requirement ---
    if tender_requirements.get("msme_required", False):
        udyam = verification_results.get("udyam")
        if udyam and udyam.get("status") == "verified":
            enterprise_type = udyam.get("registry_data", {}).get("enterprise_type", "Unknown")
            matches.append(MatchResult(
                requirement_id="msme_status",
                requirement_text="MSME/Udyam registration required",
                status="met",
                evidence_summary=f"Registered as {enterprise_type} Enterprise (Udyam verified)",
                source_document="udyam",
                confidence=0.95,
            ))
        else:
            matches.append(MatchResult(
                requirement_id="msme_status",
                requirement_text="MSME/Udyam registration required",
                status="unmet",
                evidence_summary="No valid Udyam registration found",
                confidence=0.9,
            ))

    # --- Check Make in India requirement ---
    if tender_requirements.get("make_in_india_required", False):
        min_local = tender_requirements.get("local_content_percentage", 50)
        mii_data = extracted_data.get("make_in_india", {})
        declared_pct = float(mii_data.get("local_content_percentage", 0))

        if declared_pct >= min_local:
            matches.append(MatchResult(
                requirement_id="make_in_india",
                requirement_text=f"Make in India — minimum {min_local}% local content",
                status="met",
                evidence_summary=f"Declared local content: {declared_pct}% (≥ {min_local}%)",
                source_document="make_in_india",
                confidence=0.85,
            ))
        elif declared_pct > 0:
            matches.append(MatchResult(
                requirement_id="make_in_india",
                requirement_text=f"Make in India — minimum {min_local}% local content",
                status="partial",
                evidence_summary=f"Declared local content: {declared_pct}% (below required {min_local}%)",
                source_document="make_in_india",
                confidence=0.85,
            ))
        else:
            matches.append(MatchResult(
                requirement_id="make_in_india",
                requirement_text=f"Make in India — minimum {min_local}% local content",
                status="unmet",
                evidence_summary="No local content declaration found",
                confidence=0.9,
            ))

    # --- Check Startup India requirement ---
    if tender_requirements.get("startup_required", False):
        startup = verification_results.get("startup_certificate")
        if startup and startup.get("status") == "verified":
            matches.append(MatchResult(
                requirement_id="startup_india",
                requirement_text="Startup India recognition required",
                status="met",
                evidence_summary="Valid Startup India certificate verified",
                source_document="startup_certificate",
                confidence=0.95,
            ))
        else:
            matches.append(MatchResult(
                requirement_id="startup_india",
                requirement_text="Startup India recognition required",
                status="unmet",
                evidence_summary="No valid Startup India certificate found",
                confidence=0.9,
            ))

    # --- Check minimum turnover ---
    min_turnover = tender_requirements.get("min_turnover")
    if min_turnover and min_turnover > 0:
        income_data = extracted_data.get("income_tax", {})
        total_income = float(income_data.get("total_income", 0))

        if total_income >= min_turnover:
            matches.append(MatchResult(
                requirement_id="min_turnover",
                requirement_text=f"Minimum annual turnover ₹{min_turnover:,.0f}",
                status="met",
                evidence_summary=f"Declared income: ₹{total_income:,.0f}",
                source_document="income_tax",
                confidence=0.8,
            ))
        else:
            matches.append(MatchResult(
                requirement_id="min_turnover",
                requirement_text=f"Minimum annual turnover ₹{min_turnover:,.0f}",
                status="unmet",
                evidence_summary=f"Declared income: ₹{total_income:,.0f} (below required ₹{min_turnover:,.0f})",
                source_document="income_tax",
                confidence=0.8,
            ))

    # --- Check blacklist status ---
    # This is always checked regardless of tender requirements
    blacklist = verification_results.get("blacklist")
    if blacklist and blacklist.get("status") == "verified":
        # Being "verified" in blacklist means the entity IS blacklisted
        matches.append(MatchResult(
            requirement_id="blacklist_check",
            requirement_text="Not blacklisted/debarred by any government agency",
            status="unmet",
            evidence_summary="⚠️ ENTITY FOUND IN DEBARMENT/BLACKLIST DATABASE",
            source_document="blacklist",
            confidence=1.0,
        ))
    else:
        matches.append(MatchResult(
            requirement_id="blacklist_check",
            requirement_text="Not blacklisted/debarred by any government agency",
            status="met",
            evidence_summary="Entity not found in any blacklist/debarment database",
            confidence=0.9,
        ))

    # --- Check DigiLocker verification ---
    digilocker = verification_results.get("digilocker")
    if digilocker:
        if digilocker.get("status") == "verified":
            matches.append(MatchResult(
                requirement_id="digilocker_verification",
                requirement_text="DigiLocker document verification",
                status="met",
                evidence_summary="Document digitally verified via DigiLocker",
                source_document="digilocker",
                confidence=0.95,
            ))
        elif digilocker.get("status") == "mismatch":
            matches.append(MatchResult(
                requirement_id="digilocker_verification",
                requirement_text="DigiLocker document verification",
                status="partial",
                evidence_summary="DigiLocker document has discrepancies",
                source_document="digilocker",
                confidence=0.6,
            ))
        else:
            matches.append(MatchResult(
                requirement_id="digilocker_verification",
                requirement_text="DigiLocker document verification",
                status="unmet",
                evidence_summary=f"DigiLocker verification status: {digilocker.get('status', 'unknown')}",
                source_document="digilocker",
                confidence=0.8,
            ))

    # --- Check BIS certification ---
    bis = verification_results.get("bis_certificate")
    if bis:
        if bis.get("status") == "verified":
            matches.append(MatchResult(
                requirement_id="bis_certification",
                requirement_text="BIS (Bureau of Indian Standards) certification",
                status="met",
                evidence_summary="Valid BIS certification verified against registry",
                source_document="bis_certificate",
                confidence=0.95,
            ))
        else:
            matches.append(MatchResult(
                requirement_id="bis_certification",
                requirement_text="BIS (Bureau of Indian Standards) certification",
                status="unmet",
                evidence_summary=f"BIS verification status: {bis.get('status', 'unknown')}",
                source_document="bis_certificate",
                confidence=0.8,
            ))

    # --- Check Income Tax Return filing ---
    itr = verification_results.get("income_tax")
    if itr and itr.get("filing_verified"):
        matches.append(MatchResult(
            requirement_id="income_tax_filing",
            requirement_text="Income Tax Return filing verification",
            status="met",
            evidence_summary=f"ITR filing verified — AY {itr.get('assessment_year', 'N/A')}, status: {itr.get('filing_status', 'filed')}",
            source_document="income_tax",
            confidence=0.9,
        ))
    elif itr and itr.get("status") == "verified":
        matches.append(MatchResult(
            requirement_id="income_tax_filing",
            requirement_text="Income Tax Return filing verification",
            status="partial",
            evidence_summary="PAN verified but ITR filing status could not be confirmed",
            source_document="income_tax",
            confidence=0.7,
        ))

    # --- Check custom eligibility requirements ---
    custom_reqs = tender_requirements.get("eligibility_checks", [])
    for req in custom_reqs:
        # For custom requirements, we do a best-effort match
        matches.append(MatchResult(
            requirement_id=req.get("id", "custom"),
            requirement_text=req.get("description", "Custom requirement"),
            status="partial",  # Custom reqs need officer review
            evidence_summary="Requires manual officer verification",
            confidence=0.5,
        ))

    logger.info(f"Matched {len(matches)} requirements: "
                f"{sum(1 for m in matches if m.status == 'met')} met, "
                f"{sum(1 for m in matches if m.status == 'partial')} partial, "
                f"{sum(1 for m in matches if m.status == 'unmet')} unmet")

    return matches
