-- This file is autogenerated from regen-schema.ts
create table if not exists
  user_topic_interests (
    id bigint not null,
    user_id text not null,
    created_time timestamp with time zone default now() not null,
    group_ids_to_activity jsonb not null
  );

-- Indexes
drop index if exists user_topic_interests_pkey;

create unique index user_topic_interests_pkey on public.user_topic_interests using btree (id);

drop index if exists user_topic_interests_created_time;

create index user_topic_interests_created_time on public.user_topic_interests using btree (user_id, created_time desc);
