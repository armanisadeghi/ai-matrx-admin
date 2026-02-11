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

    local conf_path=""
    if [[ -f "${search_dir}/${MATRX_TOOLS_CONF}" ]]; then
        conf_path="${search_dir}/${MATRX_TOOLS_CONF}"
    elif [[ -f "./${MATRX_TOOLS_CONF}" ]]; then
        conf_path="./${MATRX_TOOLS_CONF}"
        search_dir="$(pwd)"
    else
        echo -e "${RED}Error: ${MATRX_TOOLS_CONF} not found${NC}"
        echo -e "${DIM}Run the installer or create one manually.${NC}"
        echo -e "${DIM}See: https://github.com/armanisadeghi/matrx-dev-tools${NC}"
        exit 1
    fi

    # Source the config in a subshell first to catch syntax errors / unbound vars
    if ! (source "$conf_path") 2>/dev/null; then
        echo -e "${RED}Error: ${MATRX_TOOLS_CONF} has syntax errors or invalid content${NC}"
        echo -e "${DIM}  File: ${conf_path}${NC}"
        echo ""
        echo -e "${YELLOW}This usually happens when the installer ran via curl|bash and the${NC}"
        echo -e "${YELLOW}prompts couldn't read from the terminal, corrupting the config file.${NC}"
        echo ""
        echo -e "${CYAN}To fix: delete ${MATRX_TOOLS_CONF} and re-run the installer:${NC}"
        echo -e "  ${DIM}rm ${conf_path}${NC}"
        echo -e "  ${DIM}curl -sL https://raw.githubusercontent.com/armanisadeghi/matrx-dev-tools/main/install.sh | bash${NC}"
        exit 1
    fi

    # shellcheck disable=SC1090
    source "$conf_path"
    REPO_ROOT="$search_dir"
    export REPO_ROOT

    # Validate required config values
    _validate_config "$conf_path"
}

_validate_single_value() {
    local key_name="$1"
    local key_value="$2"

    if [[ -z "$key_value" ]]; then
        return 1
    fi
    if [[ "$key_value" == "# "* ]] || [[ "$key_value" == *"source "* ]] || [[ "$key_value" == *"shellcheck"* ]] || [[ "$key_value" == *'$'* ]]; then
        return 1
    fi
    return 0
}

_validate_config() {
    local conf_path="$1"
    local has_errors=0

    if [[ "${DOPPLER_MULTI:-false}" == "true" ]]; then
        # ─── Multi-config validation ──────────────────────────────
        local configs_list
        configs_list=$(conf_get "DOPPLER_CONFIGS" "")

        if [[ -z "$configs_list" ]]; then
            echo -e "${RED}Error: DOPPLER_MULTI is true but DOPPLER_CONFIGS is empty in ${MATRX_TOOLS_CONF}${NC}"
            echo -e "${DIM}  Set DOPPLER_CONFIGS to a comma-separated list (e.g., 'web,api')${NC}"
            has_errors=1
        else
            IFS=',' read -ra cnames <<< "$configs_list"
            for cname in "${cnames[@]}"; do
                cname=$(echo "$cname" | tr -d ' ')
                [[ -z "$cname" ]] && continue

                local dp dc ef
                dp=$(conf_get "DOPPLER_PROJECT_${cname}" "")
                dc=$(conf_get "DOPPLER_CONFIG_${cname}" "")
                ef=$(conf_get "ENV_FILE_${cname}" "")

                if ! _validate_single_value "DOPPLER_PROJECT_${cname}" "$dp"; then
                    echo -e "${RED}Error: DOPPLER_PROJECT_${cname} is missing or invalid in ${MATRX_TOOLS_CONF}${NC}"
                    echo -e "${DIM}  Open ${conf_path} and set: DOPPLER_PROJECT_${cname}=\"your-project\"${NC}"
                    has_errors=1
                fi
                if ! _validate_single_value "DOPPLER_CONFIG_${cname}" "$dc"; then
                    echo -e "${RED}Error: DOPPLER_CONFIG_${cname} is missing or invalid in ${MATRX_TOOLS_CONF}${NC}"
                    echo -e "${DIM}  Open ${conf_path} and set: DOPPLER_CONFIG_${cname}=\"${cname}\"${NC}"
                    has_errors=1
                fi
                if [[ -z "$ef" ]]; then
                    echo -e "${RED}Error: ENV_FILE_${cname} is not set in ${MATRX_TOOLS_CONF}${NC}"
                    echo -e "${DIM}  Open ${conf_path} and set: ENV_FILE_${cname}=\"path/to/.env\"${NC}"
                    has_errors=1
                fi
            done
        fi
    else
        # ─── Single-config validation ─────────────────────────────
        if ! _validate_single_value "DOPPLER_PROJECT" "${DOPPLER_PROJECT:-}"; then
            echo -e "${RED}Error: DOPPLER_PROJECT is missing or invalid in ${MATRX_TOOLS_CONF}${NC}"
            echo -e "${DIM}  Open ${conf_path} and set: DOPPLER_PROJECT=\"your-doppler-project-name\"${NC}"
            has_errors=1
        fi

        if ! _validate_single_value "DOPPLER_CONFIG" "${DOPPLER_CONFIG:-}"; then
            echo -e "${RED}Error: DOPPLER_CONFIG is missing or invalid in ${MATRX_TOOLS_CONF}${NC}"
            echo -e "${DIM}  Open ${conf_path} and set: DOPPLER_CONFIG=\"dev\"${NC}"
            has_errors=1
        fi

        if [[ -z "${ENV_FILE:-}" ]]; then
            echo -e "${RED}Error: ENV_FILE is not set in ${MATRX_TOOLS_CONF}${NC}"
            echo -e "${DIM}  Open ${conf_path} and set: ENV_FILE=\".env.local\"${NC}"
            has_errors=1
        fi
    fi

    if [[ $has_errors -eq 1 ]]; then
        echo ""
        echo -e "${YELLOW}Fix the values in ${conf_path}, then re-run the command.${NC}"
        echo -e "${DIM}Or delete ${MATRX_TOOLS_CONF} and run the installer again to regenerate it.${NC}"
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
        echo -e "${RED}Error: Doppler CLI not found${NC}"
        echo ""
        echo -e "  The env-sync tool requires the Doppler CLI to manage secrets."
        echo ""
        echo -e "  ${BOLD}Install:${NC}"
        echo -e "    ${CYAN}https://docs.doppler.com/docs/install-cli${NC}"
        echo ""
        echo -e "  ${BOLD}Then authenticate:${NC}"
        echo -e "    ${CYAN}doppler login${NC}"
        exit 1
    fi

    # Check authentication
    if ! doppler me &>/dev/null 2>&1; then
        echo -e "${RED}Error: Doppler CLI is not authenticated${NC}"
        echo ""
        echo -e "  The Doppler CLI is installed but you haven't logged in yet."
        echo ""
        echo -e "  ${BOLD}Run:${NC}"
        echo -e "    ${CYAN}doppler login${NC}"
        echo ""
        echo -e "  ${DIM}This is a one-time setup per machine. After logging in, all env-sync${NC}"
        echo -e "  ${DIM}commands will work automatically.${NC}"
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
    # grep returns exit 1 when no lines match — tolerate empty/comment-only files
    (grep -v '^\s*#' "$input" || true) | (grep -v '^\s*$' || true) | while IFS= read -r line; do
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
