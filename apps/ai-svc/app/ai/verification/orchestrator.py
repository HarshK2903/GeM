"""
Verification Orchestrator

Runs parallel verification calls against mock government APIs.
Each verifier checks extracted document data against the mock registry.
Designed to be swappable with real API integrations.
"""

import asyncio
import logging
import time
from typing import Dict, List, Tuple, Optional, Callable

import httpx

logger = logging.getLogger("ai-svc.verification")

MOCK_API_BASE = "http://localhost:8001/api/registry"


class VerificationResult:
    def __init__(self, doc_type: str, status: str, registry_data: dict = None,
                 mismatches: list = None, errors: list = None):
        self.doc_type = doc_type
        self.status = status  # verified | failed | mismatch | not_found | expired
        self.registry_data = registry_data or {}
        self.mismatches = mismatches or []
        self.errors = errors or []
        self.verified_at = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


async def verify_document(
    doc_type: str,
    extracted_data: Dict[str, str],
    registration_number: str,
) -> VerificationResult:
    """
    Verify a single document against the mock government registry.
    """
    verifiers = {
        "udyam": _verify_udyam,
        "gst": _verify_gst,
        "pan": _verify_pan,
        "income_tax": _verify_income_tax,
        "epfo": _verify_epfo,
        "esic": _verify_esic,
        "startup_certificate": _verify_startup,
        "nsic": _verify_nsic,
        "company_registration": _verify_mca21,
        "oem_authorization": _verify_oem,
        "make_in_india": _verify_make_in_india,
        "digilocker": _verify_digilocker,
        "bis": _verify_bis,
    }

    verifier = verifiers.get(doc_type, _verify_generic)

    try:
        result = await verifier(doc_type, extracted_data, registration_number)
        logger.info(f"Verification [{doc_type}] → {result.status} (reg: {registration_number})")
        return result
    except Exception as e:
        logger.error(f"Verification [{doc_type}] failed: {e}")
        return VerificationResult(
            doc_type=doc_type,
            status="failed",
            errors=[str(e)]
        )


async def _check_blacklist(pan: str, entity_name: str) -> VerificationResult:
    """Check if the entity is blacklisted."""
    # Check by PAN first
    identifier = pan if pan else entity_name
    if not identifier:
        return VerificationResult("blacklist", "clean", {})
        
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            resp = await client.get(f"http://localhost:8001/api/blacklist/check/{identifier}")
            if resp.status_code == 200:
                data = resp.json()
                if data.get("is_blacklisted"):
                    return VerificationResult("blacklist", "blacklisted", data.get("details", {}), errors=[data.get("reason", "Blacklisted")])
                else:
                    return VerificationResult("blacklist", "clean", data)
            else:
                logger.warning(f"Blacklist check for {identifier} returned {resp.status_code}")
                return VerificationResult("blacklist", "failed", errors=[f"API error: {resp.status_code}"])
        except Exception as e:
            logger.error(f"Blacklist check failed: {e}")
            return VerificationResult("blacklist", "failed", errors=[str(e)])


async def verify_all_documents(
    documents: List[Dict],
    progress_callback: Optional[Callable] = None,
) -> Dict[str, VerificationResult]:
    """
    Run verification for all documents in parallel.
    Returns a dict of doc_type -> VerificationResult.
    """
    
    registries = [doc["doc_type"] for doc in documents]
    if progress_callback:
        await progress_callback("verification", "started", 20.0, {"registries": registries})

    async def _verify_with_progress(doc):
        doc_type = doc["doc_type"]
        reg_number = _get_registration_number(doc_type, doc.get("extracted_data", {}))
        
        if progress_callback:
            await progress_callback("verification", "checking", 30.0, {"registry": doc_type, "status": "checking"})
            
        result = await verify_document(
            doc_type=doc_type,
            extracted_data=doc.get("extracted_data", {}),
            registration_number=reg_number,
        )
        
        if progress_callback:
            await progress_callback("verification", "checked", 40.0, {
                "registry": doc_type, 
                "status": result.status, 
                "details": result.registry_data
            })
            
        return doc, result

    tasks = [_verify_with_progress(doc) for doc in documents]
    results_tuples = await asyncio.gather(*tasks, return_exceptions=True)

    output = {}
    pan = None
    entity_name = None
    verified_count = 0
    failed_count = 0
    
    for i, rt in enumerate(results_tuples):
        doc = documents[i]
        if isinstance(rt, Exception):
            output[doc["doc_type"]] = VerificationResult(
                doc_type=doc["doc_type"],
                status="failed",
                errors=[str(rt)]
            )
            failed_count += 1
        else:
            _, result = rt
            output[doc["doc_type"]] = result
            if result.status == "verified":
                verified_count += 1
            else:
                failed_count += 1
                
            # Try to get PAN and entity name for blacklist check
            if doc["doc_type"] == "pan" and result.status == "verified":
                pan = doc.get("extracted_data", {}).get("pan_number")
                entity_name = doc.get("extracted_data", {}).get("name")
            elif not entity_name and doc.get("extracted_data", {}).get("enterprise_name"):
                entity_name = doc.get("extracted_data", {}).get("enterprise_name")

    # Run blacklist check
    if pan or entity_name:
        if progress_callback:
            await progress_callback("verification", "checking", 42.0, {"registry": "blacklist", "status": "checking"})
        blacklist_result = await _check_blacklist(pan or "", entity_name or "")
        output["blacklist"] = blacklist_result
        if progress_callback:
            await progress_callback("verification", "checked", 44.0, {"registry": "blacklist", "status": blacklist_result.status, "details": blacklist_result.registry_data})

    if progress_callback:
        await progress_callback("verification", "completed", 45.0, {"verified": verified_count, "failed": failed_count, "total": len(documents)})

    return output


