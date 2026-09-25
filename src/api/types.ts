export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  bankConnected: boolean;
}

/**
 * Login / signup response. The backend today returns a flat object (userId, email, ...); the API brief
 * describes it nested under `user`. Both shapes are accepted and normalised in api/auth.ts.
 */
export interface RawAuthResponse {
  token: string;
  type?: string;
  user?: Partial<User> & { userId?: number };
  userId?: number;
  id?: number;
  email?: string;
  firstName?: string;
  lastName?: string;
  bankConnected?: boolean;
}

export interface AuthSession {
  token: string;
  user: User;
}

export interface SignupPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

/** A row as sent by GET /api/transactions (JPA entity serialised as-is). */
export interface RawTransaction {
  /** Numeric row id. Advisor citations reference this, not `transactionId`. */
  id: number;
  transactionId?: string | null;
  accountId?: string | null;
  /** UTC instant. */
  timestamp?: string | null;
  description?: string | null;
  /** BigDecimal sent as a JSON number. */
  amount?: number | string | null;
  currency?: string | null;
  /** DEBIT | CREDIT */
  transactionType?: string | null;
  /** PURCHASE | TRANSFER | DIRECT_DEBIT | ... A transaction *type*, not a spending category. */
  transactionCategory?: string | null;
  merchantName?: string | null;
  providerTransactionCategory?: string | null;
  /** LocalDateTime: no zone. */
  ingestedAt?: string | null;
}

export interface TransactionsResponse {
  count: number;
  transactions: RawTransaction[];
}

export interface CountResponse {
  count: number;
}

export interface IngestResponse {
  message?: string;
  count: number;
}

export interface PlanSections {
  spendingAnalysis?: string | null;
  budgetRecommendations?: string | null;
  investmentAdvice?: string | null;
}

export interface Citation {
  /** Numeric row id: join to RawTransaction.id. */
  transactionId: number;
  merchant?: string | null;
  /** Citations send amount as a string. */
  amount?: string | null;
  currency?: string | null;
  category?: string | null;
  date?: string | null;
  description?: string | null;
}

export interface PlanResponse {
  success: boolean;
  question?: string;
  summary?: string | null;
  sections?: PlanSections | null;
  citations?: Citation[] | null;
  agentResponses?: Record<string, string> | null;
  error?: string | null;
  /** The conversation the answer was saved to: a new one when the request didn't name one. */
  conversationId?: number | null;
  conversationTitle?: string | null;
}

/** GET /api/conversations item. Instants are ISO strings. */
export interface ConversationSummary {
  id: number;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

export interface ConversationListResponse {
  conversations: ConversationSummary[];
}

export interface ConversationMessage {
  id: number;
  role: 'user' | 'assistant';
  /** The question, or the answer's summary. */
  content: string;
  createdAt: string;
  /** Assistant messages only: the full answer as POST /api/plan returned it. */
  response?: PlanResponse | null;
}

/** GET /api/conversations/{id}: messages oldest first, alternating user / assistant. */
export interface ConversationDetail {
  id: number;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ConversationMessage[];
}
