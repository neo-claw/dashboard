import pytest
import subprocess
import json
import os
import sys
import tempfile
from pathlib import Path

CHECK_SCRIPT = str(Path(__file__).parent.parent / 'check')

def test_check_test_mode():
    input_data = {
        "preset": "yosemite-valley",
        "startDate": "2025-04-01",
        "endDate": "2025-04-03"
    }
    test_dir = tempfile.mkdtemp(prefix="recreation-check-test-")
    env = os.environ.copy()
    env['RECREATION_CHECK_TEST_DIR'] = test_dir
    # Set dummy Telegram token to trigger Telegram path in test mode
    env['OPENCLAW_TELEGRAM_BOT_TOKEN'] = 'dummy_token'
    env['OPENCLAW_TELEGRAM_CHAT_ID'] = '123456'

    result = subprocess.run(
        [sys.executable, CHECK_SCRIPT, '--test'],
        input=json.dumps(input_data).encode(),
        env=env,
        capture_output=True,
        cwd='/home/ubuntu/.openclaw/workspace'
    )
    assert result.returncode == 0, f"stderr: {result.stderr.decode()}"
    # The notification message containing "AVAILABILITY FOUND" is logged to stderr
    stderr = result.stderr.decode()
    assert "AVAILABILITY FOUND" in stderr, f"Stderr: {stderr}"

    # Check log file
    log_file = os.path.join(test_dir, 'notifications.log')
    assert os.path.exists(log_file), f"Log file not found: {log_file}"
    with open(log_file) as f:
        log_content = f.read()
    assert "AVAILABILITY FOUND" in log_content

    # Check Telegram mock file
    telegram_mock = os.path.join(test_dir, 'telegram-mock.txt')
    assert os.path.exists(telegram_mock), f"Telegram mock not found: {telegram_mock}"
    with open(telegram_mock) as f:
        msg = f.read()
    assert "AVAILABILITY FOUND" in msg

def test_check_force_mode():
    # Test that --force causes notification even if no change (but we need to simulate change detection logic)
    # This is more complex; could skip for brevity, but we can test second run with same data doesn't send unless --force.
    # Given time constraints, we can implement a simple version:
    input_data = {
        "preset": "yosemite-valley",
        "startDate": "2025-04-01",
        "endDate": "2025-04-03"
    }
    test_dir = tempfile.mkdtemp(prefix="recreation-check-test-force-")
    env = os.environ.copy()
    env['RECREATION_CHECK_TEST_DIR'] = test_dir
    env['OPENCLAW_TELEGRAM_BOT_TOKEN'] = 'dummy'

    # First run: creates cache and sends notification
    result1 = subprocess.run(
        [sys.executable, CHECK_SCRIPT, '--test'],
        input=json.dumps(input_data).encode(),
        env=env,
        capture_output=True
    )
    assert result1.returncode == 0

    # Verify first run created mock file
    mock1 = os.path.join(test_dir, 'telegram-mock.txt')
    assert os.path.exists(mock1)

    # Remove mock file to detect if second run creates it again
    os.remove(mock1)

    # Second run without --force: no change, should NOT send notification (no mock file)
    result2 = subprocess.run(
        [sys.executable, CHECK_SCRIPT, '--test'],
        input=json.dumps(input_data).encode(),
        env=env,
        capture_output=True
    )
    assert result2.returncode == 0
    # Mock file should not be recreated
    assert not os.path.exists(mock1), "Second run without --force should not send notification"

    # Third run with --force: should force sending notification again
    result3 = subprocess.run(
        [sys.executable, CHECK_SCRIPT, '--test', '--force'],
        input=json.dumps(input_data).encode(),
        env=env,
        capture_output=True
    )
    assert result3.returncode == 0
    assert os.path.exists(mock1), "Third run with --force should send notification"
