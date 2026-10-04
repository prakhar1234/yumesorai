"""Routes for compiling and running COBOL programs via Docker."""

import logging
import os
import tempfile

from flask import Blueprint, jsonify, request

from services.code_runner import CobolRunner

logger = logging.getLogger(__name__)

cobol_run_bp = Blueprint("cobol_run", __name__)

_runner = CobolRunner()


@cobol_run_bp.route("/api/cobol/run", methods=["POST"])
def cobol_run():
    """Compile and run a COBOL program, returning stdout/stderr.

    Expects JSON body:
        cobol_source (str): The COBOL source code.
        test_input (str, optional): Data piped to stdin.

    Returns:
        JSON with success, stdout, stderr, build_errors.
    """
    data = request.get_json(silent=True)
    if data is None:
        return jsonify({"error": "Request body must be valid JSON"}), 400

    cobol_source = data.get("cobol_source", "")
    if not cobol_source.strip():
        return jsonify({"error": "cobol_source is required"}), 400

    test_input = data.get("test_input", "")

    work_dir = tempfile.mkdtemp(prefix="cobol_run_")
    try:
        build = _runner.build(cobol_source, work_dir)
        if not build.success:
            return jsonify({
                "success": False,
                "stdout": "",
                "stderr": "",
                "build_errors": build.errors,
            })

        result = _runner.run(work_dir, test_input)
        return jsonify({
            "success": result.success,
            "stdout": result.stdout,
            "stderr": result.stderr,
            "build_errors": "",
        })

    except Exception as e:
        logger.error("COBOL run error: %s", e, exc_info=True)
        return jsonify({"error": f"COBOL execution failed: {str(e)}"}), 500

    finally:
        # Best-effort cleanup
        try:
            import shutil
            shutil.rmtree(work_dir, ignore_errors=True)
        except Exception:
            pass
