# 02: Service serves configuration and resolves tokens

**What to build:** The service exposes its configuration over its loopback routes: a read returning the
Configured host, the Project override and, per host, only whether an Access token is present; a write
setting the Configured host and Project override; and a way to set or clear the token for the current
host. `/proxy` stops requiring the caller to supply the token — it resolves the token for the request's
host from configuration and attaches it. Until the Panel is cut over, `/proxy` still accepts a body token
as a fallback so the shipped Panel keeps working.

**Blocked by:** 01 — Service configuration module

**Status:** done

- [x] The read route never returns a token, only whether one exists per host.
- [x] Writing the Configured host and Project override persists them; a later read returns them.
- [x] Setting a token stores it for the named host; clearing it removes it.
- [x] `/proxy` resolves the token for the request's host and attaches it with no body token supplied.
- [x] `/proxy` no longer reads a token from the body (contracted in 06); the service attaches the
      configured token only.
- [x] A request for a host with no token is a typed error, never an empty result.
- [x] A malformed or non-`https` host is refused before any call.
- [x] The token is never logged and is stripped from any returned body or error.
- [x] Every route, health included, still requires the host-issued bearer and binds only loopback.
- [x] Service tests cover the configuration routes and the token-resolving proxy through the pure
      handlers; `bun run check` stays green.
