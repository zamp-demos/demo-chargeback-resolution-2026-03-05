const fs = require('fs');
const path = require('path');

// --- Configuration ---
const PROJECT_ROOT = path.join(__dirname, '..');
const PUBLIC_DATA_DIR = path.join(PROJECT_ROOT, 'public/data');
const PROCESSES_FILE = path.join(PUBLIC_DATA_DIR, 'processes.json');
const PROCESS_ID = "CHB_003";
const CASE_NAME = "CloudFit Athletic Gear — Pre-Arb Cost-Benefit Reversal";

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
            "Case ID": "CHB-2026-0412",
            "Reason Code": "Visa 10.4 — Other Fraud (Card Absent)",
            "Amount": "$1,180.00",
            "Cardholder": "David L. Morrison",
            "Merchant": "CloudFit Athletic Gear",
            "Card Last 4": "6709"
        }
    });

    const steps = [
        {
            id: "step-1",
            title_p: "Pega Smart Dispute — Triaging case CHB-2026-0412...",
            title_s: "Pega Smart Dispute — Case Triaged, Routed to Pace (Pre-Arbitration)",
            reasoning: [
                "Visa VROL webhook received — chargeback escalation to pre-arbitration",
                "Pega case CHB-2026-0412 created — running intake decisioning rules:",
                "  Validated cardholder: David L. Morrison (card ending 6709)",
                "  Merchant: CloudFit Athletic Gear (MCC 5941 — Sporting Goods)",
                "  Transaction date: January 30, 2026 — dispute amount: $1,180.00",
                "  Reason Code: Visa 10.4 — Other Fraud (Card-Absent Environment)",
                "  Core banking pull: Original authorization confirmed via 3DS frictionless flow",
                "Pega detected this is a pre-arbitration escalation:",
                "  Prior representment filed February 15 — rejected by Visa",
                "  Rejection reason: CE 3.0 Rule 10.4.3 not satisfied",
                "  Case now in pre-arb phase — 10-day decision deadline",
                "  Arbitration filing fee: $500.00 (non-refundable if lost)",
                "Pega routing decision — handing to Pace intelligence layer:",
                "  Pre-arbitration involves financial risk assessment ($500 fee at stake)",
                "  Requires cost-benefit analysis and evidence re-evaluation beyond rule engine",
                "  Pace to analyze evidence strength, model economics, and recommend action"
            ],
            artifacts: [{
                id: "case-intake",
                type: "json",
                label: "Pega Case Handoff",
                data: {
                    case_id: "CHB-2026-0412",
                    reason_code: "Visa 10.4",
                    amount: "$1,180.00",
                    cardholder: "David L. Morrison",
                    merchant: "CloudFit Athletic Gear",
                    mcc: "5941",
                    stage: "Pre-arbitration",
                    pega_triage: "Prior representment rejected, pre-arb escalation detected",
                    handoff_reason: "Financial risk decision — cost-benefit analysis required",
                    prior_representment: "Filed Feb 15, rejected (CE 3.0 Rule 10.4.3 not met)",
                    arbitration_fee: "$500.00"
                }
            }]
        },
        {
            id: "step-2",
            title_p: "Pulling 3DS authentication logs and device fingerprint data...",
            title_s: "Evidence Gathering — 3DS Authentication + Device Fingerprint",
            reasoning: [
                "3D Secure 2.0 authentication analysis:",
                "  Authentication type: Frictionless flow (no challenge issued)",
                "  ECI indicator: 05 (fully authenticated, liability shift to issuer)",
                "  3DS Server: Visa Directory Server v2.2.0",
                "Device fingerprint analysis:",
                "  Transaction IP: 172.58.91.204 (Phoenix, AZ)",
                "  Cardholder registered address: Denver, CO",
                "  IP geolocation mismatch: 600+ miles from billing address",
                "  Device: Chrome 121 / Windows 11 — not in cardholder device history",
                "  Browser language: en-US (consistent)",
                "Mixed signals: 3DS authenticated but device/IP anomalies present"
            ],
            artifacts: [{
                id: "3ds-analysis",
                type: "json",
                label: "3DS + Device Analysis",
                data: {
                    auth_type: "Frictionless 3DS 2.0",
                    eci: "05",
                    liability_shift: "Issuer",
                    ip_location: "Phoenix, AZ",
                    billing_location: "Denver, CO",
                    ip_mismatch: true,
                    device_known: false
                }
            }]
        },
        {
            id: "step-3",
            title_p: "Checking VROL for prior representment outcome...",
            title_s: "VROL Status Check — Representment Previously Rejected",
            reasoning: [
                "Visa Resolve Online case history:",
                "  First representment filed: February 15, 2026",
                "  Evidence submitted: 3DS authentication logs, merchant records",
                "  Visa ruling: REJECTED",
                "  Rejection reason: CE 3.0 Rule 10.4.3 not satisfied",
                "  Visa noted IP/device mismatch undermined 3DS evidence",
                "Case now in pre-arbitration phase:",
                "  Meridian Bank must decide: escalate to arbitration or accept liability",
                "  Arbitration filing fee: $500.00",
                "  Decision deadline: 10 calendar days"
            ],
            artifacts: [{
                id: "vrol-video",
                type: "video",
                label: "VROL Portal — Rejection Details",
                url: "/mocks/chb003_vrol_browser.webm"
            }]
        },
        {
            id: "step-4",
            title_p: "Running pre-arbitration cost-benefit analysis...",
            title_s: "Pre-Arbitration Cost-Benefit Analysis — Negative Expected Value",
            reasoning: [
                "Arbitration financial analysis:",
                "  Dispute amount: $1,180.00",
                "  Arbitration filing fee: $500.00 (non-refundable if lost)",
                "  Win probability: 35% (weak evidence after CE 3.0 rejection)",
                "Expected value calculation:",
                "  If win (35%):  +$1,180.00 recovered",
                "  If lose (65%): -$500.00 filing fee (amount already lost)",
                "  Expected value: (0.35 × $1,180) - (0.65 × $500) = $413 - $325 = +$88",
                "  Minus internal processing cost (~$175): Net EV = -$87.00",
                "Recommendation: ACCEPT LIABILITY — negative expected value",
                "Arbitration is not economically justified for this case"
            ],
            artifacts: [{
                id: "cost-benefit",
                type: "json",
                label: "Pre-Arb Cost-Benefit Model",
                data: {
                    dispute_amount: "$1,180.00",
                    filing_fee: "$500.00",
                    win_probability: "35%",
                    expected_recovery: "$413.00",
                    expected_cost: "$500.00",
                    net_expected_value: "-$87.00",
                    recommendation: "Accept liability"
                }
            }]
        },
        {
            id: "step-5",
            title_p: "Computing fraud likelihood score with Gemini...",
            title_s: "Fraud Likelihood Scoring — Score: 42/100 (Moderate / Inconclusive)",
            reasoning: [
                "Gemini multi-factor fraud analysis:",
                "  3DS frictionless authentication (ECI 05): -20 points",
                "  IP geolocation mismatch (600+ miles): +18 points",
                "  Unknown device not in history: +15 points",
                "  Prior representment rejected by Visa: +12 points",
                "  No prior disputes on this card: -8 points",
                "  Merchant has low dispute ratio (0.3%): -5 points",
                "Final Score: 42/100 (Moderate — Inconclusive)",
                "Evidence Strength: 31/100 (Weak after CE 3.0 rejection)",
                "Recommendation: ACCEPT LIABILITY — evidence insufficient for arbitration"
            ],
            artifacts: [{
                id: "fraud-score",
                type: "json",
                label: "Fraud Risk Assessment",
                data: {
                    fraud_score: "42/100",
                    risk_level: "Moderate",
                    evidence_strength: "31/100",
                    recommendation: "Accept liability",
                    rationale: "Negative EV, weak evidence"
                }
            }]
        },
        {
            id: "step-6",
            title_p: "Awaiting analyst review of cost-benefit recommendation...",
            title_s: "Analyst Review — Accept Liability Recommendation ($-87 EV)",
            reasoning: [
                "HUMAN-IN-THE-LOOP checkpoint reached",
                "Pace recommends accepting liability based on cost-benefit analysis:",
                "  Dispute amount: $1,180.00",
                "  Arbitration filing fee: $500.00",
                "  Win probability: 35%",
                "  Net expected value: -$87.00",
                "If analyst approves:",
                "  Liability will be accepted, no arbitration filed",
                "  $1,180.00 written off to chargeback loss reserve",
                "  Case closed as RESOLVED — Liability Accepted",
                "If analyst overrides:",
                "  Case will proceed to Visa arbitration ($500 fee)",
                "Awaiting analyst decision..."
            ],
            isHitl: true,
            hitlSignal: "APPROVE_PARTIAL_REFUND_CB003"
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
            await updateProcessListStatus(PROCESS_ID, "In Progress", "Analyst approved liability acceptance — posting to SAP");

            await delay(2000);
            updateProcessLog(PROCESS_ID, {
                id: "step-7",
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                title: "SAP Liability Posting + Pega Case Closure",
                status: "completed",
                reasoning: [
                    "UiPath RPA bot execution:",
                    "  SAP GL posting: $1,180.00 to chargeback loss reserve (GL 2380)",
                    "  Journal entry: JE-2026-CHB-0412 posted",
                    "  Merchant notification: CloudFit Athletic Gear — no further action",
                    "Pega case closure:",
                    "  Status: RESOLVED — Liability Accepted",
                    "  Reason: Negative expected value (-$87.00), weak evidence",
                    "  Arbitration avoided — saved $500.00 filing fee",
                    "  Total resolution time: 2 hours 38 minutes",
                    "  Bank net savings vs arbitration: $587.00"
                ]
            });
            await updateProcessListStatus(PROCESS_ID, "Done", "Liability accepted — $587 saved vs arbitration path");
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
