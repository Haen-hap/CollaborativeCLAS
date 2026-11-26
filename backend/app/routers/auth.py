import hmac
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy import func, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.network_gate import (
    is_ip_allowed,
    require_admin_network,
    resolve_effective_ip,
)
from app.core.security import (
    create_signed_token,
    hash_pin_or_password,
    verify_pin_or_password,
    verify_signed_token,
)
from app.core.settings import settings
from app.models.admin_user import AdminUser
from app.schemas.auth import (
    AdminUserOut,
    AuthStatusResponse,
    LoginRequest,
    RegisterRequest,
    TokenResponse,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def get_current_admin(
    request: Request,
    authorization: Optional[str] = Header(default=None),
    x_admin_token: Optional[str] = Header(default=None),
    db: Session = Depends(get_db),
    _network: str = Depends(require_admin_network),
) -> AdminUser:
    """Verifies Factor 1 (Network-Gate) and Factor 2 (HMAC bearer token + active user)."""
    raw_token = None
    if authorization and authorization.lower().startswith("bearer "):
        raw_token = authorization[7:].strip()
    elif x_admin_token:
        raw_token = x_admin_token.strip()

    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Autenticación requerida: token no proporcionado",
        )

    payload = verify_signed_token(raw_token, settings.admin_secret_key)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
        )

    user_id = payload.get("uid")
    user = db.get(AdminUser, user_id) if user_id else None
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario administrativo no encontrado o inactivo",
        )

    return user


@router.get("/status", response_model=AuthStatusResponse)
def get_auth_status(request: Request, db: Session = Depends(get_db)) -> AuthStatusResponse:
    """Returns network authorization state and whether admin users exist."""
    effective_ip = resolve_effective_ip(request)
    network_ok = is_ip_allowed(effective_ip, settings.admin_allowed_cidrs)
    has_admins = (
        db.query(func.count(AdminUser.id))
        .filter(AdminUser.is_active.is_(True))
        .scalar()
        or 0
    ) > 0
    return AuthStatusResponse(
        network_allowed=network_ok,
        has_admins=has_admins,
        effective_ip=effective_ip,
    )


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register_admin(
    payload: RegisterRequest,
    request: Request,
    authorization: Optional[str] = Header(default=None),
    db: Session = Depends(get_db),
    _network: str = Depends(require_admin_network),
) -> TokenResponse:
    """Registers the first superadmin (bootstrap) or subsequent admins with invite code."""
    bind = db.get_bind()
    if bind is not None and bind.dialect.name == "postgresql":
        db.execute(text("SELECT pg_advisory_xact_lock(:lock_id)"), {"lock_id": 4242001})

    email_clean = payload.email.lower().strip()
    existing = db.query(AdminUser).filter(AdminUser.email == email_clean).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El correo electrónico ya está registrado",
        )

    admin_count = (
        db.query(func.count(AdminUser.id))
        .filter(AdminUser.is_active.is_(True))
        .scalar()
        or 0
    )
    if admin_count == 0:
        # Bootstrap mode: first user becomes superadmin
        role = "superadmin"
    else:
        # Check invite code or superadmin token
        is_authorized = False
        if payload.invite_code and hmac.compare_digest(payload.invite_code, settings.admin_invite_code):
            is_authorized = True
        elif authorization and authorization.lower().startswith("bearer "):
            token = authorization[7:].strip()
            token_payload = verify_signed_token(token, settings.admin_secret_key)
            caller_id = token_payload.get("uid") if token_payload else None
            caller = db.get(AdminUser, caller_id) if caller_id else None
            if caller and caller.is_active and caller.role == "superadmin":
                is_authorized = True

        if not is_authorized:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Código de invitación no válido o autorización requerida",
            )
        role = "admin"

    pw_hash = hash_pin_or_password(payload.pin)
    new_user = AdminUser(
        name=payload.name.strip(),
        email=email_clean,
        password_hash=pw_hash,
        role=role,
        is_active=True,
    )
    db.add(new_user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Este correo ya está registrado.",
        )
    db.refresh(new_user)

    token = create_signed_token(
        {"sub": new_user.email, "uid": new_user.id, "role": new_user.role},
        settings.admin_secret_key,
        settings.admin_token_expire_seconds,
    )

    return TokenResponse(token=token, user=AdminUserOut.model_validate(new_user))


@router.post("/login", response_model=TokenResponse)
def login_admin(
    payload: LoginRequest,
    db: Session = Depends(get_db),
    _network: str = Depends(require_admin_network),
) -> TokenResponse:
    """Verifies credentials against admin_users and returns a signed bearer token."""
    email_clean = payload.email.lower().strip()
    user = db.query(AdminUser).filter(AdminUser.email == email_clean).first()

    if not user or not verify_pin_or_password(payload.pin, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario administrativo desactivado",
        )

    user.last_login_at = func.now()
    db.commit()
    db.refresh(user)

    token = create_signed_token(
        {"sub": user.email, "uid": user.id, "role": user.role},
        settings.admin_secret_key,
        settings.admin_token_expire_seconds,
    )

    return TokenResponse(token=token, user=AdminUserOut.model_validate(user))


@router.get("/me", response_model=AdminUserOut)
def get_current_admin_info(current_admin: AdminUser = Depends(get_current_admin)) -> AdminUserOut:
    """Returns currently authenticated admin info."""
    return AdminUserOut.model_validate(current_admin)


@router.post("/logout")
def logout_admin(_network: str = Depends(require_admin_network)) -> dict:
    return {"ok": True}
