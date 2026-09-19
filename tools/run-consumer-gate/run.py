#!/usr/bin/env python3
"""Pinned producer -> verified original bundles -> actual Dashboard consumer gate."""
import argparse
import hashlib
import importlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import xml.etree.ElementTree as ET
sys.dont_write_bytecode = True
from controls import run_controls
from report import digest, validate_lane, verdict, finalize_report

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
PINS = json.loads((HERE / 'pins.json').read_text())


def write(path, value):
    Path(path).write_text(json.dumps(value, indent=2, sort_keys=True) + '\n')


def command(args, cwd=ROOT, timeout=120, log=None, env=None):
    if log:
        with Path(log).open('w') as stream:
            return subprocess.run(args, cwd=cwd, timeout=timeout, stdout=stream, stderr=subprocess.STDOUT, env=env).returncode
    return subprocess.check_output(args, cwd=cwd, timeout=timeout, text=True, env=env).strip()


def check_base():
    value = json.loads(command(['gh', 'pr', 'view', '246', '--repo', 'krafton-jungle-project-4team/loop-ad_dashboard',
        '--json', 'state,mergedAt,headRefName,headRefOid,baseRefName,url']))
    assert value['state'] == 'OPEN' and value['mergedAt'] is None and value['headRefOid'] == PINS['dashboard_fix_sha'] and value['headRefName'] == PINS['dashboard_fix_branch'], 'PR #246 changed: ' + json.dumps(value)
    return value


def producer_validator(checkout):
    assert command(['git', 'rev-parse', 'HEAD'], checkout) == PINS['decision_sha'], 'producer checkout differs'
    assert not command(['git', 'status', '--porcelain'], checkout), 'producer checkout dirty'
    sys.path.insert(0, str(checkout))
    return importlib.import_module('tools.run_contract_gate.bundle').validate_bundle


def prepare_bundle(producer_output, checkout, lane, output, validate_bundle, selected_hash=None):
    source = producer_output / lane / 'consumer'
    if not source.is_dir():
        if lane == 'latest': return None
        raise AssertionError('fixed bundle missing')
    parent = json.loads((producer_output / 'result.json').read_text())
    recorded = parent['consumer_bundles'][lane]['manifest_sha256']
    assert selected_hash is None or selected_hash == recorded, 'selected manifest differs from producer result'
    verified = validate_bundle(source, lane=lane, producer_sha=PINS['decision_sha'],
        source_sha256=PINS['decision_source_sha256'], manifest_sha256=selected_hash or recorded,
        run_id=parent['run_id'], gate_status=parent['status'])
    manifest = json.loads((source / 'manifest.json').read_text())
    assert manifest['producer']['candidate_dirty'] is False
    if lane == 'fixed': assert manifest['contract_sha'] == PINS['fixed_contract_sha']
    assert verified['lane_status'] == 'PASS', f'{lane} producer contract failed; stop'
    assert all(sample['db_assertions_passed'] is True and sample['status'] < 500 for sample in manifest['samples']), 'producer contract/500 failure; stop'
    destination = output / 'bundles' / lane
    shutil.copytree(source, destination)
    # Revalidate the bytes which the consumer will actually read.
    validate_bundle(destination, lane=lane, producer_sha=PINS['decision_sha'], source_sha256=PINS['decision_source_sha256'], manifest_sha256=recorded, run_id=parent['run_id'], gate_status=parent['status'])
    return dict(lane=lane, bundle_directory=str(destination), manifest_sha256=recorded,
                producer_sha=PINS['decision_sha'], producer_source_sha256=PINS['decision_source_sha256'],
                producer_run_id=parent['run_id'], contract_sha=manifest['contract_sha'], ddl_sha256=manifest['ddl_sha256'])


def fingerprint():
    paths = command(['git', 'ls-files', '--cached', '--others', '--exclude-standard']).splitlines()
    files = {}
    for name in sorted(set(paths)):
        if name.startswith(('apps/', 'packages/', 'tools/run-consumer-gate/', '.github/workflows/run-consumer-gate')) or name in ('package.json', 'package-lock.json', 'scripts/run-consumer-gate.sh', 'docs/contracts/decision-promotion-run-response.v1.json'):
            path = ROOT / name
            assert path.is_file() and not path.is_symlink()
            files[name] = digest(path)
    return dict(files=files, source_sha256=hashlib.sha256(json.dumps(files, sort_keys=True).encode()).hexdigest())


