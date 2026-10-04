"""Build and run abstraction for generated modern code.

Each runner writes source to a temp directory, attempts compilation,
and executes the program with test input piped via stdin.
"""
from __future__ import annotations

import logging
import os
import re
import shutil
import subprocess
import time
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


@dataclass
class BuildResult:
    success: bool
    errors: str = ""
    output: str = ""


@dataclass
class RunResult:
    success: bool
    stdout: str = ""
    stderr: str = ""
    exit_code: int = 0


# ---------------------------------------------------------------------------
# Abstract runner
# ---------------------------------------------------------------------------

class CodeRunner:
    """Base class for language-specific build/run helpers."""

    def build(self, source_code: str, work_dir: str) -> BuildResult:
        raise NotImplementedError

    def run(self, work_dir: str, test_input: str) -> RunResult:
        raise NotImplementedError

    @staticmethod
    def _tool_available(name: str) -> bool:
        return shutil.which(name) is not None


# ---------------------------------------------------------------------------
# Java
# ---------------------------------------------------------------------------

class JavaRunner(CodeRunner):
    """Compile with javac, run with java.  Standalone — no Maven/Gradle."""

    def build(self, source_code: str, work_dir: str) -> BuildResult:
        if not self._tool_available("javac"):
            return BuildResult(False, errors="javac not found on PATH")

        match = re.search(r"public\s+class\s+(\w+)", source_code)
        if not match:
            return BuildResult(False, errors="Could not find a public class declaration in the source")

        class_name = match.group(1)
        src_path = os.path.join(work_dir, f"{class_name}.java")
        with open(src_path, "w", encoding="utf-8") as f:
            f.write(source_code)

        try:
            proc = subprocess.run(
                ["javac", src_path],
                capture_output=True, text=True, timeout=30,
            )
        except subprocess.TimeoutExpired:
            return BuildResult(False, errors="javac timed out after 30 s")

        if proc.returncode != 0:
            return BuildResult(False, errors=proc.stderr)

        return BuildResult(True, output=f"Compiled {class_name}.java")

    def run(self, work_dir: str, test_input: str) -> RunResult:
        class_files = [f.replace(".class", "") for f in os.listdir(work_dir) if f.endswith(".class")]
        if not class_files:
            return RunResult(False, stderr="No .class files found after build")

        # Prefer a class with a main method — heuristic: shortest name first
        main_class = sorted(class_files, key=len)[0]

        try:
            proc = subprocess.run(
                ["java", "-cp", work_dir, main_class],
                input=test_input, capture_output=True, text=True, timeout=60,
            )
        except subprocess.TimeoutExpired:
            return RunResult(False, stderr="java execution timed out after 60 s", exit_code=-1)

        return RunResult(
            success=proc.returncode == 0,
            stdout=proc.stdout,
            stderr=proc.stderr,
            exit_code=proc.returncode,
        )


# ---------------------------------------------------------------------------
# Python
# ---------------------------------------------------------------------------

class PythonRunner(CodeRunner):
    """Syntax-check with py_compile, run with python3."""

    def build(self, source_code: str, work_dir: str) -> BuildResult:
        python = "python3" if self._tool_available("python3") else "python"
        if not self._tool_available(python):
            return BuildResult(False, errors="python3/python not found on PATH")

        src_path = os.path.join(work_dir, "program.py")
        with open(src_path, "w", encoding="utf-8") as f:
            f.write(source_code)

        try:
            proc = subprocess.run(
                [python, "-m", "py_compile", src_path],
                capture_output=True, text=True, timeout=15,
            )
        except subprocess.TimeoutExpired:
            return BuildResult(False, errors="py_compile timed out after 15 s")

        if proc.returncode != 0:
            return BuildResult(False, errors=proc.stderr)

        return BuildResult(True, output="Python syntax check passed")

    def run(self, work_dir: str, test_input: str) -> RunResult:
        python = "python3" if self._tool_available("python3") else "python"
        src_path = os.path.join(work_dir, "program.py")

        try:
            proc = subprocess.run(
                [python, src_path],
                input=test_input, capture_output=True, text=True, timeout=60,
            )
        except subprocess.TimeoutExpired:
            return RunResult(False, stderr="python execution timed out after 60 s", exit_code=-1)

        return RunResult(
            success=proc.returncode == 0,
            stdout=proc.stdout,
            stderr=proc.stderr,
            exit_code=proc.returncode,
        )


# ---------------------------------------------------------------------------
# C#
# ---------------------------------------------------------------------------

