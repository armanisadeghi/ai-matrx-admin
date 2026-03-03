#!/bin/bash

echo ""

# Colors
BLUE='\033[1;34m'
CYAN='\033[0;36m'
NC='\033[0m' 

# 1. Print Headers
printf "${BLUE}%-18s | %-45s | %s${NC}\n" "LAST UPDATED" "BRANCH NAME" "LATEST COMMIT"
printf "${BLUE}%s${NC}\n" "-------------------+-----------------------------------------------+-----------------------"

# 2. Execute Git Branch command
git branch -r --sort=-committerdate --format="%(color:green)%(align:width=18)%(committerdate:relative)%(end)%(color:reset) | %(color:yellow)%(align:width=45)%(refname:short)%(end)%(color:reset) | %(contents:subject)"

# 3. Next Steps Help Menu
echo -e "\n${BLUE}COMMON NEXT STEPS:${NC}"
echo -e "${CYAN}  Switch to a branch:      ${NC} git checkout <branch-name>"
echo -e "${CYAN}  Pull latest changes:     ${NC} git pull origin <branch-name>"
echo -e "${CYAN}  Merge into current:      ${NC} git merge origin/<branch-name>"
echo -e "${CYAN}  Compare with current:    ${NC} git diff HEAD..origin/<branch-name>"
echo -e "${CYAN}  Delete remote branch:    ${NC} git push origin --delete <branch-name>"
echo -e "${CYAN}  Prune stale remotes:     ${NC} git fetch --prune"

echo ""
