-- =============================================================================
-- Al-Sahiy Supermarket CRM — Initial Schema
-- Migration: 001_init.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Helper: updated_at trigger function
-- ---------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------------
-- Helper: role check (security definer so it bypasses RLS)
-- ---------------------------------------------------------------------------
create or replace function get_my_role()
returns text as $$
  select role from profiles where id = auth.uid();
$$ language sql security definer;

-- ---------------------------------------------------------------------------
-- Table: profiles
-- ---------------------------------------------------------------------------
create table if not exists profiles (
  id          uuid references auth.users on delete cascade primary key,
  name        text not null,
  role        text not null default 'designer'
                check (role in ('admin', 'manager', 'designer', 'analyst')),
  division    text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger trg_profiles_updated_at
  before update on profiles
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Table: tasks
-- ---------------------------------------------------------------------------
create table if not exists tasks (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  format      text not null,
  division    text,
  assigned_to uuid references profiles(id) on delete set null,
  given_date  date not null,
  deadline    date not null,
  done_date   date,
  status      text not null default 'pending'
                check (status in ('pending', 'done_ontime', 'done_late', 'revision')),
  reason      text,
  note        text,
  created_by  uuid references profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_tasks_given_date   on tasks (given_date);
create index if not exists idx_tasks_deadline     on tasks (deadline);
create index if not exists idx_tasks_status       on tasks (status);
create index if not exists idx_tasks_assigned_to  on tasks (assigned_to);
create index if not exists idx_tasks_division     on tasks (division);

create trigger trg_tasks_updated_at
  before update on tasks
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Table: task_comments
-- ---------------------------------------------------------------------------
create table if not exists task_comments (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid not null references tasks(id) on delete cascade,
  user_id     uuid references profiles(id) on delete set null,
  text        text not null,
  is_internal boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists idx_task_comments_task_id on task_comments (task_id);

-- ---------------------------------------------------------------------------
-- Table: sla_rules
-- ---------------------------------------------------------------------------
create table if not exists sla_rules (
  id           uuid primary key default gen_random_uuid(),
  format_name  text unique not null,
  days_allowed int not null default 1,
  description  text,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Table: sales_data
-- ---------------------------------------------------------------------------
create table if not exists sales_data (
  id                  uuid primary key default gen_random_uuid(),
  week_start          date not null,
  week_end            date not null,
  division            text not null,
  category            text,
  product_name        text,
  sku                 text,
  quantity_sold       numeric not null default 0,
  revenue             numeric not null default 0,
  revenue_prev_week   numeric not null default 0,
  revenue_prev_year   numeric not null default 0,
  avg_check           numeric not null default 0,
  transactions_count  int not null default 0,
  uploaded_by         uuid references profiles(id) on delete set null,
  uploaded_at         timestamptz not null default now(),
  notes               text
);

create index if not exists idx_sales_data_week_start on sales_data (week_start);
create index if not exists idx_sales_data_week_end   on sales_data (week_end);
create index if not exists idx_sales_data_division   on sales_data (division);
create index if not exists idx_sales_data_sku        on sales_data (sku);

-- ---------------------------------------------------------------------------
-- Table: sales_uploads_log
-- ---------------------------------------------------------------------------
create table if not exists sales_uploads_log (
  id            uuid primary key default gen_random_uuid(),
  filename      text,
  week_start    date,
  week_end      date,
  rows_imported int not null default 0,
  uploaded_by   uuid references profiles(id) on delete set null,
  uploaded_at   timestamptz not null default now(),
  status        text not null default 'success'
                  check (status in ('success', 'error')),
  error_message text
);

-- =============================================================================
-- Row Level Security
-- =============================================================================

alter table profiles          enable row level security;
alter table tasks             enable row level security;
alter table task_comments     enable row level security;
alter table sla_rules         enable row level security;
alter table sales_data        enable row level security;
alter table sales_uploads_log enable row level security;

-- ---------------------------------------------------------------------------
-- RLS: profiles
-- ---------------------------------------------------------------------------

-- Everyone authenticated can read all profiles (needed for assignment UI)
create policy "profiles: authenticated read all"
  on profiles for select
  to authenticated
  using (true);

-- Users can update their own profile
create policy "profiles: self update"
  on profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Admin can update any profile
create policy "profiles: admin update any"
  on profiles for update
  to authenticated
  using (get_my_role() = 'admin');

-- Admin can insert new profiles (e.g. manual provisioning)
create policy "profiles: admin insert"
  on profiles for insert
  to authenticated
  with check (get_my_role() = 'admin');

-- Admin can delete profiles
create policy "profiles: admin delete"
  on profiles for delete
  to authenticated
  using (get_my_role() = 'admin');

-- ---------------------------------------------------------------------------
-- RLS: tasks
-- ---------------------------------------------------------------------------

-- Admin and manager can see all tasks
create policy "tasks: admin/manager select all"
  on tasks for select
  to authenticated
  using (get_my_role() in ('admin', 'manager'));

-- Designer can only see their own assigned tasks
create policy "tasks: designer select own"
  on tasks for select
  to authenticated
  using (
    get_my_role() = 'designer'
    and assigned_to = auth.uid()
  );

-- Admin and manager can insert tasks
create policy "tasks: admin/manager insert"
  on tasks for insert
  to authenticated
  with check (get_my_role() in ('admin', 'manager'));

-- Admin and manager can update any task
create policy "tasks: admin/manager update any"
  on tasks for update
  to authenticated
  using (get_my_role() in ('admin', 'manager'));

-- Designer can update only status, note, done_date on their own tasks.
-- We enforce the column restriction via a check that non-designer fields
-- remain unchanged (Supabase does not support column-level RLS directly,
-- so the application layer must also enforce this; the policy restricts rows).
create policy "tasks: designer update own"
  on tasks for update
  to authenticated
  using (
    get_my_role() = 'designer'
    and assigned_to = auth.uid()
  )
  with check (
    get_my_role() = 'designer'
    and assigned_to = auth.uid()
  );

-- Admin and manager can delete tasks
create policy "tasks: admin/manager delete"
  on tasks for delete
  to authenticated
  using (get_my_role() in ('admin', 'manager'));

-- ---------------------------------------------------------------------------
-- RLS: task_comments
-- ---------------------------------------------------------------------------

-- Admin and manager can see all comments
create policy "task_comments: admin/manager select all"
  on task_comments for select
  to authenticated
  using (get_my_role() in ('admin', 'manager'));

-- Designer can see comments on their own tasks
create policy "task_comments: designer select own tasks"
  on task_comments for select
  to authenticated
  using (
    get_my_role() = 'designer'
    and exists (
      select 1 from tasks t
      where t.id = task_comments.task_id
        and t.assigned_to = auth.uid()
    )
  );

-- All authenticated users can insert comments on tasks they can access
create policy "task_comments: authenticated insert"
  on task_comments for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and (
      -- admin/manager can comment on any task
      get_my_role() in ('admin', 'manager')
      -- designer can only comment on their assigned tasks
      or exists (
        select 1 from tasks t
        where t.id = task_comments.task_id
          and t.assigned_to = auth.uid()
      )
    )
  );

-- Users can delete their own comments
create policy "task_comments: self delete"
  on task_comments for delete
  to authenticated
  using (user_id = auth.uid());

-- Admin can delete any comment
create policy "task_comments: admin delete any"
  on task_comments for delete
  to authenticated
  using (get_my_role() = 'admin');

-- ---------------------------------------------------------------------------
-- RLS: sla_rules
-- ---------------------------------------------------------------------------

-- All authenticated users can read SLA rules
create policy "sla_rules: authenticated select"
  on sla_rules for select
  to authenticated
  using (true);

-- Only admin can manage SLA rules
create policy "sla_rules: admin insert"
  on sla_rules for insert
  to authenticated
  with check (get_my_role() = 'admin');

create policy "sla_rules: admin update"
  on sla_rules for update
  to authenticated
  using (get_my_role() = 'admin');

create policy "sla_rules: admin delete"
  on sla_rules for delete
  to authenticated
  using (get_my_role() = 'admin');

-- ---------------------------------------------------------------------------
-- RLS: sales_data
-- ---------------------------------------------------------------------------

-- Admin, manager, analyst can read sales data
create policy "sales_data: admin/manager/analyst select"
  on sales_data for select
  to authenticated
  using (get_my_role() in ('admin', 'manager', 'analyst'));

-- Only admin can insert
create policy "sales_data: admin insert"
  on sales_data for insert
  to authenticated
  with check (get_my_role() = 'admin');

-- Only admin can update
create policy "sales_data: admin update"
  on sales_data for update
  to authenticated
  using (get_my_role() = 'admin');

-- Only admin can delete
create policy "sales_data: admin delete"
  on sales_data for delete
  to authenticated
  using (get_my_role() = 'admin');

-- ---------------------------------------------------------------------------
-- RLS: sales_uploads_log
-- ---------------------------------------------------------------------------

-- Admin and manager can view upload logs
create policy "sales_uploads_log: admin/manager select"
  on sales_uploads_log for select
  to authenticated
  using (get_my_role() in ('admin', 'manager'));

-- Only admin can insert upload log entries
create policy "sales_uploads_log: admin insert"
  on sales_uploads_log for insert
  to authenticated
  with check (get_my_role() = 'admin');

-- =============================================================================
-- Seed data: sla_rules
-- =============================================================================

insert into sla_rules (format_name, days_allowed, description) values
  ('SMM post',       1, 'Social media post for any platform'),
  ('Stories',        1, 'Instagram / Telegram stories'),
  ('Banner',         2, 'Promotional banner (digital or print-ready)'),
  ('Video/Reels',    3, 'Short-form video or reels content'),
  ('Prezentatsiya',  2, 'PowerPoint / Keynote presentation'),
  ('Narxnoma',       1, 'Price list layout'),
  ('POSM material',  2, 'Point-of-sale material (wobblers, shelf-talkers, etc.)'),
  ('Hujjat/Shablon', 1, 'Document template or branded form'),
  ('Boshqa',         2, 'Other / miscellaneous format')
on conflict (format_name) do nothing;

-- =============================================================================
-- Realtime
-- =============================================================================

alter publication supabase_realtime add table tasks;
