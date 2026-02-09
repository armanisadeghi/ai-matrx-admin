#!/usr/bin/env bash
# =============================================================================
# env-sync.sh — Safe Doppler ↔ .env.local synchronization
#
# Usage:
#   ./scripts/env-sync.sh push    Push local vars to Doppler (merge, not replace)
#   ./scripts/env-sync.sh pull    Pull Doppler vars into .env.local (merge, not replace)
#   ./scripts/env-sync.sh diff    Show differences between local and Doppler
#   ./scripts/env-sync.sh status  Quick summary of what's different
#
# Safety:
#   - Never deletes keys from either side
#   - Changed values: keeps new value, comments out old value with timestamp
#   - Creates timestamped backups before any modification
#
# Compatible with bash 3.2+ (macOS default)
# =============================================================================

set -euo pipefail

DOPPLER_PROJECT="ai-matrx-admin"
DOPPLER_CONFIG="dev"
ENV_FILE=".env.local"
BACKUP_DIR=".env-backups"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
DIM='\033[2m'
NC='\033[0m'

cd "$(git rev-parse --show-toplevel 2>/dev/null || echo ".")"

# Temp files (cleaned up on exit)
TMPDIR_SYNC=$(mktemp -d)
trap "rm -rf '$TMPDIR_SYNC'" EXIT

# ─── Helpers ──────────────────────────────────────────────────────────────────

parse_env_to_sorted_file() {
    # Parse a .env-style file into sorted KEY=VALUE pairs (one per line)
    # Strips comments, blank lines, and surrounding quotes from values
    local input="$1"
    local output="$2"
    if [[ ! -f "$input" ]]; then
        touch "$output"
        return
    fi
    grep -v '^\s*#' "$input" | grep -v '^\s*$' | while IFS= read -r line; do
        local key="${line%%=*}"
        local value="${line#*=}"
        value="${value#\"}"
        value="${value%\"}"
        printf '%s=%s\n' "$key" "$value"
    done | sort > "$output"
}

get_doppler_secrets() {
    doppler secrets download \
        --project "$DOPPLER_PROJECT" \
        --config "$DOPPLER_CONFIG" \
        --no-file \
        --format env 2>/dev/null
}

lookup_value() {
    # Look up a key's value in a sorted KEY=VALUE file
    # Returns the value (everything after first =) or empty string
    local key="$1"
    local file="$2"
    local match
    match=$(grep "^${key}=" "$file" 2>/dev/null | head -1) || true
    if [[ -n "$match" ]]; then
        echo "${match#*=}"
    fi
}

key_exists() {
    # Check if a key exists in a sorted KEY=VALUE file
    local key="$1"
    local file="$2"
    grep -q "^${key}=" "$file" 2>/dev/null
}

extract_keys() {
    # Extract just the keys from a KEY=VALUE file
    local file="$1"
    sed 's/=.*//' "$file" | sort -u
}

backup_file() {
    local file="$1"
    if [[ ! -f "$file" ]]; then
        return
    fi
    mkdir -p "$BACKUP_DIR"
    local timestamp
    timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_path="${BACKUP_DIR}/${file##*/}.${timestamp}"
    cp "$file" "$backup_path"
    echo -e "${DIM}Backup saved: ${backup_path}${NC}"
}

# ─── STATUS ──────────────────────────────────────────────────────────────────

cmd_status() {
    echo -e "${CYAN}Env sync status${NC}"

    if [[ ! -f "$ENV_FILE" ]]; then
        echo -e "${RED}No $ENV_FILE found${NC}"
        exit 1
    fi

    local local_file="$TMPDIR_SYNC/local_parsed"
    local remote_file="$TMPDIR_SYNC/remote_parsed"

    parse_env_to_sorted_file "$ENV_FILE" "$local_file"
    get_doppler_secrets > "$TMPDIR_SYNC/remote_raw"
    parse_env_to_sorted_file "$TMPDIR_SYNC/remote_raw" "$remote_file"

    local local_count remote_count
    local_count=$(wc -l < "$local_file" | tr -d ' ')
    remote_count=$(wc -l < "$remote_file" | tr -d ' ')

    echo -e "  Local ($ENV_FILE):  ${GREEN}${local_count}${NC} variables"
    echo -e "  Doppler ($DOPPLER_CONFIG):     ${BLUE}${remote_count}${NC} variables"
    echo ""
    echo -e "  Run ${CYAN}pnpm env:diff${NC} for details"
}

