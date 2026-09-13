"""Routes for the program BRD (Business Requirements Document) endpoint."""

import json
import logging
import re

from flask import Blueprint, jsonify, request

from config import Config
from services.llm_provider import get_provider

logger = logging.getLogger(__name__)

program_brd_bp = Blueprint("program_brd", __name__)

SYSTEM_PROMPT = (
    "You are a senior COBOL business analyst. Given the full source code of a COBOL "
    "program, produce a comprehensive Business Requirements Document (BRD) as a JSON "
    "object. The JSON must have exactly these keys:\n\n"
    "1. \"purpose\" - A concise summary of what this program does and why it exists.\n"
    "2. \"business_rules\" - An array of business rules enforced by the program "
    "(validations, thresholds, conditions, routing logic).\n"
    "3. \"data_inputs_outputs\" - An object with \"inputs\" and \"outputs\" arrays, each "
    "entry describing a file, database table, queue, or copybook used.\n"
    "4. \"processing_logic\" - A step-by-step description of the main processing flow, "
    "from initialization through termination.\n"
    "5. \"dependencies\" - An array of external programs, copybooks, vendor modules, "
    "CICS transactions, or DB2 tables this program depends on.\n"
    "6. \"error_handling\" - A description of how the program detects and handles errors, "
    "invalid data, and exceptional conditions.\n"
    "7. \"downstream_effects\" - A description of what downstream systems, processes, or "
    "reports are affected by this program's output.\n\n"
    "Return ONLY the JSON object, no markdown fences, no commentary."
)


@program_brd_bp.route("/api/program-brd", methods=["POST"])
def program_brd():
    """Generate a full BRD for an entire COBOL program.

    Expects JSON body:
        program_content (str): The full COBOL source code.
        file_path (str, optional): The source file name for context.
        repo_url (str, optional): The repository URL for context.

    Returns:
        JSON with a "brd" object containing program_id, program_name, and sections.
    """
    data = request.get_json(silent=True)
    if data is None:
        return jsonify({"error": "Request body must be valid JSON"}), 400

    program_content = data.get("program_content", "").strip()
    if not program_content:
        return jsonify({"error": "program_content is required"}), 400

    file_path = data.get("file_path", "unknown")
    repo_url = data.get("repo_url", "")

    user_prompt = f"File: {file_path}\n\n```cobol\n{program_content}\n```"
    if repo_url:
        user_prompt = f"Repository: {repo_url}\n{user_prompt}"

    try:
        provider = get_provider(Config)

        if hasattr(provider, "client") and hasattr(provider, "model"):
            # Anthropic provider
            collected = []
            with provider.client.messages.stream(
                model=provider.model,
                max_tokens=8192,
                system=SYSTEM_PROMPT,
                messages=[{"role": "user", "content": user_prompt}],
            ) as stream:
                for text in stream.text_stream:
                    collected.append(text)
            raw = "".join(collected).strip()
        else:
            # Fallback: use analyze and extract text
            result = provider.analyze(SYSTEM_PROMPT, user_prompt)
            raw = str(result)

        # Strip markdown fences if the LLM wrapped the JSON
        cleaned = re.sub(r"^```(?:json)?\s*", "", raw)
        cleaned = re.sub(r"\s*```$", "", cleaned)

        sections = json.loads(cleaned)

        # Extract program ID from file path
        program_name = file_path.split("/")[-1] if "/" in file_path else file_path
        program_id = program_name.replace(".cbl", "").replace(".CBL", "")

        return jsonify({
            "brd": {
                "program_id": program_id,
                "program_name": program_name,
                "sections": sections,
            }
        })

    except json.JSONDecodeError as e:
        logger.error("BRD JSON parse error: %s\nRaw: %s", e, raw[:500] if 'raw' in dir() else 'N/A')
        return jsonify({"error": f"Failed to parse BRD response as JSON: {str(e)}"}), 502

    except Exception as e:
        logger.error("Program BRD error: %s", e, exc_info=True)
        return jsonify({"error": f"BRD generation failed: {str(e)}"}), 500
