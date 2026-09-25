#!/usr/bin/env node
/**
 * Dependency-free stand-in for the EFinSight Spring backend, for developing the UI without Vertex AI / TrueLayer.
 * Mirrors the real response shapes (flat AuthResponse, Transaction entity, PlanResponseDto, conversations) and
 * quirks: unauthenticated requests get 403, /api/plan is slow, connect-bank redirects to /auth/success, another
 * user's conversation is a 404. Conversations live in memory and reset on restart.
 *
 *   npm run mock            # listens on :8080
 *   PORT=8081 npm run mock
 *
 * Demo login: jamie@example.com / password123 (bank connected, transactions already imported).
 * Any new sign-up starts with no bank: connect -> import -> dashboard.
 */
import http from 'node:http';
import { URL } from 'node:url';

const PORT = Number(process.env.PORT ?? 8080);
const PLAN_DELAY_MS = Number(process.env.PLAN_DELAY_MS ?? 6000);
const INGEST_DELAY_MS = Number(process.env.INGEST_DELAY_MS ?? 2500);

const users = new Map(); // email -> { id, email, password, firstName, lastName, bankConnected }
const txnsByUser = new Map(); // userId -> Transaction[]
const conversations = new Map(); // id -> { id, userId, title, createdAt, updatedAt, messages: [] }
let nextUserId = 1;
let nextTxnId = 1000;
let nextConversationId = 1;
let nextMessageId = 1;

// Same rule as the backend: first line of the question, cut at a word boundary to 80 characters
function titleFrom(question) {
  const t = question.trim().split('\n')[0].replace(/\s+/g, ' ');
  if (!t) return 'New conversation';
  if (t.length <= 80) return t;
  const cut = t.lastIndexOf(' ', 79);
  return `${t.slice(0, cut > 40 ? cut : 79).trimEnd()}…`;
}
const ownConversation = (user, id) => {
  const c = conversations.get(id);
  return c && c.userId === user.id ? c : null;
};
const conversationDetail = (c) => ({ id: c.id, title: c.title, createdAt: c.createdAt, updatedAt: c.updatedAt, messages: c.messages });

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const sign = (u) => `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: u.email, userId: u.id, exp: Math.floor(Date.now() / 1000) + 3600 })}.mock`;
function verify(token) {
  try {
    const p = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
    if (p.exp * 1000 < Date.now()) return null;
    return [...users.values()].find((u) => u.id === p.userId) ?? null;
  } catch {
    return null;
  }
}
const authResponse = (u) => ({ token: sign(u), type: 'Bearer', userId: u.id, email: u.email, firstName: u.firstName, lastName: u.lastName, bankConnected: u.bankConnected });

function addUser(email, password, firstName, lastName, bankConnected) {
  const u = { id: nextUserId++, email, password, firstName, lastName, bankConnected };
  users.set(email, u);
  return u;
}

// ---- sample data ----
const MERCHANTS = [
  { m: 'Tesco', d: 'TESCO STORES 4417', c: 'PURCHASE', lo: 12, hi: 62, w: 6 },
  { m: 'TfL', d: 'TFL TRAVEL CH', c: 'PURCHASE', lo: 3, hi: 16, w: 5 },
  { m: 'Amazon', d: 'AMZNMKTPLACE AMAZON.CO.UK', c: 'PURCHASE', lo: 8, hi: 45, w: 2 },
  { m: 'Deliveroo', d: 'DELIVEROO LONDON', c: 'PURCHASE', lo: 14, hi: 32, w: 2 },
  { m: 'Pret A Manger', d: 'PRET A MANGER 0231', c: 'PURCHASE', lo: 4, hi: 9, w: 3 },
  { m: 'Sainsbury’s', d: 'SAINSBURYS S/MKTS 1102', c: 'PURCHASE', lo: 10, hi: 48, w: 2 },
];
let seed = 42;
const rand = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const between = (lo, hi) => Math.round((lo + rand() * (hi - lo)) * 100) / 100;

