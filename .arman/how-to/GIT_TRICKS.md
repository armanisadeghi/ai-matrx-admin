# Arman's Git Tricks


## Work on a branch but make updates go to main and that branch for quick fixes to go live:

# 1. Switch to main, make your fix, commit, push
git checkout main
git pull origin main
# (make your edits)
git add -A
git commit -m "fix: description here"
git push origin main

# 2. Switch to your dev branch and merge main in
#    The --no-edit flag skips the scary editor!
git checkout api-client-updates
git merge main --no-edit
git push origin api-client-updates