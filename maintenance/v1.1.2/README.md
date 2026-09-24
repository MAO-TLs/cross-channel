# v1.1.2 control-flow repair

The CCFC decoder stopped after some call/return sequences and near-end returns, retaining subsequent executable instructions as an opaque footer. Translation changed the prefix length while pointers inside that footer retained their original offsets. The attached decoder patch removes those two stopping rules for CCFC only.

Re-decoding and packing all 353 original scripts with the repaired decoder produces byte-identical decompressed scripts. The hotfix corrects 1,135 branch operands and 15 header entries in 74 scripts. Every other decompressed script byte, including all text, remains identical to v1.1.1.

The included Rust tests use synthetic instructions and exercise embedded returns, short tails, and relocated branches. Apply the patch to yet-cc-rs revision `3fcf5e950d5f20cc4584c766d2b95cd56dafa7ec`, place the test in `tests/`, and run `cargo test --test ccfc_embedded_return`.

All 1,135 corrected branches were also exercised with the shipped executable's handlers in x86 emulation. Both taken and untaken paths were checked for each conditional branch; unchanged fall-through paths were preserved. This is not an in-game replay. The original Japanese sections have not been translated by this hotfix. Issues #5, #6, and #7 remain open for in-game testing and the outstanding text work.
