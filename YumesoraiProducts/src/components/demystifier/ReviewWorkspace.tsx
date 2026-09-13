'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { BrdModal, BrdData } from './BrdModal';

// ---------------------------------------------------------------------------
// File tree data (same mock data as FluxWorkspace)
// ---------------------------------------------------------------------------
interface FileEntry {
  name: string;
  path: string;
  loc: number;
  type: 'cbl' | 'cpy' | 'jcl';
}

interface FolderEntry {
  name: string;
  children: FileEntry[];
}

const FILE_TREE: FolderEntry[] = [
  {
    name: 'src/programs',
    children: [
      { name: 'BILL0030.cbl', path: 'src/programs/BILL0030.cbl', loc: 2340, type: 'cbl' },
      { name: 'BILL0040.cbl', path: 'src/programs/BILL0040.cbl', loc: 1120, type: 'cbl' },
      { name: 'PAY0100.cbl', path: 'src/programs/PAY0100.cbl', loc: 1180, type: 'cbl' },
      { name: 'CUST0200.cbl', path: 'src/programs/CUST0200.cbl', loc: 860, type: 'cbl' },
    ],
  },
  {
    name: 'src/copybooks',
    children: [
      { name: 'BILLREC.cpy', path: 'src/copybooks/BILLREC.cpy', loc: 96, type: 'cpy' },
      { name: 'CUSTACCT.cpy', path: 'src/copybooks/CUSTACCT.cpy', loc: 74, type: 'cpy' },
    ],
  },
  {
    name: 'jcl',
    children: [
      { name: 'BILLCYCL.jcl', path: 'jcl/BILLCYCL.jcl', loc: 64, type: 'jcl' },
    ],
  },
];