# ─── DIFF ────────────────────────────────────────────────────────────────────

cmd_diff() {
    echo -e "${CYAN}Comparing .env.local ↔ Doppler ($DOPPLER_PROJECT / $DOPPLER_CONFIG)${NC}"
    echo ""

    if [[ ! -f "$ENV_FILE" ]]; then
        echo -e "${RED}Error: $ENV_FILE not found${NC}"
        exit 1
    fi

    local local_file="$TMPDIR_SYNC/local_parsed"
    local remote_file="$TMPDIR_SYNC/remote_parsed"
    local local_keys="$TMPDIR_SYNC/local_keys"
    local remote_keys="$TMPDIR_SYNC/remote_keys"

    parse_env_to_sorted_file "$ENV_FILE" "$local_file"
    get_doppler_secrets > "$TMPDIR_SYNC/remote_raw"
    parse_env_to_sorted_file "$TMPDIR_SYNC/remote_raw" "$remote_file"

    extract_keys "$local_file" > "$local_keys"
    extract_keys "$remote_file" > "$remote_keys"

    local local_only=0
    local remote_only=0
    local changed=0
    local same=0

    # Keys only in local
    while IFS= read -r key; do
        if ! key_exists "$key" "$remote_file"; then
            echo -e "${GREEN}+ LOCAL ONLY:${NC}  $key"
            local_only=$((local_only + 1))
        fi
    done < "$local_keys"

    # Keys only in remote
    while IFS= read -r key; do
        if ! key_exists "$key" "$local_file"; then
            echo -e "${BLUE}+ DOPPLER ONLY:${NC} $key"
            remote_only=$((remote_only + 1))
        fi
    done < "$remote_keys"

    # Keys in both — check values
    while IFS= read -r key; do
        if key_exists "$key" "$remote_file"; then
            local lval rval
            lval=$(lookup_value "$key" "$local_file")
            rval=$(lookup_value "$key" "$remote_file")
            if [[ "$lval" != "$rval" ]]; then
                echo -e "${YELLOW}~ CHANGED:${NC}      $key"
                echo -e "    ${DIM}local:   ${lval:0:60}${NC}"
                echo -e "    ${DIM}doppler: ${rval:0:60}${NC}"
                changed=$((changed + 1))
            else
                same=$((same + 1))
            fi
        fi
    done < "$local_keys"

    echo ""
    echo -e "${DIM}────────────────────────────────────${NC}"
    echo -e "  ${GREEN}Local only:${NC}   $local_only"
    echo -e "  ${BLUE}Doppler only:${NC} $remote_only"
    echo -e "  ${YELLOW}Changed:${NC}      $changed"
    echo -e "  ${DIM}Identical:    $same${NC}"
}

# ─── PUSH ────────────────────────────────────────────────────────────────────

