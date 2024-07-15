-- This file is autogenerated from regen-schema.ts
create table if not exists
  manalink_claims (manalink_id text not null, txn_id text not null);

-- Policies
alter table manalink_claims enable row level security;

drop policy if exists "public read" on manalink_claims;

create policy "public read" on manalink_claims for
select
  using (true);

-- Indexes
drop index if exists manalink_claims_pkey;

create unique index manalink_claims_pkey on public.manalink_claims using btree (manalink_id, txn_id);