"""Routes for execution-based performance benchmarking (COBOL vs modern)."""

import logging
import os
import shutil
import tempfile
import time

from flask import Blueprint, jsonify, request

from services.code_runner import CobolRunner, get_runner

logger = logging.getLogger(__name__)

perf_benchmark_bp = Blueprint("perf_benchmark", __name__)


def _timed_run(runner, work_dir: str, test_input: str) -> tuple:
    """Run a program and return (RunResult, elapsed_ms)."""
    start = time.perf_counter()
    result = runner.run(work_dir, test_input)
    elapsed_ms = (time.perf_counter() - start) * 1000
    return result, elapsed_ms


@perf_benchmark_bp.route("/api/perf-eval/benchmark", methods=["POST"])
def perf_benchmark():
    """Timed execution benchmark — runs COBOL and modern code N times.

    Expects JSON body:
        cobol_source (str): Original COBOL source code.
        modern_source (str): Modernized code.
        target_lang (str): Target language id (java, python, csharp).
        test_input (str, optional): Data piped to stdin.
        iterations (int, optional): Number of timed runs (default 5, max 20).

    Returns:
        JSON with cobol/modern timing stats, speedup ratio, output match.
    """
    data = request.get_json(silent=True)
    if data is None:
        return jsonify({"error": "Request body must be valid JSON"}), 400

    cobol_source = data.get("cobol_source", "")
    if not cobol_source.strip():
        return jsonify({"error": "cobol_source is required"}), 400

    modern_source = data.get("modern_source", "").strip()
    if not modern_source:
        return jsonify({"error": "modern_source is required"}), 400

    target_lang = data.get("target_lang", "").strip()
    if not target_lang:
        return jsonify({"error": "target_lang is required"}), 400

    test_input = data.get("test_input", "")
    iterations = min(max(int(data.get("iterations", 5)), 1), 20)

    cobol_runner = CobolRunner()
    try:
        modern_runner = get_runner(target_lang)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    cobol_dir = tempfile.mkdtemp(prefix="bench_cobol_")
    modern_dir = tempfile.mkdtemp(prefix="bench_modern_")

    try:
        # ---- Build phase ----
        cobol_build = cobol_runner.build(cobol_source, cobol_dir)
        if not cobol_build.success:
            return jsonify({
                "error": "COBOL build failed",
                "build_errors": cobol_build.errors,
            }), 422

        modern_build = modern_runner.build(modern_source, modern_dir)
        if not modern_build.success:
            return jsonify({
                "error": "Modern build failed",
                "build_errors": modern_build.errors,
            }), 422

        # ---- Run phase: timed iterations ----
        cobol_runs = []
        modern_runs = []
        cobol_first_output = ""
        modern_first_output = ""

        for i in range(iterations):
            cr, ct = _timed_run(cobol_runner, cobol_dir, test_input)
            if not cr.success:
                return jsonify({
                    "error": f"COBOL run failed on iteration {i + 1}",
                    "stderr": cr.stderr,
                }), 422
            cobol_runs.append(ct)
            if i == 0:
                cobol_first_output = cr.stdout

            mr, mt = _timed_run(modern_runner, modern_dir, test_input)
            if not mr.success:
                return jsonify({
                    "error": f"Modern run failed on iteration {i + 1}",
                    "stderr": mr.stderr,
                }), 422
            modern_runs.append(mt)
            if i == 0:
                modern_first_output = mr.stdout

        # ---- Compute stats ----
        def _stats(runs):
            return {
                "mean_ms": round(sum(runs) / len(runs), 2),
                "min_ms": round(min(runs), 2),
                "max_ms": round(max(runs), 2),
                "runs": [round(r, 2) for r in runs],
            }

        cobol_stats = _stats(cobol_runs)
        modern_stats = _stats(modern_runs)

        speedup = round(cobol_stats["mean_ms"] / modern_stats["mean_ms"], 2) if modern_stats["mean_ms"] > 0 else 0

        outputs_match = cobol_first_output.strip() == modern_first_output.strip()

        return jsonify({
            "cobol": cobol_stats,
            "modern": modern_stats,
            "speedup": speedup,
            "outputs_match": outputs_match,
            "cobol_output": cobol_first_output,
            "modern_output": modern_first_output,
        })

    except Exception as e:
        logger.error("Benchmark error: %s", e, exc_info=True)
        return jsonify({"error": f"Benchmark failed: {str(e)}"}), 500

    finally:
        shutil.rmtree(cobol_dir, ignore_errors=True)
        shutil.rmtree(modern_dir, ignore_errors=True)
