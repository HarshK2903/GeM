"""
Mock Government API Service

Simulates the following Indian government registries:
  - Udyam/MSME Registry
  - GSTN (GST Network)
  - PAN Verification
  - MCA21 (Company Registration)
  - EPFO (Provident Fund)
  - ESIC
  - Startup India
  - NSIC
  - Blacklist/Debarment Database

Each registry is backed by seeded in-memory data.
The API is designed to be a drop-in replacement for real APIs.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI(
    title="GemVerify — Mock Government APIs",
    description="Simulated government registry APIs for bid verification",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================
# Seeded Registry Data
# ============================================

REGISTRIES = {
    "udyam": {
        "UDYAM-MH-26-0012345": {
            "registration_number": "UDYAM-MH-26-0012345",
            "entity_name": "TechCorp Solutions Pvt Ltd",
            "data": {
                "enterprise_name": "TechCorp Solutions Pvt Ltd",
                "enterprise_type": "Small",
                "major_activity": "Manufacturing",
                "social_category": "General",
                "date_of_incorporation": "2015-01-10",
                "date_of_registration": "2022-03-15",
                "state": "Maharashtra",
                "district": "Pune",
                "pan_number": "AABCT1234E",
                "investment_in_plant": 4500000,
                "turnover": 25000000,
            },
            "is_active": True,
        },
        "UDYAM-DL-07-0098765": {
            "registration_number": "UDYAM-DL-07-0098765",
            "entity_name": "Green Energy Systems LLP",
            "data": {
                "enterprise_name": "Green Energy Systems LLP",
                "enterprise_type": "Micro",
                "major_activity": "Services",
                "social_category": "OBC",
                "date_of_incorporation": "2019-06-01",
                "date_of_registration": "2023-01-20",
                "state": "Delhi",
                "district": "New Delhi",
                "pan_number": "AADPG5678F",
                "investment_in_plant": 800000,
                "turnover": 3500000,
            },
            "is_active": True,
        },
        "UDYAM-KA-29-0045678": {
            "registration_number": "UDYAM-KA-29-0045678",
            "entity_name": "Bharath Defence Electronics",
            "data": {
                "enterprise_name": "Bharath Defence Electronics",
                "enterprise_type": "Medium",
                "major_activity": "Manufacturing",
                "date_of_registration": "2020-08-10",
                "state": "Karnataka",
                "pan_number": "AABCB9012G",
                "investment_in_plant": 30000000,
                "turnover": 120000000,
            },
            "is_active": True,
        },
    },

    "gstn": {
        "27AABCT1234E1ZV": {
            "registration_number": "27AABCT1234E1ZV",
            "entity_name": "TechCorp Solutions Pvt Ltd",
            "data": {
                "gstin": "27AABCT1234E1ZV",
                "legal_name": "TechCorp Solutions Pvt Ltd",
                "trade_name": "TechCorp",
                "status": "Active",
                "registration_date": "2017-07-01",
                "last_return_filed": "2025-12-15",
                "return_filing_status": "regular",
                "state": "Maharashtra",
                "business_type": "Private Limited Company",
                "principal_place": "Pune, Maharashtra",
            },
            "is_active": True,
        },
        "07AADPG5678F1ZQ": {
            "registration_number": "07AADPG5678F1ZQ",
            "entity_name": "Green Energy Systems LLP",
            "data": {
                "gstin": "07AADPG5678F1ZQ",
                "legal_name": "Green Energy Systems LLP",
                "status": "Active",
                "registration_date": "2019-08-15",
                "last_return_filed": "2025-11-20",
                "return_filing_status": "regular",
                "state": "Delhi",
                "business_type": "LLP",
            },
            "is_active": True,
        },
        "29AABCB9012G1ZR": {
            "registration_number": "29AABCB9012G1ZR",
            "entity_name": "Bharath Defence Electronics",
            "data": {
                "gstin": "29AABCB9012G1ZR",
                "legal_name": "Bharath Defence Electronics Pvt Ltd",
                "status": "Active",
                "registration_date": "2018-01-01",
                "last_return_filed": "2024-06-15",
                "return_filing_status": "defaulter",
                "state": "Karnataka",
                "business_type": "Private Limited",
            },
            "is_active": True,
        },
    },

    "pan": {
        "AABCT1234E": {
            "registration_number": "AABCT1234E",
            "entity_name": "TechCorp Solutions Pvt Ltd",
            "data": {
                "pan_number": "AABCT1234E",
                "name": "TECHCORP SOLUTIONS PVT LTD",
                "status": "Active",
                "category": "Company",
                "aadhaar_linked": True,
            },
            "is_active": True,
        },
        "AADPG5678F": {
            "registration_number": "AADPG5678F",
            "entity_name": "Green Energy Systems LLP",
            "data": {
                "pan_number": "AADPG5678F",
                "name": "GREEN ENERGY SYSTEMS LLP",
                "status": "Active",
                "category": "Firm",
                "aadhaar_linked": True,
            },
            "is_active": True,
        },
        "AABCB9012G": {
            "registration_number": "AABCB9012G",
            "entity_name": "Bharath Defence Electronics Pvt Ltd",
            "data": {
                "pan_number": "AABCB9012G",
                "name": "BHARATH DEFENCE ELECTRONICS PVT LTD",
                "status": "Active",
                "category": "Company",
            },
            "is_active": True,
        },
    },

    "mca21": {
        "U72200MH2015PTC123456": {
            "registration_number": "U72200MH2015PTC123456",
            "entity_name": "TechCorp Solutions Pvt Ltd",
            "data": {
                "cin": "U72200MH2015PTC123456",
                "company_name": "TECHCORP SOLUTIONS PRIVATE LIMITED",
                "company_status": "Active",
                "company_class": "Private",
                "date_of_incorporation": "2015-01-10",
                "authorized_capital": 10000000,
                "paid_up_capital": 5000000,
                "roc": "RoC-Pune",
                "email": "info@techcorp.in",
            },
            "is_active": True,
        },
    },

    "epfo": {
        "MH/PUN/12345": {
            "registration_number": "MH/PUN/12345",
            "entity_name": "TechCorp Solutions Pvt Ltd",
            "data": {
                "establishment_code": "MH/PUN/12345",
                "establishment_name": "TechCorp Solutions Pvt Ltd",
                "total_employees": 85,
                "compliance_status": "compliant",
                "last_payment_month": "2025-12",
                "registration_date": "2016-04-01",
            },
            "is_active": True,
        },
        "DL/NDL/67890": {
            "registration_number": "DL/NDL/67890",
            "entity_name": "Green Energy Systems LLP",
            "data": {
                "establishment_code": "DL/NDL/67890",
                "establishment_name": "Green Energy Systems LLP",
                "total_employees": 12,
                "compliance_status": "compliant",
                "last_payment_month": "2025-11",
            },
            "is_active": True,
        },
    },

    "esic": {
        "12345678901234567": {
            "registration_number": "12345678901234567",
            "entity_name": "TechCorp Solutions Pvt Ltd",
            "data": {
                "esic_code": "12345678901234567",
                "employer_name": "TechCorp Solutions Pvt Ltd",
                "compliance_status": "compliant",
            },
            "is_active": True,
        },
    },

    "startup": {
        "DIPP12345": {
            "registration_number": "DIPP12345",
            "entity_name": "Green Energy Systems LLP",
            "data": {
                "certificate_number": "DIPP12345",
                "recognition_number": "REC-2023-GE-001",
                "entity_name": "Green Energy Systems LLP",
                "recognition_date": "2023-02-15",
                "sector": "Clean Energy",
                "valid_until": "2033-02-14",
            },
            "is_active": True,
        },
    },

    "nsic": {
        "NSIC/2022/MH/001": {
            "registration_number": "NSIC/2022/MH/001",
            "entity_name": "TechCorp Solutions Pvt Ltd",
            "data": {
                "nsic_number": "NSIC/2022/MH/001",
                "entity_name": "TechCorp Solutions Pvt Ltd",
                "category": "Micro & Small",
                "valid_from": "2022-04-01",
                "valid_until": "2027-03-31",
            },
            "is_active": True,
        },
    },

    "blacklist": {
        "BL-2024-001": {
            "registration_number": "BL-2024-001",
            "entity_name": "Fraudulent Corp Ltd",
            "data": {
                "entity_name": "Fraudulent Corp Ltd",
                "pan": "AABCF9999Z",
                "reason": "Submission of forged documents",
                "debarred_by": "CVC",
                "debarment_date": "2024-01-15",
                "debarment_period": "3 years",
                "debarment_end": "2027-01-14",
            },
            "is_active": True,
        },
    },

    "digilocker": {
        "DOC-AADHAAR-123": {
            "registration_number": "DOC-AADHAAR-123",
            "entity_name": "Director of TechCorp",
            "data": {
                "document_id": "DOC-AADHAAR-123",
                "document_type": "Aadhaar Card",
                "issued_date": "2015-05-10",
                "issuer_organization": "UIDAI",
            },
            "is_active": True,
            "signature_valid": True,
        },
        "DOC-PAN-456": {
            "registration_number": "DOC-PAN-456",
            "entity_name": "TechCorp Solutions Pvt Ltd",
            "data": {
                "document_id": "DOC-PAN-456",
                "document_type": "PAN Card",
                "issued_date": "2015-01-20",
                "issuer_organization": "Income Tax Department",
            },
            "is_active": True,
            "signature_valid": True,
        },
        "DOC-EDU-789": {
            "registration_number": "DOC-EDU-789",
            "entity_name": "Green Energy Systems LLP",
            "data": {
                "document_id": "DOC-EDU-789",
                "document_type": "Degree Certificate",
                "issued_date": "2010-06-15",
                "issuer_organization": "Delhi University",
            },
            "is_active": True,
            "signature_valid": True,
        }
    },

    "bis": {
        "R-1234567": {
            "registration_number": "R-1234567",
            "entity_name": "TechCorp Solutions Pvt Ltd",
            "data": {
                "license_number": "R-1234567",
                "product_category": "Electronics",
                "standard_number": "IS 13252",
                "validity_date": "2026-12-31",
                "manufacturer_name": "TechCorp Solutions Pvt Ltd",
                "status": "Active",
            },
            "is_active": True,
        },
        "CM/L-9876543": {
            "registration_number": "CM/L-9876543",
            "entity_name": "Bharath Defence Electronics",
            "data": {
                "license_number": "CM/L-9876543",
                "product_category": "Defence Equipment",
                "standard_number": "IS 9001",
                "validity_date": "2025-06-30",
                "manufacturer_name": "Bharath Defence Electronics Pvt Ltd",
                "status": "Active",
            },
            "is_active": True,
        }
    },

    "income_tax": {
        "AABCT1234E": {
            "registration_number": "AABCT1234E",
            "entity_name": "TechCorp Solutions Pvt Ltd",
            "data": {
                "pan_number": "AABCT1234E",
                "filing_status": "filed",
                "assessment_year": "2025-26",
                "declared_turnover": 25000000,
                "filing_date": "2025-07-25",
                "return_type": "ITR-6",
            },
            "is_active": True,
        },
        "AADPG5678F": {
            "registration_number": "AADPG5678F",
            "entity_name": "Green Energy Systems LLP",
            "data": {
                "pan_number": "AADPG5678F",
                "filing_status": "filed",
                "assessment_year": "2025-26",
                "declared_turnover": 3500000,
                "filing_date": "2025-07-28",
                "return_type": "ITR-5",
            },
            "is_active": True,
        },
        "AABCB9012G": {
            "registration_number": "AABCB9012G",
            "entity_name": "Bharath Defence Electronics Pvt Ltd",
            "data": {
                "pan_number": "AABCB9012G",
                "filing_status": "not-filed",
                "assessment_year": "2025-26",
                "declared_turnover": 120000000,
                "filing_date": None,
                "return_type": None,
            },
            "is_active": True,
        },
    }
}


# ============================================
# API Routes
# ============================================

@app.get("/api/health")
async def health():
    return {"status": "healthy", "service": "Mock Government APIs"}


@app.get("/api/registry/{registry_type}/{registration_number}")
async def lookup_registry(registry_type: str, registration_number: str):
    """Look up an entity in a government registry."""
    registry = REGISTRIES.get(registry_type)
    if not registry:
        raise HTTPException(404, f"Unknown registry type: {registry_type}")

    entry = registry.get(registration_number)
    if not entry:
        raise HTTPException(404, f"Not found in {registry_type}: {registration_number}")

    return entry


@app.get("/api/registry/{registry_type}")
async def list_registry(registry_type: str):
    """List all entries in a registry (for debugging/seeding)."""
    registry = REGISTRIES.get(registry_type)
    if not registry:
        raise HTTPException(404, f"Unknown registry type: {registry_type}")
    return {"registry_type": registry_type, "count": len(registry), "entries": list(registry.values())}


@app.get("/api/registries")
async def list_registries():
    """List all available registries."""
    return {
        "registries": [
            {"type": k, "count": len(v)} for k, v in REGISTRIES.items()
        ]
    }


@app.get("/api/digilocker/verify/{document_id}")
async def verify_digilocker(document_id: str):
    registry = REGISTRIES.get("digilocker")
    if not registry:
        raise HTTPException(404, "Registry not found")
        
    entry = registry.get(document_id)
    if not entry:
        raise HTTPException(404, "Document not found in DigiLocker")
        
    return {
        "valid": entry.get("is_active", False),
        "signature_valid": entry.get("signature_valid", False),
        "data": entry.get("data", {})
    }


@app.get("/api/blacklist/check/{identifier}")
async def check_blacklist(identifier: str):
    """Check if an entity is blacklisted (by PAN or name)."""
    for entry in REGISTRIES.get("blacklist", {}).values():
        data = entry.get("data", {})
        if (data.get("pan", "").lower() == identifier.lower() or
                data.get("entity_name", "").lower() == identifier.lower()):
            return {
                "is_blacklisted": True,
                "details": data,
                "reason": data.get("reason", "Blacklisted")
            }
    return {"is_blacklisted": False, "details": {}}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)
