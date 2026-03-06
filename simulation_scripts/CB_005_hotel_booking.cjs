const fs = require('fs');
const path = require('path');

// --- Configuration ---
const PROJECT_ROOT = path.join(__dirname, '..');
const PUBLIC_DATA_DIR = path.join(PROJECT_ROOT, 'public/data');
const PROCESSES_FILE = path.join(PUBLIC_DATA_DIR, 'processes.json');
const PROCESS_ID = "CHB_005";
const CASE_NAME = "Grand Meridian Hotel — Representment Document Analysis";

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

const waitForEmailSent = async () => {
    console.log('Waiting for email to be sent via /email-status...');
    const apiUrl = process.env.VITE_API_URL || 'http://localhost:3001';

    while (true) {
        try {
            const response = await fetch(`${apiUrl}/email-status`);
            const data = await response.json();
            if (data.sent) {
                console.log('Email sent signal received!');
                return true;
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
            "Case ID": "CHB-2026-0731",
            "Reason Code": "Visa 13.1 — Merchandise/Services Not Received",
            "Amount": "$4,200.00",
            "Cardholder": "Katherine E. Whitfield",
            "Merchant": "Grand Meridian Hotel & Suites",
            "Card Last 4": "4892"
        }
    });

    const steps = [
        {
            id: "step-1",
            title_p: "Pega Smart Dispute — Representment received, routing to Pace...",
            title_s: "Pega Smart Dispute — Representment Routed to Pace",
            reasoning: [
                "Pega STP processed the initial chargeback for case CHB-2026-0731 automatically",
                "under Visa Reason Code 13.1 (Merchandise/Services Not Received).",
                "Provisional credit of $4,200.00 was issued to cardholder on 2026-02-18.",
                "",
                "The merchant, Grand Meridian Hotel & Suites, has now submitted a representment",
                "packet containing 4 documents. Pega's deterministic rules cannot parse unstructured",
                "merchant evidence — routing to Pace for intelligent document analysis."
            ],
            artifacts: [{
                id: "case-intake-cb005",
                type: "json",
                label: "Case Details — CHB-2026-0731",
                data: {
                    caseId: "CHB-2026-0731",
                    processId: "CHB_005",
                    cardholderName: "Katherine E. Whitfield",
                    cardNumber: "****-****-****-4892",
                    merchantName: "Grand Meridian Hotel & Suites",
                    merchantCategory: "MCC 7011 — Lodging / Hotels",
                    transactionDate: "2026-02-08",
                    disputeAmount: "$4,200.00",
                    reasonCode: "Visa 13.1 — Merchandise/Services Not Received",
                    cardholderClaim: "Hotel stay was never rendered — booking was cancelled",
                    chargebackFiledDate: "2026-02-15",
                    provisionalCreditDate: "2026-02-18",
                    representmentReceivedDate: "2026-03-01",
                    merchantDocumentsSubmitted: 4,
                    pegaDecision: "STP limit reached — unstructured evidence requires intelligent analysis",
                    routedTo: "Pace Intelligence Layer"
                }
            }]
        },
        {
            id: "step-2",
            title_p: "Pace — Extracting evidence from 4 merchant documents...",
            title_s: "Pace — Intelligent Document Extraction (23 Facts from 4 Documents)",
            reasoning: [
                "Pace ingested the merchant's representment packet — 4 documents in mixed formats.",
                "Each document was parsed, OCR'd where necessary, and key facts extracted.",
                "",
                "Document 1: Hotel check-in scan (image) — physical registration card with signature",
                "Document 2: Email correspondence thread (PDF) — 6 messages between cardholder and hotel",
                "Document 3: Hotel cancellation & modification policy (PDF) — terms and conditions",
                "Document 4: Hotel folio / itemized invoice (PDF) — charges over 3-night stay",
                "",
                "Pace extracted 23 discrete facts across all 4 documents in 4.2 seconds."
            ],
            artifacts: [
                {
                    id: "doc1-checkin",
                    type: "image",
                    label: "Document 1 — Hotel Check-In Registration Scan",
                    src: "/pdfs/chb005_checkin_scan.png"
                },
                {
                    id: "doc2-email",
                    type: "file",
                    label: "Document 2 — Email Correspondence Thread",
                    pdfPath: "/pdfs/chb005_email_thread.pdf"
                },
                {
                    id: "doc3-policy",
                    type: "file",
                    label: "Document 3 — Hotel Cancellation & Modification Policy",
                    pdfPath: "/pdfs/chb005_cancellation_policy.pdf"
                },
                {
                    id: "doc4-folio",
                    type: "file",
                    label: "Document 4 — Hotel Folio / Itemized Invoice",
                    pdfPath: "/pdfs/chb005_hotel_folio.pdf"
                },
                {
                    id: "extraction-summary",
                    type: "json",
                    label: "Extraction Summary — All 4 Documents",
                    data: {
                        totalDocumentsProcessed: 4,
                        totalFactsExtracted: 23,
                        processingTime: "4.2 seconds",
                        document1_checkinScan: {
                            type: "Image (scanned registration card)",
                            guestName: "Katherine E. Whitfield",
                            checkInDate: "2026-02-10",
                            checkOutDate: "2026-02-13",
                            roomNumber: "Suite 1204",
                            guestSignature: "PRESENT — verified against card-on-file name",
                            signatureTimestamp: "2026-02-10 at 14:32 EST",
                            idVerification: "Driver license ending *8834 — matched"
                        },
                        document2_emailThread: {
                            type: "PDF (6-message email thread)",
                            originalBookingDates: "2026-02-05 to 2026-02-08",
                            dateChangeRequested: "2026-02-03",
                            newDatesRequested: "2026-02-10 to 2026-02-13",
                            requestedBy: "Katherine Whitfield (katherine.whitfield@bellvue-partners.com)",
                            hotelConfirmation: "Confirmed by reservations@grandmeridian.com on 2026-02-03",
                            newConfirmationNumber: "GM-2026-88412-REV",
                            cancellationMentioned: "NO — cardholder explicitly wrote 'move my dates' not 'cancel'"
                        },
                        document3_cancellationPolicy: {
                            type: "PDF (terms and conditions)",
                            freeCancellationWindow: "72 hours before check-in",
                            modificationPolicy: "Date changes within 48 hours of new check-in are non-refundable",
                            modificationBinding: "Revised booking becomes non-refundable per Section 4.2(b)"
                        },
                        document4_hotelFolio: {
                            type: "PDF (itemized charges)",
                            folioNumber: "FO-2026-1204-WH",
                            totalCharges: "$4,200.00",
                            roomCharges: "$3,600.00 (3 nights × $1,200/night — Executive Suite)",
                            minibarCharges: "$187.50 (Feb 10, 11, 12)",
                            roomService: "$312.50 (Feb 11 dinner, Feb 12 breakfast)",
                            spaServices: "$100.00 (Feb 11)",
                            occupancyEvidence: "Room service + minibar + spa across 3 days confirms physical presence"
                        }
                    }
                }
            ]
        },
        {
            id: "step-3",
            title_p: "Pace — Cross-referencing evidence across all 4 documents...",
            title_s: "Pace — Cross-Reference Analysis (5/5 Tests Fail Cardholder Claim)",
            reasoning: [
                "Pace cross-referenced the 23 extracted facts across all 4 documents",
                "and against Meridian Bank's internal records.",
                "",
                "The cardholder claims the hotel stay was 'never rendered' and the booking was cancelled.",
                "Pace tested this claim against the documentary evidence:",
                "",
                "Test 1 — Was the booking cancelled? NO",
                "  Email thread shows date CHANGE request, not cancellation.",
                "  Cardholder's exact words: 'I need to move my dates to Feb 10-13 instead.'",
                "",
                "Test 2 — Did the cardholder check in? YES",
                "  Physical registration card signed Feb 10 at 14:32 EST. ID verified.",
                "",
                "Test 3 — Did the cardholder physically stay? YES",
                "  Minibar, room service, spa charges across 3 days require physical presence.",
                "",
                "Test 4 — Is the revised booking refundable? NO",
                "  Section 4.2(b): date modifications create a new non-refundable booking.",
                "",
                "Test 5 — Does the charge amount match? YES",
                "  Folio total $4,200.00 matches disputed amount exactly.",
                "",
                "All 5 tests fail the cardholder's claim."
            ],
            artifacts: [{
                id: "cross-ref-matrix",
                type: "json",
                label: "Evidence Cross-Reference Matrix",
                data: {
                    cardholderClaim: "Hotel stay never rendered — booking was cancelled",
                    crossReferenceResults: [
                        {
                            test: "Was the booking cancelled?",
                            finding: "NO",
                            evidence: "Email thread shows cardholder requested DATE CHANGE on Feb 3, not cancellation. Exact words: 'I need to move my dates to Feb 10-13 instead.'",
                            sources: ["Document 2 — Email Thread (message #2, Feb 3 at 09:14)"]
                        },
                        {
                            test: "Did the cardholder check in?",
                            finding: "YES",
                            evidence: "Physical registration card signed by Katherine E. Whitfield on Feb 10 at 14:32 EST. Driver license ID verified. Room 1204 assigned.",
                            sources: ["Document 1 — Check-In Scan"]
                        },
                        {
                            test: "Did the cardholder physically stay at the hotel?",
                            finding: "YES",
                            evidence: "Folio shows minibar charges on Feb 10, 11, 12; room service on Feb 11 and 12; spa service on Feb 11. These charges require physical presence.",
                            sources: ["Document 4 — Hotel Folio"]
                        },
                        {
                            test: "Is the revised booking refundable?",
                            finding: "NO",
                            evidence: "Hotel policy Section 4.2(b): date modifications create a new non-refundable booking. Confirmation GM-2026-88412-REV is binding.",
                            sources: ["Document 3 — Cancellation Policy", "Document 2 — Email Thread"]
                        },
                        {
                            test: "Does the charge amount match?",
                            finding: "YES",
                            evidence: "Folio total $4,200.00 matches disputed amount exactly. Breakdown: $3,600 room + $600 incidentals.",
                            sources: ["Document 4 — Hotel Folio", "Case Details"]
                        }
                    ],
                    contradictionsSummary: "Cardholder claims service never rendered, but 4 independent evidence sources confirm: (1) dates were changed not cancelled, (2) cardholder checked in with signature, (3) cardholder incurred in-room charges over 3 days, (4) revised booking is non-refundable. All 5 tests fail the cardholder's claim."
                }
            }]
        },
        {
            id: "step-4",
            title_p: "Pace — Rendering verdict based on cross-reference analysis...",
            title_s: "Pace — Verdict: Merchant Wins (Confidence 97.2%)",
            reasoning: [
                "Based on cross-reference analysis of all 4 merchant documents against the",
                "cardholder's claim, Pace has reached a determination.",
                "",
                "The cardholder's own email correspondence is the deciding evidence —",
                "it proves a date change was requested, not a cancellation.",
                "Combined with the signed check-in, in-room charges, and non-refundable policy,",
                "the merchant's representment fully rebuts the dispute.",
                "",
                "Verdict: MERCHANT WINS — Representment Accepted",
                "Confidence: 97.2%",
                "Recommendation: Accept representment. Reverse provisional credit of $4,200.00."
            ],
            artifacts: [{
                id: "verdict-cb005",
                type: "json",
                label: "Verdict — CHB-2026-0731",
                data: {
                    caseId: "CHB-2026-0731",
                    verdict: "MERCHANT WINS — Representment Accepted",
                    confidence: "97.2%",
                    reasonCode: "Visa 13.1 — Merchandise/Services Not Received",
                    finding: "Services WERE rendered. Cardholder's claim is contradicted by their own correspondence and 3 corroborating documents.",
                    decidingEvidence: {
                        document: "Email Correspondence Thread (Document 2)",
                        keyFact: "Cardholder wrote 'I need to move my dates to Feb 10-13 instead' on Feb 3 — this is a modification request, not a cancellation",
                        significance: "Directly contradicts the cardholder's dispute claim that the booking was cancelled"
                    },
                    corroboratingEvidence: [
                        "Check-in scan: Cardholder signed registration card on Feb 10 at 14:32 — physically arrived",
                        "Hotel folio: Minibar, room service, spa charges across 3 days — physically stayed",
                        "Cancellation policy: Section 4.2(b) makes modified bookings non-refundable — no refund owed"
                    ],
                    recommendedAction: "Accept merchant representment. Reverse provisional credit of $4,200.00.",
                    riskAssessment: "LOW — Evidence is overwhelming and internally consistent. Pre-arbitration unlikely."
                }
            }]
        },
        {
            id: "step-5",
            title_p: "Awaiting analyst review of representment verdict...",
            title_s: "Analyst Review Required — Approve Representment Acceptance",
            reasoning: [
                "HUMAN-IN-THE-LOOP checkpoint reached",
                "",
                "Pace recommends accepting the merchant's representment and reversing the",
                "provisional credit of $4,200.00 back to the cardholder's account.",
                "",
                "The evidence strongly supports the merchant. The cardholder's own email proves",
                "the stay was modified (not cancelled), and 3 additional documents confirm occupancy.",
                "",
                "Confidence: 97.2%",
                "Pre-arbitration risk: LOW",
                "",
                "Please review the evidence summary and approve or override this recommendation."
            ],
            isHitl: true,
            hitlSignal: "APPROVE_REPRESENTMENT_CB005",
            artifacts: [{
                id: "analyst-decision-cb005",
                type: "decision",
                label: "Approve Representment Acceptance?",
                options: [
                    { label: "Approve — Accept representment, reverse provisional credit", signal: "APPROVE_REPRESENTMENT_CB005" },
                    { label: "Override — Reject representment, maintain cardholder credit", signal: "APPROVE_REPRESENTMENT_CB005" }
                ]
            }]
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
            await updateProcessListStatus(PROCESS_ID, "In Progress", "Analyst approved — drafting response to Visa network");

            // --- Post-HITL Step 6: Email Draft to Visa ---
            await delay(2000);
            updateProcessLog(PROCESS_ID, {
                id: "step-6",
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                title: "Pace — Drafting representment acceptance response to Visa...",
                status: "processing"
            });
            await updateProcessListStatus(PROCESS_ID, "In Progress", "Drafting representment response to Visa...");
            await delay(2000);
            updateProcessLog(PROCESS_ID, {
                id: "step-6",
                title: "Pace — Draft Response to Visa Network",
                status: "warning",
                reasoning: [
                    "Analyst approved the representment acceptance. Pace is now drafting the formal",
                    "response to Visa's dispute resolution channel, citing the evidence package",
                    "and compliance framework references.",
                    "",
                    "Review the draft and click Send to dispatch via Pega Correspondence Engine."
                ],
                artifacts: [{
                    id: "visa-response-email",
                    type: "email_draft",
                    label: "Response to Visa — Representment Accepted",
                    data: {
                        from: "disputes@meridianbank.com",
                        to: "visa-disputes@visa.com",
                        subject: "RE: Chargeback CHB-2026-0731 — Representment Accepted, Provisional Credit Reversal",
                        body: "Dear Visa Dispute Resolution Team,\n\nRegarding Case CHB-2026-0731 (Visa RC 13.1 — Merchandise/Services Not Received), Meridian Bank has completed its review of the merchant representment submitted by Grand Meridian Hotel & Suites.\n\nAfter thorough analysis of the submitted evidence package, we have determined that the merchant's representment is valid and the cardholder's claim is not substantiated.\n\nKey Findings:\n\n1. The cardholder did not cancel the booking. Email correspondence dated February 3, 2026 shows the cardholder requested a date modification from Feb 5-8 to Feb 10-13, not a cancellation. The cardholder's exact words were: \"I need to move my dates to Feb 10-13 instead.\"\n\n2. The cardholder checked in and stayed at the hotel. A signed physical registration card (Feb 10 at 14:32 EST) and itemized folio showing minibar, room service, and spa charges across February 10-12 confirm physical occupancy.\n\n3. The revised booking is non-refundable. Per the hotel's cancellation policy Section 4.2(b), date modifications create a new non-refundable reservation. The revised confirmation (GM-2026-88412-REV) is binding.\n\nAction Taken:\n- Representment accepted in full\n- Provisional credit of $4,200.00 will be reversed to cardholder account ending ****4892\n- Merchant funds released\n\nEvidence package reference: 4 documents on file (check-in scan, email thread, cancellation policy, hotel folio).\n\nPlease confirm receipt and processing.\n\nRegards,\nMeridian Bank Disputes Team\nCase Reference: CHB-2026-0731"
                    }
                }]
            });
            await updateProcessListStatus(PROCESS_ID, "Needs Attention", "Review Visa response before dispatching");

            // Wait for the email Send button to be clicked
            await waitForEmailSent();
            await updateProcessListStatus(PROCESS_ID, "In Progress", "Response dispatched — closing case");

            // --- Post-Email Step 7: Case Closed ---
            await delay(2000);
            updateProcessLog(PROCESS_ID, {
                id: "step-7",
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                title: "Pega Smart Dispute — Closing case, reversing provisional credit...",
                status: "processing"
            });
            await updateProcessListStatus(PROCESS_ID, "In Progress", "Pega processing case closure...");
            await delay(2000);
            updateProcessLog(PROCESS_ID, {
                id: "step-7",
                title: "Case Resolved — Merchant Representment Accepted",
                status: "completed",
                reasoning: [
                    "CHB-2026-0731 is now closed. The merchant's representment has been accepted",
                    "and the provisional credit of $4,200.00 is being reversed.",
                    "",
                    "Resolution summary:",
                    "  Cardholder claim: Hotel stay never rendered (booking cancelled)",
                    "  Finding: Claim contradicted by cardholder's own email + 3 corroborating documents",
                    "  Deciding evidence: Email thread proving date change, not cancellation",
                    "  Outcome: Merchant wins — representment accepted",
                    "  Action: Provisional credit of $4,200.00 reversed to cardholder account ****4892",
                    "",
                    "Pace analyzed 4 unstructured merchant documents, extracted 23 facts,",
                    "cross-referenced them against the dispute claim, and reached a determination",
                    "in under 30 seconds — a process that typically takes an analyst 45-60 minutes.",
                    "",
                    "Case routed to Pega for final closure and archival."
                ],
                artifacts: [{
                    id: "case-closure-cb005",
                    type: "json",
                    label: "Case Closure — CHB-2026-0731",
                    data: {
                        caseId: "CHB-2026-0731",
                        status: "CLOSED",
                        resolution: "Merchant Representment Accepted",
                        provisionalCreditReversed: "$4,200.00",
                        cardholderAccount: "****4892",
                        merchantName: "Grand Meridian Hotel & Suites",
                        processingTime: "28.4 seconds (Pace) vs ~52 minutes (manual analyst average)",
                        documentsAnalyzed: 4,
                        factsExtracted: 23,
                        crossReferencesPerformed: 5,
                        confidenceScore: "97.2%",
                        preArbitrationRisk: "LOW",
                        closedBy: "Pace Intelligence Layer + Analyst Approval",
                        archivedTo: "Pega Smart Dispute — Case Management"
                    }
                }]
            });
            await updateProcessListStatus(PROCESS_ID, "Done", "Case closed — representment accepted, credit reversed");
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