function makeTransactions(userId) {
  const out = [];
  const now = new Date();
  const at = (daysAgo, hour = 9) => {
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    d.setHours(hour, Math.floor(rand() * 59), 0, 0);
    return d.toISOString();
  };
  const push = (o) =>
    out.push({
      id: nextTxnId++, userId, transactionId: `tl-${nextTxnId}-${Math.floor(rand() * 1e6)}`, accountId: 'acc-1', currency: 'GBP',
      providerTransactionCategory: o.credit ? 'CREDIT' : 'PURCHASE', ingestedAt: now.toISOString().slice(0, 19), chunked: true,
      transactionType: o.credit ? 'CREDIT' : 'DEBIT', ...o,
    });
  for (let day = 0; day < 90; day++) {
    for (const mer of MERCHANTS) {
      if (rand() < mer.w / 40) push({ timestamp: at(day, 8 + Math.floor(rand() * 12)), description: mer.d, merchantName: mer.m, transactionCategory: mer.c, amount: -between(mer.lo, mer.hi) });
    }
  }
  for (const m of [0, 1, 2]) {
    const off = m * 30 + 3;
    push({ timestamp: at(off + 2), description: 'OCTOPUS ENERGY DD', merchantName: 'Octopus Energy', transactionCategory: 'DIRECT_DEBIT', amount: -62 });
    push({ timestamp: at(off + 5), description: 'NETFLIX.COM', merchantName: 'Netflix', transactionCategory: 'DIRECT_DEBIT', amount: -10.99 });
    push({ timestamp: at(off + 8), description: 'Standing Order Rent', merchantName: null, transactionCategory: 'STANDING_ORDER', amount: -950 });
    push({ timestamp: at(off + 1), description: 'Faster Payment Salary', merchantName: null, transactionCategory: 'TRANSFER', amount: 2450, credit: true });
  }
  push({ timestamp: at(11), description: 'Transfer From Savings', merchantName: null, transactionCategory: 'TRANSFER', amount: 200, credit: true });
  return out;
}

