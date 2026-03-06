const fs = require('fs');
const path = require('path');

// --- Configuration ---
const PROJECT_ROOT = path.join(__dirname, '..');
const PUBLIC_DATA_DIR = path.join(PROJECT_ROOT, 'public/data');
const PROCESSES_FILE = path.join(PUBLIC_DATA_DIR, 'processes.json');
const PROCESS_ID = "CHB_002";
const CASE_NAME = "Artisan Home Furnishings — Friendly Fraud Detection";

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

const waitForSignal = async (signalId) => {
    console.log(`Waiting for human signal: ${signalId}...`);
    const signalFile = path.join(__dirname, '../interaction-signals.json');

    for (let i = 0; i < 15; i++) {
        try {
            if (fs.existsSync(signalFile)) {
                const content = fs.readFileSync(signalFile, 'utf8');
                if (!content) continue;
                const signals = JSON.parse(content);
                if (signals[signalId]) {
                    delete signals[signalId];
                    const tempSignal = signalFile + '.' + Math.random().toString(36).substring(7) + '.tmp';
                    fs.writeFileSync(tempSignal, JSON.stringify(signals, null, 4));
                    fs.renameSync(tempSignal, signalFile);
                }
                break;
            }
        } catch (e) { await delay(Math.floor(Math.random() * 200) + 100); }
    }

    while (true) {
        try {
            if (fs.existsSync(signalFile)) {
                const content = fs.readFileSync(signalFile, 'utf8');
                if (content) {
                    const signals = JSON.parse(content);
                    if (signals[signalId]) {
                        console.log(`Signal ${signalId} received!`);
                        delete signals[signalId];
                        const tempSignal = signalFile + '.' + Math.random().toString(36).substring(7) + '.tmp';
                        fs.writeFileSync(tempSignal, JSON.stringify(signals, null, 4));
                        fs.renameSync(tempSignal, signalFile);
                        return true;
                    }
                }
            }
        } catch (e) { }
        await delay(1000);
    }
};

