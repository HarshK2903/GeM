"""
Document OCR & Field Extraction Engine

Uses Tesseract for OCR, then applies regex/heuristic parsers
to extract structured fields from Indian government documents.
"""

import re
import logging
from typing import Dict, Tuple, Optional
from pathlib import Path

logger = logging.getLogger("ai-svc.ocr")

# Attempt to import pytesseract (graceful fallback if not installed)
try:
    import pytesseract
    from PIL import Image
    TESSERACT_AVAILABLE = True
except ImportError:
    TESSERACT_AVAILABLE = False
    logger.warning("pytesseract not available — OCR will return mock data")


def extract_text_from_image(file_path: str) -> Tuple[str, float]:
    """
    Extract raw text from an image/PDF using Tesseract OCR.
    Returns (raw_text, confidence_score).
    """
    if not TESSERACT_AVAILABLE:
        return _mock_ocr_text(file_path), 0.85

    try:
        image = Image.open(file_path)
        # Get OCR data with confidence
        data = pytesseract.image_to_data(image, output_type=pytesseract.Output.DICT)

        # Calculate average confidence
        confidences = [int(c) for c in data["conf"] if int(c) > 0]
        avg_confidence = sum(confidences) / len(confidences) / 100 if confidences else 0.0

        # Get full text
        raw_text = pytesseract.image_to_string(image)

        logger.info(f"OCR completed: {len(raw_text)} chars, confidence={avg_confidence:.2f}")
        return raw_text, avg_confidence

    except Exception as e:
        logger.error(f"OCR failed for {file_path}: {e}")
        return "", 0.0


def extract_fields(raw_text: str, doc_type: str) -> Dict[str, str]:
    """
    Extract structured fields from OCR text based on document type.
    Uses regex patterns specific to Indian government documents.
    """
    extractors = {
        "udyam": _extract_udyam_fields,
        "gst": _extract_gst_fields,
        "pan": _extract_pan_fields,
        "income_tax": _extract_income_tax_fields,
        "epfo": _extract_epfo_fields,
        "esic": _extract_esic_fields,
        "startup_certificate": _extract_startup_fields,
        "nsic": _extract_nsic_fields,
        "oem_authorization": _extract_oem_fields,
        "company_registration": _extract_company_reg_fields,
        "make_in_india": _extract_make_in_india_fields,
        "digilocker": _extract_digilocker_fields,
        "bis": _extract_bis_fields,
    }

    extractor = extractors.get(doc_type, _extract_generic_fields)
    fields = extractor(raw_text)

    logger.info(f"Extracted {len(fields)} fields from {doc_type} document")
    return fields


# ============================================
# Document-Specific Field Extractors
# ============================================

def _extract_udyam_fields(text: str) -> Dict[str, str]:
    """Extract fields from Udyam/MSME Registration Certificate."""
    fields = {}
    # Udyam Registration Number: UDYAM-XX-00-0000000
    udyam_match = re.search(r'UDYAM[-\s]?\w{2}[-\s]?\d{2}[-\s]?\d{7}', text, re.IGNORECASE)
    if udyam_match:
        fields["udyam_number"] = udyam_match.group().replace(" ", "")

    # Enterprise name
    name_match = re.search(r'(?:name\s*of\s*enterprise|enterprise\s*name)\s*[:\-]?\s*(.+?)(?:\n|$)', text, re.IGNORECASE)
    if name_match:
        fields["enterprise_name"] = name_match.group(1).strip()

    # Type of enterprise: Micro/Small/Medium
    type_match = re.search(r'(micro|small|medium)\s*enterprise', text, re.IGNORECASE)
    if type_match:
        fields["enterprise_type"] = type_match.group(1).capitalize()

    # Date of registration
    date_match = re.search(r'(?:date\s*of\s*(?:registration|incorporation))\s*[:\-]?\s*(\d{2}[/\-]\d{2}[/\-]\d{4})', text, re.IGNORECASE)
    if date_match:
        fields["registration_date"] = date_match.group(1)

    # PAN
    pan_match = re.search(r'[A-Z]{5}\d{4}[A-Z]', text)
    if pan_match:
        fields["pan_number"] = pan_match.group()

    return fields