def run(args):
    output = args.output.resolve()
    output.mkdir(exist_ok=False, parents=True)
    result = dict(schema_version='rcc-gate.v1', status='INCOMPLETE', exit_code=2, fixed={'status': 'INCOMPLETE'}, latest_status='WARN_UNVERIFIED', cleanup_ok=False)
    write(output / 'result.json', result)
    scratch = tempfile.TemporaryDirectory(prefix='rcc-preparation-')
    work = Path(scratch.name)
    try:
        write(output / 'base-status-start.json', check_base())
        command(['git', 'merge-base', '--is-ancestor', PINS['dashboard_fix_sha'], 'HEAD'])
        ci = {key: os.environ.get(key, '') for key in ('GITHUB_REPOSITORY', 'GITHUB_RUN_ID', 'GITHUB_RUN_ATTEMPT', 'GITHUB_SHA', 'GITHUB_REF', 'RCC_PR_HEAD', 'RCC_PR_BASE')}
        if ci['RCC_PR_BASE']: assert ci['RCC_PR_BASE'] == PINS['dashboard_fix_sha'], 'CI base changed; stop'
        inputs = dict(pins=PINS, dashboard_checkout_sha=command(['git', 'rev-parse', 'HEAD']),
            dashboard_dirty=bool(command(['git', 'status', '--porcelain'])), ci=ci,
            node_version=command(['node', '--version']), npm_version=command(['npm', '--version']), **fingerprint())
        write(output / 'inputs.json', inputs)
        checkout = args.producer_checkout.resolve() if args.producer_checkout else work / 'decision'
        if not args.producer_checkout:
            environment = os.environ | {'GIT_CONFIG_NOSYSTEM': '1', 'GIT_CONFIG_GLOBAL': '/dev/null', 'GIT_TERMINAL_PROMPT': '0'}
            checkout.mkdir()
            command(['git', 'init', '-q'], checkout, env=environment)
            command(['git', '-c', 'credential.helper=', 'fetch', '--depth=1', PINS['decision_repository'], PINS['decision_sha']], checkout, env=environment)
            command(['git', 'checkout', '--detach', '-q', 'FETCH_HEAD'], checkout, env=environment)
        validate_bundle = producer_validator(checkout)
        baseline = checkout / 'tests/fixtures/run_contract_gate/baseline'
        assert digest(baseline / 'expected.json') == PINS['baseline_expected_sha256']
        (output / 'baseline').mkdir()
        for name in ('expected.json', 'provenance.json'): shutil.copyfile(baseline / name, output / 'baseline' / name)
        producer_output = args.producer_output.resolve() if args.producer_output else output.with_name(output.name + '-producer')
        result['producer_output_directory'] = str(producer_output)
        if args.producer_output:
            assert args.fixed_manifest_sha256 and args.latest_manifest_sha256, 'reused output requires both selected manifest hashes'
        else:
            code = command(['bash', 'scripts/run-contract-gate.sh', str(producer_output)], checkout, timeout=1800, log=work / 'producer.log')
            assert code == 0, f'producer failed ({code}); stop; artifacts: {producer_output}'
        for name in ('result.json', 'inputs.json'):
            shutil.copyfile(producer_output / name, output / ('producer-' + name))
        producer = json.loads((output / 'producer-result.json').read_text())
        provenance = json.loads((output / 'producer-inputs.json').read_text())
        assert producer['cleanup_ok'] is True and producer['artifacts_ok'] is True and producer['controls']['status'] == 'PASS'
        assert provenance['candidate_commit'] == PINS['decision_sha'] and provenance['candidate_dirty'] is False
        assert provenance['source_sha256'] == PINS['decision_source_sha256']
        assert hashlib.sha256(json.dumps(provenance['files'], sort_keys=True).encode()).hexdigest() == provenance['source_sha256']
        for name, sha in provenance['files'].items():
            relative = name.removeprefix('gate/')
            if relative == 'run-contract-gate.sh': relative = 'scripts/' + relative
            assert digest(checkout / relative) == sha, f'producer source mismatch: {name}'
        assert command(['npm', 'run', 'build', '-w', '@loopad/shared'], log=work / 'build.log') == 0
        (output / 'bundles').mkdir()
        lane_inputs = {}
        for lane in ('fixed', 'latest'):
            selected_hash = getattr(args, lane + '_manifest_sha256')
            lane_input = prepare_bundle(producer_output, checkout, lane, output, validate_bundle, selected_hash)
            if lane_input is None: continue
            lane_inputs[lane] = lane_input
            write(output / (lane + '-input.json'), lane_input)
            code = command(['node', '--import', 'tsx', str(HERE / 'consume.ts'), str(output / (lane + '-input.json')), str(output / lane), str(output / 'baseline/expected.json')], timeout=60, log=work / (lane + '.log'))
            assert code in (0, 1), f'{lane} process failed ({code})'
            checked = validate_lane(output / lane, lane_input)
            assert code == (0 if checked['status'] == 'PASS' else 1), 'process/verdict mismatch'
            result[lane] = checked
            if lane == 'latest': result['latest_status'] = 'PASS' if checked['status'] == 'PASS' else 'WARN_DRIFT'
        controls = run_controls(output / 'fixed', lane_inputs['fixed'], output / 'controls')
        result['controls'] = dict(status=controls['status'], cases=len(controls['cases']))
        assert controls['status'] == 'PASS'
        write(output / 'base-status-end.json', check_base())
        result['cleanup_ok'] = all(result[lane]['cleanup_ok'] for lane in lane_inputs)
        result['status'], result['exit_code'] = verdict(result['fixed']['status'], result['latest_status'], result['cleanup_ok'])
    except (AssertionError, OSError, ValueError, KeyError, TypeError, subprocess.SubprocessError, ET.ParseError) as error:
        result.update(status='INCOMPLETE', exit_code=2, reason=str(error))
        diagnostics = output.with_name(output.name + '-diagnostics')
        diagnostics.mkdir(exist_ok=True)
        for path in work.glob('*.log'):
            shutil.copyfile(path, diagnostics / path.name)
        # Producer output is already retained separately, including partial evidence.
        result['diagnostics_directory'] = str(diagnostics)
        # Keep only generated structured evidence, never invent missing cases/JUnit.
    finally:
        finalize_report(output, result, scratch.cleanup)
    print(json.dumps(result, indent=2))
    return result['exit_code']


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('output', type=Path)
    parser.add_argument('--producer-checkout', type=Path)
    parser.add_argument('--producer-output', type=Path)
    parser.add_argument('--fixed-manifest-sha256')
    parser.add_argument('--latest-manifest-sha256')
    return run(parser.parse_args())


if __name__ == '__main__':
    raise SystemExit(main())
