-- Wrap auth.uid() in a scalar subselect so Postgres evaluates it once per query
-- (via an InitPlan) instead of once per row. Flagged by Supabase's performance
-- advisor (auth_rls_initplan) on every RLS-protected table; this was slowing down
-- reads/writes on tables like investment_transactions.

ALTER POLICY "Users own their backup_fund_transactions" ON public.backup_fund_transactions
  USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

ALTER POLICY "Users own their daily_targets" ON public.daily_targets
  USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

ALTER POLICY "Users manage own debt payments" ON public.debt_payments
  USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

ALTER POLICY "Users own their debts" ON public.debts
  USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

ALTER POLICY "Users own their deduction_payments" ON public.deduction_payments
  USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

ALTER POLICY "Users own their deductions" ON public.deductions
  USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

ALTER POLICY "Users own their expenses" ON public.expenses
  USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

ALTER POLICY "incomes_user_access" ON public.incomes
  USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

ALTER POLICY "Users own their investment_transactions" ON public.investment_transactions
  USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

ALTER POLICY "Users own their investments" ON public.investments
  USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

ALTER POLICY "Users manage own notes" ON public.notes
  USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

ALTER POLICY "Users can insert own profile" ON public.profiles
  WITH CHECK ((select auth.uid()) = user_id);

ALTER POLICY "Users can update own profile" ON public.profiles
  USING ((select auth.uid()) = user_id);

ALTER POLICY "Users can view own profile" ON public.profiles
  USING ((select auth.uid()) = user_id);

ALTER POLICY "Users manage own subscription renewals" ON public.subscription_renewals
  USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

ALTER POLICY "Users manage own subscriptions" ON public.subscriptions
  USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
