import base64
import hashlib
import hmac
import json
import secrets
import time
from typing import Any, Optional


def hash_pin_or_password(secret: str) -> str:
    """Hashes a PIN or password using Python standard library scrypt."""
    salt = secrets.token_bytes(16)
    derived = hashlib.scrypt(
        secret.encode("utf-8"),
        salt=salt,
        n=16384,
        r=8,
        p=1,
        maxmem=0,
        dklen=32,
    )
    return f"scrypt${salt.hex()}${derived.hex()}"


def verify_pin_or_password(secret: str, stored_hash: str) -> bool:
    """Verifies a secret against a stored scrypt hash in constant time."""
    try:
        algorithm, salt_hex, hash_hex = stored_hash.split("$", 2)
        if algorithm != "scrypt":
            return False
        salt = bytes.fromhex(salt_hex)
        expected_hash = bytes.fromhex(hash_hex)
        candidate = hashlib.scrypt(
            secret.encode("utf-8"),
            salt=salt,
            n=16384,
            r=8,
            p=1,
            maxmem=0,
            dklen=len(expected_hash),
        )
        return hmac.compare_digest(candidate, expected_hash)
    except Exception:
        return False


def create_signed_token(payload: dict[str, Any], secret_key: str, expires_in_seconds: int = 86400) -> str:
    """Creates an HMAC-SHA256 signed bearer token using stdlib only."""
    token_payload = dict(payload)
    token_payload["exp"] = int(time.time()) + expires_in_seconds
    raw_json = json.dumps(token_payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
    payload_b64 = base64.urlsafe_b64encode(raw_json).decode("utf-8").rstrip("=")
    signature = hmac.new(secret_key.encode("utf-8"), payload_b64.encode("utf-8"), hashlib.sha256).digest()
    sig_b64 = base64.urlsafe_b64encode(signature).decode("utf-8").rstrip("=")
    return f"{payload_b64}.{sig_b64}"


def verify_signed_token(token: str, secret_key: str) -> Optional[dict[str, Any]]:
    """Verifies token signature and expiration in constant time. Returns payload dict or None."""
    try:
        parts = token.split(".", 1)
        if len(parts) != 2:
            return None
        payload_b64, sig_b64 = parts

        # Verify signature
        expected_sig = hmac.new(secret_key.encode("utf-8"), payload_b64.encode("utf-8"), hashlib.sha256).digest()
        expected_sig_b64 = base64.urlsafe_b64encode(expected_sig).decode("utf-8").rstrip("=")
        if not hmac.compare_digest(sig_b64, expected_sig_b64):
            return None

        # Pad base64 if needed
        padding = 4 - (len(payload_b64) % 4)
        if padding != 4:
            payload_b64 += "=" * padding

        raw_json = base64.urlsafe_b64decode(payload_b64.encode("utf-8"))
        payload = json.loads(raw_json.decode("utf-8"))

        # Check expiration
        exp = payload.get("exp")
        if not exp or int(exp) < int(time.time()):
            return None

        return payload
    except Exception:
        return None