cmd_push() {
    echo -e "${CYAN}Pushing .env.local → Doppler ($DOPPLER_PROJECT / $DOPPLER_CONFIG)${NC}"
    echo -e "${DIM}Mode: merge (add + update, never delete)${NC}"
    echo ""

    if [[ ! -f "$ENV_FILE" ]]; then
        echo -e "${RED}Error: $ENV_FILE not found${NC}"
        exit 1
    fi

    local local_file="$TMPDIR_SYNC/local_parsed"
    local remote_file="$TMPDIR_SYNC/remote_parsed"
    local merged_file="$TMPDIR_SYNC/merged"
    local local_keys="$TMPDIR_SYNC/local_keys"
    local remote_keys="$TMPDIR_SYNC/remote_keys"

    parse_env_to_sorted_file "$ENV_FILE" "$local_file"
    get_doppler_secrets > "$TMPDIR_SYNC/remote_raw"
    parse_env_to_sorted_file "$TMPDIR_SYNC/remote_raw" "$remote_file"

    extract_keys "$local_file" > "$local_keys"
    extract_keys "$remote_file" > "$remote_keys"

    touch "$merged_file"

    local added=0
    local updated=0
    local kept=0

    # Process all remote keys first (preserve everything in Doppler)
    while IFS= read -r key; do
        local rval
        rval=$(lookup_value "$key" "$remote_file")
        if key_exists "$key" "$local_file"; then
            local lval
            lval=$(lookup_value "$key" "$local_file")
            if [[ "$lval" != "$rval" ]]; then
                echo -e "  ${YELLOW}~${NC} $key ${DIM}(updated)${NC}"
                printf '%s=%s\n' "$key" "$lval" >> "$merged_file"
                updated=$((updated + 1))
            else
                printf '%s=%s\n' "$key" "$rval" >> "$merged_file"
                kept=$((kept + 1))
            fi
        else
            # Key exists in Doppler but not locally — keep it
            printf '%s=%s\n' "$key" "$rval" >> "$merged_file"
            kept=$((kept + 1))
        fi
    done < "$remote_keys"

    # Add keys that only exist locally
    while IFS= read -r key; do
        if ! key_exists "$key" "$remote_file"; then
            local lval
            lval=$(lookup_value "$key" "$local_file")
            echo -e "  ${GREEN}+${NC} $key ${DIM}(new)${NC}"
            printf '%s=%s\n' "$key" "$lval" >> "$merged_file"
            added=$((added + 1))
        fi
    done < "$local_keys"

    if [[ $added -eq 0 && $updated -eq 0 ]]; then
        echo -e "${GREEN}Already in sync — nothing to push${NC}"
        return
    fi

    echo ""
    echo -e "  ${GREEN}Adding:${NC}   $added new keys"
    echo -e "  ${YELLOW}Updating:${NC} $updated changed keys"
    echo -e "  ${DIM}Keeping:  $kept unchanged keys${NC}"
    echo ""

    # Upload the merged file
    doppler secrets upload \
        --project "$DOPPLER_PROJECT" \
        --config "$DOPPLER_CONFIG" \
        "$merged_file" 2>/dev/null

    echo -e "${GREEN}✓ Doppler updated successfully${NC}"
}

# ─── PULL ────────────────────────────────────────────────────────────────────

