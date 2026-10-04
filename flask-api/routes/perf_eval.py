"""Routes for the performance evaluation endpoint."""

import json
import logging
import re

from flask import Blueprint, jsonify, request

from config import Config
from services.llm_provider import get_provider

logger = logging.getLogger(__name__)

perf_eval_bp = Blueprint("perf_eval", __name__)

SYSTEM_PROMPT = (
    "You are a senior software performance analyst specializing in legacy COBOL "
    "modernization. Given the original COBOL source code and its modernized "
    "equivalent, produce a structured JSON performance comparison.\n\n"
    "Evaluate both codebases across these six categories, scoring each on a "
    "0-100 scale where higher is better:\n"
    "1. CPU / Compute — algorithmic efficiency, loop structures, parallelism potential\n"
    "2. Memory Usage — data structure efficiency, allocation patterns, GC pressure\n"
    "3. I/O & File Handling — batch throughput, buffering, sequential vs random access\n"
    "4. SQL / DB Efficiency — query patterns, cursor usage, connection pooling\n"
    "5. Error Resilience — fault tolerance, recovery mechanisms, graceful degradation\n"
    "6. Maintainability — readability, modularity, testability, refactorability\n\n"
    "Return ONLY a JSON object with this exact shape:\n"
    "{\n"
    '  "summary": "One-paragraph overall assessment",\n'
    '  "verdict": "faster" | "comparable" | "slower",\n'
    '  "categories": [\n'
    "    {\n"
    '      "name": "CPU / Compute",\n'
    '      "cobol_score": 82,\n'
    '      "modern_score": 88,\n'
    '      "cobol_notes": "Brief analysis of COBOL performance characteristics...",\n'
    '      "modern_notes": "Brief analysis of modern code performance characteristics...",\n'
    '      "recommendation": "Actionable recommendation..."\n'
    "    }\n"
    "  ],\n"
    '  "overall_cobol_score": 74,\n'
    '  "overall_modern_score": 85\n'
    "}\n\n"
    "The verdict field refers to the modern code relative to COBOL: "
    '"faster" means modern is better overall, "comparable" means roughly equal, '
    '"slower" means COBOL is better overall.\n\n'
    "Be realistic and nuanced — COBOL often wins on raw batch I/O throughput and "
    "sequential file processing, while modern languages win on maintainability, "
    "parallelism, and ecosystem. Do not bias toward either side.\n\n"
    "Return ONLY the JSON object, no markdown fences, no commentary."
)


@perf_eval_bp.route("/api/perf-eval", methods=["POST"])
def perf_eval():
    """Compare performance characteristics of COBOL vs modernized code.

    Expects JSON body:
        cobol_source (str): The original COBOL source code.
        modern_source (str): The modernized target language code.
        target_lang (str, optional): Target language name (default: "Java").
        program_name (str, optional): Program identifier for context.

    Returns:
        JSON with performance comparison data.
    """
    data = request.get_json(silent=True)
    if data is None:
        return jsonify({"error": "Request body must be valid JSON"}), 400

    cobol_source = data.get("cobol_source", "").strip()
    if not cobol_source:
        return jsonify({"error": "cobol_source is required"}), 400

    modern_source = data.get("modern_source", "").strip()
    if not modern_source:
        return jsonify({"error": "modern_source is required"}), 400

    target_lang = data.get("target_lang", "Java")
    program_name = data.get("program_name", "unknown")

    user_prompt = (
        f"Program: {program_name}\n"
        f"Target language: {target_lang}\n\n"
        f"=== COBOL Source ===\n```cobol\n{cobol_source}\n```\n\n"
        f"=== {target_lang} Output ===\n```{target_lang.lower()}\n{modern_source}\n```"
    )

    try:
        provider = get_provider(Config)

        if hasattr(provider, "client") and hasattr(provider, "model"):
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
            result = provider.analyze(SYSTEM_PROMPT, user_prompt)
            raw = str(result)

        # Strip markdown fences if the LLM wrapped the JSON
        cleaned = re.sub(r"^```(?:json)?\s*", "", raw)
        cleaned = re.sub(r"\s*```$", "", cleaned)

        perf_data = json.loads(cleaned)

        return jsonify(perf_data)

    except json.JSONDecodeError as e:
        logger.error(
            "Perf eval JSON parse error: %s\nRaw: %s",
            e,
            raw[:500] if "raw" in dir() else "N/A",
        )
        return jsonify({"error": f"Failed to parse performance response as JSON: {str(e)}"}), 502

    except Exception as e:
        logger.error("Perf eval error: %s", e, exc_info=True)
        return jsonify({"error": f"Performance evaluation failed: {str(e)}"}), 500
