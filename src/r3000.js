/**
 * Copyright (c) Tatsuo Nomura <tatsuo.nomura@gmail.com>
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { GDBCommandHandler } from './gdb-command-handler.js';
import { ok, stopped, error, ERROR_BAD_ACCESS_SIZE_FOR_ADDRESS } from './gdb-server-stub.js';

const log = console.log;

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
      fcsr: 0,
      fir: 0,
    }

    this.memory = new Array(1024).fill(0);

    // Set the initial content of memory just for fun.
    // asm:
    //   li t0
    //   li t1
    //   add t2, t0, t1
    this.handleWriteMemory(0xbfc00000, R3000._uint32ArrayToBytes([0x200803e8, 0x200907d0, 0x01095020]));
  }

  handleHaltReason() {
    // Use stop reason SIGTRAP(5).
    return stopped(5);
  }

  handleReadRegisters() {
    log("readRegisters");
    const r = this.registers;
    const values = [...r.gprs, r.sr, r.hi, r.lo, r.bad, r.cause, r.pc, r.fcsr, r.fir];
    return ok(R3000._uint32ArrayToBytes(values));
  }

  handleWriteRegisters(bytes) {
    log("writeRegisters");
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
    log("readMemory");
    const start = Math.max(address - 0xbfc00000, 0);
    const end = Math.min(start + length, this.memory.length);
    return ok(this.memory.slice(start, end));
  }

  handleWriteMemory(address, values) {
    log("writeMemory");
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
    log("step");
    if (address) {
      this.registers.pc = address
    }
    this.registers.pc += 4;
    return stopped(5);
  }

  handleContinue(address) {
    log("continue");
    if (address) {
      this.registers.pc = address
    }
    this.registers.pc += 4;
    return stopped(5);
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