const FILE_CONTENTS: Record<string, string> = {
  'src/programs/BILL0030.cbl': `      *================================================================*
      * BILL0030 - BILLING CYCLE PROCESSOR
      * Processes monthly billing records, validates amounts,
      * and generates customer invoices.
      *================================================================*
       IDENTIFICATION DIVISION.
       PROGRAM-ID.    BILL0030.
       AUTHOR.        LEGACY-BANK BILLING TEAM.
       DATE-WRITTEN.  1998-03-15.

       ENVIRONMENT DIVISION.
       CONFIGURATION SECTION.
       SOURCE-COMPUTER.  IBM-ZOS.
       OBJECT-COMPUTER.  IBM-ZOS.

       INPUT-OUTPUT SECTION.
       FILE-CONTROL.
           SELECT BILL-INPUT  ASSIGN TO BILLIN
               ORGANIZATION IS SEQUENTIAL
               FILE STATUS IS WS-FILE-STATUS.
           SELECT BILL-OUTPUT ASSIGN TO BILLOUT
               ORGANIZATION IS SEQUENTIAL
               FILE STATUS IS WS-FILE-STATUS.

       DATA DIVISION.
       FILE SECTION.
       FD  BILL-INPUT
           RECORDING MODE IS F
           BLOCK CONTAINS 0 RECORDS.
       01  BILL-INPUT-REC             PIC X(200).

       FD  BILL-OUTPUT
           RECORDING MODE IS F
           BLOCK CONTAINS 0 RECORDS.
       01  BILL-OUTPUT-REC            PIC X(300).

       WORKING-STORAGE SECTION.
       01  WS-FILE-STATUS             PIC XX.
       01  WS-EOF-FLAG                PIC X VALUE 'N'.
           88 WS-EOF                  VALUE 'Y'.
       01  WS-RECORD-COUNT            PIC 9(8) VALUE 0.
       01  WS-ERROR-COUNT             PIC 9(6) VALUE 0.

       COPY BILLREC.
       COPY CUSTACCT.

       01  WS-BILL-AMOUNT             PIC S9(9)V99 COMP-3.
       01  WS-TAX-AMOUNT              PIC S9(7)V99 COMP-3.
       01  WS-TOTAL-AMOUNT            PIC S9(9)V99 COMP-3.
       01  WS-CURRENT-DATE.
           05 WS-CURR-YEAR            PIC 9(4).
           05 WS-CURR-MONTH           PIC 9(2).
           05 WS-CURR-DAY             PIC 9(2).

       PROCEDURE DIVISION.
       0000-MAIN.
           PERFORM 1000-INITIALIZE
           PERFORM 2000-PROCESS UNTIL WS-EOF
           PERFORM 9000-TERMINATE
           STOP RUN.

       1000-INITIALIZE.
           OPEN INPUT  BILL-INPUT
           OPEN OUTPUT BILL-OUTPUT
           MOVE FUNCTION CURRENT-DATE TO WS-CURRENT-DATE
           READ BILL-INPUT INTO WS-BILL-RECORD
               AT END SET WS-EOF TO TRUE
           END-READ.

       2000-PROCESS.
           ADD 1 TO WS-RECORD-COUNT
           PERFORM 2100-VALIDATE-RECORD
           IF WS-VALID-FLAG = 'Y'
               PERFORM 2200-CALCULATE-AMOUNTS
               PERFORM 2300-WRITE-OUTPUT
           ELSE
               ADD 1 TO WS-ERROR-COUNT
               PERFORM 2900-LOG-ERROR
           END-IF
           READ BILL-INPUT INTO WS-BILL-RECORD
               AT END SET WS-EOF TO TRUE
           END-READ.

       2100-VALIDATE-RECORD.
           MOVE 'Y' TO WS-VALID-FLAG
           IF WS-BILL-ACCT-NO = SPACES OR LOW-VALUES
               MOVE 'N' TO WS-VALID-FLAG
           END-IF
           IF WS-BILL-AMOUNT < 0
               MOVE 'N' TO WS-VALID-FLAG
           END-IF.

       2200-CALCULATE-AMOUNTS.
           MOVE WS-BILL-BASE-AMT TO WS-BILL-AMOUNT
           COMPUTE WS-TAX-AMOUNT =
               WS-BILL-AMOUNT * 0.085
           COMPUTE WS-TOTAL-AMOUNT =
               WS-BILL-AMOUNT + WS-TAX-AMOUNT.

       2300-WRITE-OUTPUT.
           MOVE WS-BILL-ACCT-NO   TO WS-OUT-ACCT
           MOVE WS-TOTAL-AMOUNT   TO WS-OUT-TOTAL
           MOVE WS-CURRENT-DATE   TO WS-OUT-DATE
           WRITE BILL-OUTPUT-REC FROM WS-OUTPUT-RECORD.

       2900-LOG-ERROR.
           DISPLAY 'ERR: INVALID RECORD #' WS-RECORD-COUNT
               ' ACCT=' WS-BILL-ACCT-NO.

      *================================================================*
      * ANBX-AUDIT - Vendor audit logging call
      *================================================================*
       3000-AUDIT-LOG.
           CALL 'ANBXAUDT' USING WS-BILL-ACCT-NO
                                  WS-TOTAL-AMOUNT
                                  WS-CURRENT-DATE.

           EXEC SQL
               INSERT INTO BILL_AUDIT
               (ACCT_NO, AMOUNT, PROCESS_DATE)
               VALUES
               (:WS-BILL-ACCT-NO,
                :WS-TOTAL-AMOUNT,
                :WS-CURRENT-DATE)
           END-EXEC.

       9000-TERMINATE.
           CLOSE BILL-INPUT
           CLOSE BILL-OUTPUT
           DISPLAY 'BILL0030 COMPLETE: '
               WS-RECORD-COUNT ' RECORDS, '
               WS-ERROR-COUNT  ' ERRORS'.`,

  'src/programs/BILL0040.cbl': `      *================================================================*
      * BILL0040 - BILLING ADJUSTMENT PROCESSOR
      * Handles credit/debit adjustments to customer bills.
      *================================================================*
       IDENTIFICATION DIVISION.
       PROGRAM-ID.    BILL0040.

       DATA DIVISION.
       WORKING-STORAGE SECTION.
       COPY BILLREC.

       01  WS-ADJ-TYPE                PIC X(2).
           88  WS-CREDIT              VALUE 'CR'.
           88  WS-DEBIT               VALUE 'DB'.
       01  WS-ADJ-AMOUNT              PIC S9(9)V99 COMP-3.
       01  WS-NEW-BALANCE             PIC S9(9)V99 COMP-3.

       PROCEDURE DIVISION.
       0000-MAIN.
           PERFORM 1000-INIT
           PERFORM 2000-PROCESS-ADJUSTMENTS
           PERFORM 9000-CLEANUP
           STOP RUN.

       1000-INIT.
           DISPLAY 'BILL0040 ADJUSTMENT START'.

       2000-PROCESS-ADJUSTMENTS.
           EVALUATE TRUE
               WHEN WS-CREDIT
                   SUBTRACT WS-ADJ-AMOUNT FROM WS-NEW-BALANCE
               WHEN WS-DEBIT
                   ADD WS-ADJ-AMOUNT TO WS-NEW-BALANCE
           END-EVALUATE.

       9000-CLEANUP.
           DISPLAY 'BILL0040 ADJUSTMENT COMPLETE'.`,

  'src/programs/PAY0100.cbl': `      *================================================================*
      * PAY0100 - PAYMENT PROCESSING MODULE
      * Receives and applies customer payments to accounts.
      *================================================================*
       IDENTIFICATION DIVISION.
       PROGRAM-ID.    PAY0100.

       DATA DIVISION.
       WORKING-STORAGE SECTION.
       COPY CUSTACCT.

       01  WS-PAY-AMOUNT              PIC S9(9)V99 COMP-3.
       01  WS-ACCT-BALANCE            PIC S9(9)V99 COMP-3.
       01  WS-PAY-METHOD              PIC X(4).
           88  WS-ACH                 VALUE 'ACH '.
           88  WS-WIRE                VALUE 'WIRE'.
           88  WS-CHECK               VALUE 'CHK '.

       PROCEDURE DIVISION.
       0000-MAIN.
           PERFORM 1000-INIT
           PERFORM 2000-APPLY-PAYMENT
           PERFORM 3000-UPDATE-ACCOUNT
           STOP RUN.

       1000-INIT.
           DISPLAY 'PAY0100 PAYMENT PROCESSING START'.

       2000-APPLY-PAYMENT.
           SUBTRACT WS-PAY-AMOUNT FROM WS-ACCT-BALANCE
           IF WS-ACCT-BALANCE < 0
               DISPLAY 'OVERPAYMENT DETECTED'
               PERFORM 2100-HANDLE-OVERPAYMENT
           END-IF.

       2100-HANDLE-OVERPAYMENT.
           MOVE 0 TO WS-ACCT-BALANCE
           DISPLAY 'CREDIT MEMO GENERATED'.

       3000-UPDATE-ACCOUNT.
           EXEC SQL
               UPDATE CUSTOMER_ACCOUNTS
               SET BALANCE = :WS-ACCT-BALANCE,
                   LAST_PAY_DATE = CURRENT DATE
               WHERE ACCT_NO = :WS-CUST-ACCT-NO
           END-EXEC.`,

  'src/programs/CUST0200.cbl': `      *================================================================*
      * CUST0200 - CUSTOMER MASTER FILE MAINTENANCE
      * CRUD operations on customer records via CICS.
      *================================================================*
       IDENTIFICATION DIVISION.
       PROGRAM-ID.    CUST0200.

       DATA DIVISION.
       WORKING-STORAGE SECTION.
       COPY CUSTACCT.

       01  WS-CICS-RESP              PIC S9(8) COMP.
       01  WS-ACTION                  PIC X(1).
           88  WS-ADD                 VALUE 'A'.
           88  WS-UPDATE              VALUE 'U'.
           88  WS-DELETE              VALUE 'D'.
           88  WS-INQUIRY             VALUE 'I'.

       PROCEDURE DIVISION.
       0000-MAIN.
           EVALUATE TRUE
               WHEN WS-ADD
                   PERFORM 1000-ADD-CUSTOMER
               WHEN WS-UPDATE
                   PERFORM 2000-UPDATE-CUSTOMER
               WHEN WS-DELETE
                   PERFORM 3000-DELETE-CUSTOMER
               WHEN WS-INQUIRY
                   PERFORM 4000-INQUIRY-CUSTOMER
           END-EVALUATE
           EXEC CICS RETURN END-EXEC.

       1000-ADD-CUSTOMER.
           EXEC SQL
               INSERT INTO CUSTOMER_MASTER
               (ACCT_NO, NAME, ADDR, STATUS)
               VALUES
               (:WS-CUST-ACCT-NO,
                :WS-CUST-NAME,
                :WS-CUST-ADDR,
                'ACTIVE')
           END-EXEC.

       2000-UPDATE-CUSTOMER.
           EXEC SQL
               UPDATE CUSTOMER_MASTER
               SET NAME = :WS-CUST-NAME,
                   ADDR = :WS-CUST-ADDR
               WHERE ACCT_NO = :WS-CUST-ACCT-NO
           END-EXEC.

       3000-DELETE-CUSTOMER.
           EXEC SQL
               UPDATE CUSTOMER_MASTER
               SET STATUS = 'CLOSED'
               WHERE ACCT_NO = :WS-CUST-ACCT-NO
           END-EXEC.

       4000-INQUIRY-CUSTOMER.
           EXEC SQL
               SELECT NAME, ADDR, STATUS
               INTO :WS-CUST-NAME,
                    :WS-CUST-ADDR,
                    :WS-CUST-STATUS
               FROM CUSTOMER_MASTER
               WHERE ACCT_NO = :WS-CUST-ACCT-NO
           END-EXEC.`,

  'src/copybooks/BILLREC.cpy': `      *================================================================*
      * BILLREC - Billing Record Copybook
      * Standard layout for billing transaction records.
      *================================================================*
       01  WS-BILL-RECORD.
           05  WS-BILL-ACCT-NO        PIC X(10).
           05  WS-BILL-CUST-NAME      PIC X(30).
           05  WS-BILL-BASE-AMT       PIC S9(9)V99 COMP-3.
           05  WS-BILL-TAX-AMT        PIC S9(7)V99 COMP-3.
           05  WS-BILL-TOTAL          PIC S9(9)V99 COMP-3.
           05  WS-BILL-DATE           PIC X(10).
           05  WS-BILL-STATUS         PIC X(2).
               88  WS-BILL-OPEN       VALUE 'OP'.
               88  WS-BILL-CLOSED     VALUE 'CL'.
               88  WS-BILL-PENDING    VALUE 'PN'.
           05  WS-VALID-FLAG          PIC X(1).
       01  WS-OUTPUT-RECORD.
           05  WS-OUT-ACCT            PIC X(10).
           05  WS-OUT-TOTAL           PIC S9(9)V99.
           05  WS-OUT-DATE            PIC X(10).`,

  'src/copybooks/CUSTACCT.cpy': `      *================================================================*
      * CUSTACCT - Customer Account Copybook
      * Standard layout for customer account records.
      *================================================================*
       01  WS-CUST-RECORD.
           05  WS-CUST-ACCT-NO        PIC X(10).
           05  WS-CUST-NAME           PIC X(30).
           05  WS-CUST-ADDR           PIC X(60).
           05  WS-CUST-STATUS         PIC X(8).
           05  WS-CUST-BALANCE        PIC S9(9)V99 COMP-3.
           05  WS-CUST-LAST-PAY       PIC X(10).
           05  WS-CUST-TYPE           PIC X(2).
               88  WS-CUST-RETAIL     VALUE 'RT'.
               88  WS-CUST-COMMERCIAL VALUE 'CM'.`,

  'jcl/BILLCYCL.jcl': `//BILLCYCL JOB (BILLING),'BILL CYCLE',
//         CLASS=A,MSGCLASS=X,
//         NOTIFY=&SYSUID
//*================================================================*
//* BILLCYCL - Monthly Billing Cycle JCL
//* Runs BILL0030 and BILL0040 in sequence.
//*================================================================*
//STEP010  EXEC PGM=BILL0030,REGION=0M
//STEPLIB  DD DSN=PROD.BILLING.LOADLIB,DISP=SHR
//BILLIN   DD DSN=PROD.BILLING.INPUT,DISP=SHR
//BILLOUT  DD DSN=PROD.BILLING.OUTPUT,
//            DISP=(NEW,CATLG,DELETE),
//            SPACE=(CYL,(50,10),RLSE),
//            DCB=(RECFM=FB,LRECL=300,BLKSIZE=0)
//SYSOUT   DD SYSOUT=*
//*
//STEP020  EXEC PGM=BILL0040,REGION=0M,
//         COND=(0,NE,STEP010)
//STEPLIB  DD DSN=PROD.BILLING.LOADLIB,DISP=SHR
//ADJIN    DD DSN=PROD.BILLING.ADJUSTMENTS,DISP=SHR
//SYSOUT   DD SYSOUT=*`,
};

