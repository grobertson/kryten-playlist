from __future__ import annotations

from datetime import timedelta, timezone

import pytest

from kryten_playlist.auth.otp import (
    expires_at,
    generate_otp_code,
    generate_salt,
    hash_otp,
    isoformat,
    parse_iso,
    utcnow,
)


def test_generate_otp_code_default_length() -> None:
    code = generate_otp_code()
    assert len(code) == 8
    assert code.isalnum()


def test_generate_otp_code_min_length_guard() -> None:
    with pytest.raises(ValueError):
        generate_otp_code(5)


def test_hash_otp_changes_with_salt() -> None:
    otp = "ABC123"
    h1 = hash_otp(otp, "salt1")
    h2 = hash_otp(otp, "salt2")
    assert h1 != h2


def test_parse_iso_roundtrip_utc() -> None:
    now = utcnow()
    raw = isoformat(now)
    parsed = parse_iso(raw)
    assert parsed.tzinfo is not None
    assert parsed.tzinfo == timezone.utc


def test_expires_at_adds_seconds() -> None:
    now = utcnow()
    exp = expires_at(now, 10)
    assert exp - now == timedelta(seconds=10)


def test_generate_salt_nonempty() -> None:
    assert generate_salt()
