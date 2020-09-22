/**
 * Copyright (c) Tatsuo Nomura <tatsuo.nomura@gmail.com>
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { GDBCommandHandler } from './gdb-command-handler.js';
import { ok, stopped, error, currentThreadId, threadIds, ERROR_BAD_ACCESS_SIZE_FOR_ADDRESS, unsupported } from './gdb-server-stub.js';
import Debug from 'debug';

const trace = Debug('gss:r3000:trace');
const REGISTER_INFO = [
  'name:r0;alt-name:zero;bitsize:32;offset:0;encoding:uint;format:hex;set:General Purpose Registers;',
  'name:r1;alt-name:at;bitsize:32;offset:4;encoding:uint;format:hex;set:General Purpose Registers;',
  'name:r2;alt-name:v0;bitsize:32;offset:8;encoding:uint;format:hex;set:General Purpose Registers;',
  'name:r3;alt-name:v1;bitsize:32;offset:12;encoding:uint;format:hex;set:General Purpose Registers;',
  'name:r4;alt-name:a0;bitsize:32;offset:16;encoding:uint;format:hex;set:General Purpose Registers;generic:arg1;',
  'name:r5;alt-name:a1;bitsize:32;offset:20;encoding:uint;format:hex;set:General Purpose Registers;generic:arg2;',
  'name:r6;alt-name:a2;bitsize:32;offset:24;encoding:uint;format:hex;set:General Purpose Registers;generic:arg3;',
  'name:r7;alt-name:a3;bitsize:32;offset:28;encoding:uint;format:hex;set:General Purpose Registers;generic:arg4;',
  'name:r8;alt-name:t0;bitsize:32;offset:32;encoding:uint;format:hex;set:General Purpose Registers;',
  'name:r9;alt-name:t1;bitsize:32;offset:36;encoding:uint;format:hex;set:General Purpose Registers;',
  'name:r10;alt-name:t2;bitsize:32;offset:40;encoding:uint;format:hex;set:General Purpose Registers;',
  'name:r11;alt-name:t3;bitsize:32;offset:44;encoding:uint;format:hex;set:General Purpose Registers;',
  'name:r12;alt-name:t4;bitsize:32;offset:48;encoding:uint;format:hex;set:General Purpose Registers;',
  'name:r13;alt-name:t5;bitsize:32;offset:52;encoding:uint;format:hex;set:General Purpose Registers;',
  'name:r14;alt-name:t6;bitsize:32;offset:56;encoding:uint;format:hex;set:General Purpose Registers;',
  'name:r15;alt-name:t7;bitsize:32;offset:60;encoding:uint;format:hex;set:General Purpose Registers;',
  'name:r16;alt-name:s0;bitsize:32;offset:64;encoding:uint;format:hex;set:General Purpose Registers;',
  'name:r17;alt-name:s1;bitsize:32;offset:68;encoding:uint;format:hex;set:General Purpose Registers;',
  'name:r18;alt-name:s2;bitsize:32;offset:72;encoding:uint;format:hex;set:General Purpose Registers;',
  'name:r19;alt-name:s3;bitsize:32;offset:76;encoding:uint;format:hex;set:General Purpose Registers;',
  'name:r20;alt-name:s4;bitsize:32;offset:80;encoding:uint;format:hex;set:General Purpose Registers;',
  'name:r21;alt-name:s5;bitsize:32;offset:84;encoding:uint;format:hex;set:General Purpose Registers;',
  'name:r22;alt-name:s6;bitsize:32;offset:88;encoding:uint;format:hex;set:General Purpose Registers;',
  'name:r23;alt-name:s7;bitsize:32;offset:92;encoding:uint;format:hex;set:General Purpose Registers;',
  'name:r24;alt-name:t8;bitsize:32;offset:96;encoding:uint;format:hex;set:General Purpose Registers;',
  'name:r25;alt-name:t9;bitsize:32;offset:100;encoding:uint;format:hex;set:General Purpose Registers;',
  'name:r26;alt-name:k0;bitsize:32;offset:104;encoding:uint;format:hex;set:General Purpose Registers;',
  'name:r27;alt-name:k1;bitsize:32;offset:108;encoding:uint;format:hex;set:General Purpose Registers;',
  'name:r28;alt-name:gp;bitsize:32;offset:112;encoding:uint;format:hex;set:General Purpose Registers;',
  'name:r29;alt-name:sp;bitsize:32;offset:116;encoding:uint;format:hex;set:General Purpose Registers;generic:sp;',
  'name:r30;alt-name:fp;bitsize:32;offset:120;encoding:uint;format:hex;set:General Purpose Registers;generic:fp;',
  'name:r31;alt-name:ra;bitsize:32;offset:124;encoding:uint;format:hex;set:General Purpose Registers;generic:ra;',
  'name:sr;bitsize:32;offset:128;encoding:uint;format:hex;set:General Purpose Registers;',
  'name:lo;bitsize:32;offset:132;encoding:uint;format:hex;set:General Purpose Registers;',
  'name:hi;bitsize:32;offset:136;encoding:uint;format:hex;set:General Purpose Registers;',
  'name:bad;bitsize:32;offset:140;encoding:uint;format:hex;set:General Purpose Registers;',
  'name:cause;bitsize:32;offset:144;encoding:uint;format:hex;set:General Purpose Registers;',
  'name:pc;bitsize:32;offset:148;encoding:uint;format:hex;set:General Purpose Registers;generic:pc;',
];

export class R3000 extends GDBCommandHandler {
  constructor() {
    super();
    this.registers = {
      gprs: new Array(32).fill(0),
      sr: 0,
      hi: 0,
      lo: 0,
      bad: 0,
      cause: 0,
      // 0xbfc00000 is MIPS's reset vector
      pc: 0xbfc00000,
    }

    this.memory = new Array(1024).fill(0);

    // Set the initial content of memory just for fun.
    // asm:
    //   li t0
    //   li t1
    //   add t2, t0, t1
    this.handleWriteMemory(0xbfc00000, R3000._uint32ArrayToBytes([0x200803e8, 0x200907d0, 0x01095020]));

    this.stopAfterCycles = 0;

    this.breakpoints = {};
  }

  run(cycles) {
    if (this.stopAfterCycles == 0) {
      return;
    }

    let cyclesToRun = Math.min(cycles, this.stopAfterCycles);
    while (cyclesToRun-- > 0) {
      this.stopAfterCycles--;
      this.registers.pc += 4;
      if (this.registers.pc in this.breakpoints) {
        this.stopAfterCycles = 0;
        break;
      }
    }

    if (this.stopAfterCycles == 0) {
      this.emit('stopped', stopped(5));
    }
  }

  handleInterruption() {
    trace('interrupted')
    this.stopAfterCycles = 0;
    this.emit('stopped', stopped(5));
  }

  handleHaltReason() {
    trace('haltReason')
    // Use stop reason SIGTRAP(5).
    return stopped(5);
  }

  handleReadRegisters() {
    trace("readRegisters");
    const r = this.registers;
    const empty = new Array(32).fill(0);
    const values = [...r.gprs, r.sr, r.hi, r.lo, r.bad, r.cause, r.pc];
    return ok(R3000._uint32ArrayToBytes(values));
  }

  handleReadRegister(index) {
    trace(`readRegister${index}`);
    const r = this.registers;
    const empty = new Array(32).fill(0);
    const values = [...r.gprs, r.sr, r.hi, r.lo, r.bad, r.cause, r.pc];
    return ok(R3000._uint32ToBytes(values[index]));
  }

  handleWriteRegisters(bytes) {
    trace("writeRegisters");
    const values = R3000._bytesToInt32Array(bytes);
    // Skip the $zero register.
    for (let i = 1; i < this.registers.gprs.length; i++) {
      this.registers.gprs[i] = values[i];
    }
    this.registers.sr = values[32];
    this.registers.hi = values[33];
    this.registers.lo = values[34];
    this.registers.bad = values[35];
    this.registers.cause = values[36];
    this.registers.pc = values[37];
    return ok();
  }

  handleReadMemory(address, length) {
    trace("readMemory");
    const start = Math.max(address - 0xbfc00000, 0);
    const end = Math.min(start + length, this.memory.length);
    return ok(this.memory.slice(start, end));
  }

  handleWriteMemory(address, values) {
    trace("writeMemory");
    const start = Math.max(address - 0xbfc00000, 0);
    const end = start + values.length;
    if (this.memory.length < end) {
      // Bad access size for address
      return error(ERROR_BAD_ACCESS_SIZE_FOR_ADDRESS);
    }
    for (let i = start; i < end; i++) {
      this.memory[i] = values[i - start];
    }
    return ok();
  }

  handleStep(address) {
    trace("step");
    this.stopAfterCycles = 1;
    return ok();
  }

  handleContinue(address) {
    trace("continue");
    this.stopAfterCycles = Infinity;
    return ok();
  }

  handleQSupported(features) {
    return ok('QStartNoAckMode+')
  }

  handleStartNoAckMode() {
    return ok();
  }

  handleThreadInfo() {
    return threadIds([0x11]);
  }

  handleCurrentThread() {
    return currentThreadId(0x11);
  }

  handleRegisterInfo(index) {
    trace(`registerInfo:${index}`);
    if (index < REGISTER_INFO.length) {
      return ok(REGISTER_INFO[index]);
    }
    return error(1);
  }

  handleHostInfo() {
    trace('hostInfo');
    // triple:mipsel-unknown-linux-gnu
    return ok('triple:6d697073656c2d756e6b6e6f776e2d6c696e75782d676e75;endian:little;ptrsize:4');
  }
  
  handleSelectExecutionThread(threadId) {
    trace(`select execution thread:${threadId}`);
    return ok();
  }
  
  handleSelectRegisterThread(threadId) {
    trace(`select register thread:${threadId}`);
    return ok();
  }
  
  handleSelectMemoryThread(threadId) {
    trace(`select memory thread:${threadId}`);
    return ok();
  }

  handleAddBreakpoint(type, address, kind) {
    trace(`addBreakpoint at:${address.toString(16)}`)
    this.breakpoints[address] = true;
    return ok();
  }

  handleRemoveBreakpoint(type, address, kind) {
    trace(`removeBreakpoint at:${address.toString(16)}`)
    if (address in this.breakpoints) {
      delete this.breakpoints[address];
      return ok();
    } else {
      return error(1);
    }
  }

  static _uint32ToBytes(value) {
    if (value < 0)  {
      value = -value + 1;
    }
    return [
      (value >>> 0)  & 0xff,
      (value >>> 8)  & 0xff,
      (value >>> 16) & 0xff,
      (value >>> 24) & 0xff,
    ];
  }

  static _uint32ArrayToBytes(values) {
    const bytes = [];
    for (let i = 0; i < values.length; i++) {
      this._uint32ToBytes(values[i]).forEach(x => bytes.push(x));
    }
    return bytes;
  }

  static _bytesToUint32(bytes) {
    // Always end with a >>> 0 so that the number is treated as unsigned int.
    return (((bytes[0] & 0xff) << 0) |
      ((bytes[1] & 0xff) << 8) |
      ((bytes[2] & 0xff) << 16) |
      ((bytes[3] & 0xff) << 24)) >>> 0;
  }

  static _bytesToInt32Array(bytes) {
    const values = [];
    for (let i = 0; i < bytes.length; i += 4) {
      values.push(this._bytesToUint32(bytes.slice(i, i + 4)));
    }
    return values;
  }
}
