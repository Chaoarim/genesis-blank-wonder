SELECT cron.schedule(
  'weekly-backup',
  '0 3 * * 0',
  $$
  SELECT net.http_post(
    url := 'https://orqysvmrmyqebjntloac.supabase.co/functions/v1/weekly-backup',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ycXlzdm1ybXlxZWJqbnRsb2FjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNTk5ODIsImV4cCI6MjA4NjkzNTk4Mn0.-I32sj9guy2DyFeqi9woLtoRYZoF7AAB788pnWxYVbM"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);