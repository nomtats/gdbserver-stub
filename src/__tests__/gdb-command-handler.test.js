/**
 * Copyright (c) Tatsuo Nomura <tatsuo.nomura@gmail.com>
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { GDBCommandHandler } from '../gdb-command-handler';

test('unsupported', () => {
  expect(GDBCommandHandler.unsupported()).toEqual('');
});

test('ok', () => {
  expect(GDBCommandHandler.ok()).toEqual('OK');
  expect(GDBCommandHandler.ok('text')).toEqual('text');
  expect(GDBCommandHandler.ok([0x1a, 0x2b, 0x3c, 0x4d])).toEqual('1a2b3c4d');
});

test('ok value out of range', () => {
  expect(() => GDBCommandHandler.ok([0x100])).toThrow();
  expect(() => GDBCommandHandler.ok([1.1])).toThrow();
  expect(() => GDBCommandHandler.ok([-1])).toThrow();
});

test('ok unkown type', () => {
  expect(() => GDBCommandHandler.ok(['test'])).toThrow();
  expect(() => GDBCommandHandler.ok({})).toThrow();
});

test('stopped', () => {
  expect(GDBCommandHandler.stopped(0)).toEqual('S00');
  expect(GDBCommandHandler.stopped(5)).toEqual('S05');

  expect(() => GDBCommandHandler.stopped(-1)).toThrow();
  expect(() => GDBCommandHandler.stopped(0x100)).toThrow();
  expect(() => GDBCommandHandler.stopped()).toThrow();
  expect(() => GDBCommandHandler.stopped({})).toThrow();
  expect(() => GDBCommandHandler.stopped([])).toThrow();
});

test('error', () => {
  expect(GDBCommandHandler.error(0)).toEqual('E00');
  expect(GDBCommandHandler.error(0xa0)).toEqual('Ea0');
  
  expect(() => GDBCommandHandler.error()).toThrow();
  expect(() => GDBCommandHandler.error(0x100)).toThrow();
});