(async () => {
    console.log(`Starting ${PROCESS_ID}: ${CASE_NAME}...`);

    writeJson(path.join(PUBLIC_DATA_DIR, `process_${PROCESS_ID}.json`), {
        logs: [],
        keyDetails: {
            "Case ID": "CHB-2026-0289",
            "Reason Code": "Visa 13.3 — Not as Described / Defective",
            "Amount": "$6,420.00",
            "Cardholder": "Sarah M. Chen",
            "Merchant": "Artisan Home Furnishings",
            "Card Last 4": "3356"
        }
    });

    const steps = [
        {
            id: "step-1",
            title_p: "Pega Smart Dispute — Triaging case CHB-2026-0289...",
            title_s: "Pega Smart Dispute — Case Triaged, Routed to Pace (Complex Dispute)",
            reasoning: [
                "Visa VROL webhook received — new chargeback filed under RC 13.3",
                "Pega case CHB-2026-0289 created — running intake decisioning rules:",
                "  Validated cardholder: Sarah M. Chen (card ending 3356)",
                "  Merchant: Artisan Home Furnishings (MCC 5712 — Furniture Stores)",
                "  Transaction date: February 10, 2026 — dispute amount: $6,420.00",
                "  Cardholder claim: 'Dining set arrived damaged, legs broken'",
                "  Core banking pull: Original authorization confirmed, no reversal on file",
                "  SLA assignment: 15-day Visa representment window, deadline March 5, 2026",
                "Pega rule engine flagged two risk indicators:",
                "  1. Prior dispute found — Luxe Bedding Co, $3,180.00 (Jan 28, also RC 13.3)",
                "  2. High-value claim ($6,420) exceeds auto-adjudication threshold ($5,000)",
                "Pega routing decision — handing to Pace intelligence layer:",
                "  Prior dispute + high-value claim triggers complex dispute classification",
                "  Requires fraud pattern analysis and evidence judgment beyond rule engine",
                "  Pace to investigate, score fraud likelihood, and recommend action"
            ],
            artifacts: [{
                id: "case-intake",
                type: "json",
                label: "Pega Case Handoff",
                data: {
                    case_id: "CHB-2026-0289",
                    reason_code: "Visa 13.3",
                    amount: "$6,420.00",
                    cardholder: "Sarah M. Chen",
                    merchant: "Artisan Home Furnishings",
                    mcc: "5712",
                    transaction_date: "2026-02-10",
                    pega_triage: "Prior dispute flagged, high-value threshold exceeded",
                    handoff_reason: "Complex dispute — fraud pattern analysis required",
                    prior_dispute: "Luxe Bedding Co, $3,180.00, RC 13.3, Jan 28"
                }
            }]
        },
        {
            id: "step-2",
            title_p: "Pulling cardholder dispute history from Salesforce CRM...",
            title_s: "Salesforce CRM — Prior Dispute Flagged (Luxe Bedding Co)",
            reasoning: [
                "Salesforce CRM — Customer history for Sarah M. Chen:",
                "  Prior dispute: January 28, 2026 — Luxe Bedding Co, $3,180.00",
                "  That dispute also filed under RC 13.3 (Not as Described)",
                "  Prior dispute outcome: Refund granted (merchant did not contest)",
                "  Combined dispute exposure in 25 days: $9,600.00",
                "  No other dispute history prior to January 2026",
                "  Customer account created: August 2023",
                "Repeat RC 13.3 disputes against furniture merchants — pattern emerging"
            ],
            artifacts: [{
                id: "salesforce-history",
                type: "json",
                label: "Salesforce Dispute History",
                data: {
                    prior_disputes: 1,
                    prior_dispute_merchant: "Luxe Bedding Co",
                    prior_dispute_amount: "$3,180.00",
                    prior_dispute_rc: "13.3",
                    prior_dispute_date: "2026-01-28",
                    prior_outcome: "Refund granted",
                    combined_exposure: "$9,600.00"
                }
            }]
        },
        {
            id: "step-3",
            title_p: "Retrieving merchant order and delivery records from Artisan Home Furnishings...",
            title_s: "Merchant Records — Delivery Confirmed, Positive Email, No Damage Claim",
            reasoning: [
                "Merchant records — Artisan Home Furnishings:",
                "  Order #AHF-90421 — 6-piece walnut dining set ($6,420.00)",
                "  FedEx Freight delivery: February 14, signed 'S. Chen'",
                "  Customer email to merchant February 18: 'Absolutely love the craftsmanship'",
                "  No damage claim filed with merchant before chargeback",
                "  No return request initiated",
                "  Merchant's return window: 30 days (still open at time of dispute)",
                "Cardholder praised product 4 days after delivery, then filed chargeback claiming damage"
            ],
            artifacts: [{
                id: "merchant-records",
                type: "json",
                label: "Merchant Order Records",
                data: {
                    order_id: "AHF-90421",
                    item: "6-piece walnut dining set",
                    delivered: "2026-02-14",
                    signed_by: "S. Chen",
                    positive_email: "2026-02-18",
                    return_requested: false,
                    damage_claim: false,
                    return_window_open: true
                }
            }]
        },
        {
            id: "step-4",
            title_p: "Running social media intelligence scan...",
            title_s: "Social Media Intelligence — Instagram Evidence Found",
            reasoning: [
                "Instagram OSINT scan for cardholder Sarah M. Chen:",
                "  Public post: February 16, 2026 (2 days after delivery)",
                "  Caption: 'New dining room vibes! Finally upgraded from IKEA'",
                "  Photo shows: Walnut dining set matching order #AHF-90421",
                "  47 likes, 8 comments",
                "  Comment from user @chen_mama: 'Beautiful! Where did you get it?'",
                "  Reply from cardholder: 'Artisan Home Furnishings — worth every penny!'",
                "This directly contradicts the chargeback claim of damaged merchandise"
            ],
            artifacts: [{
                id: "instagram-evidence",
                type: "json",
                label: "Instagram Post Evidence",
                data: {
                    platform: "Instagram",
                    post_date: "2026-02-16",
                    caption: "New dining room vibes! Finally upgraded from IKEA",
                    likes: 47,
                    comments: 8,
                    product_visible: true,
                    contradicts_claim: true
                }
            }]
        },
        {
            id: "step-5",
            title_p: "Analyzing dual-dispute pattern across card network...",
            title_s: "Dual-Dispute Pattern Analysis — Serial Fraud Indicators",
            reasoning: [
                "Cross-network pattern analysis for Sarah M. Chen:",
                "  Dispute 1: Luxe Bedding Co — $3,180.00 (Jan 28, RC 13.3)",
                "  Dispute 2: Artisan Home Furnishings — $6,420.00 (current, RC 13.3)",
                "  Combined exposure: $9,600.00 in 25 days",
                "Pattern flags:",
                "  Both disputes use identical reason code (Visa 13.3)",
                "  Both merchants in MCC 5712 (Furniture Stores)",
                "  Dispute language nearly identical ('arrived damaged')",
                "  Neither merchant received return request or damage claim",
                "  First dispute succeeded — cardholder testing boundaries",
                "  Classic 'friendly fraud escalation' pattern detected"
            ],
            artifacts: [{
                id: "pattern-analysis",
                type: "json",
                label: "Dual-Dispute Pattern Report",
                data: {
                    disputes_in_25_days: 2,
                    combined_amount: "$9,600.00",
                    same_reason_code: true,
                    same_mcc: true,
                    identical_language: true,
                    pattern: "Friendly fraud escalation",
                    first_dispute_outcome: "Refund granted"
                }
            }]
        },
        {
            id: "step-6",
            title_p: "Computing fraud likelihood score with Gemini...",
            title_s: "Fraud Likelihood Scoring — Score: 89/100 (Confirmed Friendly Fraud)",
            reasoning: [
                "Gemini multi-factor fraud analysis:",
                "  Instagram post contradicting damage claim: +25 points",
                "  Positive email to merchant post-delivery: +20 points",
                "  Dual-dispute pattern (2 in 25 days): +18 points",
                "  Identical RC and MCC across disputes: +12 points",
                "  No return request or damage report filed: +8 points",
                "  First dispute succeeded (learned behavior): +6 points",
                "Final Score: 89/100 (Confirmed Friendly Fraud Pattern)",
                "Evidence Strength: 94/100 (Exceptional)",
                "Recommendation: AGGRESSIVE REPRESENTMENT + Fraud Team Escalation"
            ],
            artifacts: [{
                id: "fraud-score",
                type: "json",
                label: "Fraud Risk Assessment",
                data: {
                    fraud_score: "89/100",
                    risk_level: "Confirmed Pattern",
                    evidence_strength: "94/100",
                    recommendation: "Aggressive representment",
                    escalation: "Fraud team notification"
                }
            }]
        },
        {
            id: "step-7",
            title_p: "Generating fraud narrative rebuttal letter...",
            title_s: "Rebuttal Letter Generated — Fraud Narrative with Social Media Evidence",
            reasoning: [
                "Rebuttal letter compiled with:",
                "  Instagram post screenshot (Feb 16) showing undamaged product",
                "  Cardholder's own comment: 'worth every penny!'",
                "  Positive email to merchant praising craftsmanship",
                "  Dual-dispute pattern documentation",
                "  FedEx Freight signed delivery confirmation",
                "  Merchant order records with no damage claim",
                "  Total evidence pages: 9",
                "  Letter includes fraud pattern narrative for Visa review"
            ],
            artifacts: [{
                id: "rebuttal-pdf",
                type: "pdf",
                label: "Fraud Narrative Rebuttal — RC 13.3",
                url: "/pdfs/chb002_rebuttal.pdf"
            }]
        },
        {
            id: "step-8",
            title_p: "Awaiting analyst approval for fraud escalation...",
            title_s: "Analyst Review Required — Approve Fraud Evidence Package",
            reasoning: [
                "HUMAN-IN-THE-LOOP checkpoint reached",
                "This case involves fraud team escalation beyond standard representment.",
                "Analyst must review and approve before proceeding:",
                "  1. Rebuttal letter with social media evidence",
                "  2. Dual-dispute pattern flagging cardholder for monitoring",
                "  3. Fraud team alert to add Sarah M. Chen to watch list",
                "  4. Potential law enforcement referral if pattern continues",
                "Awaiting analyst confirmation to proceed..."
            ],
            isHitl: true,
            hitlSignal: "APPROVE_EVIDENCE_CB002"
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

        if (step.isHitl) {
            updateProcessLog(PROCESS_ID, {
                id: step.id,
                title: step.title_s,
                status: "warning",
                reasoning: step.reasoning || [],
                artifacts: step.artifacts || []
            });
            await updateProcessListStatus(PROCESS_ID, "Needs Attention", step.title_s);

            await waitForSignal(step.hitlSignal);
            await updateProcessListStatus(PROCESS_ID, "In Progress", "Analyst approved — filing representment and escalating to fraud team");

            await delay(2000);
            updateProcessLog(PROCESS_ID, {
                id: "step-9"                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                title: "VROL Filing + Fraud Team Alert + UiPath Notifications",
                status: "completed",
                reasoning: [
                    "Representment filed via VROL:",
                    "  ARN: 3356-8812-0289-4471",
                    "  Evidence package: 9 pages including social media proof",
                    "  Fraud narrative flag: Active",
                    "Fraud team escalation:",
                    "  Sarah M. Chen added to Enhanced Monitoring list",
                    "  Alert sent to Meridian Bank Fraud Operations",
                    "  Cross-reference flag set for future RC 13.3 disputes",
                    "UiPath RPA execution:",
                    "  SAP GL posting: Chargeback reserve $6,420.00 maintained",
                    "  Merchant notification: Artisan Home Furnishings updated",
                    "  Case status: RESOLVED — Won (Fraud Pattern Confirmed)"
                ]
            });
            await updateProcessListStatus(PROCESS_ID, "Done", "Dispute resolved — fraud pattern confirmed, representment filed");
        } else {
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
    }

    console.log(`${PROCESS_ID} Complete: ${CASE_NAME}`);
})();
