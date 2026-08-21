"""OpenAI LLM provider implementation."""

import json

import openai

from services.llm_provider import LLMProvider


class OpenAIProvider(LLMProvider):
    """LLM provider using the OpenAI API."""

    def __init__(self, config):
        """Initialize the OpenAI provider.

        Args:
            config: Application config with OPENAI_API_KEY and OPENAI_MODEL.
        """
        api_key = getattr(config, "OPENAI_API_KEY", "")
        if not api_key:
            raise ValueError("OPENAI_API_KEY is not configured")
        self.client = openai.OpenAI(api_key=api_key)
        self.model = getattr(config, "OPENAI_MODEL", "gpt-4o")

    def analyze(self, system_prompt: str, user_prompt: str) -> dict:
        """Send prompts to the OpenAI API and return structured analysis.

        Args:
            system_prompt: The system-level instruction prompt.
            user_prompt: The user-level prompt with specific repo details.

        Returns:
            A dict containing nodes, edges, domains, and metadata.

        Raises:
            RuntimeError: If the API call fails or response cannot be parsed.
        """
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                max_tokens=16384,
            )
            content = response.choices[0].message.content
            return self._parse_response(content)
        except openai.APIError as e:
            raise RuntimeError(f"OpenAI API error: {e}") from e

    def _parse_response(self, text: str) -> dict:
        """Parse the LLM response text into a structured dict.

        Args:
            text: Raw text response from the LLM.

        Returns:
            Parsed JSON dict.

        Raises:
            RuntimeError: If the response is not valid JSON.
        """
        stripped = text.strip()
        if stripped.startswith("```"):
            lines = stripped.split("\n")
            lines = lines[1:]
            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]
            stripped = "\n".join(lines)

        try:
            return json.loads(stripped)
        except json.JSONDecodeError as e:
            raise RuntimeError(f"Failed to parse LLM response as JSON: {e}") from e
