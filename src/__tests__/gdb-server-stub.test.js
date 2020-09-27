/**
 * Copyright (c) Tatsuo Nomura <tatsuo.nomura@gmail.com>
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

jest.mock('net');
jest.mock('../gdb-command-handler.js');

import { Socket } from 'net';
import { ok, error, unsupported, stopped, GDBServerStub } from '../gdb-server-stub.js';
import { GDBCommandHandler } from '../gdb-command-handler.js';

beforeEach(() => {
  GDBCommandHandler.mockClear();
  Socket.mockClear();
});

test('unsupported', () => {
  expect(unsupported()).toEqual('');
});

test('ok', () => {
  expect(ok()).toEqual('OK');
  expect(ok('text')).toEqual('text');
  expect(ok([0x1a, 0x2b, 0x3c, 0x4d])).toEqual('1a2b3c4d');
});

test('ok value out of range', () => {
  expect(() => ok([0x100])).toThrow();
  expect(() => ok([1.1])).toThrow();
  expect(() => ok([-1])).toThrow();
});

test('ok unkown type', () => {
  expect(() => ok(['test'])).toThrow();
  expect(() => ok({})).toThrow();
});

test('stopped', () => {
  expect(stopped(0)).toEqual('S00');
  expect(stopped(5)).toEqual('S05');

  expect(() => stopped(-1)).toThrow();
  expect(() => stopped(0x100)).toThrow();
  expect(() => stopped()).toThrow();
  expect(() => stopped({})).toThrow();
  expect(() => stopped([])).toThrow();
});

test('error', () => {
  expect(error(0)).toEqual('E00');
  expect(error(0xa0)).toEqual('Ea0');
  
  expect(() => error()).toThrow();
  expect(() => error(0x100)).toThrow();
});

test('unsupported command', () => {
  const handler = new GDBCommandHandler;
  const stub = new GDBServerStub(handler);
  const socket = new Socket();
  stub.handlePacket(socket, 'UNKOWN');
  expect(socket.write).toHaveBeenCalledWith('+');
  expect(socket.write).toHaveBeenCalledWith('$#00');
});

test('? command', () => {
  const handler = new GDBCommandHandler;
  const stub = new GDBServerStub(handler);
  const socket = new Socket();
  handler.handleHaltReason.mockReturnValue("S05");
  stub.handlePacket(socket, '?');
  expect(socket.write).toHaveBeenCalledWith('+');
  expect(socket.write).toHaveBeenCalledWith('$S05#b8');
});

test('g command', () => {
  const handler = new GDBCommandHandler;
  const stub = new GDBServerStub(handler);
  const socket = new Socket();
  handler.handleReadRegisters.mockReturnValue("1234abcd");
  stub.handlePacket(socket, 'g');
  expect(socket.write).toHaveBeenCalledWith('+');
  expect(socket.write).toHaveBeenCalledWith('$1234abcd#54');
});

test('G command', () => {
  const handler = new GDBCommandHandler;
  const stub = new GDBServerStub(handler);
  const socket = new Socket();
  handler.handleWriteRegisters.mockReturnValue("OK");
  stub.handlePacket(socket, 'G1234abcd');
  expect(socket.write).toHaveBeenCalledWith('+');
  expect(socket.write).toHaveBeenCalledWith('$OK#9a');
});

test('m command', () => {
  const handler = new GDBCommandHandler;
  const stub = new GDBServerStub(handler);
  const socket = new Socket();
  handler.handleReadMemory.mockReturnValue("OK");
  stub.handlePacket(socket, 'm1234abCD,3000');
  expect(handler.handleReadMemory).toHaveBeenCalledWith(0x1234abcd, 0x3000);
  expect(socket.write).toHaveBeenCalledWith('+');
  expect(socket.write).toHaveBeenCalledWith('$OK#9a');
});

test('M command', () => {
  const handler = new GDBCommandHandler;
  const stub = new GDBServerStub(handler);
  const socket = new Socket();
  handler.handleWriteMemory.mockReturnValue("OK");
  stub.handlePacket(socket, 'M1234abCD,a:0102030405a0b0C0d0E0');
  expect(handler.handleWriteMemory).toHaveBeenCalledWith(0x1234abcd, [1,2,3,4,5,0xa0,0xb0,0xc0,0xd0,0xe0]);
  expect(socket.write).toHaveBeenCalledWith('+');
  expect(socket.write).toHaveBeenCalledWith('$OK#9a');
});


test('M command wrong length', () => {
  const handler = new GDBCommandHandler;
  const stub = new GDBServerStub(handler);
  const socket = new Socket();
  stub.handlePacket(socket, 'M1234abCD,1:0102');
  expect(handler.handleWriteMemory).toHaveBeenCalledTimes(0);
  expect(socket.write).toHaveBeenCalledWith('+');
  expect(socket.write).toHaveBeenCalledWith('$E00#a5');
});

test('s command', () => {
  const handler = new GDBCommandHandler;
  const stub = new GDBServerStub(handler);
  const socket = new Socket();
  handler.handleStep.mockReturnValue("OK");
  stub.handlePacket(socket, 's');
  expect(socket.write).toHaveBeenCalledWith('+');
  expect(socket.write).toHaveBeenCalledWith('$OK#9a');
});

test('s command with address', () => {
  const handler = new GDBCommandHandler;
  const stub = new GDBServerStub(handler);
  const socket = new Socket();
  handler.handleStep.mockReturnValue("OK");
  stub.handlePacket(socket, 'sabcd1234');
  expect(handler.handleStep).toHaveBeenCalledWith(0xabcd1234);
  expect(socket.write).toHaveBeenCalledWith('+');
  expect(socket.write).toHaveBeenCalledWith('$OK#9a');
});

test('c command', () => {
  const handler = new GDBCommandHandler;
  const stub = new GDBServerStub(handler);
  const socket = new Socket();
  handler.handleContinue.mockReturnValue("OK");
  stub.handlePacket(socket, 'c');
  expect(socket.write).toHaveBeenCalledWith('+');
  expect(socket.write).toHaveBeenCalledWith('$OK#9a');
});

test('c command with address', () => {
  const handler = new GDBCommandHandler;
  const stub = new GDBServerStub(handler);
  const socket = new Socket();
  handler.handleContinue.mockReturnValue("OK");
  stub.handlePacket(socket, 'cabcd1234');
  expect(handler.handleContinue).toHaveBeenCalledWith(0xabcd1234);
  expect(socket.write).toHaveBeenCalledWith('+');
  expect(socket.write).toHaveBeenCalledWith('$OK#9a');
});

test('qSupported command', () => {
  const handler = new GDBCommandHandler;
  const stub = new GDBServerStub(handler);
  const socket = new Socket();
  handler.handleQSupported.mockReturnValue("multiprocess+;fork-events-;xmlRegisters=mips");
  stub.handlePacket(socket, 'qSupported:multiprocess+;hwbreak-;fork-events+;no-resumed+;xmlRegisters=i386');
  expect(handler.handleQSupported).toHaveBeenCalledWith([
    {'multiprocess': true},
    {'hwbreak': false},
    {'fork-events': true},
    {'no-resumed': true},
    {'xmlRegisters': 'i386'}]);
  expect(socket.write).toHaveBeenCalledWith('+');
  expect(socket.write).toHaveBeenCalledWith('$multiprocess+;fork-events-;xmlRegisters=mips#6b');
});

test('QStartNoAckMode command', () => {
  const handler = new GDBCommandHandler;
  const stub = new GDBServerStub(handler);
  const socket = new Socket();

  handler.handleHaltReason.mockReturnValue("S05");
  handler.handleStartNoAckMode.mockReturnValue('OK');

  stub.handlePacket(socket, '?');
  stub.handlePacket(socket, 'QStartNoAckMode');
  expect(handler.handleStartNoAckMode).toHaveBeenCalled();
  stub.handlePacket(socket, '?');
  stub.handlePacket(socket, '?');
  expect(socket.write.mock.calls).toEqual([
    ['+'],        // ack to ?
    ['$S05#b8'],
    ['+'],        // ack to QStartNoAckMode
    ['$OK#9a'],
    ['$S05#b8'],  // no more acks
    ['$S05#b8'],
  ]);
});

test('qfThreadInfo command', () => {
  const handler = new GDBCommandHandler;
  const stub = new GDBServerStub(handler);
  const socket = new Socket();
  handler.handleThreadInfo.mockReturnValue("m1,2,3");
  stub.handlePacket(socket, 'qfThreadInfo');
  expect(handler.handleThreadInfo).toHaveBeenCalled();
  expect(socket.write).toHaveBeenCalledWith('+');
  expect(socket.write).toHaveBeenCalledWith('$m1,2,3#5b');
});

test('qsThreadInfo command', () => {
  const handler = new GDBCommandHandler;
  const stub = new GDBServerStub(handler);
  const socket = new Socket();
  stub.handlePacket(socket, 'qsThreadInfo');
  expect(handler.handleThreadInfo).toHaveBeenCalledTimes(0);
  expect(socket.write).toHaveBeenCalledWith('+');
  expect(socket.write).toHaveBeenCalledWith('$l#6c');
});

test('qMemoryRegionInfo command', () => {
  const handler = new GDBCommandHandler;
  const stub = new GDBServerStub(handler);
  const socket = new Socket();
  handler.handleMemoryRegionInfo.mockReturnValue("start:12340000;size:100;");
  stub.handlePacket(socket, 'qMemoryRegionInfo:1234dead');
  expect(handler.handleMemoryRegionInfo).toHaveBeenCalledWith(0x1234dead);
  expect(socket.write).toHaveBeenCalledWith('$start:12340000;size:100;#ee');
});

test('qC command', () => {
  const handler = new GDBCommandHandler;
  const stub = new GDBServerStub(handler);
  const socket = new Socket();
  handler.handleCurrentThread.mockReturnValue("QC1");
  stub.handlePacket(socket, 'qC');
  expect(handler.handleCurrentThread).toHaveBeenCalled();
  expect(socket.write).toHaveBeenCalledWith('+');
  expect(socket.write).toHaveBeenCalledWith('$QC1#c5');
});

test('Hc command', () => {
  const handler = new GDBCommandHandler;
  const stub = new GDBServerStub(handler);
  const socket = new Socket();
  handler.handleSelectExecutionThread.mockReturnValue("OK");
  stub.handlePacket(socket, 'Hc-1');
  expect(handler.handleSelectExecutionThread).toHaveBeenCalledWith(-1);
  expect(socket.write).toHaveBeenCalledWith('+');
  expect(socket.write).toHaveBeenCalledWith('$OK#9a');
});

test('Hg command', () => {
  const handler = new GDBCommandHandler;
  const stub = new GDBServerStub(handler);
  const socket = new Socket();
  handler.handleSelectRegisterThread.mockReturnValue("OK");
  stub.handlePacket(socket, 'Hg123');
  expect(handler.handleSelectRegisterThread).toHaveBeenCalledWith(0x123);
  expect(socket.write).toHaveBeenCalledWith('+');
  expect(socket.write).toHaveBeenCalledWith('$OK#9a');
});

test('Hm command', () => {
  const handler = new GDBCommandHandler;
  const stub = new GDBServerStub(handler);
  const socket = new Socket();
  handler.handleSelectMemoryThread.mockReturnValue("OK");
  stub.handlePacket(socket, 'Hm123');
  expect(handler.handleSelectMemoryThread).toHaveBeenCalledWith(0x123);
  expect(socket.write).toHaveBeenCalledWith('+');
  expect(socket.write).toHaveBeenCalledWith('$OK#9a');
});

test('Z command', () => {
  const handler = new GDBCommandHandler;
  const stub = new GDBServerStub(handler);
  const socket = new Socket();
  handler.handleAddBreakpoint.mockReturnValue("OK");
  stub.handlePacket(socket, 'Z1,1234,4');
  expect(handler.handleAddBreakpoint).toHaveBeenCalledWith(1, 0x1234, 4);
  expect(socket.write).toHaveBeenCalledWith('+');
  expect(socket.write).toHaveBeenCalledWith('$OK#9a');
});

test('z command', () => {
  const handler = new GDBCommandHandler;
  const stub = new GDBServerStub(handler);
  const socket = new Socket();
  handler.handleRemoveBreakpoint.mockReturnValue("OK");
  stub.handlePacket(socket, 'z1,1234,4');
  expect(handler.handleRemoveBreakpoint).toHaveBeenCalledWith(1, 0x1234, 4);
  expect(socket.write).toHaveBeenCalledWith('+');
  expect(socket.write).toHaveBeenCalledWith('$OK#9a');
});

test('z command with invalid type', () => {
  const handler = new GDBCommandHandler;
  const stub = new GDBServerStub(handler);
  const socket = new Socket();
  stub.handlePacket(socket, 'z5,1234,4');
  expect(handler.handleRemoveBreakpoint).toHaveBeenCalledTimes(0);
});