import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Savings Goal Calculator',
  description:
    'Work backwards from your savings goal. Find out how much you need to invest each month to reach your target.',
}

export default function SavingsGoalPage() {
  redirect('/compound-interest-calculator')
}
