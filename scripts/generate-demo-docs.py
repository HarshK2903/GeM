#!/usr/bin/env python3
"""Generate dummy PDF documents for GemVerify bid submission demo."""
import os

OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "demo-docs")
os.makedirs(OUTPUT_DIR, exist_ok=True)

def make_pdf(filename, title, content_lines):
    """Create a minimal valid PDF with text content."""
    text = title + "\n\n" + "\n".join(content_lines)

    # Minimal PDF structure
    lines_text = text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
    # Split into lines for BT/ET
    pdf_text_ops = ""
    y = 750
    for line in lines_text.split("\n"):
        pdf_text_ops += f"BT /F1 10 Tf 50 {y} Td ({line}) Tj ET\n"
        y -= 14

    stream = f"""BT /F1 16 Tf 50 780 Td ({title}) Tj ET
{pdf_text_ops}"""

    obj1 = "1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
    obj2 = "2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n"
    obj3 = f"3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n"
    obj4 = f"4 0 obj<</Length {len(stream)}>>stream\n{stream}endstream\nendobj\n"
    obj5 = "5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\n"

    body = "%PDF-1.4\n" + obj1 + obj2 + obj3 + obj4 + obj5
    xref_pos = len(body)
    xref = f"xref\n0 6\n0000000000 65535 f \n"
    trailer = f"trailer<</Size 6/Root 1 0 R>>\nstartxref\n{xref_pos}\n%%EOF\n"

    filepath = os.path.join(OUTPUT_DIR, filename)
    with open(filepath, 'w') as f:
        f.write(body + xref + trailer)
    print(f"  ✅ {filename}")

print("📄 Generating demo documents...\n")

make_pdf("Udyam_Certificate.pdf", "Udyam Registration Certificate", [
    "UDYAM REGISTRATION NUMBER: UDYAM-UP-26-0018745",
    "",
    "Name of Enterprise: TechFlow Systems Private Limited",
    "Type of Enterprise: Micro/Small/Medium",
    "Category: Small",
    "Date of Registration: 15-Mar-2019",
    "",
    "Major Activity: Manufacturing of IT Hardware & Services",
    "NIC 2-digit Code: 26 (Manufacture of computer, electronic products)",
    "",
    "Address: Plot 42, TechPark SEZ, Sector 62, Noida, UP - 201301",
    "State: Uttar Pradesh | District: Gautam Buddha Nagar",
    "",
    "Investment in Plant & Machinery: Rs. 4,25,00,000",
    "Turnover: Rs. 12,50,00,000",
    "",
    "Date of Commencement: 01-Apr-2015",
    "PAN: AABCT1234F | GSTIN: 09AABCT1234F1ZP",
    "",
    "This certificate is generated from the Udyam Registration Portal,",
    "Ministry of MSME, Government of India.",
    "Verification: https://udyamregistration.gov.in/verify/UDYAM-UP-26-0018745",
])

make_pdf("GST_Registration_Certificate.pdf", "GST Registration Certificate", [
    "GOODS AND SERVICES TAX REGISTRATION CERTIFICATE",
    "Form GST REG-06 | Central/State Goods and Services Tax Act",
    "",
    "GSTIN: 09AABCT1234F1ZP",
    "Legal Name: TechFlow Systems Private Limited",
    "Trade Name: TechFlow Systems",
    "Constitution: Private Limited Company",
    "",
    "Address of Principal Place of Business:",
    "Plot 42, TechPark SEZ, Sector 62, Noida, Uttar Pradesh - 201301",
    "",
    "Date of Liability: 01-Jul-2017",
    "Effective Date of Registration: 01-Jul-2017",
    "Type of Registration: Regular",
    "",
    "Particulars of Authorized Signatory:",
    "Name: Amit Kumar | Designation: Director | PAN: BXKPK4567A",
    "",
    "HSN/SAC codes: 8471 (Computers), 8473 (Parts), 998314 (IT Services)",
    "",
    "Issued by: GST Portal, Government of India",
])

