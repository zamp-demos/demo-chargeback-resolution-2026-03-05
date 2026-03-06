const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

// ── Config ──────────────────────────────────────────────────────────────
const PROCESS_ID = "CHB_005";
const CASE_NAME = "Grand Meridian Hotel — Representment Document Analysis";
const API_URL = process.env.API_URL || "http://localhost:3001";
const PUBLIC_DATA_DIR = path.join(__dirname, '..', 'public', 'data');
const STEP_DELAY = 4000;

// ── Utilities ───────────────────────────────────────────────────────────
function writeJson(filePath, data) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const tmpFile = filePath + '.tmp';
    fs.writeFileSync(tmpFile, JSON.stringify(data, null, 4));
    fs.renameSync(tmpFile, filePath);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function updateProcess(updates) {
    const processPath = path.join(PUBLIC_DATA_DIR, `process_${PROCESS_ID}.json`);
    let current = {};
    try { current = JSON.parse(fs.readFileSync(processPath, 'utf8')); } catch {}
    const updated = { ...current, ...updates, lastUpdated: new Date().toISOString() };
    writeJson(processPath, updated);
    return updated;
}

function addLogEntry(step, title, description, artifacts = [], isLatest = true) {
    const logPath = path.join(PUBLIC_DATA_DIR, `log_${PROCESS_ID}.json`);
    let logs = [];
    try { logs = JSON.parse(fs.readFileSync(logPath, 'utf8')); } catch {}
    if (isLatest) logs.forEach(l => l.isLatest = false);
    logs.push({
        step, title, description, artifacts,
        timestamp: new Date().toISOString(),
        isLatest
    });
    writeJson(logPath, logs);
}

function postJson(urlStr, data) {
    return new Promise((resolve, reject) => {
        const url = new URL(urlStr);
        const mod = url.protocol === 'https:' ? https : http;
        const req = mod.request(url, { method: 'POST', headers: { 'Content-Type': 'application/json' } }, (res) => {
            let body = ''; res.on('data', c => body += c); res.on('end', () => resolve(body));
        });
        req.on('error', reject);
        req.write(JSON.stringify(data));
        req.end();
    });
}

function waitForSignal(signalId) {
    return new Promise((resolve) => {
        const signalFile = path.join(__dirname, '../interaction-signals.json');
        const check = () => {
            try {
                const content = fs.readFileSync(signalFile, 'utf8');
                const signals = JSON.parse(content);
                if (signals[signalId]) {
                    delete signals[signalId];
                    const tmpSignal = signalFile + '.tmp';
                    fs.writeFileSync(tmpSignal, JSON.stringify(signals, null, 4));
                    fs.renameSync(tmpSignal, signalFile);
                    resolve();
                    return;
                }
            } catch {}
            setTimeout(check, 1000);
        };
        setTimeout(check, 2000);
    });
}

function waitForEmailSent() {
    const apiUrl = API_URL;
    console.log('Waiting for email to be sent via /email-status...');
    return new Promise((resolve) => {
        const check = async () => {
            try {
                const response = await fetch(`${apiUrl}/email-status`);
                const data = await response.json();
                if (data.sent) {
                    console.log('Email sent signal received!');
                    resolve();
                    return;
                }
            } catch {}
            setTimeout(check, 2000);
        };
        setTimeout(check, 2000);
    });
}