def _extract_gst_fields(text: str) -> Dict[str, str]:
    """Extract fields from GST Registration Certificate."""
    fields = {}
    # GSTIN: 2-digit state code + PAN + 1 digit + Z + 1 check
    gstin_match = re.search(r'\d{2}[A-Z]{5}\d{4}[A-Z]\d[A-Z\d][A-Z]\d', text)
    if gstin_match:
        fields["gstin"] = gstin_match.group()

    # Legal name
    legal_match = re.search(r'(?:legal\s*name|trade\s*name)\s*[:\-]?\s*(.+?)(?:\n|$)', text, re.IGNORECASE)
    if legal_match:
        fields["legal_name"] = legal_match.group(1).strip()

    # Registration date
    date_match = re.search(r'(?:date\s*of\s*registration)\s*[:\-]?\s*(\d{2}[/\-]\d{2}[/\-]\d{4})', text, re.IGNORECASE)
    if date_match:
        fields["registration_date"] = date_match.group(1)

    # Status
    status_match = re.search(r'(?:status)\s*[:\-]?\s*(active|inactive|cancelled|suspended)', text, re.IGNORECASE)
    if status_match:
        fields["status"] = status_match.group(1).capitalize()

    return fields


def _extract_pan_fields(text: str) -> Dict[str, str]:
    """Extract fields from PAN Card."""
    fields = {}
    pan_match = re.search(r'[A-Z]{5}\d{4}[A-Z]', text)
    if pan_match:
        fields["pan_number"] = pan_match.group()

    name_match = re.search(r'(?:name|naam)\s*[:\-]?\s*(.+?)(?:\n|$)', text, re.IGNORECASE)
    if name_match:
        fields["name"] = name_match.group(1).strip()

    dob_match = re.search(r'(\d{2}[/\-]\d{2}[/\-]\d{4})', text)
    if dob_match:
        fields["date_of_birth"] = dob_match.group(1)

    return fields


def _extract_income_tax_fields(text: str) -> Dict[str, str]:
    """Extract fields from Income Tax Returns / Assessment."""
    fields = {}
    pan_match = re.search(r'[A-Z]{5}\d{4}[A-Z]', text)
    if pan_match:
        fields["pan_number"] = pan_match.group()

    ay_match = re.search(r'(?:assessment\s*year|A\.?Y\.?)\s*[:\-]?\s*(\d{4}[-\s]?\d{2,4})', text, re.IGNORECASE)
    if ay_match:
        fields["assessment_year"] = ay_match.group(1)

    income_match = re.search(r'(?:total\s*income|gross\s*total)\s*[:\-]?\s*₹?\s*([\d,]+)', text, re.IGNORECASE)
    if income_match:
        fields["total_income"] = income_match.group(1).replace(",", "")

    return fields


def _extract_epfo_fields(text: str) -> Dict[str, str]:
    """Extract EPFO registration details."""
    fields = {}
    # EPF establishment code
    code_match = re.search(r'(?:establishment\s*(?:code|id)|EPF\s*(?:code|no))\s*[:\-]?\s*([A-Z]{2}[/\s]?\w+[/\s]?\w+)', text, re.IGNORECASE)
    if code_match:
        fields["establishment_code"] = code_match.group(1)

    name_match = re.search(r'(?:establishment\s*name|employer\s*name)\s*[:\-]?\s*(.+?)(?:\n|$)', text, re.IGNORECASE)
    if name_match:
        fields["establishment_name"] = name_match.group(1).strip()

    employees_match = re.search(r'(?:total\s*employees|no\.\s*of\s*employees)\s*[:\-]?\s*(\d+)', text, re.IGNORECASE)
    if employees_match:
        fields["total_employees"] = employees_match.group(1)

    return fields