make_pdf("GST_Returns_GSTR3B.pdf", "GSTR-3B Returns Summary", [
    "GSTR-3B MONTHLY RETURN SUMMARY (Last 6 Months)",
    "GSTIN: 09AABCT1234F1ZP | TechFlow Systems Pvt Ltd",
    "",
    "Month        | Taxable Value  | IGST      | CGST     | SGST     | Status",
    "-------------|----------------|-----------|----------|----------|-------",
    "Apr 2026     | 1,85,00,000    | 18,50,000 | 9,25,000 | 9,25,000 | Filed",
    "Mar 2026     | 2,10,00,000    | 21,00,000 | 10,50,000| 10,50,000| Filed",
    "Feb 2026     | 1,72,00,000    | 17,20,000 | 8,60,000 | 8,60,000 | Filed",
    "Jan 2026     | 1,98,00,000    | 19,80,000 | 9,90,000 | 9,90,000 | Filed",
    "Dec 2025     | 2,25,00,000    | 22,50,000 | 11,25,000| 11,25,000| Filed",
    "Nov 2025     | 1,65,00,000    | 16,50,000 | 8,25,000 | 8,25,000 | Filed",
    "",
    "Total Turnover (6 months): Rs. 11,55,00,000",
    "Total Tax Paid: Rs. 2,08,00,000",
    "Filing Status: All returns filed on time. No defaults.",
])

make_pdf("PAN_Card.pdf", "PAN Card", [
    "INCOME TAX DEPARTMENT - PERMANENT ACCOUNT NUMBER CARD",
    "",
    "PAN: AABCT1234F",
    "Name: TECHFLOW SYSTEMS PRIVATE LIMITED",
    "Father's Name / FTN: N/A (Company)",
    "Date of Incorporation: 15/04/2015",
    "Status: Company",
    "",
    "Issued by: Income Tax Department, Government of India",
    "Card Number: 2015-2026-AABCT1234F",
])

make_pdf("ITR_2023-24.pdf", "Income Tax Return - AY 2023-24", [
    "INCOME TAX RETURN ACKNOWLEDGEMENT",
    "Assessment Year: 2023-24 | Status: Company",
    "",
    "PAN: AABCT1234F",
    "Name: TechFlow Systems Private Limited",
    "ITR Form: ITR-6",
    "",
    "Gross Total Income: Rs. 3,45,00,000",
    "Total Deductions u/s 80C-80U: Rs. 25,00,000",
    "Total Taxable Income: Rs. 3,20,00,000",
    "Tax Payable: Rs. 83,20,000",
    "Tax Paid: Rs. 83,20,000",
    "",
    "Date of Filing: 28-Oct-2023",
    "Acknowledgement No: CPC/2023-24/ITR6/TF1234567890",
    "Verification Status: e-Verified via Aadhaar OTP",
    "",
    "Filed at: Centralized Processing Centre, Bengaluru",
])

make_pdf("ITR_2022-23.pdf", "Income Tax Return - AY 2022-23", [
    "INCOME TAX RETURN ACKNOWLEDGEMENT",
    "Assessment Year: 2022-23 | Status: Company",
    "PAN: AABCT1234F | Name: TechFlow Systems Private Limited",
    "Gross Total Income: Rs. 2,85,00,000",
    "Tax Paid: Rs. 68,40,000",
    "Date of Filing: 30-Sep-2022",
    "Acknowledgement No: CPC/2022-23/ITR6/TF0987654321",
])

make_pdf("ITR_2021-22.pdf", "Income Tax Return - AY 2021-22", [
    "INCOME TAX RETURN ACKNOWLEDGEMENT",
    "Assessment Year: 2021-22 | Status: Company",
    "PAN: AABCT1234F | Name: TechFlow Systems Private Limited",
    "Gross Total Income: Rs. 2,15,00,000",
    "Tax Paid: Rs. 51,60,000",
    "Date of Filing: 15-Oct-2021",
    "Acknowledgement No: CPC/2021-22/ITR6/TF1122334455",
])

