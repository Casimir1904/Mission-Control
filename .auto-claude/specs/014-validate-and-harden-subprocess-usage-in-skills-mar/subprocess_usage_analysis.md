# Subprocess Usage Analysis: skills_marketplace.py

## Overview

This document analyzes all subprocess usage in `backend/app/api/skills_marketplace.py` for security audit purposes.

## File Location
- `backend/app/api/skills_marketplace.py`

## Subprocess Calls Summary

There are **3 subprocess.run() calls** in the file, all contained within the `_clone_pack_and_collect_skills()` function (lines 591-681).

---

## Call 1: Primary git clone (lines 613-629)

### Code
```python
subprocess.run(
    [
        "git",
        "clone",
        "--depth",
        "1",
        "--single-branch",
        "--branch",
        requested_branch,  # <-- USER INPUT (normalized)
        source_url,        # <-- USER INPUT (validated)
        str(repo_dir),
    ],
    check=True,
    capture_output=True,
    text=True,
    timeout=GIT_CLONE_TIMEOUT_SECONDS,
)
```

### Input Parameters
| Parameter | Source | Validation/Normalization | Risk Level |
|-----------|--------|-------------------------|------------|
| `source_url` | Function parameter | `_validate_pack_source_url()` at line 604 | Medium - validated but passed as string |
| `requested_branch` | `_normalize_pack_branch(branch)` at line 606 | Regex validation: `^[A-Za-z0-9._/\-]+$` | Low - sanitized |
| `repo_dir` | `TemporaryDirectory` path | N/A (system generated) | None |

### Error Handling
- `FileNotFoundError`: Maps to "git binary not available on the server"
- `subprocess.TimeoutExpired`: Maps to "timed out cloning pack repository"
- `subprocess.CalledProcessError`: Falls through to fallback clone or error

---

## Call 2: Fallback git clone (lines 637-643)

### Code
```python
subprocess.run(
    ["git", "clone", "--depth", "1", source_url, str(repo_dir)],
    check=True,
    capture_output=True,
    text=True,
    timeout=GIT_CLONE_TIMEOUT_SECONDS,
)
```

### Input Parameters
| Parameter | Source | Validation/Normalization | Risk Level |
|-----------|--------|-------------------------|------------|
| `source_url` | Function parameter | Already validated at line 604 | Medium - validated but passed as string |
| `repo_dir` | `TemporaryDirectory` path | N/A (system generated) | None |

### Trigger Condition
Only executed when:
1. Primary clone fails with `CalledProcessError`
2. `requested_branch != "main"`

### Error Handling
Catches `FileNotFoundError`, `subprocess.TimeoutExpired`, `subprocess.CalledProcessError` and raises RuntimeError.

---

## Call 3: git rev-parse (lines 663-669)

### Code
```python
discovered_branch = subprocess.run(
    ["git", "-C", str(repo_dir), "rev-parse", "--abbrev-ref", "HEAD"],
    check=True,
    capture_output=True,
    text=True,
    timeout=GIT_REV_PARSE_TIMEOUT_SECONDS,
).stdout.strip()
```

### Input Parameters
| Parameter | Source | Validation/Normalization | Risk Level |
|-----------|--------|-------------------------|------------|
| `repo_dir` | `TemporaryDirectory` path | N/A (system generated) | None |

### Notes
- No user input in this call
- Used to discover the actual branch name that was cloned
- Fallback to `used_branch or "main"` on any error

---

## Validation Functions

### `_validate_pack_source_url(source_url: str)` (line 169)

**Validations performed:**
1. Scheme must be "https" (lowercase check)
2. Hostname must exist
3. Blocks "localhost" explicitly
4. **Must be "github.com" only** (strict allowlist)
5. Path must contain at least one "/" (owner/repo format)

**Raises:** `ValueError` with descriptive message on validation failure

### `_normalize_pack_branch(raw_branch: str | None)` (line 59)

**Normalizations performed:**
1. Returns "main" if `None` or empty/whitespace-only
2. Strips whitespace
3. Returns "main" if contains newline, carriage return, or tab
4. Regex validation: `^[A-Za-z0-9._/\-]+$`
5. Returns "main" if regex fails

**Returns:** Sanitized branch name (falls back to "main" on any issue)

---

## Security Observations

### Positive Controls
1. **List-based arguments**: All subprocess calls use list format, not shell string format
2. **URL validation**: Strict allowlist to github.com only with https scheme
3. **Branch sanitization**: Regex whitelist prevents injection via branch names
4. **Timeout protection**: All git operations have timeouts (30s clone, 10s rev-parse)
5. **Temporary directory**: Uses `TemporaryDirectory` context manager for cleanup
6. **Defense in depth**: Validation at both entry point and point of use

### Potential Concerns
1. **Source URL passed directly**: While validated, the URL string is still passed directly to git subprocess
2. **No additional URL encoding**: After validation, URL is passed as-is
3. **Git CLI parsing**: Relies on git's argument parsing (list format helps but git has its own quirks)

---

## Dependencies

- `GIT_CLONE_TIMEOUT_SECONDS = 30` (line 54)
- `GIT_REV_PARSE_TIMEOUT_SECONDS = 10` (line 55)
- `BRANCH_NAME_ALLOWED_RE = r"^[A-Za-z0-9._/\-]+$"` (line 56)
- `ALLOWED_PACK_SOURCE_SCHEMES = {"https"}` (line 53)

---

## Function Context

All subprocess calls are within `_clone_pack_and_collect_skills()`:
- **Called by:** `sync_skill_pack()` endpoint (line 1186)
- **Purpose:** Clone a skill pack repository and discover skills within it
- **Called with:** `source_url` and `branch` from user-provided payload

---

*Generated for subtask-1-1: Security Analysis*