def _extract_esic_fields(text: str) -> Dict[str, str]:
    """Extract ESIC registration details."""
    fields = {}
    code_match = re.search(r'(?:ESIC\s*(?:code|no|number))\s*[:\-]?\s*(\d{17})', text, re.IGNORECASE)
    if code_match:
        fields["esic_code"] = code_match.group(1)
    return fields


def _extract_startup_fields(text: str) -> Dict[str, str]:
    """Extract Startup India certificate details."""
    fields = {}
    cert_match = re.search(r'(?:DIPP|certificate)\s*(?:number|no)\s*[:\-]?\s*(\w+)', text, re.IGNORECASE)
    if cert_match:
        fields["certificate_number"] = cert_match.group(1)

    recognition_match = re.search(r'(?:recognition\s*(?:number|no))\s*[:\-]?\s*(\w+)', text, re.IGNORECASE)
    if recognition_match:
        fields["recognition_number"] = recognition_match.group(1)

    return fields


def _extract_nsic_fields(text: str) -> Dict[str, str]:
    """Extract NSIC registration details."""
    fields = {}
    nsic_match = re.search(r'(?:NSIC\s*(?:registration|cert))\s*(?:no|number)\s*[:\-]?\s*(\w+)', text, re.IGNORECASE)
    if nsic_match:
        fields["nsic_number"] = nsic_match.group(1)
    return fields


def _extract_oem_fields(text: str) -> Dict[str, str]:
    """Extract OEM Authorization letter details."""
    fields = {}
    oem_match = re.search(r'(?:authorized|authorised)\s+(?:by|from)\s*[:\-]?\s*(.+?)(?:\n|$)', text, re.IGNORECASE)
    if oem_match:
        fields["authorizing_oem"] = oem_match.group(1).strip()

    validity_match = re.search(r'(?:valid\s*(?:till|until|upto))\s*[:\-]?\s*(\d{2}[/\-]\d{2}[/\-]\d{4})', text, re.IGNORECASE)
    if validity_match:
        fields["valid_until"] = validity_match.group(1)

    return fields


def _extract_company_reg_fields(text: str) -> Dict[str, str]:
    """Extract Company Registration (MCA21/CIN) details."""
    fields = {}
    cin_match = re.search(r'[UL]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6}', text)
    if cin_match:
        fields["cin"] = cin_match.group()

    name_match = re.search(r'(?:company\s*name)\s*[:\-]?\s*(.+?)(?:\n|$)', text, re.IGNORECASE)
    if name_match:
        fields["company_name"] = name_match.group(1).strip()

    return fields


def _extract_make_in_india_fields(text: str) -> Dict[str, str]:
    """Extract Make in India / local content declaration."""
    fields = {}
    percentage_match = re.search(r'(?:local\s*content|domestic\s*(?:value|content))\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*%?', text, re.IGNORECASE)
    if percentage_match:
        fields["local_content_percentage"] = percentage_match.group(1)

    return fields


