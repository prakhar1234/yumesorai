"""Shared fixtures for tests."""
from __future__ import annotations

from pathlib import Path

import pytest

from cobol_agent.graph.builder import GraphBuilder
from cobol_agent.sources.base import SourceFetcher, SourceFile

FIXTURES_DIR = Path(__file__).parent / "fixtures" / "sample_cobol"


class StubFetcher(SourceFetcher):
    """In-memory fetcher for tests."""

    def __init__(self, files: dict[str, str]) -> None:
        """files: {path: content}"""
        self._files = files

    def list_files(self) -> list[SourceFile]:
        from cobol_agent.sources.base import classify_extension
        result = []
        for path, content in self._files.items():
            cls = classify_extension(path)
            if cls is None:
                continue
            ext, file_type = cls
            from pathlib import PurePosixPath
            name = PurePosixPath(path).stem.upper()
            result.append(SourceFile(path=path, name=name, ext=ext, file_type=file_type, content=content))
        return result

    def read_file(self, path: str) -> str:
        if path not in self._files:
            raise FileNotFoundError(path)
        return self._files[path]


@pytest.fixture
def stub_fetcher():
    """Create a StubFetcher with sample COBOL files from fixtures."""
    files = {}
    if FIXTURES_DIR.is_dir():
        for p in FIXTURES_DIR.iterdir():
            if p.is_file():
                files[p.name] = p.read_text(encoding="utf-8", errors="replace")
    if not files:
        # Minimal inline fixtures
        files = {
            "REPORT.cbl": (
                "       IDENTIFICATION DIVISION.\n"
                "       PROGRAM-ID. REPORT.\n"
                "       ENVIRONMENT DIVISION.\n"
                "       INPUT-OUTPUT SECTION.\n"
                "       FILE-CONTROL.\n"
                "           SELECT INFILE ASSIGN TO 'INPUT.DAT'.\n"
                "           SELECT OUTFILE ASSIGN TO 'OUTPUT.DAT'.\n"
                "       DATA DIVISION.\n"
                "       FILE SECTION.\n"
                "       FD INFILE.\n"
                "       01 IN-REC PIC X(80).\n"
                "       FD OUTFILE.\n"
                "       01 OUT-REC PIC X(133).\n"
                "       PROCEDURE DIVISION.\n"
                "           OPEN INPUT INFILE.\n"
                "           OPEN OUTPUT OUTFILE.\n"
                "           READ INFILE.\n"
                "           WRITE OUT-REC.\n"
                "           CLOSE INFILE.\n"
                "           CLOSE OUTFILE.\n"
                "           STOP RUN.\n"
            ),
            "RUNJOB.jcl": (
                "//RUNJOB  JOB (ACCT),'RUN REPORT',CLASS=A\n"
                "//STEP01  EXEC PGM=REPORT\n"
                "//INDD    DD DSN=PROD.INPUT.DATA,DISP=SHR\n"
                "//OUTDD   DD DSN=PROD.OUTPUT.REPORT,\n"
                "//           DISP=(NEW,CATLG,DELETE)\n"
            ),
            "COMMON.cpy": (
                "       01 WS-DATE.\n"
                "           05 WS-YEAR  PIC 9(4).\n"
                "           05 WS-MONTH PIC 9(2).\n"
                "           05 WS-DAY   PIC 9(2).\n"
            ),
        }
    return StubFetcher(files)


@pytest.fixture
def minimal_fetcher():
    """A fetcher with a single COBOL file for tests that don't need full coverage."""
    return StubFetcher({
        "REPORT.cbl": (
            "       IDENTIFICATION DIVISION.\n"
            "       PROGRAM-ID. REPORT.\n"
            "       PROCEDURE DIVISION.\n"
            "           STOP RUN.\n"
        ),
    })


@pytest.fixture
def builder():
    return GraphBuilder()