class CSharpRunner(CodeRunner):
    """Build with dotnet, run with dotnet run.  Creates a minimal .csproj."""

    _CSPROJ = """\
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>Exe</OutputType>
    <TargetFramework>net8.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
  </PropertyGroup>
</Project>
"""

    def build(self, source_code: str, work_dir: str) -> BuildResult:
        if not self._tool_available("dotnet"):
            return BuildResult(False, errors="dotnet CLI not found on PATH")

        with open(os.path.join(work_dir, "Program.cs"), "w", encoding="utf-8") as f:
            f.write(source_code)
        with open(os.path.join(work_dir, "Program.csproj"), "w", encoding="utf-8") as f:
            f.write(self._CSPROJ)

        try:
            proc = subprocess.run(
                ["dotnet", "build", "--nologo", "-v", "q"],
                cwd=work_dir, capture_output=True, text=True, timeout=60,
            )
        except subprocess.TimeoutExpired:
            return BuildResult(False, errors="dotnet build timed out after 60 s")

        if proc.returncode != 0:
            return BuildResult(False, errors=proc.stderr + "\n" + proc.stdout)

        return BuildResult(True, output="dotnet build succeeded")

    def run(self, work_dir: str, test_input: str) -> RunResult:
        try:
            proc = subprocess.run(
                ["dotnet", "run", "--project", work_dir, "--no-build"],
                input=test_input, capture_output=True, text=True, timeout=60,
            )
        except subprocess.TimeoutExpired:
            return RunResult(False, stderr="dotnet run timed out after 60 s", exit_code=-1)

        return RunResult(
            success=proc.returncode == 0,
            stdout=proc.stdout,
            stderr=proc.stderr,
            exit_code=proc.returncode,
        )


# ---------------------------------------------------------------------------
# COBOL (via Docker + GnuCOBOL)
# ---------------------------------------------------------------------------

class CobolRunner(CodeRunner):
    """Compile COBOL with GnuCOBOL (cobc) via Docker, run the binary."""

    IMAGE = "yumesorai-cobol"

    def _docker_available(self) -> bool:
        return self._tool_available("docker")

    def _image_exists(self) -> bool:
        try:
            proc = subprocess.run(
                ["docker", "image", "inspect", self.IMAGE],
                capture_output=True, timeout=10,
            )
            return proc.returncode == 0
        except (subprocess.TimeoutExpired, FileNotFoundError):
            return False

    def build(self, source_code: str, work_dir: str) -> BuildResult:
        if not self._docker_available():
            return BuildResult(False, errors="docker not found on PATH")
        if not self._image_exists():
            return BuildResult(
                False,
                errors=(
                    f"Docker image '{self.IMAGE}' not found. "
                    "Run: docker build -f Dockerfile.gnucobol -t yumesorai-cobol ."
                ),
            )

        src_path = os.path.join(work_dir, "program.cob")
        with open(src_path, "w", encoding="utf-8") as f:
            f.write(source_code)

        try:
            proc = subprocess.run(
                [
                    "docker", "run", "--rm",
                    "-v", f"{work_dir}:/workspace",
                    self.IMAGE,
                    "-c", "cobc -x -o /workspace/program /workspace/program.cob",
                ],
                capture_output=True, text=True, timeout=60,
            )
        except subprocess.TimeoutExpired:
            return BuildResult(False, errors="cobc compilation timed out after 60 s")

        if proc.returncode != 0:
            return BuildResult(False, errors=proc.stderr + proc.stdout)

        return BuildResult(True, output="COBOL compilation succeeded")

    def run(self, work_dir: str, test_input: str) -> RunResult:
        try:
            proc = subprocess.run(
                [
                    "docker", "run", "--rm", "-i",
                    "-v", f"{work_dir}:/workspace",
                    self.IMAGE,
                    "-c", "/workspace/program",
                ],
                input=test_input, capture_output=True, text=True, timeout=60,
            )
        except subprocess.TimeoutExpired:
            return RunResult(False, stderr="COBOL execution timed out after 60 s", exit_code=-1)

        return RunResult(
            success=proc.returncode == 0,
            stdout=proc.stdout,
            stderr=proc.stderr,
            exit_code=proc.returncode,
        )



# ---------------------------------------------------------------------------
# Factory
# ---------------------------------------------------------------------------

_RUNNERS: dict[str, type[CodeRunner]] = {
    "java": JavaRunner,
    "python": PythonRunner,
    "csharp": CSharpRunner,
    "cobol": CobolRunner,
}


def get_runner(target_lang: str) -> CodeRunner:
    """Return a runner for the given target language id.

    Raises ValueError for unsupported languages.
    """
    cls = _RUNNERS.get(target_lang)
    if cls is None:
        raise ValueError(
            f"No runner for language '{target_lang}'. "
            f"Supported: {', '.join(_RUNNERS)}"
        )
    return cls()
