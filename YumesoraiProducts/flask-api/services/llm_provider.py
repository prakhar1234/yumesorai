"""Abstract LLM provider and factory function."""

from abc import ABC, abstractmethod


class LLMProvider(ABC):
    """Abstract base class for LLM providers."""

    @abstractmethod
    def analyze(self, system_prompt: str, user_prompt: str) -> dict:
        """Send prompts to the LLM and return a structured analysis result.

        Args:
            system_prompt: The system-level instruction prompt.
            user_prompt: The user-level prompt with specific repo details.

        Returns:
            A dict containing nodes, edges, domains, and metadata.
        """


def get_provider(config) -> LLMProvider:
    """Return the appropriate LLM provider based on configuration.

    Args:
        config: Application config object with LLM_PROVIDER attribute.

    Returns:
        An instance of LLMProvider.

    Raises:
        ValueError: If the configured provider is not supported.
    """
    provider_name = getattr(config, "LLM_PROVIDER", "anthropic").lower()

    if provider_name == "anthropic":
        from services.anthropic_provider import AnthropicProvider
        return AnthropicProvider(config)
    elif provider_name == "openai":
        from services.openai_provider import OpenAIProvider
        return OpenAIProvider(config)
    else:
        raise ValueError(f"Unsupported LLM provider: {provider_name}")
