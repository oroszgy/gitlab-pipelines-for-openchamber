# 01: Service configuration module

**What to build:** The Proxy service gains a pure configuration store it will own. It holds the
Configured host (defaulting to `gitlab.com`), the Project override, and one Access token per host, and
persists them in a `0600` file at a per-user path. The module takes an injected filesystem and an injected
path/environment, so its tests need no disk. Nothing else is wired to it yet.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] Reading with no file present yields defaults: Configured host `gitlab.com`, no Project override, no
      tokens.
- [x] Configuration persists to and reads back from a per-user path resolved from the environment (XDG on
      Linux, Application Support on macOS, APPDATA on Windows).
- [x] The file is written `0600`; an existing file with looser permissions is read and rewritten `0600`.
- [x] An Access token can be set and cleared per host, and one host's token is unaffected by another's.
- [x] Resolving a token for a host returns it; a host with no token resolves to nothing.
- [x] A malformed host is rejected on write and never stored.
- [x] Tests drive the module through a fake filesystem and fake environment; none touches the real disk or
      the real config directory.
- [x] `bun run check` stays green.
