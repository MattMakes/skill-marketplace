---
name: systems
description: >-
  Systems-language references: C++ coding standards from the C++ Core Guidelines, asynchronous C++ networking with Boost.Asio or standalone Asio (TCP and UDP, SSL/TLS, timers, strands, io_context, coroutines and completion handlers), and Swift concurrency (actor isolation, Sendable, Swift 6.2 strict concurrency, SwiftUI) with a triage-fix-verify workflow. Use when writing, reviewing or refactoring C++, writing Asio networking code, or fixing Swift concurrency diagnostics. Read only the topic guide that applies.
---

# Systems languages

Each topic is a full guide in `topics/<name>/GUIDE.md`. Pick the topic, read its guide, and follow it.

| Topic | Read it when | Guide |
|---|---|---|
| `cpp-coding-standards` | Writing, reviewing or refactoring C++ | [`topics/cpp-coding-standards/GUIDE.md`](topics/cpp-coding-standards/GUIDE.md) |
| `boost-asio-pro` | Asynchronous C++ networking with Boost.Asio or standalone Asio | [`topics/boost-asio-pro/GUIDE.md`](topics/boost-asio-pro/GUIDE.md) |
| `swift-concurrency-expert` | Swift actor isolation, Sendable and strict-concurrency diagnostics | [`topics/swift-concurrency-expert/GUIDE.md`](topics/swift-concurrency-expert/GUIDE.md) |

Paths inside a guide are relative to that guide's folder. Other skills cite a topic as `software:systems` (topic `<name>`).

Credits per topic are in `NOTICE.md`.
