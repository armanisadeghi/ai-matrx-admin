#!/usr/bin/env bash
# =============================================================================
# env-sync.sh — Safe Doppler ↔ .env merge synchronization
#
# Usage:
#   env-sync.sh push [--force]   Push local vars to Doppler
#   env-sync.sh pull [--force]   Pull Doppler vars into local
#   env-sync.sh diff             Show differences
#   env-sync.sh status           Quick summary
#
# Compatible with bash 3.2+ (macOS default)
# Config: reads from .matrx-tools.conf in the project root
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LIB_DIR="${SCRIPT_DIR}/lib"

# shellcheck disable=SC1091
source "${LIB_DIR}/colors.sh"
# shellcheck disable=SC1091
source "${LIB_DIR}/utils.sh"

load_config
ensure_doppler

TMPDIR_SYNC=$(mktemp -d)
trap "rm -rf '$TMPDIR_SYNC'" EXIT

# ─── Multi-config support ───────────────────────────────────────────────────

get_configs() {
    local multi
    multi=$(conf_get "DOPPLER_MULTI" "false")
    if [[ "$multi" == "true" ]]; then
        conf_get "DOPPLER_CONFIGS" "" | tr ',' '\n'
    else
        echo "default"
    fi
}

get_config_value() {
    local config_name="$1"
    local key="$2"
    local default="${3:-}"
    if [[ "$config_name" == "default" ]]; then
        conf_get "$key" "$default"
    else
        conf_get "${key}_${config_name}" "$default"
    fi
}

# ─── STATUS ──────────────────────────────────────────────────────────────────

run_status() {
    local config_name="$1"
    local doppler_project doppler_config env_file
    doppler_project=$(get_config_value "$config_name" "DOPPLER_PROJECT")
    doppler_config=$(get_config_value "$config_name" "DOPPLER_CONFIG")
    env_file=$(get_config_value "$config_name" "ENV_FILE")

    if [[ "$config_name" != "default" ]]; then
        echo -e "${BOLD}[$config_name]${NC}"
    fi
    echo -e "${CYAN}Env sync status${NC}"

    if [[ ! -f "${REPO_ROOT}/${env_file}" ]]; then
        echo -e "  ${RED}No ${env_file} found${NC}"
        return
    fi

    local local_file="$TMPDIR_SYNC/local_parsed_${config_name}"
    local remote_file="$TMPDIR_SYNC/remote_parsed_${config_name}"

    parse_env_to_sorted_file "${REPO_ROOT}/${env_file}" "$local_file"
    get_doppler_secrets "$doppler_project" "$doppler_config" > "$TMPDIR_SYNC/remote_raw_${config_name}"
    parse_env_to_sorted_file "$TMPDIR_SYNC/remote_raw_${config_name}" "$remote_file"

    local local_count remote_count
    local_count=$(wc -l < "$local_file" | tr -d ' ')
    remote_count=$(wc -l < "$remote_file" | tr -d ' ')

    echo -e "  Local (${env_file}):  ${GREEN}${local_count}${NC} variables"
    echo -e "  Doppler (${doppler_config}):     ${BLUE}${remote_count}${NC} variables"
    echo ""
}

cmd_status() {
    local configs
    configs=$(get_configs)
    while IFS= read -r config_name; do
        [[ -z "$config_name" ]] && continue
        run_status "$config_name"
    done <<< "$configs"
    echo -e "  Run ${CYAN}env:diff${NC} / ${CYAN}make env-diff${NC} for details"
}

# ─── DIFF ────────────────────────────────────────────────────────────────────

