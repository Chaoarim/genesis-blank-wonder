-- Habilitar Realtime para atualização instantânea no Analytics
ALTER PUBLICATION supabase_realtime ADD TABLE public.pre_registrations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.webhook_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_subscriptions;