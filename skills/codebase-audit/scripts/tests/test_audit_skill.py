from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from audit_skill.findings import group_similar_findings, score
from audit_skill.phases import get_phases_for_audit_type, run_audit
from audit_skill.safe_runner import run_safe_command


class PhaseMappingTest(unittest.TestCase):
    def test_deep_phase_mapping_matches_engine(self) -> None:
        self.assertEqual(get_phases_for_audit_type("full", "deep"), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
        self.assertEqual(get_phases_for_audit_type("security", "deep"), [0, 1, 6, 7, 10, 11])
        self.assertEqual(get_phases_for_audit_type("team-collaboration", "deep"), [0, 1, 5, 10, 11])
        self.assertEqual(get_phases_for_audit_type("code-quality", "deep"), [0, 1, 2, 3, 4, 8, 9, 10, 11])

    def test_quick_skips_deep_phases(self) -> None:
        self.assertEqual(get_phases_for_audit_type("full", "quick"), [0, 1, 2, 3, 4, 5, 8, 9, 10])
        self.assertEqual(get_phases_for_audit_type("security", "quick"), [0, 1, 10])


class SafeRunnerTest(unittest.TestCase):
    def test_blocks_mutating_command(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            result = run_safe_command(Path(tmp), ["rm", "-rf", "."])
            self.assertTrue(result.blocked)

    def test_blocks_path_escape(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            escape_path = str(Path("..") / "secret.txt")
            result = run_safe_command(Path(tmp), ["sed", "-n", "1,10p", escape_path])
            self.assertTrue(result.blocked)

    def test_allows_read_command(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            repo = Path(tmp)
            (repo / "README.md").write_text("hello\n", encoding="utf-8")
            result = run_safe_command(repo, ["sed", "-n", "1,1p", "README.md"])
            self.assertFalse(result.blocked)
            self.assertTrue(result.ok)
            self.assertIn("hello", result.output)


class FindingsTest(unittest.TestCase):
    def test_groups_similar_findings_before_scoring(self) -> None:
        findings = [
            {
                "id": "1",
                "phase": 4,
                "category": "complexity",
                "severity": "medium",
                "title": "Large file: a.py",
                "description": "A",
                "filePaths": ["a.py"],
                "lineNumbers": [],
                "recommendation": "",
            },
            {
                "id": "2",
                "phase": 4,
                "category": "complexity",
                "severity": "high",
                "title": "Large file: b.py",
                "description": "B",
                "filePaths": ["b.py"],
                "lineNumbers": [],
                "recommendation": "",
            },
        ]
        grouped = group_similar_findings(findings)
        self.assertEqual(len(grouped), 1)
        self.assertEqual(grouped[0]["severity"], "high")
        self.assertEqual(score(grouped), 90)


class AuditFlowTest(unittest.TestCase):
    def test_code_quality_quick_flow_excludes_third_party(self) -> None:
        with tempfile.TemporaryDirectory() as repo_tmp, tempfile.TemporaryDirectory() as out_tmp:
            repo = Path(repo_tmp)
            (repo / "src").mkdir()
            (repo / "src" / "app.py").write_text("\n".join(["print(1)"] * 350), encoding="utf-8")
            (repo / "node_modules" / "pkg").mkdir(parents=True)
            (repo / "node_modules" / "pkg" / "index.js").write_text("\n".join(["x=1"] * 2000), encoding="utf-8")

            out = Path(out_tmp)
            run_audit(repo, out, "code-quality", "quick", force=True)

            meta = json.loads((out / "audit_meta.json").read_text(encoding="utf-8"))
            self.assertEqual(meta["phases_requested"], [0, 1, 2, 3, 4, 8, 9, 10])
            self.assertTrue((out / "phase-04.md").exists())
            combined = "\n".join(path.read_text(encoding="utf-8") for path in out.glob("*.md"))
            self.assertNotIn("pkg/index.js", combined)
            self.assertNotIn("2000", combined)
            self.assertIn("src/app.py", combined)


if __name__ == "__main__":
    unittest.main()
