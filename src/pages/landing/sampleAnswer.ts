import type { PlanResponse } from '@/api/types';

/** Illustrative sample shown on the landing page. Not real data. */
export const SAMPLE_QUESTION = 'Where am I spending the most?';
export const SAMPLE_ASKED_AT = '2026-09-21T10:42:00';

export const SAMPLE_RESPONSE: PlanResponse = {
  success: true,
  question: SAMPLE_QUESTION,
  summary:
    'Groceries and household bills make up most of your spending. **Tesco** is your single largest merchant, followed by your energy supplier and transport.',
  sections: {
    spendingAnalysis: [
      'Your largest merchants by total spend over the last 90 days were:',
      '',
      '- **Tesco** — £412.30 across 21 transactions',
      '- **Octopus Energy** — £186.00 in three monthly direct debits',
      '- **TfL** — £164.20 across 27 journeys',
      '- **Amazon** — £141.98 across 6 orders',
      '',
      'Card spending is steady week to week. The busiest week was in late August at about £395; the quietest recent week was about £203.',
    ].join('\n'),
    budgetRecommendations: [
      'Groceries average roughly £137 a month. Two changes would make the biggest difference:',
      '',
      '- Set a **£125 / month** grocery target — about £12 a month back.',
      '- Cap takeaway and delivery at **£60 / month**; you spent £98.40 with Deliveroo in the period.',
      '- Move any leftover at month end into savings the day after payday, not the day before the next one.',
    ].join('\n'),
    investmentAdvice:
      'Once your monthly budget is set, money left over could go into a cash ISA first, keeping an emergency fund of three to six months of spending before investing.',
  },
  citations: [
    { transactionId: 1, merchant: 'Tesco', description: 'TESCO STORES 4417', amount: '-45.20', currency: 'GBP', date: '2026-09-21T09:00:00' },
    { transactionId: 2, merchant: 'TfL', description: 'TFL TRAVEL CH', amount: '-8.90', currency: 'GBP', date: '2026-09-20T09:00:00' },
    { transactionId: 3, merchant: 'Octopus Energy', description: 'OCTOPUS ENERGY DD', amount: '-62.00', currency: 'GBP', date: '2026-09-19T09:00:00' },
    { transactionId: 4, merchant: 'Deliveroo', description: 'DELIVEROO LONDON', amount: '-24.60', currency: 'GBP', date: '2026-09-17T09:00:00' },
  ],
  agentResponses: { spending_analysis: '', budget_plan: '', investment_advice: '' },
};
