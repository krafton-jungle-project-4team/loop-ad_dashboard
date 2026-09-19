#!/usr/bin/env python3
"""Recheck downloaded CI artifacts without executing consumer or producer services."""
import argparse
import json
from pathlib import Path
import sys
import xml.etree.ElementTree as ET
sys.dont_write_bytecode = True
from controls import MUTATIONS
from report import digest, validate_lane, verify_inventory, verdict
from run import PINS, producer_validator


def verify(root, checkout):
    count = verify_inventory(root)
    result = json.loads((root / 'result.json').read_text())
    inputs = json.loads((root / 'inputs.json').read_text())
    assert inputs['pins'] == PINS
    assert digest(root / 'baseline/expected.json') == PINS['baseline_expected_sha256']
    validate_bundle = producer_validator(checkout)
    for name in ('base-status-start.json', 'base-status-end.json'):
        base = json.loads((root / name).read_text())
        assert base['state'] == 'OPEN' and base['mergedAt'] is None and base['headRefOid'] == PINS['dashboard_fix_sha']
    parent = json.loads((root / 'producer-result.json').read_text())
    for lane in ('fixed', 'latest'):
        if lane == 'latest' and result['latest_status'] == 'WARN_UNVERIFIED' and not (root / 'latest-input.json').exists(): continue
        selected = json.loads((root / (lane + '-input.json')).read_text())
        assert selected['producer_sha'] == PINS['decision_sha'] and selected['producer_source_sha256'] == PINS['decision_source_sha256']
        checked = validate_bundle(root / 'bundles' / lane, lane=lane, producer_sha=PINS['decision_sha'], source_sha256=PINS['decision_source_sha256'], manifest_sha256=selected['manifest_sha256'], run_id=parent['run_id'], gate_status=parent['status'])
        assert checked['status'] == 'VERIFIED'
        assert parent['consumer_bundles'][lane]['manifest_sha256'] == selected['manifest_sha256']
        assert validate_lane(root / lane, selected) == result[lane]
    controls = json.loads((root / 'controls/result.json').read_text())
    names = set(MUTATIONS) | {'latest-pass-cannot-mask-FAIL', 'latest-pass-cannot-mask-INCOMPLETE', 'latest-warning-WARN_DRIFT', 'latest-warning-WARN_UNVERIFIED', 'common-failure'}
    assert len(controls['cases']) == len(names) and {case['id'] for case in controls['cases']} == names
    assert controls['status'] == 'PASS' and all(case['passed'] is True for case in controls['cases'])
    suite = ET.parse(root / 'controls/junit.xml').getroot()
    assert len(suite) == len(names) and {case.get('name') for case in suite} == names
    assert suite.get('tests') == str(len(names)) and suite.get('failures') == suite.get('errors') == suite.get('skipped') == '0'
    assert all(len(case) == 0 for case in suite)
    assert result['cleanup_ok'] is True and parent['cleanup_ok'] is True
    assert (result['status'], result['exit_code']) == verdict(result['fixed']['status'], result['latest_status'], True)
    assert result['status'] == 'PASS'
    return dict(status='VERIFIED', files=count, dashboard_checkout_sha=inputs['dashboard_checkout_sha'], dashboard_dirty=inputs['dashboard_dirty'], fixed=result['fixed'], latest_status=result['latest_status'], controls=result['controls'])


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('directory', type=Path)
    parser.add_argument('--producer-checkout', required=True, type=Path)
    args = parser.parse_args()
    print(json.dumps(verify(args.directory, args.producer_checkout), indent=2))