# ============================================
# Individual Verifiers
# ============================================

async def _query_registry(registry_type: str, registration_number: str) -> Optional[dict]:
    """Query the mock government API."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            resp = await client.get(
                f"{MOCK_API_BASE}/{registry_type}/{registration_number}"
            )
            if resp.status_code == 200:
                return resp.json()
            elif resp.status_code == 404:
                return None
            else:
                logger.warning(f"Registry query [{registry_type}] returned {resp.status_code}")
                return None
        except httpx.RequestError as e:
            logger.error(f"Registry query [{registry_type}] error: {e}")
            return None


async def _verify_udyam(doc_type: str, extracted: dict, reg_number: str) -> VerificationResult:
    registry = await _query_registry("udyam", reg_number)
    if not registry:
        return VerificationResult(doc_type, "not_found")

    mismatches = []
    reg_data = registry.get("data", {})

    # Cross-check enterprise name
    if extracted.get("enterprise_name") and reg_data.get("enterprise_name"):
        if extracted["enterprise_name"].lower() != reg_data["enterprise_name"].lower():
            mismatches.append(f"Enterprise name mismatch: doc='{extracted['enterprise_name']}' vs registry='{reg_data['enterprise_name']}'")

    # Check if active
    if not registry.get("is_active", True):
        return VerificationResult(doc_type, "expired", reg_data, mismatches)

    status = "mismatch" if mismatches else "verified"
    return VerificationResult(doc_type, status, reg_data, mismatches)


async def _verify_gst(doc_type: str, extracted: dict, reg_number: str) -> VerificationResult:
    registry = await _query_registry("gstn", reg_number)
    if not registry:
        return VerificationResult(doc_type, "not_found")

    mismatches = []
    reg_data = registry.get("data", {})

    if reg_data.get("status", "").lower() != "active":
        return VerificationResult(doc_type, "expired", reg_data)

    # Check return filing compliance
    if reg_data.get("return_filing_status", "").lower() == "defaulter":
        mismatches.append("GST return filing status: defaulter")

    status = "mismatch" if mismatches else "verified"
    return VerificationResult(doc_type, status, reg_data, mismatches)


async def _verify_pan(doc_type: str, extracted: dict, reg_number: str) -> VerificationResult:
    registry = await _query_registry("pan", reg_number)
    if not registry:
        return VerificationResult(doc_type, "not_found")

    reg_data = registry.get("data", {})
    mismatches = []

    if extracted.get("name") and reg_data.get("name"):
        if extracted["name"].lower() != reg_data["name"].lower():
            mismatches.append(f"Name mismatch on PAN")

    status = "mismatch" if mismatches else "verified"
    return VerificationResult(doc_type, status, reg_data, mismatches)


async def _verify_income_tax(doc_type: str, extracted: dict, reg_number: str) -> VerificationResult:
    pan_registry = await _query_registry("pan", reg_number)
    if not pan_registry:
        return VerificationResult(doc_type, "not_found")
        
    itr_registry = await _query_registry("income_tax", reg_number)
    if not itr_registry:
        return VerificationResult(doc_type, "not_found")
        
    mismatches = []
    reg_data = itr_registry.get("data", {})
    
    if reg_data.get("filing_status", "").lower() != "filed":
        mismatches.append("Income Tax Return not filed")
        
    # Cross check turnover if available
    doc_turnover = extracted.get("declared_turnover")
    reg_turnover = reg_data.get("declared_turnover")
    if doc_turnover and reg_turnover:
        try:
            doc_val = float(doc_turnover)
            reg_val = float(reg_turnover)
            # 10% tolerance
            if abs(doc_val - reg_val) > 0.1 * reg_val:
                mismatches.append(f"Turnover mismatch: doc={doc_val}, registry={reg_val}")
        except ValueError:
            pass

    status = "mismatch" if mismatches else "verified"
    return VerificationResult(doc_type, status, {"pan_data": pan_registry.get("data", {}), "itr_data": reg_data}, mismatches)


async def _verify_epfo(doc_type: str, extracted: dict, reg_number: str) -> VerificationResult:
    registry = await _query_registry("epfo", reg_number)
    if not registry:
        return VerificationResult(doc_type, "not_found")

    reg_data = registry.get("data", {})
    mismatches = []
    if reg_data.get("compliance_status", "").lower() == "defaulter":
        mismatches.append("EPFO compliance status: defaulter")

    status = "mismatch" if mismatches else "verified"
    return VerificationResult(doc_type, status, reg_data, mismatches)


async def _verify_esic(doc_type: str, extracted: dict, reg_number: str) -> VerificationResult:
    registry = await _query_registry("esic", reg_number)
    if not registry:
        return VerificationResult(doc_type, "not_found")
    return VerificationResult(doc_type, "verified", registry.get("data", {}))


async def _verify_startup(doc_type: str, extracted: dict, reg_number: str) -> VerificationResult:
    registry = await _query_registry("startup", reg_number)
    if not registry:
        return VerificationResult(doc_type, "not_found")
    return VerificationResult(doc_type, "verified", registry.get("data", {}))


async def _verify_nsic(doc_type: str, extracted: dict, reg_number: str) -> VerificationResult:
    registry = await _query_registry("nsic", reg_number)
    if not registry:
        return VerificationResult(doc_type, "not_found")
    return VerificationResult(doc_type, "verified", registry.get("data", {}))


async def _verify_mca21(doc_type: str, extracted: dict, reg_number: str) -> VerificationResult:
    registry = await _query_registry("mca21", reg_number)
    if not registry:
        return VerificationResult(doc_type, "not_found")

    reg_data = registry.get("data", {})
    mismatches = []
    if reg_data.get("company_status", "").lower() not in ("active", "active-compliant"):
        mismatches.append(f"Company status: {reg_data.get('company_status', 'unknown')}")

    status = "mismatch" if mismatches else "verified"
    return VerificationResult(doc_type, status, reg_data, mismatches)


async def _verify_oem(doc_type: str, extracted: dict, reg_number: str) -> VerificationResult:
    # OEM authorization doesn't have a government registry — just validate format
    if extracted.get("authorizing_oem") and extracted.get("valid_until"):
        return VerificationResult(doc_type, "verified", extracted)
    return VerificationResult(doc_type, "failed", errors=["Incomplete OEM authorization data"])


async def _verify_make_in_india(doc_type: str, extracted: dict, reg_number: str) -> VerificationResult:
    # Self-declaration — validate that percentage is present
    if extracted.get("local_content_percentage"):
        return VerificationResult(doc_type, "verified", extracted)
    return VerificationResult(doc_type, "failed", errors=["Local content percentage not found"])


async def _verify_digilocker(doc_type: str, extracted: dict, reg_number: str) -> VerificationResult:
    doc_id = extracted.get("document_id") or reg_number
    if not doc_id:
        return VerificationResult(doc_type, "failed", errors=["No document ID extracted"])
        
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            # Need to call digilocker/verify/{document_id} which returns validity
            resp = await client.get(f"http://localhost:8001/api/digilocker/verify/{doc_id}")
            if resp.status_code == 200:
                data = resp.json()
                if data.get("valid") and data.get("signature_valid"):
                    return VerificationResult(doc_type, "verified", data)
                else:
                    return VerificationResult(doc_type, "mismatch", data, mismatches=["Invalid document or signature"])
            elif resp.status_code == 404:
                return VerificationResult(doc_type, "not_found")
            else:
                return VerificationResult(doc_type, "failed", errors=[f"API error: {resp.status_code}"])
        except Exception as e:
            return VerificationResult(doc_type, "failed", errors=[str(e)])


async def _verify_bis(doc_type: str, extracted: dict, reg_number: str) -> VerificationResult:
    registry = await _query_registry("bis", reg_number)
    if not registry:
        return VerificationResult(doc_type, "not_found")
        
    reg_data = registry.get("data", {})
    mismatches = []
    
    if reg_data.get("status", "").lower() != "active":
        return VerificationResult(doc_type, "expired", reg_data)
        
    status = "mismatch" if mismatches else "verified"
    return VerificationResult(doc_type, status, reg_data, mismatches)


async def _verify_generic(doc_type: str, extracted: dict, reg_number: str) -> VerificationResult:
    return VerificationResult(doc_type, "verified", extracted)


# ============================================
# Helpers
# ============================================

def _get_registration_number(doc_type: str, extracted: dict) -> str:
    """Extract the registration number based on document type."""
    mapping = {
        "udyam": "udyam_number",
        "gst": "gstin",
        "pan": "pan_number",
        "income_tax": "pan_number",
        "epfo": "establishment_code",
        "esic": "esic_code",
        "startup_certificate": "certificate_number",
        "nsic": "nsic_number",
        "company_registration": "cin",
        "oem_authorization": "authorizing_oem",
        "make_in_india": "local_content_percentage",
        "digilocker": "document_id",
        "bis": "license_number",
    }
    key = mapping.get(doc_type, "registration_number")
    return extracted.get(key, "UNKNOWN")

