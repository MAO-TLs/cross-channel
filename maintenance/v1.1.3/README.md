# v1.1.3 complete-script restoration

This release adds 3,374 source-bound English rows across 11 scripts that were absent from the v1.1.1 manuscript and v1.1.2 patch. The published manuscript and online reader now contain 54,316 rows across 323 nonempty engine scripts.

The translated scenario archive was packed and decoded again. The verification receipt confirms that every restored English row matches its Japanese source hash, all affected instruction shapes are preserved, every entry target lands on a decoded instruction boundary, the reported issue #7 branch remains correctly relocated, and all 342 unaffected script payloads are byte-identical to v1.1.2.

The installer suite covers clean installation, repeat installation, rollback, injected partial failures, post-write hash failures, Unicode and space-containing paths, read-only retail directories, and installation from the actual release ZIP. The online reader is checked row-for-row against the v1.1.3 manuscript, including all public artifact hashes.

Actual replay of the reported failure point and a complete playthrough remain outstanding. The v1.1.2 repair separately executed all 1,135 corrected branch operands with the shipped executable's handlers in x86 emulation; those results are retained under [`../v1.1.2/`](../v1.1.2/).

## Receipts

- [`integration-receipt.json`](integration-receipt.json)
- [`integrated-verification.json`](integrated-verification.json)
- [`v1.1.3-manuscript-receipt.json`](v1.1.3-manuscript-receipt.json)
- [`v1.1.3-reader-verification.json`](v1.1.3-reader-verification.json)
- [`v1.1.3-package-test-receipt.json`](v1.1.3-package-test-receipt.json)
- [`release-manifest.json`](release-manifest.json)
