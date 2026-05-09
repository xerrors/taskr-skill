from __future__ import annotations

import hashlib
import json
import re
import shutil
import subprocess
from dataclasses import dataclass
from datetime import datetime
from importlib import resources
from pathlib import Path
from typing import Any
from unicodedata import normalize

import yaml


TASKR_DIR = ".taskr"
TASKS_DIR = "tasks"
TEMPLATES_DIR = "templates"
TASK_TEMPLATE = "task.md"

SCHEMA_VERSION = 1
VALID_STATUSES = ("planned", "in_progress", "blocked", "implemented", "closed")
VALID_COMMIT_STATUSES = ("created", "not_created", "not_applicable")
REQUIRED_SECTIONS = (
    "Request",
    "Acceptance Criteria",
    "Implementation Plan",
    "Progress Log",
    "Agent Notes",
    "Completion Summary",
)

SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
FRONTMATTER_RE = re.compile(r"^---\n(.*?)\n---\n?", re.DOTALL)
SECTION_RE = re.compile(r"^## ([^\n]+)\n?", re.MULTILINE)


class TaskrError(RuntimeError):
    """Raised when a Taskr operation cannot be completed."""


@dataclass(frozen=True)
class ValidationIssue:
    path: Path
    message: str


@dataclass
class TaskDocument:
    path: Path
    metadata: dict[str, Any]
    body: str

    @property
    def id(self) -> str:
        return str(self.metadata.get("id", self.path.stem))

    @property
    def title(self) -> str:
        return str(self.metadata.get("title", self.id))

    @property
    def status(self) -> str:
        return str(self.metadata.get("status", ""))


def find_repo_root(start: Path | None = None) -> Path:
    """Return the Git root when available, otherwise the current directory."""
    cwd = (start or Path.cwd()).resolve()
    try:
        result = subprocess.run(
            ["git", "rev-parse", "--show-toplevel"],
            cwd=cwd,
            check=True,
            capture_output=True,
            text=True,
        )
    except (FileNotFoundError, subprocess.CalledProcessError):
        return cwd
    return Path(result.stdout.strip()).resolve()


def taskr_root(repo_root: Path) -> Path:
    return repo_root / TASKR_DIR


def tasks_root(repo_root: Path) -> Path:
    return taskr_root(repo_root) / TASKS_DIR


def now_iso() -> str:
    return datetime.now().astimezone().replace(microsecond=0).isoformat()


def log_timestamp() -> str:
    dt = datetime.now().astimezone().replace(microsecond=0)
    offset = dt.strftime("%z")
    if offset:
        offset = f"{offset[:3]}:{offset[3:]}"
    return dt.strftime("%Y-%m-%d %H:%M ") + offset


def slugify(value: str) -> str:
    ascii_text = normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", ascii_text).lower().strip("-")
    slug = re.sub(r"-{2,}", "-", slug)
    if slug:
        return slug
    digest = hashlib.sha1(value.encode("utf-8")).hexdigest()[:8]
    return f"task-{digest}"


def ensure_unique_task_id(repo_root: Path, desired: str) -> str:
    base = slugify(desired)
    candidate = base
    index = 2
    while (tasks_root(repo_root) / f"{candidate}.md").exists():
        candidate = f"{base}-{index}"
        index += 1
    return candidate


def default_config() -> dict[str, Any]:
    return {
        "version": SCHEMA_VERSION,
        "tasks_dir": ".taskr/tasks",
        "id": {
            "style": "kebab-case",
            "generated_by": "agent",
        },
        "statuses": list(VALID_STATUSES),
        "commit": {
            "required_for_implemented": False,
            "convention": "[taskr:{id}]",
        },
        "agent": {
            "preferred_update_method": "cli_or_direct_file",
            "default_status_after_code_change": "implemented",
            "require_completion_summary": True,
            "require_related_files": True,
        },
    }


def default_schema() -> dict[str, Any]:
    return {
        "schema_version": SCHEMA_VERSION,
        "task_frontmatter": {
            "required": [
                "schema_version",
                "id",
                "title",
                "status",
                "created_at",
                "updated_at",
                "branch",
                "commits",
                "commit_status",
                "related_files",
                "verification",
            ],
            "statuses": list(VALID_STATUSES),
            "commit_statuses": list(VALID_COMMIT_STATUSES),
        },
        "task_sections": list(REQUIRED_SECTIONS),
    }


