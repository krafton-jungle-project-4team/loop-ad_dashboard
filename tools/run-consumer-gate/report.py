"""Strict consumer evidence validation; never turn absent execution into PASS."""
import hashlib
import json
from pathlib import Path, PurePosixPath
import xml.etree.ElementTree as ET

HERE = Path(__file__).resolve().parent
CASES = json.loads((HERE / 'cases.json').read_text())
REQUIRED = {f'{group}/{name}' for group, names in CASES.items() for name in names}
assert set(CASES) == {f'RCC-{i:02}' for i in range(1, 7)} and len(REQUIRED) == 34


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def safe_file(root, name):
    relative = PurePosixPath(name)
    assert not relative.is_absolute() and '..' not in relative.parts and relative.as_posix() == name
    path = Path(root)
    assert not path.is_symlink()
    for part in relative.parts:
        path = path / part
        assert not path.is_symlink(), 'symlink refused'
    assert path.is_file(), f'missing artifact: {name}'
    return path


def validate_lane(root, expected_input):
    root = Path(root)
    result = json.loads(safe_file(root, 'result.json').read_text())
    assert result['schema_version'] == 'rcc-consumer.v1'
    assert result['lane'] == expected_input['lane']
    assert result['input'] == expected_input, 'consumer input provenance differs'
    assert result['cleanup_ok'] is True, 'replay server cleanup unverified'
    entries = result['cases']
    ids = [entry['id'] for entry in entries]
    assert len(ids) == len(REQUIRED) and set(ids) == REQUIRED, 'missing/duplicate/zero cases'
    outcomes = {}
    for entry in entries:
        assert entry['outcome'] in ('passed', 'failed'), 'skip/unknown outcome'
        evidence_path = safe_file(root, entry['evidence_file'])
        assert digest(evidence_path) == entry['evidence_sha256'], 'evidence digest differs'
        evidence = json.loads(evidence_path.read_text())
        assert evidence['id'] == entry['id'] and evidence['lane'] == result['lane']
        assert evidence['outcome'] == entry['outcome']
        if evidence['derived_body_file']:
            assert digest(safe_file(root, evidence['derived_body_file'])) == evidence['replay_body_sha256']
        else:
            assert evidence['replay_body_sha256'] == evidence['parent_body_sha256']
        assert len(evidence['requests']) == 1, 'actual HTTP client call missing'
        if entry['outcome'] == 'passed' and entry['id'].startswith(('RCC-04/', 'RCC-05/')):
            assert evidence['calls'] == [] and evidence['rejected_at'] in ('client', 'launch')
        outcomes[entry['id']] = entry['outcome']
    junit = ET.parse(safe_file(root, 'junit.xml')).getroot()
    assert junit.tag == 'testsuite'
    junit_cases = list(junit)
    assert len(junit_cases) == len(REQUIRED) and {case.get('name') for case in junit_cases} == REQUIRED
    failed = sum(value == 'failed' for value in outcomes.values())
    for field, number in [('tests', len(REQUIRED)), ('failures', failed), ('errors', 0), ('skipped', 0)]:
        assert int(junit.get(field, '-1')) == number, 'JUnit counts disagree'
    for case in junit_cases:
        assert case.tag == 'testcase' and all(child.tag == 'failure' for child in case)
        assert len(case) == (1 if outcomes[case.get('name')] == 'failed' else 0), 'JUnit outcome differs'
    status = 'FAIL' if failed else 'PASS'
    assert result['status'] == status, 'forged consumer verdict'
    return {'status': status, 'cases': len(REQUIRED), 'failed': failed, 'cleanup_ok': True}


def verdict(fixed, latest, common_ok):
    if not common_ok or fixed == 'INCOMPLETE':
        return 'INCOMPLETE', 2
    if fixed != 'PASS':
        return 'FAIL', 1
    return 'PASS', 0  # latest is reported separately, never substitutes for fixed.


def write_inventory(root):
    root = Path(root)
    files = {}
    for path in sorted(root.rglob('*')):
        assert not path.is_symlink()
        if path.is_file() and path.name not in ('artifact-manifest.json', 'artifact-manifest.sha256'):
            files[path.relative_to(root).as_posix()] = {'sha256': digest(path), 'bytes': path.stat().st_size}
    (root / 'artifact-manifest.json').write_text(json.dumps(files, indent=2, sort_keys=True) + '\n')
    (root / 'artifact-manifest.sha256').write_text(digest(root / 'artifact-manifest.json') + '\n')


def verify_inventory(root):
    root = Path(root)
    assert digest(safe_file(root, 'artifact-manifest.json')) == safe_file(root, 'artifact-manifest.sha256').read_text().strip()
    files = json.loads((root / 'artifact-manifest.json').read_text())
    actual = set()
    for path in root.rglob('*'):
        assert not path.is_symlink()
        if path.is_file():
            actual.add(path.relative_to(root).as_posix())
    assert actual == set(files) | {'artifact-manifest.json', 'artifact-manifest.sha256'}
    for name, metadata in files.items():
        path = safe_file(root, name)
        assert digest(path) == metadata['sha256'] and path.stat().st_size == metadata['bytes']
    return len(files)


def finalize_report(root, result, cleanup):
    """Publish a verdict only after scratch cleanup, including cleanup failures."""
    try:
        cleanup()
    except OSError as error:
        result.update(status='INCOMPLETE', exit_code=2, cleanup_ok=False, reason=f'scratch cleanup failed: {error}')
    (Path(root) / 'result.json').write_text(json.dumps(result, indent=2, sort_keys=True) + '\n')
    write_inventory(root)
    verify_inventory(root)
