'use client';

import { useState, useCallback } from 'react';

// ---------------------------------------------------------------------------
// File tree data
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

// ---------------------------------------------------------------------------
// Mock COBOL source for each file
// ---------------------------------------------------------------------------
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
// Impact analysis mock data
// ---------------------------------------------------------------------------
interface ImpactItem {
  name: string;
  type: 'program' | 'copybook' | 'jcl';
  impact: 'direct' | 'indirect';
  reason: string;
}

const IMPACT_DATA: ImpactItem[] = [
  { name: 'BILL0030.cbl', type: 'program', impact: 'direct', reason: 'Contains validation logic being modified' },
  { name: 'BILL0040.cbl', type: 'program', impact: 'indirect', reason: 'Uses BILLREC copybook with shared fields' },
  { name: 'BILLREC.cpy', type: 'copybook', impact: 'direct', reason: 'May need new field for validation flag' },
  { name: 'BILLCYCL.jcl', type: 'jcl', impact: 'indirect', reason: 'Runs BILL0030; may need updated return codes' },
];

// ---------------------------------------------------------------------------
// Syntax highlighting
// ---------------------------------------------------------------------------
function highlightCobolLine(line: string): JSX.Element {
  const trimmed = line.trimStart();

  // Comment lines (column 7 = *)
  if (line.length >= 7 && line[6] === '*') {
    return <span style={{ color: '#57634f' }}>{line}</span>;
  }

  // JCL lines
  if (trimmed.startsWith('//')) {
    return <span style={{ color: '#c9a56a' }}>{line}</span>;
  }

  // SQL
  if (trimmed.includes('EXEC SQL') || trimmed.includes('END-EXEC') ||
      trimmed.includes('INSERT INTO') || trimmed.includes('UPDATE ') ||
      trimmed.includes('SELECT ') || trimmed.includes('DELETE ') ||
      trimmed.includes('VALUES') || trimmed.includes('WHERE ') ||
      trimmed.includes('SET ') || trimmed.includes('INTO :') ||
      trimmed.includes('FROM ')) {
    return <span style={{ color: '#58b0ff' }}>{line}</span>;
  }

  // Vendor calls (ANBX)
  if (trimmed.includes('ANBX') || trimmed.includes("CALL 'ANBX")) {
    return <span style={{ color: '#d29922' }}>{line}</span>;
  }

  // DIVISION / SECTION / COPY
  if (trimmed.includes('DIVISION') || trimmed.includes('SECTION') ||
      trimmed.startsWith('COPY ') || trimmed.includes('PROGRAM-ID') ||
      trimmed.includes('EXEC CICS')) {
    return <span style={{ color: '#7de0cf' }}>{line}</span>;
  }

  return <span style={{ color: '#9fb0c6' }}>{line}</span>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
type ApprovalStatus = 'draft' | 'review' | 'approved' | 'rejected';

interface FluxWorkspaceProps {
  repoUrl: string;
  onDisconnect: () => void;
}

export function FluxWorkspace({ repoUrl, onDisconnect }: FluxWorkspaceProps) {
  const [selectedFile, setSelectedFile] = useState<string>('src/programs/BILL0030.cbl');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(FILE_TREE.map(f => f.name))
  );
  const [changeDescription, setChangeDescription] = useState('');
  const [showImpact, setShowImpact] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState<ApprovalStatus>('draft');
  const [analyzing, setAnalyzing] = useState(false);

  const toggleFolder = useCallback((name: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  const handleSubmitChange = useCallback(() => {
    if (!changeDescription.trim()) return;
    setAnalyzing(true);
    setTimeout(() => {
      setAnalyzing(false);
      setShowImpact(true);
      setApprovalStatus('draft');
    }, 1500);
  }, [changeDescription]);

  const handleStatusAdvance = useCallback(() => {
    setApprovalStatus(prev => {
      if (prev === 'draft') return 'review';
      if (prev === 'review') return 'approved';
      return prev;
    });
  }, []);

  const handleReject = useCallback(() => {
    setApprovalStatus('rejected');
  }, []);

  const handleReset = useCallback(() => {
    setShowImpact(false);
    setChangeDescription('');
    setApprovalStatus('draft');
  }, []);

  const content = FILE_CONTENTS[selectedFile] || '      * File content not available';
  const lines = content.split('\n');
  const fileEntry = FILE_TREE.flatMap(f => f.children).find(f => f.path === selectedFile);

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left Sidebar - File Tree */}
      <div className="w-[240px] border-r border-[#1e2736] bg-[#0c1018] flex flex-col">
        {/* Repo header */}
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

        {/* File tree */}
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
                <button
                  key={file.path}
                  onClick={() => setSelectedFile(file.path)}
                  className={`flex items-center justify-between w-full pl-7 pr-3 py-1 text-left transition-colors ${
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
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Center - Code Viewer */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* File tab bar */}
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
        </div>

        {/* Code content */}
        <div className="flex-1 overflow-auto bg-[#0a0e14]">
          <pre className="text-[12px] leading-[1.6]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
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
        </div>

        {/* Bottom bar - Change composer */}
        <div className="border-t border-[#1e2736] bg-[#0c1018] p-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={changeDescription}
              onChange={e => setChangeDescription(e.target.value)}
              placeholder="Describe a change... e.g. 'Add validation for negative bill amounts'"
              className="flex-1 px-3 py-2 bg-[#111823] border border-[#232c3c] rounded-md text-[12px] text-[#dbe4f0] placeholder-[#4a5568] focus:outline-none focus:border-[#3b82f6]"
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
              onKeyDown={e => e.key === 'Enter' && handleSubmitChange()}
            />
            <button
              onClick={handleSubmitChange}
              disabled={!changeDescription.trim() || analyzing}
              className="px-4 py-2 bg-[#45c4b0] hover:bg-[#3aad9c] text-[#0a0e14] font-semibold text-[11px] rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            >
              {analyzing ? 'Analyzing...' : 'Preview Impact'}
            </button>
          </div>
        </div>
      </div>

      {/* Right Panel - Impact Preview */}
      {showImpact && (
        <div className="w-[320px] border-l border-[#1e2736] bg-[#0c1018] flex flex-col">
          {/* Panel header */}
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#1e2736]">
            <span
              className="text-[11px] font-semibold text-[#e6edf7]"
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            >
              Impact Preview
            </span>
            <button
              onClick={handleReset}
              className="text-[10px] text-[#5b6577] hover:text-[#9fb0c6] transition-colors"
            >
              Close
            </button>
          </div>

          {/* Change description */}
          <div className="px-3 py-3 border-b border-[#1e2736]">
            <span
              className="text-[10px] text-[#5b6577] uppercase tracking-wider block mb-1"
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            >
              Proposed Change
            </span>
            <p className="text-[11px] text-[#dbe4f0] leading-relaxed">
              {changeDescription}
            </p>
          </div>

          {/* Affected components */}
          <div className="flex-1 overflow-y-auto px-3 py-3">
            <span
              className="text-[10px] text-[#5b6577] uppercase tracking-wider block mb-2"
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            >
              Affected Components ({IMPACT_DATA.length})
            </span>
            <div className="space-y-2">
              {IMPACT_DATA.map(item => (
                <div
                  key={item.name}
                  className="p-2.5 bg-[#111823] border border-[#232c3c] rounded-md"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className="text-[11px] text-[#e6edf7]"
                      style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                    >
                      {item.name}
                    </span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded ${
                        item.impact === 'direct'
                          ? 'bg-[#f9731620] text-[#f97316]'
                          : 'bg-[#60a5fa20] text-[#60a5fa]'
                      }`}
                      style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                    >
                      {item.impact}
                    </span>
                  </div>
                  <p className="text-[10px] text-[#7a869a] leading-relaxed">
                    {item.reason}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Approval workflow */}
          <div className="border-t border-[#1e2736] p-3">
            {/* Status steps */}
            <div className="flex items-center justify-between mb-3">
              {(['draft', 'review', 'approved'] as const).map((step, i) => {
                const isCurrent = approvalStatus === step;
                const isPast =
                  (step === 'draft' && (approvalStatus === 'review' || approvalStatus === 'approved')) ||
                  (step === 'review' && approvalStatus === 'approved');
                const isRejected = approvalStatus === 'rejected';

                return (
                  <div key={step} className="flex items-center">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-semibold ${
                          isRejected && step !== 'draft'
                            ? 'border border-[#ef4444] text-[#ef4444]'
                            : isPast
                            ? 'bg-[#45c4b0] text-[#0a0e14]'
                            : isCurrent
                            ? 'bg-[#60a5fa] text-[#0a0e14]'
                            : 'border border-[#232c3c] text-[#5b6577]'
                        }`}
                        style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                      >
                        {isPast ? '✓' : i + 1}
                      </div>
                      <span
                        className={`text-[9px] mt-1 capitalize ${
                          isCurrent ? 'text-[#e6edf7]' : 'text-[#5b6577]'
                        }`}
                        style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                      >
                        {step}
                      </span>
                    </div>
                    {i < 2 && (
                      <div
                        className={`w-12 h-px mx-1 ${
                          isPast ? 'bg-[#45c4b0]' : 'bg-[#232c3c]'
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Action buttons */}
            {approvalStatus === 'rejected' ? (
              <div className="space-y-2">
                <div className="text-center py-1.5 px-3 bg-[#ef444420] border border-[#ef4444] rounded-md">
                  <span
                    className="text-[11px] text-[#ef4444]"
                    style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                  >
                    Change Rejected
                  </span>
                </div>
                <button
                  onClick={handleReset}
                  className="w-full py-2 text-[11px] text-[#9fb0c6] bg-[#111823] border border-[#232c3c] rounded-md hover:bg-[#182233] transition-colors"
                  style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                >
                  Start Over
                </button>
              </div>
            ) : approvalStatus === 'approved' ? (
              <div className="space-y-2">
                <div className="text-center py-1.5 px-3 bg-[#45c4b020] border border-[#45c4b0] rounded-md">
                  <span
                    className="text-[11px] text-[#45c4b0]"
                    style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                  >
                    Change Approved
                  </span>
                </div>
                <button
                  onClick={handleReset}
                  className="w-full py-2 text-[11px] text-[#9fb0c6] bg-[#111823] border border-[#232c3c] rounded-md hover:bg-[#182233] transition-colors"
                  style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                >
                  New Change
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleStatusAdvance}
                  className="flex-1 py-2 bg-[#45c4b0] hover:bg-[#3aad9c] text-[#0a0e14] font-semibold text-[11px] rounded-md transition-colors"
                  style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                >
                  {approvalStatus === 'draft' ? 'Submit for Review' : 'Approve'}
                </button>
                {approvalStatus === 'review' && (
                  <button
                    onClick={handleReject}
                    className="px-4 py-2 bg-[#ef444420] text-[#ef4444] text-[11px] rounded-md hover:bg-[#ef444430] transition-colors"
                    style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                  >
                    Reject
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