run_diff() {
    local config_name="$1"
    local doppler_project doppler_config env_file
    doppler_project=$(get_config_value "$config_name" "DOPPLER_PROJECT")
    doppler_config=$(get_config_value "$config_name" "DOPPLER_CONFIG")
    env_file=$(get_config_value "$config_name" "ENV_FILE")

    if [[ "$config_name" != "default" ]]; then
        echo -e "${BOLD}━━━ [$config_name] ━━━${NC}"
    fi
    echo -e "${CYAN}Comparing ${env_file} ↔ Doppler (${doppler_project} / ${doppler_config})${NC}"
    echo ""

    if [[ ! -f "${REPO_ROOT}/${env_file}" ]]; then
        echo -e "${RED}Error: ${env_file} not found${NC}"
        return
    fi

    local local_file="$TMPDIR_SYNC/local_parsed_${config_name}"
    local remote_file="$TMPDIR_SYNC/remote_parsed_${config_name}"
    local local_keys="$TMPDIR_SYNC/local_keys_${config_name}"
    local remote_keys="$TMPDIR_SYNC/remote_keys_${config_name}"

    parse_env_to_sorted_file "${REPO_ROOT}/${env_file}" "$local_file"
    get_doppler_secrets "$doppler_project" "$doppler_config" > "$TMPDIR_SYNC/remote_raw_${config_name}"
    parse_env_to_sorted_file "$TMPDIR_SYNC/remote_raw_${config_name}" "$remote_file"

    extract_keys "$local_file" > "$local_keys"
    extract_keys "$remote_file" > "$remote_keys"

    local local_only=0 remote_only=0 changed=0 same=0

    while IFS= read -r key; do
        if ! key_exists "$key" "$remote_file"; then
            echo -e "${GREEN}+ LOCAL ONLY:${NC}  $key"
            local_only=$((local_only + 1))
        fi
    done < "$local_keys"

    while IFS= read -r key; do
        if ! key_exists "$key" "$local_file"; then
            echo -e "${BLUE}+ DOPPLER ONLY:${NC} $key"
            remote_only=$((remote_only + 1))
        fi
    done < "$remote_keys"

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
    echo ""
}

cmd_diff() {
    local configs
    configs=$(get_configs)
    while IFS= read -r config_name; do
        [[ -z "$config_name" ]] && continue
        run_diff "$config_name"
    done <<< "$configs"
}

# ─── PUSH ────────────────────────────────────────────────────────────────────

run_push_force() {
    local config_name="$1"
    local doppler_project doppler_config env_file
    doppler_project=$(get_config_value "$config_name" "DOPPLER_PROJECT")
    doppler_config=$(get_config_value "$config_name" "DOPPLER_CONFIG")
    env_file=$(get_config_value "$config_name" "ENV_FILE")

    if [[ "$config_name" != "default" ]]; then echo -e "${BOLD}[$config_name]${NC}"; fi

    if [[ ! -f "${REPO_ROOT}/${env_file}" ]]; then
        echo -e "${RED}Error: ${env_file} not found${NC}"; return
    fi

    doppler secrets upload \
        --project "$doppler_project" \
        --config "$doppler_config" \
        "${REPO_ROOT}/${env_file}" 2>/dev/null

    echo -e "${GREEN}✓ ${env_file} force-pushed to Doppler (full replace)${NC}"
}

