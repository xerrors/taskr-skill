from pathlib import Path

from taskr.protocol import (
    complete_task,
    create_task,
    init_protocol,
    load_task,
    slugify,
    task_path,
    validate,
)


def test_slugify_uses_kebab_case_for_ascii() -> None:
    assert slugify("Implement user invitation flow") == "implement-user-invitation-flow"


def test_slugify_falls_back_for_non_ascii() -> None:
    assert slugify("实现用户邀请功能").startswith("task-")


def test_create_task_renders_valid_planned_task(tmp_path: Path) -> None:
    init_protocol(tmp_path)

    path = create_task(tmp_path, "Implement user invitation flow", status="in_progress")
    document = load_task(path)

    assert path == tmp_path / ".taskr/tasks/implement-user-invitation-flow.md"
    assert document.metadata["id"] == "implement-user-invitation-flow"
    assert document.metadata["schema_version"] == 1
    assert document.metadata["status"] == "in_progress"
    assert "## Acceptance Criteria" in document.body
    assert validate(tmp_path) == []


def test_validate_implemented_task_requires_summary_and_files(tmp_path: Path) -> None:
    init_protocol(tmp_path)
    create_task(tmp_path, "Implement billing webhook")

    path = task_path(tmp_path, "implement-billing-webhook")
    content = path.read_text(encoding="utf-8")
    content = content.replace("status: planned", "status: implemented")
    path.write_text(content, encoding="utf-8")

    issues = validate(tmp_path, "implement-billing-webhook")
    messages = [issue.message for issue in issues]

    assert "`implemented` tasks need a Completion Summary." in messages
    assert "`implemented` tasks need `related_files` or `no_related_files_reason`." in messages


def test_complete_task_can_produce_valid_implemented_task(tmp_path: Path) -> None:
    init_protocol(tmp_path)
    create_task(tmp_path, "Implement billing webhook")

    complete_task(
        tmp_path,
        "implement-billing-webhook",
        summary="Implemented the billing webhook handler.",
        related_files=["src/billing.py"],
        tests_run=["pytest tests/test_billing.py"],
        verification_result="passed",
        check_criteria=True,
    )

    assert validate(tmp_path, "implement-billing-webhook") == []

