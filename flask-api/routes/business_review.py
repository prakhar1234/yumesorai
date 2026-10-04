"""Routes for the business review endpoint."""

import logging

from flask import Blueprint, jsonify, request

from config import Config
from services.llm_provider import get_provider

logger = logging.getLogger(__name__)

business_review_bp = Blueprint("business_review", __name__)

SYSTEM_PROMPT = (
    "You are a COBOL business analyst. Given a snippet of COBOL source code, "
    "explain the business logic in plain English. Focus on: what business "
    "operation this performs, what data it processes, what rules or validations "
    "it enforces, and what downstream effects it has. Be concise but thorough. "
    "Return only the plain-English summary, no code or JSON."
)


@business_review_bp.route("/api/business-review", methods=["POST"])
def business_review():
    """Analyze a COBOL code snippet and return a business logic summary.

    Expects JSON body:
        snippet (str): The COBOL code snippet to analyze.
        file_path (str, optional): The source file name for context.
        repo_url (str, optional): The repository URL for context.

    Returns:
        JSON with a "summary" field containing the business logic explanation.
    """
    data = request.get_json(silent=True)
    if data is None:
        return jsonify({"error": "Request body must be valid JSON"}), 400

    snippet = data.get("snippet", "").strip()
    if not snippet:
        return jsonify({"error": "snippet is required"}), 400

    file_path = data.get("file_path", "unknown")
    repo_url = data.get("repo_url", "")

    user_prompt = f"File: {file_path}\n\n```cobol\n{snippet}\n```"
    if repo_url:
        user_prompt = f"Repository: {repo_url}\n{user_prompt}"

    try:
        provider = get_provider(Config)
        # Use the provider's analyze method but we only need text, not JSON.
        # Call the underlying client directly for a simple text response.
        if hasattr(provider, "client") and hasattr(provider, "model"):
            # Anthropic provider
            collected = []
            with provider.client.messages.stream(
                model=provider.model,
                max_tokens=4096,
                system=SYSTEM_PROMPT,
                messages=[{"role": "user", "content": user_prompt}],
            ) as stream:
                for text in stream.text_stream:
                    collected.append(text)
            summary = "".join(collected).strip()
        else:
            # Fallback: use analyze and extract text
            result = provider.analyze(SYSTEM_PROMPT, user_prompt)
            summary = str(result)

        return jsonify({"summary": summary})

    except Exception as e:
        logger.error("Business review error: %s", e, exc_info=True)
        return jsonify({"error": f"Analysis failed: {str(e)}"}), 500