// ---------------------------------------------------------------------------
// Syntax highlighting (duplicated from FluxWorkspace)
// ---------------------------------------------------------------------------
function highlightCobolLine(line: string): JSX.Element {
  const trimmed = line.trimStart();

  if (line.length >= 7 && line[6] === '*') {
    return <span style={{ color: '#57634f' }}>{line}</span>;
  }
  if (trimmed.startsWith('//')) {
    return <span style={{ color: '#c9a56a' }}>{line}</span>;
  }
  if (trimmed.includes('EXEC SQL') || trimmed.includes('END-EXEC') ||
      trimmed.includes('INSERT INTO') || trimmed.includes('UPDATE ') ||
      trimmed.includes('SELECT ') || trimmed.includes('DELETE ') ||
      trimmed.includes('VALUES') || trimmed.includes('WHERE ') ||
      trimmed.includes('SET ') || trimmed.includes('INTO :') ||
      trimmed.includes('FROM ')) {
    return <span style={{ color: '#58b0ff' }}>{line}</span>;
  }
  if (trimmed.includes('ANBX') || trimmed.includes("CALL 'ANBX")) {
    return <span style={{ color: '#d29922' }}>{line}</span>;
  }
  if (trimmed.includes('DIVISION') || trimmed.includes('SECTION') ||
      trimmed.startsWith('COPY ') || trimmed.includes('PROGRAM-ID') ||
      trimmed.includes('EXEC CICS')) {
    return <span style={{ color: '#7de0cf' }}>{line}</span>;
  }
  return <span style={{ color: '#9fb0c6' }}>{line}</span>;
}