// ── Main Simulation ─────────────────────────────────────────────────────
async function runSimulation() {
    console.log(`Starting ${PROCESS_ID}: ${CASE_NAME}...`);

    writeJson(path.join(PUBLIC_DATA_DIR, `process_${PROCESS_ID}.json`), {
        id: PROCESS_ID,
        category: "Chargeback Resolution",
        name: CASE_NAME,
        status: "In Progress",
        currentStatus: "Initializing...",
        year: new Date().toISOString().split('T')[0]
    });
    writeJson(path.join(PUBLIC_DATA_DIR, `log_${PROCESS_ID}.json`), []);
    await sleep(STEP_DELAY);

    // ════════════════════════════════════════════════════════════════════
    // STEP 1 — Pega STP receives representment, routes to Pace
    // ════════════════════════════════════════════════════════════════════
    updateProcess({ currentStatus: "Pega STP: Representment received — routing to Pace" });
    addLogEntry("step-1", "Pega Smart Dispute — Representment Received", [
        "Pega STP processed the initial chargeback for case CHB-2026-0731 automatically",
        "under Visa Reason Code 13.1 (Merchandise/Services Not Received).",
        "Provisional credit of $4,200.00 was issued to cardholder on 2026-02-18.",
        "",
        "The merchant, Grand Meridian Hotel & Suites, has now submitted a representment",
        "packet containing 4 documents. Pega's deterministic rules cannot parse unstructured",
        "merchant evidence — routing to Pace for intelligent document analysis."
    ], [
        {
            type: "json",
            title: "Case Details — CHB-2026-0731",
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
        }
    ]);
    await sleep(STEP_DELAY);

    // ════════════════════════════════════════════════════════════════════
    // STEP 2 — Pace extracts from all 4 merchant documents
    // ════════════════════════════════════════════════════════════════════
    updateProcess({ currentStatus: "Pace: Extracting evidence from 4 merchant documents" });
    addLogEntry("step-2", "Pace — Intelligent Document Extraction", [
        "Pace ingested the merchant's representment packet — 4 documents in mixed formats.",
        "Each document was parsed, OCR'd where necessary, and key facts extracted.",
        "",
        "Document 1: Hotel check-in scan (image) — physical registration card with signature",
        "Document 2: Email correspondence thread (PDF) — 6 messages between cardholder and hotel",
        "Document 3: Hotel cancellation & modification policy (PDF) — terms and conditions",
        "Document 4: Hotel folio / itemized invoice (PDF) — charges over 3-night stay",
        "",
        "Pace extracted 23 discrete facts across all 4 documents in 4.2 seconds."
    ], [
        {
            type: "image",
            title: "Document 1 — Hotel Check-In Registration Scan",
            src: "/pdfs/chb005_checkin_scan.png"
        },
        {
            type: "file",
            title: "Document 2 — Email Correspondence Thread",
            pdfPath: "/pdfs/chb005_email_thread.pdf"
        },
        {
            type: "file",
            title: "Document 3 — Hotel Cancellation & Modification Policy",
            pdfPath: "/pdfs/chb005_cancellation_policy.pdf"
        },
        {
            type: "file",
            title: "Document 4 — Hotel Folio / Itemized Invoice",
            pdfPath: "/pdfs/chb005_hotel_folio.pdf"
        },
        {
            type: "json",
            title: "Extraction Summary — All 4 Documents",
            data: {
                totalDocumentsProcessed: 4,
                totalFactsExtracted: 23,
                processingTime: "4.2 seconds",
                document1_checkinScan: {
                    type: "Image (scanned registration card)",
                    extractedFacts: {
                        guestName: "Katherine E. Whitfield",
                        checkInDate: "2026-02-10",
                        checkOutDate: "2026-02-13",
                        roomNumber: "Suite 1204",
                        guestSignature: "PRESENT — verified against card-on-file name",
                        signatureTimestamp: "2026-02-10 at 14:32 EST",
                        idVerification: "Driver license ending *8834 — matched"
                    }
                },
                document2_emailThread: {
                    type: "PDF (6-message email thread)",
                    extractedFacts: {
                        originalBookingDates: "2026-02-05 to 2026-02-08",
                        dateChangeRequested: "2026-02-03",
                        newDatesRequested: "2026-02-10 to 2026-02-13",
                        requestedBy: "Katherine Whitfield (katherine.whitfield@bellvue-partners.com)",
                        hotelConfirmation: "Confirmed by reservations@grandmeridian.com on 2026-02-03",
                        newConfirmationNumber: "GM-2026-88412-REV",
                        cancellationMentioned: "NO — cardholder explicitly wrote 'move my dates' not 'cancel'"
                    }
                },
                document3_cancellationPolicy: {
                    type: "PDF (terms and conditions)",
                    extractedFacts: {
                        freeCancellationWindow: "72 hours before check-in",
                        modificationPolicy: "Date changes within 48 hours of new check-in are non-refundable",
                        dateChangeRequestedOn: "2026-02-03",
                        newCheckIn: "2026-02-10",
                        daysBeforeNewCheckIn: 7,
                        withinFreeCancellation: "YES — but modification policy applies separately",
                        modificationBinding: "Revised booking becomes non-refundable per Section 4.2(b)"
                    }
                },
                document4_hotelFolio: {
                    type: "PDF (itemized charges)",
                    extractedFacts: {
                        folioNumber: "FO-2026-1204-WH",
                        totalCharges: "$4,200.00",
                        roomCharges: "$3,600.00 (3 nights × $1,200.00/night — Executive Suite)",
                        minibarCharges: "$187.50 (Feb 10, 11, 12)",
                        roomService: "$312.50 (Feb 11 dinner, Feb 12 breakfast)",
                        spaServices: "$100.00 (Feb 11)",
                        occupancyEvidence: "Room service + minibar + spa across 3 days confirms physical presence"
                    }
                }
            }
        }
    ]);
    await sleep(STEP_DELAY);

    // ════════════════════════════════════════════════════════════════════
    // STEP 3 — Pace cross-references extracted facts
    // ════════════════════════════════════════════════════════════════════
    updateProcess({ currentStatus: "Pace: Cross-referencing evidence across documents" });
    addLogEntry("step-3", "Pace — Cross-Reference Analysis", [
        "Pace is now cross-referencing the 23 extracted facts across all 4 documents",
        "and against Meridian Bank's internal records.",
        "",
        "The cardholder claims the hotel stay was 'never rendered' and the booking was cancelled.",
        "Pace is testing this claim against the documentary evidence."
    ], [
        {
            type: "json",
            title: "Evidence Cross-Reference Matrix",
            data: {
                cardholderClaim: "Hotel stay never rendered — booking was cancelled",
                crossReferenceResults: [
                    {
                        test: "Was the booking cancelled?",
                        finding: "NO",
                        evidence: "Email thread shows cardholder requested DATE CHANGE on Feb 3, not cancellation. Exact words: 'I need to move my dates to Feb 10-13 instead.' No cancellation request found in any document.",
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
                        evidence: "Folio shows minibar charges on Feb 10, 11, 12; room service on Feb 11 and 12; spa service on Feb 11. These charges require physical presence and room key access.",
                        sources: ["Document 4 — Hotel Folio"]
                    },
                    {
                        test: "Is the revised booking refundable?",
                        finding: "NO",
                        evidence: "Hotel policy Section 4.2(b): date modifications create a new non-refundable booking. The revised confirmation GM-2026-88412-REV is binding.",
                        sources: ["Document 3 — Cancellation Policy", "Document 2 — Email Thread (confirmation #GM-2026-88412-REV)"]
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
        }
    ]);
    await sleep(STEP_DELAY);

    // ════════════════════════════════════════════════════════════════════
    // STEP 4 — Pace verdict: Merchant wins
    // ════════════════════════════════════════════════════════════════════
    updateProcess({ currentStatus: "Pace: Verdict reached — merchant evidence substantiated" });
    addLogEntry("step-4", "Pace — Verdict: Merchant Wins", [
        "Based on cross-reference analysis of all 4 merchant documents against the",
        "cardholder's claim, Pace has reached a determination.",
        "",
        "The cardholder's own email correspondence is the deciding evidence —",
        "it proves a date change was requested, not a cancellation.",
        "Combined with the signed check-in, in-room charges, and non-refundable policy,",
        "the merchant's representment fully rebuts the dispute.",
        "",
        "Recommendation: Accept representment. Reverse provisional credit."
    ], [
        {
            type: "json",
            title: "Verdict — CHB-2026-0731",
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
                visaComplianceNotes: [
                    "Merchant evidence satisfies Visa CE 3.0 requirements for RC 13.1 defense",
                    "Signed check-in + itemized folio + correspondence = compelling evidence per VROL guidelines",
                    "Representment deadline: Met (filed within 30-day window)"
                ],
                riskAssessment: "LOW — Evidence is overwhelming and internally consistent. Pre-arbitration unlikely."
            }
        }
    ]);
    await sleep(STEP_DELAY);

    // ════════════════════════════════════════════════════════════════════
    // STEP 5 — HITL: Analyst reviews verdict
    // ════════════════════════════════════════════════════════════════════
    updateProcess({ currentStatus: "⏸ Awaiting analyst review — verdict requires human approval" });
    addLogEntry("step-5", "Analyst Review Required — Approve Representment Acceptance", [
        "Pace recommends accepting the merchant's representment and reversing the",
        "provisional credit of $4,200.00 back to the cardholder's account.",
        "",
        "The evidence strongly supports the merchant. The cardholder's own email proves",
        "the stay was modified (not cancelled), and 3 additional documents confirm occupancy.",
        "",
        "Please review the evidence summary and approve or override this recommendation."
    ], [
        {
            type: "decision",
            title: "Approve Representment Acceptance?",
            description: "Pace recommends accepting the merchant representment for CHB-2026-0731. Provisional credit of $4,200.00 will be reversed. Evidence confidence: 97.2%.",
            signal: "APPROVE_REPRESENTMENT_CB005",
            options: ["Approve", "Override"]
        }
    ]);

    console.log('Waiting for analyst decision signal: APPROVE_REPRESENTMENT_CB005');
    await waitForSignal('APPROVE_REPRESENTMENT_CB005');
    console.log('Analyst approved representment acceptance.');
    await sleep(2000);

    // ════════════════════════════════════════════════════════════════════
    // STEP 6 — Pace drafts response to Visa
    // ════════════════════════════════════════════════════════════════════
    updateProcess({ currentStatus: "Pace: Drafting representment acceptance response to Visa" });
    addLogEntry("step-6", "Pace — Draft Response to Visa Network", [
        "Analyst approved the representment acceptance. Pace is now drafting the formal",
        "response to Visa's dispute resolution channel, citing the evidence package",
        "and compliance framework references."
    ], [
        {
            type: "email_draft",
            title: "Response to Visa — Representment Accepted",
            to: "visa-disputes@visa.com",
            from: "disputes@meridianbank.com",
            subject: "RE: Chargeback CHB-2026-0731 — Representment Accepted, Provisional Credit Reversal",
            body: "Dear Visa Dispute Resolution Team,\n\nRegarding Case CHB-2026-0731 (Visa RC 13.1 — Merchandise/Services Not Received), Meridian Bank has completed its review of the merchant representment submitted by Grand Meridian Hotel & Suites.\n\nAfter thorough analysis of the submitted evidence package, we have determined that the merchant's representment is valid and the cardholder's claim is not substantiated.\n\nKey Findings:\n\n1. The cardholder did not cancel the booking. Email correspondence dated February 3, 2026 shows the cardholder requested a date modification from Feb 5-8 to Feb 10-13, not a cancellation. The cardholder's exact words were: \"I need to move my dates to Feb 10-13 instead.\"\n\n2. The cardholder checked in and stayed at the hotel. A signed physical registration card (Feb 10 at 14:32 EST) and itemized folio showing minibar, room service, and spa charges across February 10-12 confirm physical occupancy.\n\n3. The revised booking is non-refundable. Per the hotel's cancellation policy Section 4.2(b), date modifications create a new non-refundable reservation. The revised confirmation (GM-2026-88412-REV) is binding.\n\nAction Taken:\n- Representment accepted in full\n- Provisional credit of $4,200.00 will be reversed to cardholder account ending ****4892\n- Merchant funds released\n\nEvidence package reference: 4 documents on file (check-in scan, email thread, cancellation policy, hotel folio).\n\nPlease confirm receipt and processing.\n\nRegards,\nMeridian Bank Disputes Team\nCase Reference: CHB-2026-0731"
        }
    ]);

    console.log('Waiting for email to be sent...');
    await waitForEmailSent();
    console.log('Email sent to Visa.');
    await sleep(2000);

    // ════════════════════════════════════════════════════════════════════
    // STEP 7 — Case closed, provisional credit reversed
    // ════════════════════════════════════════════════════════════════════
    updateProcess({
        currentStatus: "Case closed — representment accepted, provisional credit reversed",
        status: "Done"
    });
    addLogEntry("step-7", "Case Resolved — Merchant Representment Accepted", [
        "CHB-2026-0731 is now closed. The merchant's representment has been accepted",
        "and the provisional credit of $4,200.00 is being reversed.",
        "",
        "Resolution summary:",
        "  • Cardholder claim: Hotel stay never rendered (booking cancelled)",
        "  • Finding: Claim contradicted by cardholder's own email + 3 corroborating documents",
        "  • Deciding evidence: Email thread proving date change, not cancellation",
        "  • Outcome: Merchant wins — representment accepted",
        "  • Action: Provisional credit of $4,200.00 reversed to cardholder account ****4892",
        "",
        "Pace analyzed 4 unstructured merchant documents, extracted 23 facts,",
        "cross-referenced them against the dispute claim, and reached a determination",
        "in under 30 seconds — a process that typically takes an analyst 45-60 minutes.",
        "",
        "Case routed to Pega for final closure and archival."
    ], [
        {
            type: "json",
            title: "Case Closure — CHB-2026-0731",
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
        }
    ]);

    console.log(`${PROCESS_ID}: ${CASE_NAME} — COMPLETE`);
}

// ── Run ─────────────────────────────────────────────────────────────────
runSimulation().catch(err => {
    console.error(`${PROCESS_ID} simulation error:`, err);
    process.exit(1);
});
