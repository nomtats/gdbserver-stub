/**
 * Copyright (c) Tatsuo Nomura <tatsuo.nomura@gmail.com>
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict'

import { createServer } from "net";

const log = console.log;
const server = createServer(socket => {
  log(`Connection accepted: ${socket.remoteAddress}:${socket.remotePort}`)
  socket.on("data", (data) => {
    log(`Incoming data:${data}`);
  });
  socket.on("close", () => log("Connection closed"));
});
server.on("error", err => { throw err; });
server.on("close", () => log("Echo Server, Shutdown"));

const port = 2424;
server.listen({ host: "localhost", port: port }, () => {
  log(`Started a server at ${port}`)
});
