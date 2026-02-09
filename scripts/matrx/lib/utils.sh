#!/usr/bin/env bash
# =============================================================================
# utils.sh — Shared utility functions for matrx-dev-tools
# Sourced by all tool scripts. Do not execute directly.
# Compatible with bash 3.2+ (macOS default).
# =============================================================================

# ─── Config Loading ──────────────────────────────────────────────────────────

MATRX_TOOLS_CONF=".matrx-tools.conf"

load_config() {
    local search_dir
    search_dir="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

    if [[ -f "${search_dir}/${MATRX_TOOLS_CONF}" ]]; then
        # shellcheck disable=SC1090
        source "${search_dir}/${MATRX_TOOLS_CONF}"
        REPO_ROOT="$search_dir"
        export REPO_ROOT
    elif [[ -f "./${MATRX_TOOLS_CONF}" ]]; then
        # shellcheck disable=SC1090
        source "./${MATRX_TOOLS_CONF}"
        REPO_ROOT="$(pwd)"
        export REPO_ROOT
    else
        echo -e "${RED}Error: ${MATRX_TOOLS_CONF} not found${NC}"
        echo -e "${DIM}Run the installer or create one manually.${NC}"
        echo -e "${DIM}See: https://github.com/armanisadeghi/matrx-dev-tools${NC}"
        exit 1
    fi
}

conf_get() {
    local key="$1"
    local default="${2:-}"
    local val
    eval "val=\"\${${key}:-${default}}\""
    echo "$val"
}

# ─── Doppler Helpers ─────────────────────────────────────────────────────────

ensure_doppler() {
    if ! command -v doppler &>/dev/null; then
        echo -e "${RED}Error: doppler CLI not found${NC}"
        echo -e "${DIM}Install: https://docs.doppler.com/docs/install-cli${NC}"
        exit 1
    fi
}

get_doppler_secrets() {
    local project="$1"
    local config="$2"
    doppler secrets download \
        --project "$project" \
        --config "$config" \
        --no-file \
        --format env 2>/dev/null
}

# ─── Env File Helpers ────────────────────────────────────────────────────────

parse_env_to_sorted_file() {
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

lookup_value() {
    local key="$1"
    local file="$2"
    local match
    match=$(grep "^${key}=" "$file" 2>/dev/null | head -1) || true
    if [[ -n "$match" ]]; then
        echo "${match#*=}"
    fi
}

key_exists() {
    local key="$1"
    local file="$2"
    grep -q "^${key}=" "$file" 2>/dev/null
}

extract_keys() {
    local file="$1"
    sed 's/=.*//' "$file" | sort -u
}

backup_file() {
    local file="$1"
    local backup_dir="${2:-.env-backups}"
    if [[ ! -f "$file" ]]; then
        return
    fi
    mkdir -p "$backup_dir"
    local timestamp
    timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_path="${backup_dir}/${file##*/}.${timestamp}"
    cp "$file" "$backup_path"
    echo -e "${DIM}Backup saved: ${backup_path}${NC}"
}
