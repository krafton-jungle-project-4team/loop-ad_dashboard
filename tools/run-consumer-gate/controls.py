"""Negative controls mutate copies of real successful execution, never production."""
import json
from pathlib import Path
import shutil
import tempfile
import xml.etree.ElementTree as ET
from report import validate_lane, verdict

MUTATIONS = ('missing-result', 'zero-cases', 'missing-case', 'duplicate-case', 'skip',
             'wrong-lane', 'wrong-producer', 'wrong-manifest', 'cleanup', 'missing-junit',
             'junit-skip', 'junit-count', 'junit-failure', 'missing-evidence',
             'corrupt-evidence', 'path-escape', 'symlink', 'forged-status')


def run_controls(lane_root, expected_input, output):
    output = Path(output)
    output.mkdir()
    reports = []
    for mutation in MUTATIONS:
        with tempfile.TemporaryDirectory(prefix='rcc-control-') as directory:
            root = Path(directory) / 'lane'
            shutil.copytree(lane_root, root)
            result_path = root / 'result.json'
            result = json.loads(result_path.read_text())
            if mutation == 'zero-cases': result['cases'] = []
            elif mutation == 'missing-case': result['cases'].pop()
            elif mutation == 'duplicate-case': result['cases'][-1] = result['cases'][0]
            elif mutation == 'skip': result['cases'][0]['outcome'] = 'skipped'
            elif mutation == 'wrong-lane': result['lane'] = 'latest'
            elif mutation == 'wrong-producer': result['input']['producer_sha'] = '0' * 40
            elif mutation == 'wrong-manifest': result['input']['manifest_sha256'] = '0' * 64
            elif mutation == 'cleanup': result['cleanup_ok'] = False
            elif mutation == 'path-escape': result['cases'][0]['evidence_file'] = '../outside.json'
            elif mutation == 'forged-status': result['status'] = 'FAIL' if result['status'] == 'PASS' else 'PASS'
            result_path.write_text(json.dumps(result))
            evidence = root / result['cases'][0]['evidence_file'] if result['cases'] and mutation != 'path-escape' else None
            if mutation == 'missing-result': result_path.unlink()
            elif mutation == 'missing-junit': (root / 'junit.xml').unlink()
            elif mutation.startswith('junit-'):
                tree = ET.parse(root / 'junit.xml'); suite = tree.getroot()
                if mutation == 'junit-skip': ET.SubElement(suite[0], 'skipped')
                elif mutation == 'junit-count': suite.set('tests', '0')
                elif mutation == 'junit-failure': ET.SubElement(suite[0], 'failure')
                tree.write(root / 'junit.xml')
            elif mutation == 'missing-evidence': evidence.unlink()
            elif mutation == 'corrupt-evidence': evidence.write_text('{}')
            elif mutation == 'symlink':
                evidence.unlink(); evidence.symlink_to(root / 'result.json')
            try:
                validate_lane(root, expected_input)
                caught = False
            except (AssertionError, OSError, ValueError, KeyError, TypeError, ET.ParseError):
                caught = True
            reports.append({'id': mutation, 'passed': caught})
    for fixed in ('FAIL', 'INCOMPLETE'):
        reports.append({'id': f'latest-pass-cannot-mask-{fixed}', 'passed': verdict(fixed, 'PASS', True)[0] == fixed})
    for latest in ('WARN_DRIFT', 'WARN_UNVERIFIED'):
        reports.append({'id': f'latest-warning-{latest}', 'passed': verdict('PASS', latest, True) == ('PASS', 0)})
    reports.append({'id': 'common-failure', 'passed': verdict('PASS', 'PASS', False) == ('INCOMPLETE', 2)})
    assert len(reports) == 23
    data = {'status': 'PASS' if all(row['passed'] for row in reports) else 'FAIL', 'cases': reports}
    (output / 'result.json').write_text(json.dumps(data, indent=2) + '\n')
    suite = ET.Element('testsuite', name='RCC-controls', tests=str(len(reports)), failures=str(sum(not row['passed'] for row in reports)), errors='0', skipped='0')
    for row in reports:
        case = ET.SubElement(suite, 'testcase', name=row['id'])
        if not row['passed']: ET.SubElement(case, 'failure', message='negative control was accepted')
    ET.ElementTree(suite).write(output / 'junit.xml', encoding='utf-8', xml_declaration=True)
    return data