make_pdf("MCA21_Certificate_of_Incorporation.pdf", "Certificate of Incorporation", [
    "MINISTRY OF CORPORATE AFFAIRS",
    "CERTIFICATE OF INCORPORATION",
    "Companies Act, 2013",
    "",
    "CIN: U72200UP2015PTC067891",
    "Company Name: TECHFLOW SYSTEMS PRIVATE LIMITED",
    "Category: Company limited by Shares",
    "Sub-Category: Non-govt company",
    "Class: Private",
    "",
    "Date of Incorporation: 15/04/2015",
    "Registered Office: Plot 42, TechPark SEZ, Sector 62, Noida, UP - 201301",
    "",
    "Authorized Capital: Rs. 5,00,00,000",
    "Paid-up Capital: Rs. 2,50,00,000",
    "",
    "Directors: Amit Kumar (DIN: 07654321), Priya Sharma (DIN: 08765432)",
    "",
    "Given under my hand at the office of Registrar of Companies,",
    "Kanpur, Uttar Pradesh on 15th April, 2015.",
    "",
    "Registrar of Companies, Kanpur",
])

make_pdf("Balance_Sheet_2023-24.pdf", "Audited Balance Sheet FY 2023-24", [
    "TECHFLOW SYSTEMS PRIVATE LIMITED",
    "AUDITED BALANCE SHEET AS ON 31ST MARCH 2024",
    "",
    "ASSETS                              | Amount (Rs.)",
    "Non-Current Assets                  | 8,50,00,000",
    "  Property, Plant & Equipment       | 4,20,00,000",
    "  Intangible Assets                 | 1,30,00,000",
    "  Long-term Investments             | 3,00,00,000",
    "Current Assets                      | 12,80,00,000",
    "  Inventories                       | 3,50,00,000",
    "  Trade Receivables                 | 5,20,00,000",
    "  Cash & Bank Balances              | 4,10,00,000",
    "TOTAL ASSETS                        | 21,30,00,000",
    "",
    "LIABILITIES                         | Amount (Rs.)",
    "Shareholders' Funds                 | 14,50,00,000",
    "  Share Capital                     | 2,50,00,000",
    "  Reserves & Surplus                | 12,00,00,000",
    "Non-Current Liabilities             | 3,00,00,000",
    "Current Liabilities                 | 3,80,00,000",
    "TOTAL LIABILITIES                   | 21,30,00,000",
    "",
    "Revenue: Rs. 18,50,00,000 | Net Profit: Rs. 3,45,00,000",
    "",
    "Auditor: M/s Sharma & Associates, Chartered Accountants",
    "Audit Report: Clean/Unqualified",
])

make_pdf("Balance_Sheet_2022-23.pdf", "Audited Balance Sheet FY 2022-23", [
    "TECHFLOW SYSTEMS PVT LTD - Balance Sheet 31-Mar-2023",
    "Total Assets: Rs. 17,80,00,000 | Revenue: Rs. 15,20,00,000",
    "Net Profit: Rs. 2,85,00,000 | Auditor: M/s Sharma & Associates, CA",
])

make_pdf("Balance_Sheet_2021-22.pdf", "Audited Balance Sheet FY 2021-22", [
    "TECHFLOW SYSTEMS PVT LTD - Balance Sheet 31-Mar-2022",
    "Total Assets: Rs. 14,20,00,000 | Revenue: Rs. 12,10,00,000",
    "Net Profit: Rs. 2,15,00,000 | Auditor: M/s Sharma & Associates, CA",
])

make_pdf("Net_Worth_Certificate.pdf", "Net Worth Certificate", [
    "CHARTERED ACCOUNTANT CERTIFICATE",
    "NET WORTH CERTIFICATE",
    "",
    "To Whomsoever It May Concern",
    "",
    "This is to certify that the Net Worth of M/s TechFlow Systems Pvt Ltd",
    "(CIN: U72200UP2015PTC067891) as on 31st March 2024 is Rs. 14,50,00,000",
    "(Rupees Fourteen Crore Fifty Lakhs Only).",
    "",
    "Basis: Audited Financial Statements for FY 2023-24",
    "Net Worth = Total Assets - Total Liabilities = 21.30 Cr - 6.80 Cr = 14.50 Cr",
    "",
    "M/s Sharma & Associates, Chartered Accountants",
    "FRN: 012345N | UDIN: 24012345ABCDEFGHIJ",
])