cmd_pull() {
    echo -e "${CYAN}Pulling Doppler ($DOPPLER_PROJECT / $DOPPLER_CONFIG) → .env.local${NC}"
    echo -e "${DIM}Mode: merge (add + update with conflict comments, never delete)${NC}"
    echo ""

    local remote_file="$TMPDIR_SYNC/remote_parsed"

    get_doppler_secrets > "$TMPDIR_SYNC/remote_raw"
    parse_env_to_sorted_file "$TMPDIR_SYNC/remote_raw" "$remote_file"

    local remote_keys="$TMPDIR_SYNC/remote_keys"
    extract_keys "$remote_file" > "$remote_keys"

    if [[ ! -f "$ENV_FILE" ]]; then
        echo -e "${YELLOW}No $ENV_FILE found — creating from Doppler${NC}"
        {
            echo "# Auto-generated from Doppler ($DOPPLER_PROJECT / $DOPPLER_CONFIG)"
            echo "# Generated: $(date '+%Y-%m-%d %H:%M:%S')"
            echo ""
            while IFS= read -r key; do
                local val
                val=$(lookup_value "$key" "$remote_file")
                printf '%s="%s"\n' "$key" "$val"
            done < "$remote_keys"
        } > "$ENV_FILE"
        local count
        count=$(wc -l < "$remote_keys" | tr -d ' ')
        echo -e "${GREEN}✓ Created $ENV_FILE with $count variables${NC}"
        return
    fi

    # Parse existing local file for comparison
    local local_file="$TMPDIR_SYNC/local_parsed"
    parse_env_to_sorted_file "$ENV_FILE" "$local_file"

    local added=0
    local updated=0
    local kept=0
    local timestamp
    timestamp=$(date '+%Y-%m-%d %H:%M')

    # Back up before modifying
    backup_file "$ENV_FILE"

    # Build the new file, preserving comments and structure from existing file
    local tmpout="$TMPDIR_SYNC/output"
    touch "$tmpout"

    # Track which remote keys we've handled (using a temp file)
    local handled_file="$TMPDIR_SYNC/handled_keys"
    touch "$handled_file"

    # Process existing file line by line, preserving comments and blank lines
    while IFS= read -r line; do
        # Keep comments and blank lines as-is
        if echo "$line" | grep -q '^\s*#' || echo "$line" | grep -q '^\s*$'; then
            echo "$line" >> "$tmpout"
            continue
        fi

        local key="${line%%=*}"
        local local_val="${line#*=}"
        local_val="${local_val#\"}"
        local_val="${local_val%\"}"

        if key_exists "$key" "$remote_file"; then
            echo "$key" >> "$handled_file"
            local rval
            rval=$(lookup_value "$key" "$remote_file")
            if [[ "$local_val" != "$rval" ]]; then
                # Value changed — comment out old, write new
                echo "# [env-sync $timestamp] Previous value:" >> "$tmpout"
                echo "# ${line}" >> "$tmpout"
                printf '%s="%s"\n' "$key" "$rval" >> "$tmpout"
                echo -e "  ${YELLOW}~${NC} $key ${DIM}(updated, old value preserved as comment)${NC}"
                updated=$((updated + 1))
            else
                # Same value — keep as-is
                echo "$line" >> "$tmpout"
                kept=$((kept + 1))
            fi
        else
            # Key only exists locally — keep it
            echo "$line" >> "$tmpout"
            kept=$((kept + 1))
        fi
    done < "$ENV_FILE"

    # Add keys that only exist in Doppler (not already handled)
    local has_new=0
    while IFS= read -r key; do
        if ! grep -q "^${key}$" "$handled_file" 2>/dev/null && ! key_exists "$key" "$local_file"; then
            if [[ $has_new -eq 0 ]]; then
                echo "" >> "$tmpout"
                echo "# [env-sync $timestamp] New variables from Doppler:" >> "$tmpout"
                has_new=1
            fi
            local rval
            rval=$(lookup_value "$key" "$remote_file")
            printf '%s="%s"\n' "$key" "$rval" >> "$tmpout"
            echo -e "  ${GREEN}+${NC} $key ${DIM}(new from Doppler)${NC}"
            added=$((added + 1))
        fi
    done < "$remote_keys"

    mv "$tmpout" "$ENV_FILE"

    echo ""
    if [[ $added -eq 0 && $updated -eq 0 ]]; then
        echo -e "${GREEN}Already in sync — no changes needed${NC}"
    else
        echo -e "  ${GREEN}Added:${NC}   $added new keys"
        echo -e "  ${YELLOW}Updated:${NC} $updated changed keys (old values preserved as comments)"
        echo -e "  ${DIM}Kept:    $kept unchanged${NC}"
        echo ""
        echo -e "${GREEN}✓ .env.local updated successfully${NC}"
    fi
}

# ─── Main ────────────────────────────────────────────────────────────────────

case "${1:-}" in
    push)   cmd_push ;;
    pull)   cmd_pull ;;
    diff)   cmd_diff ;;
    status) cmd_status ;;
    *)
        echo "Usage: $0 {push|pull|diff|status}"
        echo ""
        echo "  push    Merge local vars into Doppler (add + update, never delete)"
        echo "  pull    Merge Doppler vars into .env.local (add + update, never delete)"
        echo "  diff    Show differences between local and Doppler"
        echo "  status  Quick count summary"
        exit 1
        ;;
esac
