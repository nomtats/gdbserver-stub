/**
 * Copyright (c) Tatsuo Nomura <tatsuo.nomura@gmail.com>
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict'

import { R3000 } from "./r3000.js";
import { GDBServerStub } from "./gdb-server-stub.js";

function runServer() {
  const r3000 = new R3000();
  const server = new GDBServerStub(r3000);
  server.start("localhost", 2424);
}

if (process.env.NODE_ENV != 'test') {
  runServer();
}
