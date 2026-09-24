use yeti::opcodescript::{Opcode, Opcodelike, Quirks, Script};

fn fixture() -> Vec<u8> {
    let mut bytes = 4u32.to_le_bytes().to_vec();
    // A harmless text record followed by a cross-script call and return.
    bytes.extend([0x45, 0xff, 0xff, 0, 0, b'A', 0]);
    bytes.extend([0x02, 1, 0, 0, 0, 0x05]);
    // Executable code follows that return. A local branch points to its end.
    let destination = bytes.len() as u32 + 9 + 64;
    bytes.extend([0x06, 0xd6, 0x80, 0xff, 0xff]);
    bytes.extend(destination.to_le_bytes());
    bytes.extend([0; 64]);
    bytes.extend([0x05, 0]);
    bytes
}

#[test]
fn ccfc_decodes_code_after_embedded_call_return() {
    let bytes = fixture();
    let (script, error) = Script::new(&bytes, Quirks::CCFC).unwrap();
    assert!(error.is_none());
    assert!(script.opcodes.iter().any(|op| matches!(op, Opcode::JE(_))));
    assert_eq!(script.footer.bytes, vec![0]);
    assert_eq!(script.binary_serialize().unwrap(), bytes);
}

#[test]
fn ccfc_does_not_discard_short_executable_tails() {
    let mut bytes = 4u32.to_le_bytes().to_vec();
    bytes.push(5);
    bytes.extend([1, 10, 0, 0, 0]);
    bytes.extend([5, 0]);
    let (script, error) = Script::new(&bytes, Quirks::CCFC).unwrap();
    assert!(error.is_none());
    assert_eq!(script.opcodes.len(), 3);
    assert_eq!(script.binary_serialize().unwrap(), bytes);
}

#[test]
fn growing_prefix_relocates_branch_inside_recovered_section() {
    let bytes = fixture();
    let (mut script, error) = Script::new(&bytes, Quirks::CCFC).unwrap();
    assert!(error.is_none());
    let old_target = script.opcodes.iter().find_map(|op| {
        if let Opcode::JE(jump) = op { Some(jump.jump_address) } else { None }
    }).unwrap();
    if let Opcode::OP_TEXTBOX_DISPLAY(text) = &mut script.opcodes[0] {
        text.translation = Some("A longer synthetic line".into());
    } else { panic!("expected synthetic text record"); }
    let rebuilt = script.binary_serialize().unwrap();
    let shift = rebuilt.len() - bytes.len();
    assert!(shift > 0);
    let (decoded, error) = Script::new(&rebuilt, Quirks::CCFC).unwrap();
    assert!(error.is_none());
    let target = decoded.opcodes.iter().find_map(|op| {
        if let Opcode::JE(jump) = op { Some(jump.jump_address) } else { None }
    }).unwrap();
    assert_eq!(target, old_target + shift as u32);
    assert!(decoded.opcodes.iter().any(|op| op.address() == target && op.opcode() == 5));
}
