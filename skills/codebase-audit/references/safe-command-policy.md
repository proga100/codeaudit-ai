# Safe Command Policy

This skill runs inside Claude Code, not inside the web app sandbox. Treat this file as the runtime command policy.

## Allowed Command Families

Use read-only inspection commands only:

- filesystem inspection: `find`, `rg`, `grep`, `ls`, `tree`, `file`, `stat`, `du`, `wc`, `sort`, `uniq`
- file excerpts: `sed -n`, `head`, `tail`, `awk`
- git inspection: `git status`, `git log`, `git shortlog`, `git ls-files`, `git remote`, `git branch`, `git rev-parse`, `git diff --stat`
- ecosystem inspection: `npm audit --dry-run` when safe, `npm outdated`, `pnpm outdated`, `pip list`, `pip-audit` if already installed, `cargo audit` if already installed, `composer audit`
- code metrics if installed: `cloc`, `tokei`, `scc`, `jscpd`

## Blocked Operations

Do not run write, delete, install, network, or git-mutating commands during an audit unless the user explicitly changes the task.

Blocked examples:

- delete/write/move: `rm`, `mv`, `cp`, `mkdir`, `touch`, `chmod`, `chown`, shell redirection, `tee`, `sed -i`
- network: `curl`, `wget`, `ssh`, `scp`, `nc`
- package mutation: `npm install`, `npm ci`, `yarn add`, `pnpm add`, `pip install`, `cargo add`, `go get`
- git mutation: `git add`, `git commit`, `git push`, `git merge`, `git rebase`, `git checkout -b`
- destructive flags: `--force`, `--hard`

## Path Boundary

Operate inside the target repo and write reports only to the audit output directory. Do not inspect parent directories, home secrets, global package caches, or unrelated projects.

## Output Discipline

Prefer focused results:

- use `rg -n "pattern" --glob '!node_modules/**' --glob '!vendor/**'`
- use `sed -n 'start,endp' file` for exact excerpts
- avoid `cat` on large files
- truncate broad searches with `head -50`

