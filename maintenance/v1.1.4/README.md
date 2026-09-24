# v1.1.4 wordplay revision

This release revises 25 English rows across 12 scripts after a source-first
review of all 2,067 machine-flagged wordplay candidates in the 54,316-row
script. The accepted changes repair lost lexical echoes, false segmentation,
comic callbacks, explanatory glosses, and several duplicate-English rows.

The scenario archive was decoded after packing. All revised rows round-trip
exactly, changed instruction shapes and entry targets are preserved, and all
341 unaffected script payloads remain byte-identical to v1.1.3. The installer
suite passed clean install, repeat install, rollback, failure recovery, Unicode
paths, read-only directories, and actual-ZIP extraction checks.

Actual scene replay, native Windows replay, and a complete playthrough remain
unverified.