def task_template_placeholder() -> str:
    return """---
schema_version: 1
id: example-task
title: Example task
status: planned
created_at: 2026-05-09T14:30:00+08:00
updated_at: 2026-05-09T14:30:00+08:00
branch: null
commits: []
commit_status: not_created
related_files: []
verification:
  tests_run: []
  result: not_run
  reason: Not run yet.
---

# Example task

## Request

Describe the original user request.

## Acceptance Criteria

- [ ] Define concrete completion criteria.

## Implementation Plan

- [ ] Inspect the relevant code.
- [ ] Implement the smallest useful change.
- [ ] Validate the result.

## Progress Log

- 2026-05-09 14:30 +08:00 - Task created.

## Agent Notes

Empty.

## Completion Summary

Empty.
"""


def init_protocol(repo_root: Path, force: bool = False) -> list[Path]:
    root = taskr_root(repo_root)
    created_or_updated: list[Path] = []
    (root / TASKS_DIR).mkdir(parents=True, exist_ok=True)
    (root / TEMPLATES_DIR).mkdir(parents=True, exist_ok=True)

    files: dict[Path, str] = {
        root / "config.yaml": dump_yaml(default_config()),
        root / "schema.yaml": dump_yaml(default_schema()),
        root / TEMPLATES_DIR / TASK_TEMPLATE: task_template_placeholder(),
        root / "index.json": json.dumps(
            {"version": SCHEMA_VERSION, "generated_at": now_iso(), "tasks": []},
            indent=2,
        )
        + "\n",
    }

    for path, content in files.items():
        if path.exists() and not force:
            continue
        path.write_text(content, encoding="utf-8")
        created_or_updated.append(path)

    return created_or_updated


def dump_yaml(data: dict[str, Any]) -> str:
    return yaml.safe_dump(data, sort_keys=False, allow_unicode=True)


def render_task(
    *,
    task_id: str,
    title: str,
    request: str,
    status: str = "planned",
) -> str:
    if status not in VALID_STATUSES:
        raise TaskrError(f"Invalid status: {status}")

    timestamp = now_iso()
    metadata = {
        "schema_version": SCHEMA_VERSION,
        "id": task_id,
        "title": title,
        "status": status,
        "created_at": timestamp,
        "updated_at": timestamp,
        "branch": None,
        "commits": [],
        "commit_status": "not_created",
        "related_files": [],
        "verification": {
            "tests_run": [],
            "result": "not_run",
            "reason": "Not run yet.",
        },
    }
    created_line = f"- {log_timestamp()} - Task created."
    return f"""---
{dump_yaml(metadata)}---

# {title}

## Request

{request.strip() or title}

## Acceptance Criteria

- [ ] Confirm the requested behavior is implemented.
- [ ] Update or add focused validation where practical.
- [ ] Summarize changed files and any verification performed.

## Implementation Plan

- [ ] Inspect the relevant code and existing patterns.
- [ ] Implement the smallest useful change.
- [ ] Run appropriate validation or record why it was not run.
- [ ] Update this task with progress, related files, and completion notes.

## Progress Log

{created_line}

## Agent Notes

Empty.

## Completion Summary

Empty.
"""


def create_task(
    repo_root: Path,
    title: str,
    *,
    task_id: str | None = None,
    status: str = "planned",
    request: str | None = None,
) -> Path:
    root = taskr_root(repo_root)
    if not root.exists():
        raise TaskrError("Taskr is not initialized. Run `taskr init` first.")
    if task_id is not None and not SLUG_RE.match(task_id):
        raise TaskrError("Task id must use lower-kebab-case.")

    resolved_id = task_id or ensure_unique_task_id(repo_root, title)
    path = tasks_root(repo_root) / f"{resolved_id}.md"
    if path.exists():
        raise TaskrError(f"Task already exists: {resolved_id}")
    path.write_text(
        render_task(
            task_id=resolved_id,
            title=title,
            request=request or title,
            status=status,
        ),
        encoding="utf-8",
    )
    return path


def split_frontmatter(content: str) -> tuple[dict[str, Any], str]:
    match = FRONTMATTER_RE.match(content)
    if not match:
        raise TaskrError("Task file is missing YAML frontmatter.")
    frontmatter_text = match.group(1)
    try:
        metadata = yaml.safe_load(frontmatter_text) or {}
    except yaml.YAMLError as exc:
        raise TaskrError(f"Invalid YAML frontmatter: {exc}") from exc
    if not isinstance(metadata, dict):
        raise TaskrError("Frontmatter must be a YAML mapping.")
    return metadata, content[match.end() :]


def render_document(metadata: dict[str, Any], body: str) -> str:
    return f"---\n{dump_yaml(metadata)}---\n\n{body.lstrip()}"


