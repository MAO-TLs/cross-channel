# CROSS†CHANNEL English translation v1.1.2 (testing)

MAO Translations publishes the *CROSS†CHANNEL ～FINAL COMPLETE～*
Japanese and MAO English script alongside two independent research editions:

- [Japanese and MAO English script](https://mao-tls.github.io/cross-channel/script/)
- [George Henry Shaft translation audit](https://mao-tls.github.io/cross-channel/audit-ghs/)
- [Annotated *On Cross Channel*](https://mao-tls.github.io/cross-channel/audit-on-cross-channel/)

The script browser contains 50,942 source rows across 322 engine scripts. The
optional comparison layer aligns 38,637 George Henry Shaft units where a
defensible correspondence exists.

The current GHS audit records 5,580 confirmed source-bound findings, 989
questionable cases, 23,892 acceptable translations, 3,556 cases left
unadjudicated, and 4,620 potential bindings withheld rather than forced.

The annotated edition preserves the complete approximately 160,000-word
monograph in its original chapter and paragraph structure. Its 6,978 textual
blocks contain 847 recorded findings.

## English patch

Download the [v1.1.2 testing release](https://github.com/MAO-TLs/cross-channel/releases/tag/v1.1.2) and follow the included README. Requires an unmodified Final Complete 1.0 installation and Python 3. This hotfix corrects stale branch addresses and entry points associated with the progression reports in issues #5–#7, including every script listed in #7. All text and the other five patched files remain unchanged from v1.1.1. The untranslated sections remain Japanese; this is not a complete translation or a confirmed in-game resolution of those reports.

All 1,135 corrected branches passed tests using the shipped game's machine code in an x86 emulator. Actual scene replay and a full playthrough remain unverified. See [validation and decoder changes](maintenance/v1.1.2/).

Allow at least 5 GB free disk space and 8 GB RAM. If upgrading, restore the original game with your previous patch installer before installing this package; keep the old installer and backup until restoration succeeds. Save data is untouched. The [v1.1.1 manuscript](https://github.com/MAO-TLs/cross-channel/releases/download/v1.1.1/CROSS-CHANNEL-English-Script-v1.1.1.jsonl) still matches the online script and has not changed in this hotfix.

## Credits

- Project Lead: MAO
- Translator: GPT-5.6 Sol
- Special Thanks: gambs
