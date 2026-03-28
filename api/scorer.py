"""
Claude Opus 4.6 Threat Synthesizer
Reads runtime behavioral reports and produces structured threat assessments.
"""

import json
import anthropic
from models import RuntimeReport, ThreatReport, Severity

client = anthropic.AsyncAnthropic()

SYSTEM_PROMPT = """You are a supply chain security analyst specializing in malicious npm packages.
You receive runtime behavioral reports from isolated sandbox executions and assess threat level.

Known malicious patterns:
- Outbound HTTP/HTTPS to unknown IPs or non-CDN domains during import = data exfiltration
- Reading .ssh, .aws, .env, credential files = credential harvesting
- Accessing SECRET, TOKEN, KEY, PASSWORD env vars = secret theft
- CPU spike >75% user time = cryptomining
- Crash on import can indicate obfuscated/corrupted malware
- Multiple suspicious signals together = critical threat

Return ONLY valid JSON matching the specified schema. No markdown, no explanation outside JSON."""

THREAT_SCHEMA = {
    "type": "json_schema",
    "schema": {
        "type": "object",
        "properties": {
            "severity": {
                "type": "string",
                "enum": ["critical", "high", "medium", "low", "safe"],
                "description": "Overall threat severity"
            },
            "behaviors": {
                "type": "array",
                "items": {"type": "string"},
                "description": "List of specific suspicious behaviors detected (empty if safe)"
            },
            "summary": {
                "type": "string",
                "description": "One-sentence human-readable summary"
            },
            "explanation": {
                "type": "string",
                "description": "Detailed analysis of findings and reasoning"
            }
        },
        "required": ["severity", "behaviors", "summary", "explanation"],
        "additionalProperties": False
    }
}


def _build_prompt(package_name: str, report: RuntimeReport) -> str:
    network_summary = ""
    if report.networkCalls:
        hosts = list({c.get("host", "unknown") for c in report.networkCalls})
        network_summary = f"Made {len(report.networkCalls)} outbound network call(s) to: {', '.join(hosts)}"
    else:
        network_summary = "No outbound network calls detected"

    fs_writes = len(report.fileSystemWrites)
    fs_reads_sensitive = [r for r in report.fileSystemReads if r.get("suspicious")]

    env_accessed = [e.get("key", "") for e in report.envVarAccess]

    return f"""Analyze the runtime behavior of npm package "{package_name}" and assess its threat level.

## Runtime Behavioral Report

**Network Activity:** {network_summary}
{json.dumps(report.networkCalls, indent=2) if report.networkCalls else ""}

**File System Writes:** {fs_writes} write(s)
{json.dumps(report.fileSystemWrites, indent=2) if report.fileSystemWrites else ""}

**Sensitive File Reads:** {len(fs_reads_sensitive)} suspicious read(s)
{json.dumps(fs_reads_sensitive, indent=2) if fs_reads_sensitive else ""}

**Environment Variable Access:** {len(env_accessed)} sensitive key(s) accessed
{json.dumps(env_accessed, indent=2) if env_accessed else ""}

**CPU Anomaly (possible cryptominer):** {"YES - CPU usage spiked above 75%" if report.cpuAnomaly else "No"}

**Errors during import:** {report.errors if report.errors else "None"}

Assess the threat. Consider: is this normal package behavior (e.g. lodash making no network calls = safe),
or is this malicious (e.g. a utility making outbound calls to random IPs = critical)?"""


async def score_runtime(package_name: str, report: RuntimeReport) -> ThreatReport:
    """Use Claude Opus 4.6 to synthesize a threat report from runtime behavior."""
    prompt = _build_prompt(package_name, report)

    # Fast path: if no suspicious signals at all, skip Claude and return safe
    has_network = bool(report.networkCalls)
    has_sensitive_reads = any(r.get("suspicious") for r in report.fileSystemReads)
    has_env_access = bool(report.envVarAccess)
    has_cpu = report.cpuAnomaly
    has_errors = bool(report.errors)

    if not any([has_network, has_sensitive_reads, has_env_access, has_cpu, has_errors]):
        return ThreatReport(
            severity=Severity.safe,
            behaviors=[],
            summary=f"{package_name} showed no suspicious behavior during sandbox execution",
            explanation="No network calls, file access, environment variable probing, CPU anomalies, or errors detected.",
        )

    response = await client.messages.create(
        model="claude-opus-4-6",
        max_tokens=1024,
        thinking={"type": "adaptive"},
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": prompt}],
        output_config={"format": THREAT_SCHEMA},
    )

    # Extract text from response (thinking blocks come first)
    text = next(
        (block.text for block in response.content if block.type == "text"),
        None,
    )
    if not text:
        raise ValueError("Claude returned no text content")

    data = json.loads(text)
    return ThreatReport(
        severity=Severity(data["severity"]),
        behaviors=data["behaviors"],
        summary=data["summary"],
        explanation=data["explanation"],
    )
