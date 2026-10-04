"""Anthropic LLM provider implementation."""

import json

import anthropic

from services.llm_provider import LLMProvider


class AnthropicProvider(LLMProvider):
    """LLM provider using the Anthropic API."""

    def __init__(self, config):
        """Initialize the Anthropic provider.

        Args:
            config: Application config with ANTHROPIC_API_KEY and ANTHROPIC_MODEL.
        """
        api_key = getattr(config, "ANTHROPIC_API_KEY", "")
        if not api_key:
            raise ValueError("ANTHROPIC_API_KEY is not configured")
        self.client = anthropic.Anthropic(api_key=api_key)
        self.model = getattr(config, "ANTHROPIC_MODEL", "claude-sonnet-4-6")

    def analyze(self, system_prompt: str, user_prompt: str) -> dict:
        """Send prompts to the Anthropic API and return structured analysis.

        Args:
            system_prompt: The system-level instruction prompt.
            user_prompt: The user-level prompt with specific repo details.

        Returns:
            A dict containing nodes, edges, domains, and metadata.

        Raises:
            RuntimeError: If the API call fails or response cannot be parsed.
        """
        try:
            # Use streaming to avoid SDK timeout on long requests
            collected = []
            with self.client.messages.stream(
                model=self.model,
                max_tokens=65536,
                system=system_prompt,
                messages=[{"role": "user", "content": user_prompt}],
            ) as stream:
                for text in stream.text_stream:
                    collected.append(text)
            content = "".join(collected)
            return self._parse_response(content)
        except anthropic.APIError as e:
            raise RuntimeError(f"Anthropic API error: {e}") from e

    def _parse_response(self, text: str) -> dict:
        """Parse the LLM response text into a structured dict.

        Args:
            text: Raw text response from the LLM.

        Returns:
            Parsed JSON dict.

        Raises:
            RuntimeError: If the response is not valid JSON.
        """
        # Try to extract JSON from markdown code blocks if present
        stripped = text.strip()
        if stripped.startswith("```"):
            lines = stripped.split("\n")
            # Remove first and last lines (``` markers)
            lines = lines[1:]
            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]
            stripped = "\n".join(lines)

        try:
            return json.loads(stripped)
        except json.JSONDecodeError as e:
            raise RuntimeError(f"Failed to parse LLM response as JSON: {e}") from e