def load_task(path: Path) -> TaskDocument:
    metadata, body = split_frontmatter(path.read_text(encoding="utf-8"))
    return TaskDocument(path=path, metadata=metadata, body=body)


def task_path(repo_root: Path, task_id: str) -> Path:
    return tasks_root(repo_root) / f"{task_id}.md"


def load_task_by_id(repo_root: Path, task_id: str) -> TaskDocument:
    path = task_path(repo_root, task_id)
    if not path.exists():
        raise TaskrError(f"Task not found: {task_id}")
    return load_task(path)


def write_task(document: TaskDocument) -> None:
    document.metadata["updated_at"] = now_iso()
    document.path.write_text(
        render_document(document.metadata, document.body),
        encoding="utf-8",
    )


def list_tasks(repo_root: Path) -> list[TaskDocument]:
    root = tasks_root(repo_root)
    if not root.exists():
        return []
    tasks: list[TaskDocument] = []
    for path in sorted(root.glob("*.md")):
        tasks.append(load_task(path))
    return sorted(tasks, key=lambda item: str(item.metadata.get("updated_at", "")), reverse=True)


def extract_sections(body: str) -> dict[str, str]:
    matches = list(SECTION_RE.finditer(body))
    sections: dict[str, str] = {}
    for index, match in enumerate(matches):
        title = match.group(1).strip()
        start = match.end()
        end = matches[index + 1].start() if index + 1 < len(matches) else len(body)
        sections[title] = body[start:end].strip()
    return sections


def replace_section(body: str, section: str, content: str) -> str:
    matches = list(SECTION_RE.finditer(body))
    for index, match in enumerate(matches):
        if match.group(1).strip() != section:
            continue
        start = match.end()
        end = matches[index + 1].start() if index + 1 < len(matches) else len(body)
        replacement = f"\n{content.strip()}\n\n"
        return body[:start] + replacement + body[end:]
    raise TaskrError(f"Task is missing section: {section}")


def append_to_section(body: str, section: str, line: str) -> str:
    sections = extract_sections(body)
    current = sections.get(section, "").strip()
    if current == "Empty.":
        current = ""
    content = f"{current}\n{line}".strip()
    return replace_section(body, section, content)


def set_status(repo_root: Path, task_id: str, status: str) -> TaskDocument:
    if status not in VALID_STATUSES:
        raise TaskrError(f"Invalid status: {status}")
    document = load_task_by_id(repo_root, task_id)
    document.metadata["status"] = status
    document.body = append_to_section(
        document.body,
        "Progress Log",
        f"- {log_timestamp()} - Status changed to `{status}`.",
    )
    write_task(document)
    return document


def add_note(repo_root: Path, task_id: str, note: str) -> TaskDocument:
    document = load_task_by_id(repo_root, task_id)
    document.body = append_to_section(document.body, "Agent Notes", f"- {note.strip()}")
    document.body = append_to_section(
        document.body,
        "Progress Log",
        f"- {log_timestamp()} - Added agent note.",
    )
    write_task(document)
    return document


def complete_task(
    repo_root: Path,
    task_id: str,
    *,
    summary: str,
    commits: list[str] | None = None,
    related_files: list[str] | None = None,
    tests_run: list[str] | None = None,
    verification_result: str | None = None,
    commit_status: str | None = None,
    check_criteria: bool = False,
) -> TaskDocument:
    if commit_status is not None and commit_status not in VALID_COMMIT_STATUSES:
        raise TaskrError(f"Invalid commit status: {commit_status}")

    document = load_task_by_id(repo_root, task_id)
    commit_list = list(dict.fromkeys(commits or []))
    file_list = list(dict.fromkeys(related_files or []))

    existing_commits = document.metadata.get("commits") or []
    existing_files = document.metadata.get("related_files") or []
    document.metadata["commits"] = list(dict.fromkeys([*existing_commits, *commit_list]))
    document.metadata["commit_status"] = (
        commit_status or ("created" if document.metadata["commits"] else "not_created")
    )
    document.metadata["related_files"] = list(dict.fromkeys([*existing_files, *file_list]))
    document.metadata["status"] = "implemented"
    if tests_run is not None or verification_result is not None:
        document.metadata["verification"] = {
            "tests_run": tests_run or [],
            "result": verification_result or ("not_run" if not tests_run else "recorded"),
        }
    if check_criteria:
        sections = extract_sections(document.body)
        criteria = sections.get("Acceptance Criteria")
        if criteria is None:
            raise TaskrError("Task is missing section: Acceptance Criteria")
        checked = re.sub(r"- \[ \]", "- [x]", criteria)
        document.body = replace_section(document.body, "Acceptance Criteria", checked)
    document.body = replace_section(document.body, "Completion Summary", summary)
    document.body = append_to_section(
        document.body,
        "Progress Log",
        f"- {log_timestamp()} - Marked implemented.",
    )
    write_task(document)
    return document


