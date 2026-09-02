#!/usr/bin/env node
// Negative-control twin: a CLI that is deliberately not the ddd toolchain.
// It accepts any arguments, prints something else and exits 0, so the only way
// a replay against it can pass is if the harness compares nothing.
process.stdout.write("not the ddd cli\n");
