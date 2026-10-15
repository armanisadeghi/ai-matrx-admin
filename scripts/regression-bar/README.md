# Regression bar (data doctrine)

The data-doctrine regression bar: automated checks, walks, probes and planted faults for the custom-data, scopes,
tables and one-home switch work. `node scripts/regression-bar/run.mjs --list` names every check; coverage and run
history are in common-docs `projects/data-doctrine-adoption/v5/REGRESSION-BAR-COVERAGE.md`.

It is an automated suite that grades itself. It is NOT a real test in the sense of the `safety-net` skill (a fresh
agent walking a written sheet whose checks it never sees); green here never stands in for one.
