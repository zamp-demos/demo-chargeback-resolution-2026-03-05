const fs = require('fs');
const path = require('path');

// --- Configuration ---
const PROJECT_ROOT = path.join(__dirname, '..');
const PUBLIC_DATA_DIR = path.join(PROJECT_ROOT, 'public/data');
const PROCESSES_FILE = path.join(PUBLIC_DATA_DIR, 'processes.json');
const PROCESS_ID = "CHB_001";
const CASE_NAME = "NovaTech Electronics — Merchandise Not Received";

// --- Helpers ---
const readJson = (file) => (fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : []);
const writeJson = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 4));
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const updateProcessLog = (processId, logEntry, keyDetailsUpdate = {}) => {
    const processFile = path.join(PUBLIC_DATA_DIR, `process_${processId}.json`);
    let data = { logs: [], keyDetails: {}, sidebarArtifacts: [] };
    if (fs.existsSync(processFile)) data = readJson(processFile);

    if (logEntry) {
        const existingIdx = logEntry.id ? data.logs.findIndex(l => l.id === logEntry.id) : -1;
        if (existingIdx !== -1) {
            data.logs[existingIdx] = { ...data.logs[existingIdx], ...logEntry };
        } else {
            data.logs.push(logEntry);
        }
    }

    if (keyDetailsUpdate && Object.keys(keyDetailsUpdate).length > 0) {
        data.keyDetails = { ...data.keyDetails, ...keyDetailsUpdate };
    }
    writeJson(processFile, data);
};