def _extract_digilocker_fields(text: str) -> Dict[str, str]:
    """Extract fields from a DigiLocker verified document."""
    fields = {}
    
    uri_match = re.search(r'(?:URI|Issuer\s*URI)\s*[:\-]?\s*([a-zA-Z0-9\-\.]+)', text, re.IGNORECASE)
    if uri_match:
        fields["document_uri"] = uri_match.group(1)
        
    sig_match = re.search(r'(?:Digitally\s*signed\s*by|Signature|Signed\s*by)\s*[:\-]?\s*(.+?)(?:\n|$)', text, re.IGNORECASE)
    if sig_match:
        fields["digital_signature"] = sig_match.group(1).strip()
        
    doc_id_match = re.search(r'(?:Document\s*(?:Hash|ID)|ID)\s*[:\-]?\s*([a-zA-Z0-9\-\_]+)', text, re.IGNORECASE)
    if doc_id_match:
        fields["document_id"] = doc_id_match.group(1)
        
    date_match = re.search(r'(?:Issued\s*Date|Date\s*of\s*Issue)\s*[:\-]?\s*(\d{2}[/\-]\d{2}[/\-]\d{4})', text, re.IGNORECASE)
    if date_match:
        fields["issued_date"] = date_match.group(1)
        
    issuer_match = re.search(r'(?:Issuer\s*Organization|Issued\s*by)\s*[:\-]?\s*(.+?)(?:\n|$)', text, re.IGNORECASE)
    if issuer_match:
        fields["issuer_organization"] = issuer_match.group(1).strip()
        
    type_match = re.search(r'(?:Document\s*Type|Type)\s*[:\-]?\s*(.+?)(?:\n|$)', text, re.IGNORECASE)
    if type_match:
        fields["document_type"] = type_match.group(1).strip()
        
    return fields


def _extract_bis_fields(text: str) -> Dict[str, str]:
    """Extract fields from BIS Certification."""
    fields = {}
    
    license_match = re.search(r'(?:License|Certificate)\s*(?:No|Number)\.?\s*[:\-]?\s*((?:R|CM/L)[-\s]?\d+)', text, re.IGNORECASE)
    if license_match:
        fields["license_number"] = license_match.group(1).replace(" ", "")
        
    category_match = re.search(r'(?:Product\s*Category|Product)\s*[:\-]?\s*(.+?)(?:\n|$)', text, re.IGNORECASE)
    if category_match:
        fields["product_category"] = category_match.group(1).strip()
        
    standard_match = re.search(r'(?:Standard|IS\s*No\.?)\s*[:\-]?\s*(IS\s*\d+)', text, re.IGNORECASE)
    if standard_match:
        fields["standard_number"] = standard_match.group(1).strip()
        
    validity_match = re.search(r'(?:Valid\s*(?:upto|until|till)|Validity)\s*[:\-]?\s*(\d{2}[/\-]\d{2}[/\-]\d{4})', text, re.IGNORECASE)
    if validity_match:
        fields["validity_date"] = validity_match.group(1)
        
    mfg_match = re.search(r'(?:Manufacturer(?:s)?\s*Name|Name\s*of\s*Manufacturer)\s*[:\-]?\s*(.+?)(?:\n|$)', text, re.IGNORECASE)
    if mfg_match:
        fields["manufacturer_name"] = mfg_match.group(1).strip()
        
    return fields


def _extract_generic_fields(text: str) -> Dict[str, str]:
    """Generic extractor for unknown document types."""
    fields = {}
    # Try to find PAN
    pan_match = re.search(r'[A-Z]{5}\d{4}[A-Z]', text)
    if pan_match:
        fields["pan_number"] = pan_match.group()

    # Try to find dates
    dates = re.findall(r'\d{2}[/\-]\d{2}[/\-]\d{4}', text)
    if dates:
        fields["found_dates"] = ", ".join(dates[:3])

    return fields


def _mock_ocr_text(file_path: str) -> str:
    """Return mock OCR text when Tesseract is not available."""
    filename = Path(file_path).stem.lower()
    if "udyam" in filename:
        return "UDYAM-MH-26-0012345\nName of Enterprise: TechCorp Solutions Pvt Ltd\nType: Small Enterprise\nDate of Registration: 15/03/2022\nPAN: AABCT1234E"
    elif "gst" in filename:
        return "GSTIN: 27AABCT1234E1ZV\nLegal Name: TechCorp Solutions Pvt Ltd\nDate of Registration: 01/07/2017\nStatus: Active"
    elif "pan" in filename:
        return "PAN: AABCT1234E\nName: TECHCORP SOLUTIONS PVT LTD\nDate of Incorporation: 10/01/2015"
    return f"Sample document text for {filename}"
