"""CLI entry point for the COBOL Knowledge Graph Agent."""
from __future__ import annotations

import logging
import sys

import click

from .agent.loop import run_agent
from .graph.enrichment import to_compat_edges
from .output.json_writer import write_graph_json
from .output.summary import print_summary


@click.group()
def main() -> None:
    """COBOL Knowledge Graph Agent — agentic mainframe codebase analysis."""


@main.command()
@click.option(
    "--github",
    "github_url",
    default=None,
    help="GitHub repository URL to analyze",
)
@click.option(
    "--local",
    "local_path",
    default=None,
    type=click.Path(exists=True, file_okay=False),
    help="Local directory containing COBOL source files",
)
@click.option(
    "--output", "-o",
    "output_path",
    default="graph.json",
    help="Output JSON file path (default: graph.json)",
)
@click.option(
    "--compat",
    is_flag=True,
    default=False,
    help="Map extended edge types to base 5 types for frontend compatibility",
)
@click.option(
    "--verbose", "-v",
    is_flag=True,
    default=False,
    help="Enable verbose logging",
)
def analyze(
    github_url: "str | None",
    local_path: "str | None",
    output_path: str,
    compat: bool,
    verbose: bool,
) -> None:
    """Analyze a mainframe codebase and produce a knowledge graph."""
    # Configure logging
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s %(name)s %(levelname)s %(message)s",
        datefmt="%H:%M:%S",
    )

    # Validate input
    if not github_url and not local_path:
        click.echo("Error: provide --github URL or --local PATH", err=True)
        sys.exit(1)
    if github_url and local_path:
        click.echo("Error: provide only one of --github or --local", err=True)
        sys.exit(1)

    # Create the appropriate fetcher
    if github_url:
        from .sources.github_fetcher import GitHubFetcher
        fetcher = GitHubFetcher(github_url)
        repo_label = github_url
    else:
        from .sources.local_fetcher import LocalFetcher
        fetcher = LocalFetcher(local_path)
        repo_label = local_path

    # Run the agentic loop
    click.echo(f"Analyzing: {repo_label}")
    graph, summary = run_agent(fetcher, repo_label=repo_label, verbose=verbose)

    # Apply compat mapping if requested
    if compat:
        graph = to_compat_edges(graph)
        click.echo("Applied compatibility mapping (base 5 edge types)")

    # Write output
    write_graph_json(graph, output_path)
    click.echo(f"Graph written to {output_path}")

    # Print summary
    print_summary(graph, summary)