const updateProcessListStatus = async (processId, status, currentStatus) => {
    const apiUrl = process.env.VITE_API_URL || 'http://localhost:3001';
    try {
        const response = await fetch(`${apiUrl}/api/update-status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: processId, status, currentStatus })
        });
        if (!response.ok) throw new Error(`Server returned ${response.status}`);
    } catch (e) {
        try {
            const processes = JSON.parse(fs.readFileSync(PROCESSES_FILE, 'utf8'));
            const idx = processes.findIndex(p => p.id === String(processId));
            if (idx !== -1) {
                processes[idx].status = status;
                processes[idx].currentStatus = currentStatus;
                fs.writeFileSync(PROCESSES_FILE, JSON.stringify(processes, null, 4));
            }
        } catch (err) { }
    }
};

(async () => {
    console.log(`Starting ${PROCESS_ID}: ${CASE_NAME}...`);

    writeJson(path.join(PUBLIC_DATA_DIR, `process_${PROCESS_ID}.json`), {
        logs: [],
        keyDetails: {
            "Case ID": "CHB-2026-0147",
            "Reason Code": "Visa 13.1 — Merchandise Not Received",
            "Amount": "$2,847.00",
            "Cardholder": "James R. Patterson",
            "Merchant": "NovaTech Electronics",
            "Card Last 4": "8421"
        }
    });

    const steps = [
        {
            id: "step-1",
            title_p: "Pega Smart Dispute — Triaging case CHB-2026-0147...",
            title_s: "Pega Smart Dispute — Case Triaged, Routed to Pace",
            reasoning: [
                "Visa VROL webhook received — new chargeback filed under RC 13.1",
                "Pega case CHB-2026-0147 created — running intake decisioning rules:",
                "  Validated cardholder: James R. Patterson (card ending 8421)",
                "  Merchant: NovaTech Electronics (MCC 5732 — Electronics Stores)",
                "  Transaction date: February 18, 2026 — dispute amount: $2,847.00",
                "  Core banking pull: Original authorization confirmed, no reversal on file",
                "  SLA assignment: 15-day Visa representment window, deadline March 12",
                "  Auto-rule check: No duplicate case, no prior dispute on this transaction",
                "Pega routing decision — handing to Pace intelligence layer:",
                "  RC 13.1 requires delivery proof evaluation and CE 3.0 evidence assembly",
                "  These are judgment-intensive tasks outside Pega’s decisioning rules",
                "  Pace to gather evidence, score fraud risk, and build representment package"
            ],
            artifacts: [{
                id: "case-intake",
                type: "json",
                label: "Pega Case Handoff",
                data: {
                    case_id: "CHB-2026-0147",
                    reason_code: "Visa 13.1",
                    amount: "$2,847.00",
                    cardholder: "James R. Patterson",
                    merchant: "NovaTech Electronics",
                    mcc: "5732",
                    transaction_date: "2026-02-18",
                    pega_triage: "Intake validated, SLA set, no duplicates",
                    handoff_reason: "RC 13.1 requires evidence evaluation beyond rule engine"
                }
            }]
        },
        {
            id: "step-2",
            title_p: "Querying FedEx Ship API for delivery confirmation...",
            title_s: "FedEx API — Delivery Confirmed with Signature",
            reasoning: [
                "FedEx Ship API — Tracking 7729-4481-0037:",
                "  Shipped: February 20, 2026 from NovaTech warehouse (Dallas, TX)",
                "  Delivered: February 24, 2026 at 2:17 PM EST",
                "  Signed by: J. PATTERSON",
                "  GPS delivery confidence: 99.2% match to billing address",
                "  Photo-on-delivery: Front porch, package visible",
                "  Delivery address: 1847 Elmwood Dr, Charlotte NC 28205",
                "Strong delivery evidence — signature + GPS + photo all consistent"
            ],
            artifacts: [{
                id: "fedex-tracking",
                type: "json",
                label: "FedEx Delivery Confirmation",
                data: {
                    tracking: "7729-4481-0037",
                    status: "Delivered",
                    delivered_date: "2026-02-24 14:17 EST",
                    signed_by: "J. PATTERSON",
                    gps_confidence: "99.2%",
                    photo_proof: true,
                    delivery_address: "1847 Elmwood Dr, Charlotte NC 28205"
                }
            }]
        },
        {
            id: "step-3"            title_p: "Pulling cardholder history from Salesforce CRM...",
            title_s: "Salesforce CRM — Clean History, Gold Loyalty Tier",
            reasoning: [
                "Salesforce CRM — Customer 360 lookup for James R. Patterson:",
                "  4 prior orders with NovaTech (avg $1,200)",
                "  All 4 orders shipped to same address: 1847 Elmwood Dr",
                "  Same card ending 8421 used for all transactions",
                "  Zero previous disputes across all merchants",
                "  Loyalty tier: Gold (since 2024)",
                "  Last support ticket: None in past 12 months",
                "Clean customer profile — no fraud indicators in history"
            ],
            artifacts: [{
                id: "salesforce-crm",
                type: "json",
                label: "Salesforce Customer Profile",
                data: {
                    prior_orders: 4,
                    avg_order_value: "$1,200",
                    same_address: true,
                    same_card: true,
                    dispute_history: "None",
                    loyalty_tier: "Gold",
                    customer_since: "2024"
                }
            }]
        },
        {
            id: "step-4",
            title_p: "Running Visa CE 3.0 Compelling Evidence check...",
            title_s: "Visa CE 3.0 Compelling Evidence — Rule 13.1.4 Satisfied",
            reasoning: [
                "Visa Compelling Evidence 3.0 framework analysis:",
                "  Required: 2+ prior undisputed transactions, same card, same merchant",
                "  Found: 4 prior undisputed transactions with NovaTech Electronics",
                "  Same card ending 8421 used for all transactions",
                "  Same shipping address: 1847 Elmwood Dr, Charlotte NC 28205",
                "  Rule 13.1.4 criteria: FULLY SATISFIED",
                "  CE 3.0 match grants liability shift back to issuer",
                "  This is the strongest possible evidence category for RC 13.1"
            ],
            artifacts: [{
                id: "ce3-analysis",
                type: "json",
                label: "CE 3.0 Compliance Check",
                data: {
                    rule: "13.1.4",
                    status: "SATISFIED",
                    prior_undisputed_txns: 4,
                    same_card: true,
                    same_address: true,
                    liability_shift: "Issuer"
                }
            }]
        },
        {
            id: "step-5",
            title_p: "Computing fraud likelihood score with Gemini...",
            title_s: "Fraud Likelihood Scoring — Score: 8/100 (Low Risk)",
            reasoning: [
                "Gemini multi-factor fraud analysis:",
                "  Delivery confirmed with signature match: -30 points",
                "  GPS confidence 99.2%: -15 points",
                "  4 prior clean orders with merchant: -20 points",
                "  Zero dispute history across all cards: -15 points",
                "  CE 3.0 Rule 13.1.4 satisfied: -12 points",
                "Final Score: 8/100 (Low Risk)",
                "Evidence Strength: 92/100 (Excellent)",
                "Recommendation: REPRESENT — high confidence win"
            ],
            artifacts: [{
                id: "fraud-score",
                type: "json",
                label: "Fraud Risk Assessment",
                data: {
                    fraud_score: "8/100",
                    risk_level: "Low",
                    evidence_strength: "92/100",
                    recommendation: "REPRESENT",
                    confidence: "High"
                }
            }]
        },
        {
            id: "step-6",
            title_p: "Generating representment rebuttal letter...",
            title_s: "Rebuttal Letter Generated — RC 13.1 Representment Package",
            reasoning: [
                "Rebuttal letter compiled with:",
                "  FedEx delivery confirmation + signature proof",
                "  GPS delivery coordinates matching billing address",
                "  Photo-on-delivery evidence",
                "  CE 3.0 compliance documentation (Rule 13.1.4)",
                "  Cardholder purchase history with NovaTech",
                "  Total evidence pages: 6",
                "  Letter ready for VROL submission"
            ],
            artifacts: [{
                id: "rebuttal-pdf",
                type: "pdf",
                label: "Representment Rebuttal — RC 13.1",
                url: "/pdfs/chb001_rebuttal.pdf"
            }]
        },
        {
            id: "step-7",
            title_p: "Filing representment via VROL portal...",
            title_s: "VROL Filing — Representment Submitted Successfully",
            reasoning: [
                "Visa Resolve Online submission complete:",
                "  ARN: 7729-4481-0037-2841",
                "  Filing type: Representment (first cycle)",
                "  Evidence package: 6 pages attached",
                "  CE 3.0 flag: Active — liability shift invoked",
                "  Filed within 4 hours of case creation",
                "  Response deadline for issuer: 30 calendar days",
                "  Expected outcome: Favorable (92% confidence)"
            ],
            artifacts: [{
                id: "vrol-filing",
                type: "json",
                label: "VROL Submission Receipt",
                data: {
                    arn: "7729-4481-0037-2841",
                    filing_type: "Representment",
                    pages_attached: 6,
                    ce3_flag: "Active",
                    time_to_file: "3h 47m"
                }
            }]
        },
        {
            id: "step-8",
            title_p: "UiPath — Posting to SAP General Ledger and closing case...",
            title_s: "UiPath — Ledger Update + Merchant Notification + Case Closed",
            reasoning: [
                "UiPath RPA bot execution:",
                "  SAP GL posting: Chargeback reserve $2,847.00 reversed",
                "  Journal entry: JE-2026-CHB-0147 posted to GL account 2340",
                "  Merchant notification: NovaTech Electronics notified via email",
                "  Pega case status: RESOLVED — Won (Representment Accepted)",
                "  Total resolution time: 4 hours 12 minutes",
                "  Zero human analyst intervention required"
            ]
        }
    ];

    for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const isFinal = i === steps.length - 1;

        updateProcessLog(PROCESS_ID, {
            id: step.id,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            title: step.title_p,
            status: "processing"
        });
        await updateProcessListStatus(PROCESS_ID, "In Progress", step.title_p);
        await delay(2000);

        updateProcessLog(PROCESS_ID, {
            id: step.id,
            title: step.title_s,
            status: isFinal ? "completed" : "success",
            reasoning: step.reasoning || [],
            artifacts: step.artifacts || []
        });
        await updateProcessListStatus(PROCESS_ID, isFinal ? "Done" : "In Progress", step.title_s);
        await delay(1500);
    }

    console.log(`${PROCESS_ID} Complete: ${CASE_NAME}`);
})();