// ---------------------------------------------------------------------------
// Mock business review response (replace with real API call later)
// ---------------------------------------------------------------------------
function getMockSummary(snippet: string, filePath: string): string {
  const lower = snippet.toLowerCase();
  const fileName = filePath.split('/').pop() || filePath;

  if (lower.includes('validate') || lower.includes('valid-flag')) {
    return `This section performs input validation on the incoming record from ${fileName}. It checks that the account number field (WS-BILL-ACCT-NO) is neither blank nor contains low-value binary zeros, and verifies that the billing amount is not negative. If either check fails, the record is flagged as invalid by setting WS-VALID-FLAG to 'N', which causes the downstream processing logic to skip this record and log an error instead of generating an invoice.`;
  }
  if (lower.includes('calculate') || lower.includes('compute') || lower.includes('tax')) {
    return `This section handles the financial calculation for invoice generation. It takes the base billing amount and computes an 8.5% tax surcharge, then derives the total amount by summing the base and tax. This implements the standard tax calculation rule applied uniformly to all billing records. The computed total is what ultimately gets written to the output invoice record.`;
  }
  if (lower.includes('write') || lower.includes('output')) {
    return `This section assembles and writes the final output record. It maps the account number, computed total amount, and current processing date into the output record layout (WS-OUTPUT-RECORD), then writes it to the sequential output file. This effectively generates one line item in the billing output that downstream systems (printing, mailing, accounts receivable) will consume.`;
  }
  if (lower.includes('exec sql') || lower.includes('insert into') || lower.includes('update ')) {
    return `This section performs a database operation against the mainframe DB2 subsystem. It uses embedded SQL to persist or update data in the relational tables. This ensures that the transaction state is captured in the database for audit trail, reporting, and downstream batch reconciliation processes.`;
  }
  if (lower.includes('call') || lower.includes('anbx')) {
    return `This section invokes an external vendor module (ANBXAUDT) for audit logging purposes. It passes the account number, total amount, and processing date to the vendor's audit routine, and also inserts a corresponding record into the BILL_AUDIT table. This dual-write pattern ensures both the vendor's audit system and the internal database have a consistent record of the billing transaction.`;
  }
  if (lower.includes('open') || lower.includes('close') || lower.includes('initialize') || lower.includes('terminate')) {
    return `This section handles program lifecycle management — opening or closing file resources and performing setup/teardown operations. It ensures that input and output files are properly allocated before processing begins and properly released when processing completes, along with reporting final processing statistics (record and error counts).`;
  }
  if (lower.includes('evaluate') || lower.includes('when ')) {
    return `This section implements a decision branch (EVALUATE/WHEN) that routes processing based on a condition flag or type code. Each branch dispatches to a specific business operation, implementing a command-pattern style routing. This is the core control flow that determines which business action to execute for the current transaction.`;
  }
  if (lower.includes('subtract') || lower.includes('payment') || lower.includes('balance')) {
    return `This section applies a financial transaction to an account balance. It subtracts the payment or adjustment amount from the current balance and includes handling for edge cases such as overpayments (where the resulting balance would go negative). This implements the core payment application business rule for the accounts receivable process.`;
  }
  if (lower.includes('identification division') || lower.includes('program-id')) {
    return `This is the program identification header. It declares the program name, author, and creation date, which are used by the mainframe job scheduler and source control systems to catalog and identify this compilation unit. The program ID is also used in CALL statements from other programs and in JCL EXEC PGM= steps.`;
  }
  if (lower.includes('file-control') || lower.includes('environment division')) {
    return `This section declares the program's environment configuration — specifically the file assignments that map logical file names used in the COBOL code to physical DD names defined in the JCL. The ORGANIZATION IS SEQUENTIAL clause indicates these are flat files processed record-by-record, and FILE STATUS captures I/O return codes for error handling.`;
  }

  return `This code section from ${fileName} implements a business operation within the legacy COBOL system. It processes data according to established business rules, performing data transformations, validations, or I/O operations that are part of the larger batch or online transaction processing workflow. The logic follows standard mainframe programming patterns with structured PERFORM-based control flow.`;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ReviewEntry {
  id: number;
  snippet: string;
  filePath: string;
  summary: string;
  timestamp: Date;
}

interface ReviewWorkspaceProps {
  repoUrl: string;
  onDisconnect: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function ReviewWorkspace({ repoUrl, onDisconnect }: ReviewWorkspaceProps) {
  const [selectedFile, setSelectedFile] = useState<string>('src/programs/BILL0030.cbl');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(FILE_TREE.map(f => f.name))
  );
  const [selectedText, setSelectedText] = useState('');
  const [reviewButtonPos, setReviewButtonPos] = useState<{ top: number; left: number } | null>(null);
  const [reviews, setReviews] = useState<ReviewEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const codeRef = useRef<HTMLPreElement>(null);
  const nextId = useRef(1);

  // BRD state
  const [brdModalOpen, setBrdModalOpen] = useState(false);
  const [brdLoading, setBrdLoading] = useState(false);
  const [brdError, setBrdError] = useState<string | null>(null);
  const [brdData, setBrdData] = useState<BrdData | null>(null);
  const [brdFilePath, setBrdFilePath] = useState('');

  const toggleFolder = useCallback((name: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  // Handle text selection in the code viewer
  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.toString().trim()) {
      setSelectedText('');
      setReviewButtonPos(null);
      return;
    }

    const text = selection.toString().trim();
    if (text.length < 5) {
      setSelectedText('');
      setReviewButtonPos(null);
      return;
    }

    setSelectedText(text);

    // Position the floating button near the end of the selection
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const codeRect = codeRef.current?.getBoundingClientRect();
    if (codeRect) {
      setReviewButtonPos({
        top: rect.bottom - codeRect.top + 4,
        left: rect.right - codeRect.left - 40,
      });
    }
  }, []);

  // Clear selection when clicking outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-review-button]')) return;
      // Don't clear if selecting text
      const selection = window.getSelection();
      if (selection && !selection.isCollapsed) return;
      setReviewButtonPos(null);
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const handleReview = useCallback(() => {
    if (!selectedText) return;

    setLoading(true);
    setError(null);
    setReviewButtonPos(null);

    const snippet = selectedText;

    // Mock: simulate a short delay then show a fixed summary
    // TODO: replace with real API call to /api/demystifier/business-review
    setTimeout(() => {
      const summary = getMockSummary(snippet, selectedFile);

      setReviews(prev => [{
        id: nextId.current++,
        snippet,
        filePath: selectedFile,
        summary,
        timestamp: new Date(),
      }, ...prev]);

      setLoading(false);
      setSelectedText('');
      window.getSelection()?.removeAllRanges();
    }, 800);
  }, [selectedText, selectedFile]);

  const handleGenerateBrd = useCallback(async (filePath: string) => {
    const programContent = FILE_CONTENTS[filePath];
    if (!programContent) return;

    setBrdFilePath(filePath);
    setBrdData(null);
    setBrdError(null);
    setBrdLoading(true);
    setBrdModalOpen(true);

    try {
      const res = await fetch('/api/demystifier/program-brd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          program_content: programContent,
          file_path: filePath,
          repo_url: repoUrl,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setBrdError(json.error || 'BRD generation failed');
        return;
      }

      setBrdData(json.brd);
    } catch (err) {
      setBrdError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setBrdLoading(false);
    }
  }, [repoUrl]);

  const content = FILE_CONTENTS[selectedFile] || '      * File content not available';
  const lines = content.split('\n');
  const fileEntry = FILE_TREE.flatMap(f => f.children).find(f => f.path === selectedFile);

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left Sidebar - File Tree */}
      <div className="w-[240px] border-r border-[#1e2736] bg-[#0c1018] flex flex-col">
        <div className="px-3 py-2.5 border-b border-[#1e2736]">
          <div className="flex items-center justify-between">
            <span
              className="text-[10.5px] text-[#5b6577] uppercase tracking-wider"
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            >
              Repository
            </span>
            <button
              onClick={onDisconnect}
              className="text-[10px] text-[#5b6577] hover:text-[#9fb0c6] transition-colors"
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            >
              Disconnect
            </button>
          </div>
          <p
            className="text-[11px] text-[#9fb0c6] mt-1 truncate"
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          >
            {repoUrl.replace(/^https?:\/\//, '').replace(/^github\.com\//, '')}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {FILE_TREE.map(folder => (
            <div key={folder.name}>
              <button
                onClick={() => toggleFolder(folder.name)}
                className="flex items-center gap-1.5 w-full px-3 py-1 text-left hover:bg-[#111823] transition-colors"
              >
                <span className="text-[10px] text-[#5b6577]">
                  {expandedFolders.has(folder.name) ? '▾' : '▸'}
                </span>
                <span
                  className="text-[11px] text-[#7a869a]"
                  style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                >
                  {folder.name}/
                </span>
              </button>
              {expandedFolders.has(folder.name) && folder.children.map(file => (
                <div key={file.path} className="group flex items-center">
                  <button
                    onClick={() => setSelectedFile(file.path)}
                    className={`flex items-center justify-between flex-1 min-w-0 pl-7 pr-1 py-1 text-left transition-colors ${
                      selectedFile === file.path
                        ? 'bg-[#182233] text-[#e6edf7]'
                        : 'text-[#9fb0c6] hover:bg-[#111823]'
                    }`}
                  >
                    <span
                      className="text-[11px] truncate"
                      style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                    >
                      {file.name}
                    </span>
                    <span
                      className="text-[9px] text-[#5b6577] ml-2 shrink-0"
                      style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                    >
                      {file.loc.toLocaleString()}
                    </span>
                  </button>
                  {file.type === 'cbl' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleGenerateBrd(file.path);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-[9px] text-[#45c4b0] hover:text-[#3aad9c] px-1.5 pr-2 py-1 transition-all shrink-0"
                      style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                      title="Generate Business Requirements Document"
                    >
                      BRD
                    </button>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Center - Code Viewer with text selection */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center h-9 px-3 bg-[#0c1018] border-b border-[#1e2736]">
          <span
            className="text-[11px] text-[#9fb0c6]"
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          >
            {selectedFile}
          </span>
          {fileEntry && (
            <span
              className="text-[10px] text-[#5b6577] ml-3"
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            >
              {fileEntry.loc.toLocaleString()} LOC
            </span>
          )}
          <span className="ml-auto text-[10px] text-[#5b6577]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
            Select code to review
          </span>
        </div>

        <div className="flex-1 overflow-auto bg-[#0a0e14] relative">
          <pre
            ref={codeRef}
            className="text-[12px] leading-[1.6] relative"
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            onMouseUp={handleMouseUp}
          >
            <code>
              {lines.map((line, i) => (
                <div key={i} className="flex hover:bg-[#111823]">
                  <span
                    className="inline-block w-12 text-right pr-4 select-none shrink-0"
                    style={{ color: '#3a4250' }}
                  >
                    {i + 1}
                  </span>
                  {highlightCobolLine(line)}
                </div>
              ))}
            </code>
          </pre>

          {/* Floating Review button */}
          {reviewButtonPos && !loading && (
            <button
              data-review-button
              onClick={handleReview}
              className="absolute z-10 px-3 py-1.5 bg-[#45c4b0] hover:bg-[#3aad9c] text-[#0a0e14] font-semibold text-[11px] rounded-md shadow-lg transition-colors"
              style={{
                top: reviewButtonPos.top,
                left: Math.max(0, reviewButtonPos.left),
                fontFamily: "'IBM Plex Mono', monospace",
              }}
            >
              Review
            </button>
          )}
        </div>

        {/* Bottom hint bar */}
        <div className="border-t border-[#1e2736] bg-[#0c1018] px-3 py-2">
          <p className="text-[10.5px] text-[#5b6577]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
            {loading
              ? 'Analyzing selected code...'
              : 'Highlight any section of code, then click "Review" to get a business logic summary'}
          </p>
        </div>
      </div>

      {/* Right Panel - Review Results */}
      <div className="w-[360px] border-l border-[#1e2736] bg-[#0c1018] flex flex-col">
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#1e2736]">
          <span
            className="text-[11px] font-semibold text-[#e6edf7]"
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          >
            Business Review
          </span>
          <span
            className="text-[10px] text-[#5b6577]"
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          >
            {reviews.length} review{reviews.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Loading state */}
          {loading && (
            <div className="px-3 py-4 border-b border-[#1e2736]">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 border-2 border-[#45c4b0] border-t-transparent rounded-full animate-spin" />
                <span className="text-[11px] text-[#7a869a]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                  Analyzing...
                </span>
              </div>
              <div className="bg-[#111823] border border-[#232c3c] rounded-md p-2 mb-2">
                <pre className="text-[10px] text-[#5b6577] whitespace-pre-wrap break-all max-h-16 overflow-hidden" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                  {selectedText.slice(0, 200)}{selectedText.length > 200 ? '...' : ''}
                </pre>
              </div>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="px-3 py-3 border-b border-[#1e2736]">
              <div className="bg-[#ef444420] border border-[#ef4444] rounded-md p-2.5">
                <span className="text-[11px] text-[#ef4444]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                  {error}
                </span>
              </div>
            </div>
          )}

          {/* Review history */}
          {reviews.map(review => (
            <div key={review.id} className="px-3 py-3 border-b border-[#1e2736]">
              {/* Snippet preview */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] text-[#5b6577]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                  {review.filePath.split('/').pop()}
                </span>
                <span className="text-[9px] text-[#3a4250]">
                  {review.timestamp.toLocaleTimeString()}
                </span>
              </div>
              <div className="bg-[#111823] border border-[#232c3c] rounded-md p-2 mb-2">
                <pre className="text-[10px] text-[#7a869a] whitespace-pre-wrap break-all max-h-20 overflow-y-auto" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                  {review.snippet.slice(0, 300)}{review.snippet.length > 300 ? '...' : ''}
                </pre>
              </div>
              {/* Summary */}
              <div className="bg-[#0a0e14] border border-[#1e2736] rounded-md p-2.5">
                <span
                  className="text-[10px] text-[#45c4b0] uppercase tracking-wider block mb-1.5"
                  style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                >
                  Business Logic
                </span>
                <p className="text-[11px] text-[#dbe4f0] leading-relaxed whitespace-pre-wrap">
                  {review.summary}
                </p>
              </div>
            </div>
          ))}

          {/* Empty state */}
          {!loading && reviews.length === 0 && !error && (
            <div className="flex flex-col items-center justify-center h-full px-6 text-center">
              <span className="text-2xl mb-3 opacity-30">▤</span>
              <p className="text-[12px] text-[#5b6577] mb-2" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                No reviews yet
              </p>
              <p className="text-[11px] text-[#3a4250] leading-relaxed">
                Select a section of COBOL code in the editor and click &quot;Review&quot; to get a plain-English business logic explanation.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* BRD Modal */}
      <BrdModal
        open={brdModalOpen}
        onClose={() => setBrdModalOpen(false)}
        loading={brdLoading}
        error={brdError}
        data={brdData}
        filePath={brdFilePath}
      />
    </div>
  );
}
