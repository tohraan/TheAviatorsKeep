-- Insert bucket if it doesn't exist
insert into storage.buckets (id, name, public)
values ('agency-uploads', 'agency-uploads', false)
on conflict (id) do nothing;

-- Add RLS policies for storage.objects
create policy "Allow auth users to upload to agency-uploads"
on storage.objects for insert
with check (bucket_id = 'agency-uploads' and auth.role() = 'authenticated');

create policy "Allow auth users to read agency-uploads"
on storage.objects for select
using (bucket_id = 'agency-uploads' and auth.role() = 'authenticated');