// ---- http ----
function send(res, status, body, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json', ...headers });
  res.end(body === undefined ? '' : JSON.stringify(body));
}
const readBody = (req) =>
  new Promise((resolve) => {
    let s = '';
    req.on('data', (c) => (s += c));
    req.on('end', () => {
      try {
        resolve(s ? JSON.parse(s) : {});
      } catch {
        resolve({});
      }
    });
  });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;
  console.log(`${req.method} ${path}`);

  // ---- public ----
  if (req.method === 'POST' && path === '/api/auth/signup') {
    const b = await readBody(req);
    const errors = [];
    if (!b.email || !/^\S+@\S+\.\S+$/.test(b.email)) errors.push({ field: 'email', message: 'Invalid email format' });
    if (!b.password || b.password.length < 8) errors.push({ field: 'password', message: 'Password must be at least 8 characters' });
    if (!b.firstName) errors.push({ field: 'firstName', message: 'First name is required' });
    if (!b.lastName) errors.push({ field: 'lastName', message: 'Last name is required' });
    if (errors.length) return send(res, 400, { message: 'Validation failed', timestamp: new Date().toISOString(), errors });
    if (users.has(b.email)) return send(res, 400, { message: 'Email already exists', timestamp: new Date().toISOString() });
    return send(res, 200, authResponse(addUser(b.email, b.password, b.firstName, b.lastName, false)));
  }
  if (req.method === 'POST' && path === '/api/auth/login') {
    const b = await readBody(req);
    const u = users.get(b.email);
    if (!u || u.password !== b.password) return send(res, 401, { message: 'Invalid email or password', timestamp: new Date().toISOString() });
    return send(res, 200, authResponse(u));
  }
  if (req.method === 'GET' && path === '/auth/connect-bank') {
    const u = verify(url.searchParams.get('token') ?? '');
    if (!u) {
      res.writeHead(302, { Location: '/auth/error?message=invalid_token' });
      return res.end();
    }
    await sleep(600); // pretend to visit the bank
    if (url.searchParams.get('fail')) {
      res.writeHead(302, { Location: '/auth/error?message=access_denied' });
      return res.end();
    }
    u.bankConnected = true;
    // Relative redirect, like the real backend: the browser stays on whichever origin it came from.
    res.writeHead(302, { Location: '/auth/success' });
    return res.end();
  }

  // ---- protected: Spring answers unauthenticated requests with 403 ----
  const header = req.headers.authorization ?? '';
  const user = header.startsWith('Bearer ') ? verify(header.slice(7)) : null;
  if (!user) return send(res, 403, undefined);

  if (req.method === 'GET' && path === '/api/transactions/count') {
    return send(res, 200, { count: (txnsByUser.get(user.id) ?? []).length, userId: user.id });
  }
  if (req.method === 'GET' && path === '/api/transactions') {
    const list = txnsByUser.get(user.id) ?? [];
    return send(res, 200, { count: list.length, transactions: list });
  }
  if (req.method === 'POST' && path === '/api/transactions/ingest') {
    await sleep(INGEST_DELAY_MS);
    if (!user.bankConnected) return send(res, 500, { error: 'Failed to ingest transactions: no bank connected' });
    const existing = txnsByUser.get(user.id) ?? [];
    if (existing.length) return send(res, 200, { message: 'Transactions ingested successfully', count: 0, userId: user.id });
    const created = makeTransactions(user.id);
    txnsByUser.set(user.id, created);
    return send(res, 200, { message: 'Transactions ingested successfully', count: created.length, userId: user.id });
  }
  if (req.method === 'POST' && path === '/api/transactions/reprocess') {
    await sleep(INGEST_DELAY_MS);
    return send(res, 200, { message: 'Transactions reprocessed successfully', count: (txnsByUser.get(user.id) ?? []).length, userId: user.id });
  }
  if (req.method === 'GET' && path === '/api/conversations') {
    const mine = [...conversations.values()]
      .filter((c) => c.userId === user.id)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || b.id - a.id)
      .map((c) => ({ id: c.id, title: c.title, createdAt: c.createdAt, updatedAt: c.updatedAt, messageCount: c.messages.length }));
    return send(res, 200, { conversations: mine });
  }
  if (req.method === 'DELETE' && path === '/api/conversations') {
    for (const c of [...conversations.values()]) if (c.userId === user.id) conversations.delete(c.id);
    return send(res, 204, undefined);
  }
  const conversationMatch = path.match(/^\/api\/conversations\/(\d+)$/);
  if (conversationMatch) {
    const c = ownConversation(user, Number(conversationMatch[1]));
    if (!c) return send(res, 404, { message: 'Conversation not found', timestamp: new Date().toISOString() });
    if (req.method === 'GET') return send(res, 200, conversationDetail(c));
    if (req.method === 'DELETE') {
      conversations.delete(c.id);
      return send(res, 204, undefined);
    }
  }
  if (req.method === 'POST' && path === '/api/plan') {
    const { question, conversationId } = await readBody(req);
    if (!question || !String(question).trim()) return send(res, 400, { success: false, error: 'Question is required' });
    let conversation = null;
    if (conversationId != null) {
      conversation = ownConversation(user, Number(conversationId));
      if (!conversation) return send(res, 404, { success: false, error: 'Conversation not found' });
    }
    await sleep(PLAN_DELAY_MS);
    if (/fail/i.test(question)) return send(res, 200, { success: false, question, error: 'The advisor could not analyse this question.' });
    const mine = (txnsByUser.get(user.id) ?? []).filter((t) => t.amount < 0).slice(0, 5);
    const citations = mine.map((t) => ({
      transactionId: t.id, merchant: t.merchantName ?? undefined, amount: t.amount.toFixed(2), currency: t.currency,
      category: t.transactionCategory, date: t.timestamp, description: t.description,
    }));
    const earlier = conversation ? conversation.messages.filter((m) => m.role === 'user').length : 0;
    const response = {
      success: true, question,
      summary: earlier
        ? `Following up on “${conversation.messages[0].content}” (question ${earlier + 1} in this chat): here is a short answer to “${question}”.`
        : `Here is a short answer to “${question}”. **Groceries and transport** make up most of your spending.`,
      sections: {
        spendingAnalysis: 'Your biggest costs over the last 90 days were:\n\n- **Tesco** — the most frequent stop\n- **TfL** — steady weekly travel\n- **Rent** — one large fixed payment\n\n| Item | Trend |\n| --- | --- |\n| Groceries | steady |\n| Delivery | rising |',
        budgetRecommendations: 'Two changes would make the biggest difference:\n\n1. Set a monthly grocery target\n2. Cap takeaway and delivery spending\n\n[Read more](https://example.com) or <script>alert(1)</script> (sanitised).',
        investmentAdvice: 'Consider a cash ISA for any regular surplus, after building an emergency fund.',
      },
      citations, agentResponses: { spending_analysis: 'x', budget_plan: 'y', investment_advice: 'z' },
    };
    // Only successful answers are saved, like the backend
    const now = new Date().toISOString();
    if (!conversation) {
      conversation = { id: nextConversationId++, userId: user.id, title: titleFrom(String(question)), createdAt: now, updatedAt: now, messages: [] };
      conversations.set(conversation.id, conversation);
    }
    conversation.updatedAt = now;
    conversation.messages.push(
      { id: nextMessageId++, role: 'user', content: String(question).trim(), createdAt: now },
      { id: nextMessageId++, role: 'assistant', content: response.summary, createdAt: now, response: { ...response, conversationId: conversation.id, conversationTitle: conversation.title } },
    );
    return send(res, 200, { ...response, conversationId: conversation.id, conversationTitle: conversation.title });
  }
  return send(res, 404, { message: 'Not found' });
});

const demo = addUser('jamie@example.com', 'password123', 'Jamie', 'Carter', true);
txnsByUser.set(demo.id, makeTransactions(demo.id));

server.listen(PORT, () => {
  console.log(`Mock EFinSight backend on http://localhost:${PORT}`);
  console.log('Demo login: jamie@example.com / password123 (bank connected, transactions imported)');
});
