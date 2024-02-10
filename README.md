# gdbserver-stub
This is an attempt to implement a [GDB Remote Protocol](https://sourceware.org/gdb/current/onlinedocs/gdb.html/Remote-Protocol.html) stub and the [LLDB Extension](https://github.com/llvm/llvm-project/blob/main/lldb/docs/lldb-gdb-remote.txt) to better understand them.
Therefore, it is not intended to be used in production at all.

I only hope this code can provide some guidance for those who are interested in implementing GDB support to their project.

You can follow the journey of this development in my series
[Implement GDB Remote Debug Protocol Stub From Scratch 1](https://medium.com/swlh/implement-gdb-remote-debug-protocol-stub-from-scratch-1-a6ab2015bfc5),
[2](https://medium.com/@tatsuo.nomura/implement-gdb-remote-debug-protocol-stub-from-scratch-2-5e3025f0e987),
[3](https://medium.com/@tatsuo.nomura/implement-gdb-remote-debug-protocol-stub-from-scratch-3-e87a697ca48c),
[4](https://medium.com/@tatsuo.nomura/implement-gdb-remote-debug-protocol-stub-from-scratch-4-44f3b229f7d9),
[5](https://medium.com/@tatsuo.nomura/implement-gdb-remote-debug-protocol-stub-from-scratch-5-8aa247251709),
[6](https://medium.com/@tatsuo.nomura/implement-gdb-remote-debug-protocol-stub-from-scratch-6-1ac945e57399)

# gdb-server-stub.js
Implements the stub

# gdb-command-handler.js
The interface of the GDB command handler.

# r3000.js
A fake CPU that also implements the GDBCommandHandler.
