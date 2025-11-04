#!/usr/bin/env bash
set -euo pipefail

TOPDIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"
WIFI_IF="$(nmcli -t -f DEVICE,TYPE device status | awk -F: '$2=="wifi"{print $1; exit}')"

# Make sure Wi-Fi radio is on and interface is free
nmcli radio wifi on || true
nmcli device disconnect "$WIFI_IF" || true

# Wait up to 20s for any known connection to come up
# If it does, we're good—exit and stay a client.
if nm-online -q --timeout=20; then
  exit 0
fi

# Not online -> bring up the AP portal
exec "$TOPDIR/scripts/run.sh" -a 192.168.42.1 -p 80
