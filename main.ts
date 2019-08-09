
import { ethash_keccak256 } from "./keccak";
import { RLPData, decode } from "./rlp";

/** debugging functions
export declare function sayHello(a: i32): void;

@external("main", "debug")
export declare function debug(a: i32): void;
*/

@external("env", "debug_log")
export declare function debug(a: i32): void;

@external("env", "debug_mem")
export declare function debug_mem(pos: i32, len: i32): void;

@external("env", "eth2_blockDataSize")
export declare function eth2_blockDataSize(): i32;

@external("env", "eth2_blockDataCopy")
export declare function eth2_blockDataCopy(outputOffset: i32, srcOffset: i32, length: i32): void;

@external("env", "eth2_loadPreStateRoot")
export declare function eth2_loadPreStateRoot(offset: i32): void;

@external("env", "eth2_savePostStateRoot")
export declare function eth2_savePostStateRoot(offset: i32): void;


export function main(): i32 {


/** these globals were defined above as top level statements
 * but AS compiled them to a start function (which Scout won't run).
 *
 * There is an @global decorator, but looks like its only for functions, not variables
*/

// define two globals for using keccak: the context and the output buffer
// both will be reused repeatedly when calling keccak

// allocate keccak context buffer
let keccakCtx = new ArrayBuffer(650); // more than 616 (see the docs in keccak.tx)
let keccakCtxBuf = changetype<usize>(keccakCtx);

// allocate keccak output buffer
let hashOutputBuf = new ArrayBuffer(32);
let hashOutput = Uint64Array.wrap(hashOutputBuf, 0, 4);
// another option is Uint8Array.wrap(hashOutputBuf, 0, 32)
// we use Uint64Array so we can test equivalence of hashes by checking 4 elements rather than 32
let hashOutputPtr = changetype<usize>(hashOutputBuf);




  // INPUT 1: root hash (the pre-state root), hardcoded for testing TODO: fetch from EEI
  let root_hash_buf = new ArrayBuffer(32);
  // 0x65b7b9ccb7a4d828986e488e081bc11bfa5ef6141fb06b0af2e9a0bda273a753
  let root_hash_data = Uint64Array.wrap(root_hash_buf, 0, 4);
  eth2_loadPreStateRoot(root_hash_buf as usize);



  // INPUT 3: get proof data from the EEI
  let input_data_len = eth2_blockDataSize();
  let input_data_buff = new ArrayBuffer(input_data_len);
  let input_data_buff_ptr = changetype<usize>(input_data_buff);
  eth2_blockDataCopy(input_data_buff_ptr, 0, input_data_len);
  let input_data = Uint8Array.wrap(input_data_buff, 0, input_data_len);

  // input data is RLP
  let input_decoded = decode(input_data);
  // input_decoded is type RLPData: { buffer: Uint8Array, children: RLPData[] }

  let accounts_sequence_encoded = input_decoded.children[0]; // accounts array to be further decoded
  let hashes_data = input_decoded.children[1].buffer; // 32-byte hashes, simply concatenated
  let multiproof_opcodes = input_decoded.children[2].buffer;

  debug(hashes_data.length);
  debug(multiproof_opcodes.length);

  let hashes_data_start_ptr = (hashes_data.buffer as usize) + hashes_data.byteOffset;

  let accounts_sequence = decode(accounts_sequence_encoded.buffer).children;
  debug(accounts_sequence.length);


  const LEAF: u8 = 0x80;
  const BRANCHHASH: u8 = 0x81;
  const HASHES: u8 = 0x82;


  let pc: i32 = 0;

  let accounts_seq_i = 0;
  let hashes_seq_i = 0;

  let multiproofStack = new Uint32Array(100);
  // stack will hold pointers to memory locations
  let stackTop = 0;

  debug(777);
  debug(multiproof_opcodes.length);

  while (pc < multiproof_opcodes.length) {
    debug(111);
    debug(pc);

    let opcode: u8 = multiproof_opcodes[pc];
    debug(opcode);
    pc++;

    switch (opcode) {
      case LEAF:
        debug(80);
        // hash the leaf and push hash onto stack
        let leaf_node = accounts_sequence[accounts_seq_i].buffer;
        accounts_seq_i += 1;
        
        // get the key for the account leaf (the hash of the address)
        //let leafHashOutput = new ArrayBuffer(32);
        let leafHashOutputPtr = changetype<usize>(new ArrayBuffer(32));
        ethash_keccak256(leafHashOutputPtr, (leaf_node.buffer as usize) + leaf_node.byteOffset, leaf_node.byteLength);

        debug_mem(leafHashOutputPtr, 32);
        multiproofStack[stackTop] = leafHashOutputPtr;
        stackTop++;

        pc++; // advance pc past leaf operand
        break;

      case BRANCHHASH:
        debug(81);
        // operand = [length_byte, ...branch_indexes]
        let branch_num_children = (multiproof_opcodes[pc] as i32);
        pc++; // advance past length byte (number of branch children)

        debug(branch_num_children);

        // construct RLPData[] for encode()
        // doesn't need RLPData.buffer, just RLPData.children (RLPData.children = RLPData[])
        // each child needs RLPData.buffer

        /*
        let rlp_string_datas: RLPData[] = new Array<RLPData>();
        for (let i=0; i<testString.length; i++) {
            let elem_string = new RLPData(stringToBytes(testString[i]), nullRlpData);
            rlp_string_datas.push(elem_string);
        }
        let rlpData = new RLPData(nullUint8Arr, rlp_string_datas);
        */
        //let branch_node: RLPData[] = new Array<RLPData>(17);
        //for (let i = 0; i < branchhash_operand_len; i++) {
        //  // pop 
        //  // pass a Uint8Array to branchChild
        //  let branch_child = new RLPData(, null);
        //}

        // let's manually construct the encoded branch node, instead of using the RLP library
        // the length will depend on the number of child hashes
        /*
        // here's an encoded branch node with 4 child hashes:
        f891808080808080a09f48e0438e53d55e53bb935c4a80e294ff56055cc4b584635b4bafbf894226088080a04216caf9df3c72b105e86b5b75ecb16e09e4a6a718bb27b0b83ec6fd79bb6c0c80a0e17ee4374bd5002160209877201836362b93a75ce5813bf4789053dd613d22e08080a0b82fb32a26c22edc12788287a7d157a5be2443a4ea2a0722c77f5b995ef40d038080
        // it's 147 bytes. the 4 children are 32 * 4 == 128 bytes
        // the branch node is an RLP list of 17 elements, so 13 elements are empty. an empty element is `80`, so that's 13 bytes. 128 + 13 = 141 bytes.
        // that leaves 6 bytes for encoding (2 for 0xf891, 4 of 0xa0)
        f8 ;; RLP list over 55 bytes. length of byte length is (0xf8 - 0xf7 = 1)
        91 ;; list length = 145
        80 ;; branch index 0
        80 ;; 1
        80 ;; 2
        80 ;; branch index 3
        80 ;; branch index 4
        80 ;; branch index 5
        a0 ;; length of string is (0xa0 - 0x80) = 32
        9f48e0438e53d55e53bb935c4a80e294ff56055cc4b584635b4bafbf89422608 ;; hash at branch index 6
        80 ;; branch index 7
        80 ;; branch index 8
        a0 ;; length of string
        4216caf9df3c72b105e86b5b75ecb16e09e4a6a718bb27b0b83ec6fd79bb6c0c ;; branch index 9
        80 ;; branch index a
        a0
        e17ee4374bd5002160209877201836362b93a75ce5813bf4789053dd613d22e0 ;; branch index b
        80 ;; c
        80 ;; d
        a0
        b82fb32a26c22edc12788287a7d157a5be2443a4ea2a0722c77f5b995ef40d03 ;; branch index e
        80 ;; f
        80 ;; 17th element
        */

        // branch node will always have at least 2 children, so its length will always be at least 64 bytes
        // first byte of a branch node will be either f8 (<= 7 children) or f9 (>= 8 children)
        // two children: length is 81 bytes (0x51)
        // three children: length is 113 bytes (0x71)
        // four children: length is 145 bytes (0x91)
        // five children: length is 177 bytes (0xb1)

        // bytes for hashes = len(0xa0 + hash) = 33*branch_num_children
        // bytes for empty nodes (0x80) = (17 - branch_num_children)
        let list_bytes_len = (33 * branch_num_children) + (17 - branch_num_children);
        let branch_node_bytes: usize;
        let branch_node_bytes_len: usize;
        let branch_node_datastart: usize;
        debug(5555);
        if (branch_num_children < 8) {
          //0xf8 + (list_len as u8) + bytes..
          branch_node_bytes = changetype<usize>(new ArrayBuffer(list_bytes_len + 2));
          branch_node_bytes_len = list_bytes_len + 2;
          store<u8>(branch_node_bytes, 0xf8);
          store<u16>(branch_node_bytes + 1, (list_bytes_len as u8));
          debug_mem(branch_node_bytes, 32);
          branch_node_datastart = branch_node_bytes + 2;
        } else {
          //0xf9 + (list_len as u16) + bytes..
          branch_node_bytes = changetype<usize>(new ArrayBuffer(list_bytes_len + 3));
          branch_node_bytes_len = list_bytes_len + 3;
          store<u8>(branch_node_bytes, 0xf9);
          store<u16>(branch_node_bytes + 1, bswap<u16>(list_bytes_len as u16));
          debug_mem(branch_node_bytes, 32);
          branch_node_datastart = branch_node_bytes + 3;
        }

        // TODO: try `memory.fill(branch_node_bytes, 128, list_bytes_len)`` then overwrite where hashes are
        /*
        memory.fill(branch_node_datastart, 128, list_bytes_len);
        for (let i = 0; i < branch_num_children; i++) {
          branch_node_datastart
        }
        */


        // could create a DataView to read the operand bytes (branch child indexes), but guess that would be more overhead.
        // do it manually with pc++

        /*
        // old way without creating an array
        // first child
        let next_child = (multiproof_opcodes[pc] as u8);
        pc++; // should advance pc only branch_num_children times
        debug(5566);
        debug(next_child);

        */

        // new way using an array
        // first pop all the hash pointers off the stack, so we can process them in ascending order
        let child_indexes = new Array<u8>(branch_num_children);
        for (let i = 0; i < branch_num_children; i++) {
          //debug(101010);
          // read child index
          child_indexes[i] = (multiproof_opcodes[pc] as u8);
          //deubg(child_indexes[i]);
          pc++; // should advance pc only branch_num_children times
        }

        // we need to reverse the child indexes.
        // for that to work, we also need to pop off hashes off the stack into a reversed list
        let child_indexes_ascending = new Array<u8>(branch_num_children);
        let child_hash_ptrs = new Array<usize>(branch_num_children);
        for (let i = 0; i < branch_num_children; i++) {
          let reverse_i = branch_num_children - 1 - i;
          child_indexes_ascending[i] = child_indexes[reverse_i];
          //debug(010101);
          //debug()
          // pop child hash off the stack
          stackTop--;
          child_hash_ptrs[reverse_i] = multiproofStack[stackTop];
        }


        let children_copied = 0;
        //let all_children_copied = false;
        //slet next_child = child_indexes_ascending[children_copied];
        let next_child: u8;

        let branch_node_offset = branch_node_datastart;
        let i: u8 = 0;
        while (i < 17) {
          debug(6600);
          debug(i);

          if (children_copied < branch_num_children) {
            next_child = child_indexes_ascending[children_copied];
            // first insert all the 0x80's for empty slots
            if (i < next_child) {
              // TODO: maybe the check isn't necessary if memory.fill accepts 0 length inputs

              let num_empties = next_child - i;
              // first fill the empties with 0x80
              memory.fill(branch_node_offset, 0x80, num_empties);
              branch_node_offset = branch_node_offset + num_empties;

              debug(5577);
              //debug_mem(branch_node_offset - 32);
              i = next_child;
              debug(i);
            }

            debug(55771);
            // now copy the child
            // insert 0xa0 byte
            store<u8>(branch_node_offset, 0xa0);
            branch_node_offset++;
            // copy the child hash
            debug(55772);
            let child_hash_ptr = child_hash_ptrs[children_copied];
            memory.copy(branch_node_offset, child_hash_ptr, 32);
            branch_node_offset = branch_node_offset + 32;
            children_copied++;

            debug(5588);
            debug_mem(branch_node_offset - 32, 32);

          // children_copied >= branch_num_children
          } else {
            // we've copied all children and still haven't filled all 17 slots
            // copy empties to the end
            let num_empties = 17 - i;
            memory.fill(branch_node_offset, 0x80, num_empties);
            branch_node_offset = branch_node_offset + num_empties;
            debug(5599);
            debug_mem(branch_node_offset - 32, 32);
            break;
          }

          debug(6601);
          debug(i);
          i = i + 1;
        }

        // branch node is constructed, now hash it and push hash back on stack
        debug(668866);
        debug_mem(branch_node_bytes, branch_node_bytes_len);

        let branchHashOutputPtr = changetype<usize>(new ArrayBuffer(32));
        ethash_keccak256(branchHashOutputPtr, branch_node_bytes, branch_node_bytes_len);

        debug_mem(branchHashOutputPtr, 32);
        multiproofStack[stackTop] = branchHashOutputPtr;
        stackTop++;


        //for (let i = 0; i < branchhash_operand_len; i++) {
          // pop 
        //}
        // TODO: pop hashes from `multiproofStack` and construct branch node
        break;

      case HASHES:
        debug(82);
        // pulls hashes from the input data and puts them on the stack
        // don't bother trying to optimize the layout here, because in BRANCHHASH  they will be RLP encoded and into branche nodes
        // and rlp encoding does memory copying
        // this could be optimized to reduce memory copying, but it might require a different opcode / data sequenc
        let hashes_operand = (multiproof_opcodes[pc] as i32);
        debug(hashes_operand);
        pc++; // advance pc past hashes operand
        for (let i = 0; i < hashes_operand; i++) {
          let hash_ptr = hashes_data_start_ptr + hashes_seq_i*32;
          hashes_seq_i += 1;
          //let hashPtr = (hash.buffer as usize) + hash.byteOffset;
          debug_mem(hash_ptr, 32);
          multiproofStack[stackTop] = hash_ptr;
          stackTop++;
        }

        break;

      default:
        break;
    }

  }



  let prestate_root_ptr = multiproofStack[stackTop - 1];

  eth2_savePostStateRoot(prestate_root_ptr);
  return 1;

}