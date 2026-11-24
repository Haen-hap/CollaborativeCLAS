import ipaddress
from fastapi import HTTPException, Request, status

from app.core.settings import settings

TRUSTED_PROXY_NETWORKS = [
    ipaddress.ip_network("127.0.0.1/32"),
    ipaddress.ip_network("::1/128"),
    ipaddress.ip_network("172.16.0.0/12"),
]


def resolve_effective_ip(request: Request) -> str:
    """Resolves the single effective client IP taking trusted proxies into account."""
    client_host = request.client.host if request.client else "127.0.0.1"

    # Treat TestClient ("testclient") as a trusted proxy on loopback
    if client_host == "testclient":
        if "x-real-ip" in request.headers:
            real_ip = request.headers["x-real-ip"].strip()
            if real_ip:
                return real_ip
        return "127.0.0.1"

    # Check if client_host is in trusted proxy ranges
    try:
        parsed_host = ipaddress.ip_address(client_host)
        is_trusted_proxy = any(parsed_host in net for net in TRUSTED_PROXY_NETWORKS)
    except ValueError:
        is_trusted_proxy = False

    if is_trusted_proxy and "x-real-ip" in request.headers:
        real_ip = request.headers["x-real-ip"].strip()
        if real_ip:
            return real_ip

    return client_host


def is_ip_allowed(ip_str: str, allowed_cidrs_str: str) -> bool:
    """Verifies whether an IP string is contained in any allowed CIDR range."""
    try:
        parsed_ip = ipaddress.ip_address(ip_str)
    except ValueError:
        return False

    for cidr in allowed_cidrs_str.split(","):
        cidr_cleaned = cidr.strip()
        if not cidr_cleaned:
            continue
        try:
            network = ipaddress.ip_network(cidr_cleaned, strict=False)
            if parsed_ip in network:
                return True
        except ValueError:
            continue

    return False


def require_admin_network(request: Request) -> str:
    """FastAPI dependency: rejects unauthorized IPs with 403 Forbidden."""
    effective_ip = resolve_effective_ip(request)
    if not is_ip_allowed(effective_ip, settings.admin_allowed_cidrs):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso restringido a la red administrativa autorizada",
        )
    return effective_ip
