/**
 * Copyright (c) Tatsuo Nomura <tatsuo.nomura@gmail.com>
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { R3000 } from "../r3000"

test('bytes to int32', () => {
  expect(R3000._bytesToUint32([0x10, 0x20, 0xa1, 0x05])).toBe(0x05a12010);
  expect(R3000._bytesToUint32([0xff, 0xff, 0xff, 0xef])).toBe(0xefffffff);
  expect(R3000._bytesToUint32([0x00, 0x00, 0x00, 0xf0])).toBe(0xf0000000);
  expect(R3000._bytesToUint32([0xf0, 0xde, 0xbc, 0x9a])).toBe(0x9abcdef0);
});

test('read registers', () => {
  const r3000 = new R3000();
  const regs = r3000.registers;
  for (let i = 0; i < 32; i++) {
    regs.gprs[i] = i * 0x1000;
  }
  regs.sr    = 0x10000000;
  regs.hi    = 0x12345678;
  regs.lo    = 0x9abcdef0;
  regs.bad   = 0xffffffff;
  regs.cause = 0xcccccccc;
  regs.pc    = 0x20000000;
  expect(r3000.handleReadRegisters())
    .toEqual(`
        00000000 00100000 00200000 00300000 00400000 00500000 00600000 00700000
        00800000 00900000 00a00000 00b00000 00c00000 00d00000 00e00000 00f00000
        00000100 00100100 00200100 00300100 00400100 00500100 00600100 00700100
        00800100 00900100 00a00100 00b00100 00c00100 00d00100 00e00100 00f00100
        00000010 78563412 f0debc9a ffffffff cccccccc 00000020
    `.replace(/[ \n]/g, ""));
});

test('write registers', () => {
  const r3000 = new R3000();
  const regs = r3000.registers;

  r3000.handleWriteRegisters([
    0xff, 0x00, 0x00, 0x00, 0x00, 0x10, 0x00, 0x00, 0x00, 0x20, 0x00, 0x00, 0x00, 0x30, 0x00, 0x00,
    0x00, 0x40, 0x00, 0x00, 0x00, 0x50, 0x00, 0x00, 0x00, 0x60, 0x00, 0x00, 0x00, 0x70, 0x00, 0x00,
    0x00, 0x80, 0x00, 0x00, 0x00, 0x90, 0x00, 0x00, 0x00, 0xa0, 0x00, 0x00, 0x00, 0xb0, 0x00, 0x00,
    0x00, 0xc0, 0x00, 0x00, 0x00, 0xd0, 0x00, 0x00, 0x00, 0xe0, 0x00, 0x00, 0x00, 0xf0, 0x00, 0x00,
    0x00, 0x00, 0x01, 0x00, 0x00, 0x10, 0x01, 0x00, 0x00, 0x20, 0x01, 0x00, 0x00, 0x30, 0x01, 0x00,
    0x00, 0x40, 0x01, 0x00, 0x00, 0x50, 0x01, 0x00, 0x00, 0x60, 0x01, 0x00, 0x00, 0x70, 0x01, 0x00,
    0x00, 0x80, 0x01, 0x00, 0x00, 0x90, 0x01, 0x00, 0x00, 0xa0, 0x01, 0x00, 0x00, 0xb0, 0x01, 0x00,
    0x00, 0xc0, 0x01, 0x00, 0x00, 0xd0, 0x01, 0x00, 0x00, 0xe0, 0x01, 0x00, 0x00, 0xf0, 0x01, 0x00,
    0x00, 0x00, 0x00, 0x10, 0x78, 0x56, 0x34, 0x12, 0xf0, 0xde, 0xbc, 0x9a, 0xff, 0xff, 0xff, 0xff,
    0xcc, 0xcc, 0xcc, 0xcc, 0x00, 0x00, 0x00, 0x20, 0xde, 0xad, 0xbe, 0xef, 0x12, 0x34, 0x56, 0x78,
  ]);

  // Zero register is always zero.
  expect(regs.gprs[0]).toBe(0);
  for (let i = 0; i < 32; i++) {
    expect(regs.gprs[i]).toBe(i * 0x1000);
  }
  expect(regs.sr).toBe(0x10000000);
  expect(regs.hi).toBe(0x12345678);
  expect(regs.lo).toBe(0x9abcdef0);
  expect(regs.bad).toBe(0xffffffff);
  expect(regs.cause).toBe(0xcccccccc);
  expect(regs.pc).toBe(0x20000000);
});

test('read memory', () => {
  const r3000 = new R3000();
  for (let i = 0; i < r3000.memory.length; i++) {
    r3000.memory[i] = i & 0xff;
  }
  expect(r3000.handleReadMemory(0xbfc00000, 100)).toBe(
    "000102030405060708090a0b0c0d0e0f" +
    "101112131415161718191a1b1c1d1e1f" +
    "202122232425262728292a2b2c2d2e2f" +
    "303132333435363738393a3b3c3d3e3f" + 
    "404142434445464748494a4b4c4d4e4f" +
    "505152535455565758595a5b5c5d5e5f" +
    "60616263");

});

test('read memory larger than size', () => {
  const r3000 = new R3000();
  for (let i = 0; i < r3000.memory.length; i++) {
    r3000.memory[i] = i & 0xff;
  }
  expect(r3000.handleReadMemory(0xbfc00000 + r3000.memory.length - 10, 100))
    .toBe("f6f7f8f9fafbfcfdfeff");
});

test('write memory', () => {
  const r3000 = new R3000();
  const values = [];
  for (let i = 0; i < 100; i++) {
    values.push(i & 0xff);
  }
  expect(r3000.handleWriteMemory(0xbfc00000, values)).toBe("OK");
  expect(r3000.memory.slice(0, 100)).toEqual(values);
  expect(r3000.handleWriteMemory(0xbfc00000 + 200, values)).toBe("OK");
  expect(r3000.memory.slice(200, 200 + 100)).toEqual(values);
});

test('write memory larger than size', () => {
  const r3000 = new R3000();
  const values = [];
  for (let i = 0; i < 100; i++) {
    values.push(i & 0xff);
  }
  expect(r3000.handleWriteMemory(0xbfc00000 + r3000.memory.length - 10, values)).toBe("E34");
  expect(r3000.memory.slice(r3000.memory.length - 10, r3000.memory.length)).toEqual([0,0,0,0,0,0,0,0,0,0]);
});

test('write step', () => {
  const r3000 = new R3000();
  r3000.registers.pc = 0x100;
  expect(r3000.handleStep()).toBe("OK");
  r3000.run(100);
  expect(r3000.registers.pc).toBe(0x104);
});

test('write continue', () => {
  const r3000 = new R3000();
  r3000.registers.pc = 0x100;
  expect(r3000.handleContinue()).toBe("OK");
  r3000.run(0x100);
  expect(r3000.registers.pc).toBe(0x100 + 0x100 * 4);
});

test('add/remove breakpoint', () => {
  const r3000 = new R3000();
  r3000.registers.pc = 0x100;
  expect(r3000.handleAddBreakpoint(1, 0x110, 4)).toBe("OK");
  r3000.handleContinue();
  r3000.run(0x100);
  expect(r3000.registers.pc).toBe(0x110);
  
  r3000.handleContinue();
  r3000.run(0x10);
  expect(r3000.registers.pc).toBe(0x110 + 0x40);
  
  r3000.registers.pc = 0x100;
  expect(r3000.handleRemoveBreakpoint(1, 0x110, 4)).toBe("OK");
  r3000.handleContinue();
  r3000.run(0x100);
  expect(r3000.registers.pc).toBe(0x100 + 0x100 * 4);

  expect(r3000.handleRemoveBreakpoint(1, 0x110, 4)).toBe("E01");
});