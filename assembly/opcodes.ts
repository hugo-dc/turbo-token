export enum Opcodes {
  Stop = 0x00,
  Add = 0x01,
  Mul = 0x02,
  Sub = 0x03,
  Div = 0x04,
  Lt = 0x10,
  Eq = 0x14,
  IsZero = 0x15,
  Not = 0x19,
  CallValue = 0x34,
  CallDataLoad = 0x35,
  CallDataSize = 0x36,
  CodeCopy = 0x39,
  Pop = 0x50,
  MLoad = 0x51,
  MStore = 0x52,
  MStore8 = 0x53,
  SStore = 0x55,
  Jump = 0x56,
  Jumpi = 0x57,
  JumpDest = 0x5b,
  Push1 = 0x60,
  Push2 = 0x61,
  Push3 = 0x62,
  Push4 = 0x63,
  Push29 = 0x7c,
  Dup1 = 0x80,
  Dup2 = 0x81,
  Dup3 = 0x82,
  Swap1 = 0x90,
  Swap2 = 0x91,
  Swap3 = 0x92,
  Return = 0xf3,
  Revert = 0xfd,
  Invalid = 0xfe,
}

export function getOpcodeFee(opcode: i32): Uint8Array {
  let result = new Uint8Array(32)
  result.fill(0, 0, 32)

  switch (opcode) {
    case Opcodes.Stop:
    case Opcodes.SStore:
    case Opcodes.Return:
    case Opcodes.Revert:
    case Opcodes.Invalid: {
      break
    }

    case Opcodes.JumpDest: {
      result[31] = 1
      break
    }

    case Opcodes.CallValue:
    case Opcodes.CallDataSize:
    case Opcodes.Pop: {
      result[31] = 2
      break
    }

    case Opcodes.Add:
    case Opcodes.Sub:
    case Opcodes.Lt:
    case Opcodes.Eq:
    case Opcodes.IsZero:
    case Opcodes.Not:
    case Opcodes.CallDataLoad:
    case Opcodes.CodeCopy:
    case Opcodes.MLoad:
    case Opcodes.MStore:
    case Opcodes.MStore8:
    case Opcodes.Push1:
    case Opcodes.Push2:
    case Opcodes.Push3:
    case Opcodes.Push4:
    case Opcodes.Push29:
    case Opcodes.Dup1:
    case Opcodes.Dup2:
    case Opcodes.Dup3:
    case Opcodes.Swap1:
    case Opcodes.Swap2:
    case Opcodes.Swap3: {
      result[31] = 3
      break
    }

    case Opcodes.Mul:
    case Opcodes.Div: {
      result[31] = 5
      break
    }
    case Opcodes.Jump: {
      result[31] = 8
      break
    }
    case Opcodes.Jumpi: {
      result[31] = 10
      break
    }
  }
  return result
}
