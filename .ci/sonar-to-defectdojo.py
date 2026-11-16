#!/usr/bin/env python3
"""Export the open SonarQube issues of a project as a DefectDojo
"Generic Findings Import" JSON file.

Usage: sonar-to-defectdojo.py PROJECT_KEY OUTPUT_FILE
Reads SONAR_URL and SONAR_TOKEN from the environment.
"""
import base64
import json
import os
import sys
import urllib.parse
import urllib.request

PAGE_SIZE = 500
# SonarQube refuses to page beyond 10,000 results
MAX_RESULTS = 10000

SEVERITIES = {
    "BLOCKER": "Critical",
    "CRITICAL": "High",
    "MAJOR": "Medium",
    "MINOR": "Low",
    "INFO": "Info",
}


def fetch_issues(base_url, token, project_key):
    auth = base64.b64encode(f"{token}:".encode()).decode()
    issues, components, page = [], {}, 1
    while True:
        query = urllib.parse.urlencode({
            "componentKeys": project_key,
            "resolved": "false",
            "ps": PAGE_SIZE,
            "p": page,
        })
        request = urllib.request.Request(
            f"{base_url.rstrip('/')}/api/issues/search?{query}",
            headers={"Authorization": f"Basic {auth}"},
        )
        with urllib.request.urlopen(request, timeout=60) as response:
            data = json.load(response)
        issues.extend(data.get("issues", []))
        for component in data.get("components", []):
            components[component["key"]] = component
        total = data.get("paging", {}).get("total", data.get("total", 0))
        if page * PAGE_SIZE >= min(total, MAX_RESULTS):
            return issues, components
        page += 1


def to_finding(issue, components, project_key):
    component = components.get(issue.get("component"), {})
    file_path = component.get("path") or issue.get("component", "").removeprefix(f"{project_key}:")
    issue_type = issue.get("type", "CODE_SMELL")
    rule = issue.get("rule", "")
    return {
        "title": f"{issue.get('message', rule)}"[:500],
        "description": "\n".join([
            f"**Rule:** {rule}",
            f"**Type:** {issue_type}",
            f"**SonarQube severity:** {issue.get('severity', 'INFO')}",
            f"**Issue:** {issue.get('key', '')}",
            "",
            issue.get("message", ""),
        ]),
        "severity": SEVERITIES.get(issue.get("severity"), "Info"),
        "file_path": file_path,
        "line": issue.get("line"),
        "vuln_id_from_tool": rule,
        "unique_id_from_tool": issue.get("key"),
        "static_finding": True,
        "dynamic_finding": False,
        "tags": [issue_type.lower().replace("_", "-"), *issue.get("tags", [])],
    }


def convert(issues, components, project_key):
    return {"findings": [to_finding(i, components, project_key) for i in issues]}


def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    project_key, output = sys.argv[1], sys.argv[2]
    issues, components = fetch_issues(os.environ["SONAR_URL"], os.environ.get("SONAR_TOKEN") or os.environ["SONAR_AUTH_TOKEN"], project_key)
    report = convert(issues, components, project_key)
    with open(output, "w", encoding="utf-8") as handle:
        json.dump(report, handle, indent=2)
    print(f"SonarQube : {len(report['findings'])} alerte(s) ouverte(s) exportée(s)")


if __name__ == "__main__":
    main()
