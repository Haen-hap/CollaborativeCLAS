#!/usr/bin/env bash
set -euo pipefail

COMMAND="${1:-status}"
HOST_IP=""
MODE="auto"
IFACE=""

detect_hotspot() {
  if ip -4 addr show 2>/dev/null | grep -qw "10\.42\.0\.1"; then
    HOST_IP="10.42.0.1"
    IFACE=$(ip -4 addr show 2>/dev/null | grep -B2 -w "10\.42\.0\.1" | head -n1 | awk '{print $2}' | tr -d ':' || echo "hotspot")
    MODE="hotspot"
    return 0
  fi
  # Fallback: if user explicitly requested hotspot mode but AP hasn't acquired 10.42.0.1 yet
  HOST_IP="10.42.0.1"
  IFACE="wlan_ap"
  MODE="hotspot"
  return 0
}

detect_wifi() {
  local match
  match=$(ip -4 -o addr show 2>/dev/null | awk '$2 ~ /^(wlan|wlp)/ {print $2, $4}' | head -n1 || true)
  if [ -n "$match" ]; then
    IFACE=$(echo "$match" | awk '{print $1}')
    HOST_IP=$(echo "$match" | awk '{print $2}' | cut -d/ -f1)
    MODE="wifi"
    return 0
  fi

  # Fallback to default route interface
  local def_match
  def_match=$(ip -4 route get 1.1.1.1 2>/dev/null | awk '{for(i=1;i<=NF;i++) if($i=="dev") dev=$(i+1); if($i=="src") src=$(i+1)} END {if(dev && src) print dev, src}' || true)
  if [ -n "$def_match" ]; then
    IFACE=$(echo "$def_match" | awk '{print $1}')
    HOST_IP=$(echo "$def_match" | awk '{print $2}')
    MODE="lan"
    return 0
  fi

  return 1
}

case "$COMMAND" in
  hotspot)
    detect_hotspot
    ;;
  wifi)
    if ! detect_wifi; then
      echo "Warning: No active Wi-Fi interface detected. Falling back to default IP."
      HOST_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "127.0.0.1")
      IFACE="unknown"
      MODE="lan"
    fi
    ;;
  status|*)
    # Priority 1: Check if standard hotspot IP 10.42.0.1 is active
    if ip -4 addr show 2>/dev/null | grep -qw "10\.42\.0\.1"; then
      detect_hotspot
    elif detect_wifi; then
      : # Handled by detect_wifi
    else
      HOST_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "10.42.0.1")
      IFACE="unknown"
      MODE="auto"
    fi
    ;;
esac

TARGET_URL="http://${HOST_IP}/"
PORT=80

# Ensure runtime directory exists and write lan-info.json atomically
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
LAN_DIR="${REPO_ROOT}/runtime/lan"
mkdir -p "${LAN_DIR}"

TMP_FILE="${LAN_DIR}/lan-info.json.tmp.$$"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

cat <<EOF > "${TMP_FILE}"
{
  "mode": "${MODE}",
  "interface": "${IFACE}",
  "ipv4": "${HOST_IP}",
  "port": ${PORT},
  "url": "${TARGET_URL}",
  "updated_at": "${TIMESTAMP}"
}
EOF

chmod 644 "${TMP_FILE}"
mv "${TMP_FILE}" "${LAN_DIR}/lan-info.json"

echo "=========================================================="
echo "  GBM CCLAS · LAN & Hotspot Access Portal"
echo "  Mode: ${MODE^^} (${IFACE}) | Host IP: ${HOST_IP}"
echo "  Metadata saved to: runtime/lan/lan-info.json"
echo "=========================================================="
echo ""
echo "  📱 PARTICIPANT ACCESS (Hotspot Clients):"
echo "     • Nina Gamified Assessment:  http://${HOST_IP}/"
echo "     • React Assessment Form:    http://${HOST_IP}/form"
echo ""
echo "  📊 KIOSK & ADMIN PORTALS:"
echo "     • Kiosk / Poster QR Entry:   http://${HOST_IP}/qr"
echo "     • Analytics Dashboard:       http://${HOST_IP}/datos"
echo "     • Admin Panel:              http://${HOST_IP}/admin"
echo ""
echo "  ⚙️  API & HEALTH ENDPOINTS:"
echo "     • Health Status:            http://${HOST_IP}/health/"
echo "     • Database Status:          http://${HOST_IP}/database-status"
echo "     • Swagger API Docs:         http://${HOST_IP}/docs"
echo "=========================================================="
echo ""

# Render ASCII QR Code in terminal if utility available
if command -v qrencode >/dev/null 2>&1; then
  echo "Scan QR to open Nina Assessment (${TARGET_URL}):"
  echo ""
  qrencode -t UTF8 "${TARGET_URL}"
elif python3 -c "import qrcode" >/dev/null 2>&1; then
  echo "Scan QR to open Nina Assessment (${TARGET_URL}):"
  echo ""
  python3 -c "import qrcode; qr=qrcode.QRCode(); qr.add_data('${TARGET_URL}'); qr.print_ascii(invert=True)"
else
  echo "Tip: Install 'qrencode' (sudo pacman -S qrencode) to render terminal QR codes."
fi