make_pdf("CA_Turnover_Certificate.pdf", "CA Certified Turnover Certificate", [
    "CHARTERED ACCOUNTANT CERTIFICATE - ANNUAL TURNOVER",
    "",
    "Certified that M/s TechFlow Systems Pvt Ltd (PAN: AABCT1234F)",
    "has the following annual turnover based on audited statements:",
    "",
    "FY 2023-24: Rs. 18,50,00,000 (Eighteen Crore Fifty Lakhs)",
    "FY 2022-23: Rs. 15,20,00,000 (Fifteen Crore Twenty Lakhs)",
    "FY 2021-22: Rs. 12,10,00,000 (Twelve Crore Ten Lakhs)",
    "",
    "Average Annual Turnover (3 years): Rs. 15,26,66,667",
    "",
    "M/s Sharma & Associates, Chartered Accountants",
    "Date: 15-Jun-2024",
])

make_pdf("Work_Order_1_BSNL.pdf", "Work Order - BSNL Server Supply", [
    "BHARAT SANCHAR NIGAM LIMITED",
    "PURCHASE ORDER NO: BSNL/IT/2023/PO-4521",
    "",
    "To: TechFlow Systems Pvt Ltd, Noida",
    "Subject: Supply of 200 Rack Servers for Data Center Modernization",
    "",
    "Order Value: Rs. 12,50,00,000",
    "Delivery Period: 90 days from date of order",
    "Date of Order: 15-Jan-2023",
    "Completion Date: 10-Apr-2023 (Completed on time)",
    "",
    "Performance Rating: Excellent",
    "Penalty: NIL",
])

make_pdf("Work_Order_2_NIC.pdf", "Work Order - NIC Network Equipment", [
    "NATIONAL INFORMATICS CENTRE",
    "WORK ORDER NO: NIC/INFRA/2024/WO-789",
    "",
    "To: TechFlow Systems Pvt Ltd, Noida",
    "Subject: Supply & Installation of Network Infrastructure",
    "Order Value: Rs. 8,75,00,000",
    "Date: 01-Mar-2024 | Status: Completed",
])

make_pdf("Work_Order_3_SBI.pdf", "Work Order - SBI Desktop Supply", [
    "STATE BANK OF INDIA",
    "PURCHASE ORDER NO: SBI/IT/2022/PO-3344",
    "",
    "To: TechFlow Systems Pvt Ltd, Noida",
    "Subject: Supply of 1500 Desktop Computers for Branch Automation",
    "Order Value: Rs. 6,25,00,000",
    "Date: 10-Aug-2022 | Status: Completed | Rating: Very Good",
])

make_pdf("Performance_Certificate_BSNL.pdf", "Performance Certificate - BSNL", [
    "PERFORMANCE / COMPLETION CERTIFICATE",
    "BSNL, Corporate Office, New Delhi",
    "",
    "This is to certify that M/s TechFlow Systems Pvt Ltd",
    "has successfully completed the supply and installation of",
    "200 Rack Servers (PO: BSNL/IT/2023/PO-4521) within stipulated time.",
    "",
    "Quality of work: Excellent | Delays: None | Penalties: None",
    "Recommended for future projects: Yes",
    "",
    "Authorized Signatory, BSNL Procurement Division",
])

make_pdf("ISO_9001_Certificate.pdf", "ISO 9001:2015 Certificate", [
    "CERTIFICATE OF REGISTRATION",
    "ISO 9001:2015 - QUALITY MANAGEMENT SYSTEM",
    "",
    "Certificate No: QMS-IN-2022-45678",
    "",
    "This is to certify that the Quality Management System of:",
    "TECHFLOW SYSTEMS PRIVATE LIMITED",
    "Plot 42, TechPark SEZ, Sector 62, Noida, UP - 201301",
    "",
    "Has been assessed and found to conform to the requirements of ISO 9001:2015",
    "",
    "Scope: Design, Supply, Installation & Maintenance of IT Hardware,",
    "Servers, Network Equipment and Related Services",
    "",
    "Initial Registration: 15-Jun-2022",
    "Valid Until: 14-Jun-2025",
    "Certification Body: Bureau Veritas India Pvt Ltd",
])