run_push_merge() {
    local config_name="$1"
    local doppler_project doppler_config env_file
    doppler_project=$(get_config_value "$config_name" "DOPPLER_PROJECT")
    doppler_config=$(get_config_value "$config_name" "DOPPLER_CONFIG")
    env_file=$(get_config_value "$config_name" "ENV_FILE")

    if [[ "$config_name" != "default" ]]; then echo -e "${BOLD}━━━ [$config_name] ━━━${NC}"; fi
    echo -e "${CYAN}Pushing ${env_file} → Doppler (${doppler_project} / ${doppler_config})${NC}"
    echo -e "${DIM}Mode: merge (add + update, never delete)${NC}"
    echo ""

    if [[ ! -f "${REPO_ROOT}/${env_file}" ]]; then
        echo -e "${RED}Error: ${env_file} not found${NC}"; return
    fi

    local local_file="$TMPDIR_SYNC/local_parsed_${config_name}"
    local remote_file="$TMPDIR_SYNC/remote_parsed_${config_name}"
    local merged_file="$TMPDIR_SYNC/merged_${config_name}"
    local local_keys="$TMPDIR_SYNC/local_keys_${config_name}"
    local remote_keys="$TMPDIR_SYNC/remote_keys_${config_name}"

    parse_env_to_sorted_file "${REPO_ROOT}/${env_file}" "$local_file"
    get_doppler_secrets "$doppler_project" "$doppler_config" > "$TMPDIR_SYNC/remote_raw_${config_name}"
    parse_env_to_sorted_file "$TMPDIR_SYNC/remote_raw_${config_name}" "$remote_file"

    extract_keys "$local_file" > "$local_keys"
    extract_keys "$remote_file" > "$remote_keys"
    touch "$merged_file"

    local added=0 updated=0 kept=0

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
            printf '%s=%s\n' "$key" "$rval" >> "$merged_file"
            kept=$((kept + 1))
        fi
    done < "$remote_keys"

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
        echo -e "${GREEN}Already in sync — nothing to push${NC}"; return
    fi

    echo ""
    echo -e "  ${GREEN}Adding:${NC}   $added new keys"
    echo -e "  ${YELLOW}Updating:${NC} $updated changed keys"
    echo -e "  ${DIM}Keeping:  $kept unchanged keys${NC}"
    echo ""

    doppler secrets upload \
        --project "$doppler_project" \
        --config "$doppler_config" \
        "$merged_file" 2>/dev/null

    echo -e "${GREEN}✓ Doppler updated successfully${NC}"
}

cmd_push() {
    local force="${1:-}"
    local configs
    configs=$(get_configs)
    while IFS= read -r config_name; do
        [[ -z "$config_name" ]] && continue
        if [[ "$force" == "--force" ]]; then run_push_force "$config_name"
        else run_push_merge "$config_name"; fi
    done <<< "$configs"
}

# ─── PULL ────────────────────────────────────────────────────────────────────

run_pull_force() {
    local config_name="$1"
    local doppler_project doppler_config env_file
    doppler_project=$(get_config_value "$config_name" "DOPPLER_PROJECT")
    doppler_config=$(get_config_value "$config_name" "DOPPLER_CONFIG")
    env_file=$(get_config_value "$config_name" "ENV_FILE")

    if [[ "$config_name" != "default" ]]; then echo -e "${BOLD}[$config_name]${NC}"; fi

    local full_path="${REPO_ROOT}/${env_file}"
    local env_dir
    env_dir=$(dirname "$full_path")
    mkdir -p "$env_dir"

    get_doppler_secrets "$doppler_project" "$doppler_config" > "$full_path"
    echo -e "${GREEN}✓ ${env_file} force-pulled from Doppler (full replace)${NC}"
}

