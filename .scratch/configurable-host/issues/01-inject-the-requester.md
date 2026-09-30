# 01: Inject the requester into the GitLab client

**What to build:** A prefactor, so the transport can later be swapped without touching the GitLab
client. The client's fetch functions stop depending on the whole host port and take a plain request
function instead — the one thing they actually use. The Panel keeps passing the host bridge, so nothing
changes for the user and every existing test stays green.

**Blocked by:** None (can start immediately).

**Status:** done

- [x] The client's fetch functions take a request function, not the port.
- [x] The Panel supplies the host bridge's request as that function (`fromHostPort` keeps it bound).
- [x] No behaviour changes: the Pipelines, Jobs and Trace panel tests pass unchanged in intent.
- [x] The client tests exercise the fetch functions through a fake request function, plus a pass-through
      test asserting the built path and query reach the requester intact.