make_pdf("OEM_Authorization_Dell.pdf", "OEM Authorization Letter - Dell", [
    "DELL TECHNOLOGIES INDIA PVT LTD",
    "OEM AUTHORIZATION CERTIFICATE",
    "",
    "Reference: DELL/AUTH/2026/IN-4567",
    "Date: 01-Apr-2026 | Valid Until: 31-Mar-2027",
    "",
    "This is to certify that M/s TechFlow Systems Pvt Ltd",
    "(CIN: U72200UP2015PTC067891) is an authorized partner of",
    "Dell Technologies for the following product lines:",
    "",
    "1. PowerEdge Rack Servers (R750, R760, R660)",
    "2. PowerSwitch Network Equipment",
    "3. PowerStore Storage Solutions",
    "",
    "TechFlow Systems is authorized to quote, supply, install,",
    "and provide warranty support for Dell products in Government tenders.",
    "",
    "Authorized Signatory, Dell Technologies India",
])

make_pdf("EPFO_Registration.pdf", "EPFO Registration Certificate", [
    "EMPLOYEES' PROVIDENT FUND ORGANISATION",
    "REGISTRATION CERTIFICATE",
    "",
    "Establishment Code: DLCPM0045678000",
    "Name of Establishment: TechFlow Systems Private Limited",
    "Address: Plot 42, TechPark SEZ, Sector 62, Noida, UP",
    "",
    "Date of Registration: 01-Aug-2016",
    "Act Applied: EPF & MP Act, 1952",
    "Number of Employees: 85",
    "",
    "Monthly PF Contribution Status: Regular (No defaults)",
    "Last Payment: Sep 2026 - Rs. 4,25,000",
    "",
    "Regional PF Commissioner, EPFO Noida",
])

make_pdf("ESIC_Registration.pdf", "ESIC Registration Certificate", [
    "EMPLOYEES' STATE INSURANCE CORPORATION",
    "REGISTRATION CERTIFICATE",
    "",
    "ESIC Code: 12345678901234567",
    "Name: TechFlow Systems Private Limited",
    "Address: Plot 42, TechPark SEZ, Sector 62, Noida, UP",
    "",
    "Date of Registration: 01-Aug-2016",
    "Number of Insured Persons: 72",
    "Contribution Status: Regular",
    "",
    "Regional Director, ESIC Delhi",
])

make_pdf("EMD_Bank_Guarantee.pdf", "EMD Bank Guarantee", [
    "STATE BANK OF INDIA",
    "BANK GUARANTEE FOR EARNEST MONEY DEPOSIT",
    "",
    "BG No: SBI/NOI/BG/2026/7890",
    "Date: 25-Sep-2026",
    "",
    "In favour of: Ministry of Electronics & IT",
    "On behalf of: TechFlow Systems Pvt Ltd",
    "",
    "Amount: Rs. 25,00,000 (Twenty Five Lakhs Only)",
    "Purpose: EMD for Tender GEM/2026/B/10001",
    "Valid Until: 25-Mar-2027",
    "",
    "We, State Bank of India, Noida Sector 62 Branch,",
    "hereby guarantee unconditional payment of Rs. 25,00,000",
    "on demand by the beneficiary.",
    "",
    "Branch Manager, SBI Noida Sector 62",
    "IFSC: SBIN0050001",
])

make_pdf("Solvency_Certificate.pdf", "Solvency Certificate", [
    "STATE BANK OF INDIA",
    "SOLVENCY CERTIFICATE",
    "",
    "Account Holder: TechFlow Systems Pvt Ltd",
    "Account No: 39876543210",
    "Branch: Sector 62, Noida | IFSC: SBIN0050001",
    "",
    "This is to certify the financial solvency of the above entity.",
    "Average Balance (12 months): Rs. 3,85,00,000",
    "Credit Facilities: Rs. 5,00,00,000 (CC Limit)",
    "No adverse remarks. Account conduct satisfactory.",
    "",
    "Branch Manager, SBI Noida",
])

print(f"\n✅ All {len(os.listdir(OUTPUT_DIR))} documents generated in: {OUTPUT_DIR}")
