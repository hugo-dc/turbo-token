const baseFeeBuf: u8[] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 82, 8] // 21000
const defaultGasLimitBuf: u8[] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 134, 160]  // TODO: this value should come along with the transaction
const gasPriceBuf: u8[] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1]  // TODO: this value should come along with the transaction

export const baseFee: Uint8Array = Uint8Array.wrap(baseFeeBuf.buffer) 
export const defaultGasLimit: Uint8Array = Uint8Array.wrap(defaultGasLimitBuf.buffer) 
export const gasPrice: Uint8Array = Uint8Array.wrap(gasPriceBuf.buffer) 


