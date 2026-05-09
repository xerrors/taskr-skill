from __future__ import annotations

import argparse
import sys
from pathlib import Path

from taskr import __version__
from taskr.protocol import (
    TaskrError,
    add_note,
    complete_task,
    create_task,
    find_repo_root,
    init_protocol,
    install_claude_skill,
    list_tasks,
    load_task_by_id,
    set_status,
    validate,
)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="taskr",
        description="Repo-local task protocol for AI-assisted software development.",
    )
    parser.add_argument("--version", action="version", version=f"taskr {__version__}")

    subparsers = parser.add_subparsers(dest="command", required=True)

    init_parser = subparsers.add_parser("init", help="Initialize .taskr/ in this repo.")
    init_parser.add_argument("--force", action="store_true", help="Overwrite protocol files.")

    install_parser = subparsers.add_parser("install-skill", help="Install a Taskr agent skill.")
    install_parser.add_argument("target", choices=["claude"], help="Skill target to install.")
    install_parser.add_argument(
        "--scope",
        choices=["project", "user"],
        default="project",
        help="Install to this repo or the current user profile.",
    )
    install_parser.add_argument("--force", action="store_true", help="Overwrite an existing skill.")

    new_parser = subparsers.add_parser("new", help="Create a task file.")
    new_parser.add_argument("title", help="Task title or request.")
    new_parser.add_argument("--id", dest="task_id", help="Explicit lower-kebab-case task id.")
    new_parser.add_argument(
        "--status",
        choices=["planned", "in_progress"],
        default="planned",
        help="Initial task status.",
    )
    new_parser.add_argument("--request", help="Original request text. Defaults to title.")

    list_parser = subparsers.add_parser("list", help="List tasks.")
    list_parser.add_argument(
        "--status",
        choices=["planned", "in_progress", "blocked", "implemented", "closed"],
        help="Only show tasks with this status.",
    )

    show_parser = subparsers.add_parser("show", help="Print a task file.")
    show_parser.add_argument("task_id", help="Task id.")

    validate_parser = subparsers.add_parser("validate", help="Validate Taskr task files.")
    validate_parser.add_argument("task_id", nargs="?", help="Optional task id.")

    status_parser = subparsers.add_parser("status", help="Update a task status.")
    status_parser.add_argument("task_id", help="Task id.")
    status_parser.add_argument(
        "status",
        choices=["planned", "in_progress", "blocked", "implemented", "closed"],
        help="New status.",
    )

    note_parser = subparsers.add_parser("note", help="Append an agent note to a task.")
    note_parser.add_argument("task_id", help="Task id.")
    note_parser.add_argument("note", help="Note text.")

    complete_parser = subparsers.add_parser("complete", help="Mark a task implemented.")
    complete_parser.add_argument("task_id", help="Task id.")
    complete_parser.add_argument("--summary", required=True, help="Completion summary.")
    complete_parser.add_argument("--commit", action="append", default=[], help="Commit hash.")
    complete_parser.add_argument(
        "--commit-status",
        choices=["created", "not_created", "not_applicable"],
        help="Explicit commit status. Defaults to created when commits are supplied, otherwise not_created.",
    )
    complete_parser.add_argument("--file", action="append", default=[], help="Related file path.")
    complete_parser.add_argument("--test", action="append", default=[], help="Verification command run.")
    complete_parser.add_argument("--result", help="Verification result, such as passed or not_run.")
    complete_parser.add_argument(
        "--check-criteria",
        action="store_true",
        help="Mark all unchecked Acceptance Criteria items as checked.",
    )

    return parser


def relative(path: Path, root: Path) -> str:
    try:
        return str(path.relative_to(root))
    except ValueError:
        return str(path)


def run(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    repo_root = find_repo_root()

    try:
        if args.command == "init":
            changed = init_protocol(repo_root, force=args.force)
            if changed:
                for path in changed:
                    print(f"created {relative(path, repo_root)}")
            else:
                print(".taskr/ already initialized")
            return 0

        if args.command == "install-skill":
            target = install_claude_skill(repo_root, scope=args.scope, force=args.force)
            print(f"installed {relative(target, repo_root) if args.scope == 'project' else target}")
            return 0

        if args.command == "new":
            path = create_task(
                repo_root,
                args.title,
                task_id=args.task_id,
                status=args.status,
                request=args.request,
            )
            print(f"created {relative(path, repo_root)}")
            return 0

        if args.command == "list":
            tasks = list_tasks(repo_root)
            if args.status:
                tasks = [task for task in tasks if task.status == args.status]
            if not tasks:
                print("No tasks found.")
                return 0
            width = max(len(task.id) for task in tasks)
            for task in tasks:
                print(f"{task.id:<{width}}  {task.status:<11}  {task.title}")
            return 0

        if args.command == "show":
            task = load_task_by_id(repo_root, args.task_id)
            print(task.path.read_text(encoding="utf-8"), end="")
            return 0

        if args.command == "validate":
            issues = validate(repo_root, args.task_id)
            if not issues:
                print("Taskr validation passed.")
                return 0
            for issue in issues:
                print(f"{relative(issue.path, repo_root)}: {issue.message}", file=sys.stderr)
            return 1

        if args.command == "status":
            task = set_status(repo_root, args.task_id, args.status)
            print(f"updated {relative(task.path, repo_root)}")
            return 0

        if args.command == "note":
            task = add_note(repo_root, args.task_id, args.note)
            print(f"updated {relative(task.path, repo_root)}")
            return 0

        if args.command == "complete":
            task = complete_task(
                repo_root,
                args.task_id,
                summary=args.summary,
                commits=args.commit,
                related_files=args.file,
                tests_run=args.test,
                verification_result=args.result,
                commit_status=args.commit_status,
                check_criteria=args.check_criteria,
            )
            print(f"updated {relative(task.path, repo_root)}")
            return 0

    except TaskrError as exc:
        print(f"taskr: {exc}", file=sys.stderr)
        return 1

    parser.error(f"Unknown command: {args.command}")
    return 2


def main() -> None:
    raise SystemExit(run())


if __name__ == "__main__":
    main()