run_pull_merge() {
    local config_name="$1"
    local doppler_project doppler_config env_file
    doppler_project=$(get_config_value "$config_name" "DOPPLER_PROJECT")
    doppler_config=$(get_config_value "$config_name" "DOPPLER_CONFIG")
    env_file=$(get_config_value "$config_name" "ENV_FILE")

    if [[ "$config_name" != "default" ]]; then echo -e "${BOLD}━━━ [$config_name] ━━━${NC}"; fi
    echo -e "${CYAN}Pulling Doppler (${doppler_project} / ${doppler_config}) → ${env_file}${NC}"
    echo -e "${DIM}Mode: merge (add + update with conflict comments, never delete)${NC}"
    echo ""

    local remote_file="$TMPDIR_SYNC/remote_parsed_${config_name}"
    get_doppler_secrets "$doppler_project" "$doppler_config" > "$TMPDIR_SYNC/remote_raw_${config_name}"
    parse_env_to_sorted_file "$TMPDIR_SYNC/remote_raw_${config_name}" "$remote_file"

    local remote_keys="$TMPDIR_SYNC/remote_keys_${config_name}"
    extract_keys "$remote_file" > "$remote_keys"

    local full_env_path="${REPO_ROOT}/${env_file}"

    if [[ ! -f "$full_env_path" ]]; then
        echo -e "${YELLOW}No ${env_file} found — creating from Doppler${NC}"
        local env_dir
        env_dir=$(dirname "$full_env_path")
        mkdir -p "$env_dir"
        {
            echo "# Auto-generated from Doppler (${doppler_project} / ${doppler_config})"
            echo "# Generated: $(date '+%Y-%m-%d %H:%M:%S')"
            echo ""
            while IFS= read -r key; do
                local val
                val=$(lookup_value "$key" "$remote_file")
                printf '%s="%s"\n' "$key" "$val"
            done < "$remote_keys"
        } > "$full_env_path"
        local count
        count=$(wc -l < "$remote_keys" | tr -d ' ')
        echo -e "${GREEN}✓ Created ${env_file} with $count variables${NC}"
        return
    fi

    local local_file="$TMPDIR_SYNC/local_parsed_${config_name}"
    parse_env_to_sorted_file "$full_env_path" "$local_file"

    local added=0 updated=0 kept=0
    local timestamp
    timestamp=$(date '+%Y-%m-%d %H:%M')

    backup_file "$full_env_path" "${REPO_ROOT}/.env-backups"

    local tmpout="$TMPDIR_SYNC/output_${config_name}"
    touch "$tmpout"
    local handled_file="$TMPDIR_SYNC/handled_keys_${config_name}"
    touch "$handled_file"

    while IFS= read -r line; do
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
                echo "# [env-sync $timestamp] Previous value:" >> "$tmpout"
                echo "# ${line}" >> "$tmpout"
                printf '%s="%s"\n' "$key" "$rval" >> "$tmpout"
                echo -e "  ${YELLOW}~${NC} $key ${DIM}(updated, old value preserved as comment)${NC}"
                updated=$((updated + 1))
            else
                echo "$line" >> "$tmpout"
                kept=$((kept + 1))
            fi
        else
            echo "$line" >> "$tmpout"
            kept=$((kept + 1))
        fi
    done < "$full_env_path"

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

    mv "$tmpout" "$full_env_path"

    echo ""
    if [[ $added -eq 0 && $updated -eq 0 ]]; then
        echo -e "${GREEN}Already in sync — no changes needed${NC}"
    else
        echo -e "  ${GREEN}Added:${NC}   $added new keys"
        echo -e "  ${YELLOW}Updated:${NC} $updated changed keys (old values preserved as comments)"
        echo -e "  ${DIM}Kept:    $kept unchanged${NC}"
        echo ""
        echo -e "${GREEN}✓ ${env_file} updated successfully${NC}"
    fi
}

cmd_pull() {
    local force="${1:-}"
    local configs
    configs=$(get_configs)
    while IFS= read -r config_name; do
        [[ -z "$config_name" ]] && continue
        if [[ "$force" == "--force" ]]; then run_pull_force "$config_name"
        else run_pull_merge "$config_name"; fi
    done <<< "$configs"
}

# ─── Main ────────────────────────────────────────────────────────────────────

COMMAND="${1:-}"
EXTRA="${2:-}"

case "$COMMAND" in
    push)   cmd_push "$EXTRA" ;;
    pull)   cmd_pull "$EXTRA" ;;
    diff)   cmd_diff ;;
    status) cmd_status ;;
    *)
        echo "Usage: $(basename "$0") {push|pull|diff|status} [--force]"
        echo ""
        echo "  push             Merge local vars into Doppler (add + update, never delete)"
        echo "  push --force     Full replace: upload local file to Doppler"
        echo "  pull             Merge Doppler vars into local (add + update, never delete)"
        echo "  pull --force     Full replace: download from Doppler"
        echo "  diff             Show differences between local and Doppler"
        echo "  status           Quick count summary"
        exit 1
        ;;
esac
