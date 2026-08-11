// ============================================================
// 양계장 습격 — 멀티플레이 릴레이 서버 (v0.10, 순수 중계 전용 — 패널 D23)
//
// 하는 일: 방 코드 발급 + 역할 라우팅 중계. 그게 전부다.
//   - 게임 시뮬레이션은 전부 호스트 브라우저 (호스트 권위 — 계획 문서 §1)
//   - 정적 파일 서빙 없음 — 친구 경로는 GitHub Pages + 별도 wss 릴레이
//   - 콘텐츠 검증 없음 (친구 신뢰 모델 — 검증은 호스트가)
//
// 실행:  npm install && node server.js         (기본 포트 8787, PORT 환경변수로 변경)
// 배포:  docs/multiplayer-deploy-20260812.md 참조 (wss 필수 — https 페이지에서 ws://는 차단됨)
// ============================================================
"use strict";
const { WebSocketServer } = require('ws');
const PORT = process.env.PORT || 8787;

const wss = new WebSocketServer({ port: PORT });
const rooms = new Map();   // code → {host, clients:Map(slot→ws), locked}
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';   // 혼동 문자(ILO01) 제외

function newCode() {
  for (let tries = 0; tries < 50; tries++) {
    let c = '';
    for (let i = 0; i < 4; i++) c += CODE_CHARS[(Math.random() * CODE_CHARS.length) | 0];
    if (!rooms.has(c)) return c;
  }
  return null;
}
function send(ws, o) { if (ws.readyState === 1) ws.send(JSON.stringify(o)); }
function closeRoom(code, why) {
  const r = rooms.get(code);
  if (!r) return;
  rooms.delete(code);
  for (const ws of r.clients.values()) { send(ws, { t: 'closed', why }); ws.close(); }
}

wss.on('connection', (ws) => {
  ws.alive = true;
  ws.on('pong', () => { ws.alive = true; });
  ws.on('message', (buf) => {
    let m; try { m = JSON.parse(buf); } catch (e) { return; }

    if (m.t === 'create') {                     // 호스트: 방 생성
      const code = newCode();
      if (!code) { send(ws, { t: 'err', why: 'full-server' }); return; }
      rooms.set(code, { host: ws, clients: new Map(), locked: false });
      ws.room = code; ws.slot = 0;
      send(ws, { t: 'created', code });
      return;
    }
    if (m.t === 'join') {                       // 클라: 방 참가
      const r = rooms.get((m.code || '').toUpperCase());
      if (!r) { send(ws, { t: 'err', why: 'noroom' }); return; }
      if (r.locked) { send(ws, { t: 'err', why: 'started' }); return; }
      if (r.clients.size >= 3) { send(ws, { t: 'err', why: 'full' }); return; }
      let slot = -1;
      for (let s = 1; s < 4; s++) if (!r.clients.has(s)) { slot = s; break; }
      if (slot < 0) { send(ws, { t: 'err', why: 'full' }); return; }
      r.clients.set(slot, ws);
      ws.room = (m.code || '').toUpperCase(); ws.slot = slot;
      send(ws, { t: 'joined', slot });
      send(r.host, { t: 'peer', slot, on: true });
      return;
    }

    const r = rooms.get(ws.room);
    if (!r) return;
    const isHost = (r.host === ws);
    // 역할 라우팅 강제 (D23) — 호스트만 방송/개별 전송, 클라는 호스트로만
    if (isHost) {
      if (m.t === 'lock') { r.locked = true; return; }
      if (m.t === 'unlock') { r.locked = false; return; }
      if (m.t === 'cast') { for (const c of r.clients.values()) send(c, { t: 'd', d: m.d }); return; }
      if (m.t === 'to') { const c = r.clients.get(m.slot); if (c) send(c, { t: 'd', d: m.d }); return; }
    } else {
      if (m.t === 'host') { send(r.host, { t: 'from', slot: ws.slot, d: m.d }); return; }
    }
  });
  ws.on('close', () => {
    const r = rooms.get(ws.room);
    if (!r) return;
    if (r.host === ws) closeRoom(ws.room, 'host-left');   // 호스트 소켓 종료 = 방 소멸 + 전원 통지
    else { r.clients.delete(ws.slot); send(r.host, { t: 'peer', slot: ws.slot, on: false }); }
  });
});

// 핑/퐁 15s — 반죽음 소켓 회수 (유령 슬롯이 4/4 정원을 파먹지 않게)
setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.alive) { ws.terminate(); continue; }
    ws.alive = false; ws.ping();
  }
}, 15000);

console.log('[릴레이] ws://localhost:' + PORT + ' — 방 코드 4자, 중계 전용 (시뮬은 호스트 브라우저)');