def validate_task_file(path: Path) -> list[ValidationIssue]:
    issues: list[ValidationIssue] = []
    if not path.exists():
        return [ValidationIssue(path, "Task file does not exist.")]
    try:
        document = load_task(path)
    except TaskrError as exc:
        return [ValidationIssue(path, str(exc))]

    metadata = document.metadata
    for key in default_schema()["task_frontmatter"]["required"]:
        if key not in metadata:
            issues.append(ValidationIssue(path, f"Missing frontmatter field `{key}`."))

    task_id = str(metadata.get("id", ""))
    if not task_id or not SLUG_RE.match(task_id):
        issues.append(ValidationIssue(path, "`id` must use lower-kebab-case."))
    elif path.stem != task_id:
        issues.append(ValidationIssue(path, f"Filename must match id `{task_id}`."))

    status = metadata.get("status")
    if status not in VALID_STATUSES:
        issues.append(ValidationIssue(path, f"`status` must be one of {', '.join(VALID_STATUSES)}."))

    commit_status = metadata.get("commit_status")
    if commit_status not in VALID_COMMIT_STATUSES:
        issues.append(
            ValidationIssue(
                path,
                f"`commit_status` must be one of {', '.join(VALID_COMMIT_STATUSES)}.",
            )
        )

    if not isinstance(metadata.get("commits", []), list):
        issues.append(ValidationIssue(path, "`commits` must be a list."))
    if not isinstance(metadata.get("related_files", []), list):
        issues.append(ValidationIssue(path, "`related_files` must be a list."))

    sections = extract_sections(document.body)
    for section in REQUIRED_SECTIONS:
        if section not in sections:
            issues.append(ValidationIssue(path, f"Missing section `## {section}`."))

    if status == "implemented":
        summary = sections.get("Completion Summary", "").strip()
        if summary in {"", "Empty."}:
            issues.append(ValidationIssue(path, "`implemented` tasks need a Completion Summary."))

        commits = metadata.get("commits") or []
        if commit_status == "created" and not commits:
            issues.append(ValidationIssue(path, "`commit_status: created` requires at least one commit."))

        related_files = metadata.get("related_files") or []
        no_files_reason = metadata.get("no_related_files_reason")
        if not related_files and not no_files_reason:
            issues.append(
                ValidationIssue(
                    path,
                    "`implemented` tasks need `related_files` or `no_related_files_reason`.",
                )
            )

        criteria = sections.get("Acceptance Criteria", "")
        checkbox_matches = re.findall(r"- \[([ xX])\]", criteria)
        if not checkbox_matches:
            issues.append(ValidationIssue(path, "Acceptance Criteria must include checklist items."))
        elif not any(value.lower() == "x" for value in checkbox_matches):
            issues.append(
                ValidationIssue(
                    path,
                    "`implemented` tasks should mark checked Acceptance Criteria.",
                )
            )

    return issues


def validate(repo_root: Path, task_id: str | None = None) -> list[ValidationIssue]:
    if task_id:
        return validate_task_file(task_path(repo_root, task_id))

    root = tasks_root(repo_root)
    if not root.exists():
        return [ValidationIssue(root, "Taskr is not initialized. Run `taskr init` first.")]

    issues: list[ValidationIssue] = []
    task_files = sorted(root.glob("*.md"))
    if not task_files:
        return issues
    for path in task_files:
        issues.extend(validate_task_file(path))
    return issues


def install_claude_skill(repo_root: Path, *, scope: str = "project", force: bool = False) -> Path:
    if scope not in {"project", "user"}:
        raise TaskrError("Skill scope must be `project` or `user`.")

    if scope == "project":
        destination = repo_root / ".claude" / "skills" / "taskr"
    else:
        destination = Path.home() / ".claude" / "skills" / "taskr"

    destination.mkdir(parents=True, exist_ok=True)
    target = destination / "SKILL.md"
    if target.exists() and not force:
        raise TaskrError(f"Skill already exists: {target}. Use --force to replace it.")

    source = resources.files("taskr").joinpath("resources/claude/skills/taskr/SKILL.md")
    with resources.as_file(source) as source_path:
        shutil.copyfile(source_path, target)
    return target
