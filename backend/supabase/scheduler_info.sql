create table if not exists
  scheduler_info (
    id bigint generated by default as identity primary key,
    job_name text not null,
    created_time timestamp with time zone default now() not null,
    last_start_time timestamp with time zone,
    last_end_time timestamp with time zone
  );

-- Policies
alter table scheduler_info enable row level security;

drop policy if exists "public read" on scheduler_info;

create policy "public read" on scheduler_info for all using (true);

-- Indexes
drop index if exists scheduler_info_job_name_key;

create unique index scheduler_info_job_name_key on public.scheduler_info using btree (job_name);
