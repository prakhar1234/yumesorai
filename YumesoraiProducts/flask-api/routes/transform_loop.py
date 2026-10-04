"""Streaming endpoint for the transform-build-test agent loop."""

import json
import logging

from flask import Blueprint, Response, jsonify, request

from services.agent_loop import run_transform_loop

logger = logging.getLogger(__name__)

transform_loop_bp = Blueprint("transform_loop", __name__)


@transform_loop_bp.route("/api/transform/loop", methods=["POST"])
def loop():
    """Run the agent loop and stream NDJSON events.

    Expects JSON body:
        program_content (str):  Full COBOL source code.
        test_input (str):       Test data fed to stdin.
        expected_output (str):  Expected stdout to match.
        target_lang (str):      java | python | csharp | microservices
        target_db (str):        postgresql | oracle | mssql | dynamodb
        file_path (str, opt):   Source file name for context.
        max_iterations (int, opt): Max fix attempts (default 5).

    Returns:
        Streams ``application/x-ndjson`` — one JSON object per line.
        The final object always has ``type: "result"``.
    """
    data = request.get_json(silent=True)
    if data is None:
        return jsonify({"error": "Request body must be valid JSON"}), 400

    program_content = (data.get("program_content") or "").strip()
    if not program_content:
        return jsonify({"error": "program_content is required"}), 400

    test_input = (data.get("test_input") or "").strip()
    if not test_input:
        return jsonify({"error": "test_input is required"}), 400

    expected_output = (data.get("expected_output") or "").strip()
    if not expected_output:
        return jsonify({"error": "expected_output is required"}), 400

    target_lang = data.get("target_lang", "java")
    target_db = data.get("target_db", "postgresql")
    file_path = data.get("file_path", "unknown")
    max_iterations = min(int(data.get("max_iterations", 5)), 10)

    def generate():
        for event in run_transform_loop(
            cobol_source=program_content,
            target_lang=target_lang,
            target_db=target_db,
            test_input=test_input,
            expected_output=expected_output,
            file_path=file_path,
            max_iterations=max_iterations,
        ):
            yield json.dumps(event, default=str) + "\n"

    return Response(
        generate(),
        mimetype="application/x-ndjson",
        headers={"X-Accel-Buffering": "no", "Cache-Control": "no-cache"},
    )
