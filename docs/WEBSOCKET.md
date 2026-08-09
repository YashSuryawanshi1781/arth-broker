# WebSocket dual support (SSE primary)

Arth streams live market ticks over **Server-Sent Events** (`GET /api/market/stream`). SSE is the production path today.

## Optional hook

`MarketEngine.broadcast` already calls an optional hook after writing SSE:

```js
this.wsSend?.(payload)
```

Set `market.wsSend = (payload) => { /* fan-out to WS clients */ }` when you add a real WebSocket layer. Until then the hook is a no-op.

## Enabling later (`ENABLE_WS=true`)

1. Add a WebSocket library (e.g. `ws`) **or** terminate WS at a reverse proxy.
2. On HTTP server `listen`, upgrade `/api/market/ws` and keep a `Set` of sockets.
3. Assign `market.wsSend = (payload) => { for (const socket of wsClients) socket.send(JSON.stringify(payload)) }`.
4. Keep SSE as the default for browsers; use WS for native clients that prefer bi-directional sockets.

## Why SSE first

- Works with cookie auth and standard Express middleware
- Automatic reconnect via `EventSource`
- No extra npm dependency
- Sufficient for one-way tick fan-out

When `ENABLE_WS=true` without a WS implementation, the API may log:

`WS dual support stub — SSE remains primary`
