#!/bin/sh
set -eu
set -f

SCRIPT_DIR=$(CDPATH= cd "$(dirname "$0")" && pwd)
REPO_ROOT=$(CDPATH= cd "$SCRIPT_DIR/.." && pwd)
OUT="$REPO_ROOT/runtime/lan/lan-info.json"
WATCH=0
WATCH_SECONDS=5

while [ "$#" -gt 0 ]; do
    case "$1" in
        --out)
            [ "$#" -ge 2 ] || {
                echo "Missing path after --out" >&2
                exit 2
            }
            OUT=$2
            shift 2
            ;;
        --watch)
            WATCH=1
            shift
            if [ "$#" -gt 0 ]; then
                case "$1" in
                    ''|*[!0-9]*) ;;
                    *)
                        [ "$1" -gt 0 ] || {
                            echo "--watch interval must be greater than zero" >&2
                            exit 2
                        }
                        WATCH_SECONDS=$1
                        shift
                        ;;
                esac
            fi
            ;;
        *)
            echo "Unknown argument: $1" >&2
            exit 2
            ;;
    esac
done

[ -n "$OUT" ] || {
    echo "--out path must not be empty" >&2
    exit 2
}

detect_lan() {
    STATUS=offline
    MODE=offline
    INTERFACE=
    IPV4=
    URL=

    command -v ip >/dev/null 2>&1 || return 0

    detected=$(
        ip -4 -o addr show scope global 2>/dev/null |
            awk '
                $3 == "inet" {
                    iface = $2
                    sub(/@.*/, "", iface)
                    address = $4
                    sub(/\/.*/, "", address)

                    if (iface == "lo" ||
                        iface ~ /^(docker|br-|veth|virbr|tun|tap|wg|tailscale|cni|flannel|podman)/ ||
                        address ~ /^(127\.|169\.254\.)/) {
                        next
                    }

                    if (address ~ /^10\.42\.0\./) {
                        priority = 1
                        mode = "hotspot"
                    } else if (iface ~ /^(wl|ap)/) {
                        priority = 2
                        mode = "lan"
                    } else if (iface ~ /^(en|eth)/) {
                        priority = 3
                        mode = "lan"
                    } else {
                        next
                    }

                    if (best_priority == 0 || priority < best_priority) {
                        best_priority = priority
                        best_mode = mode
                        best_iface = iface
                        best_address = address
                    }
                }
                END {
                    if (best_priority != 0) {
                        print best_mode, best_iface, best_address
                    }
                }
            '
    )

    [ -n "$detected" ] || return 0
    set -- $detected
    MODE=$1
    INTERFACE=$2
    IPV4=$3
    STATUS=online
    URL="http://$IPV4/"
}

write_status() {
    timestamp=$(date -u '+%Y-%m-%dT%H:%M:%SZ')
    mkdir -p "$(dirname "$OUT")"
    tmp_file="${OUT}.tmp.357676"

    if [ "$STATUS" = online ]; then
        printf '{\n  "status": "%s",\n  "mode": "%s",\n  "interface": "%s",\n  "ipv4": "%s",\n  "port": 80,\n  "url": "%s",\n  "updated_at": "%s"\n}\n' \
            "$STATUS" "$MODE" "$INTERFACE" "$IPV4" "$URL" "$timestamp" > "$tmp_file"
    else
        printf '{\n  "status": "offline",\n  "mode": "offline",\n  "interface": null,\n  "ipv4": null,\n  "port": 80,\n  "url": null,\n  "updated_at": "%s"\n}\n' "$timestamp" > "$tmp_file"
    fi

    chmod 644 "$tmp_file"
    mv -f "$tmp_file" "$OUT"
}

detect_lan
write_status
previous="$STATUS|$MODE|$INTERFACE|$IPV4|$URL"

if [ "$WATCH" -eq 1 ]; then
    while :; do
        sleep "$WATCH_SECONDS"
        detect_lan
        current="$STATUS|$MODE|$INTERFACE|$IPV4|$URL"
        if [ "$current" != "$previous" ]; then
            write_status
            previous=$current
        fi
    done
fi
