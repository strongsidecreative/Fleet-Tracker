-- Fleet Tracker — allow driver edits to send an approved booking back to
-- Pending Approval, without weakening the admin-only approve/decline guard.
-- Run after 0008_booking_approvals_recurring.sql

-- The 0008 guard blocked ANY change to approval_status unless is_admin().
-- That correctly stops a driver approving their own request, but it also
-- accidentally blocks the legitimate case of a driver editing an already
-- approved booking, which should demote it back to pending for re-review.
-- Replace the guard with a version that allows exactly that one narrow
-- transition (approved -> pending, by the booking's own driver, clearing
-- the previous decision) and nothing else.
create or replace function guard_approval_fields()
returns trigger as $$
declare
  is_driver_resubmit boolean;
begin
  is_driver_resubmit :=
    old.approval_status = 'approved'
    and new.approval_status = 'pending'
    and new.driver_id = auth.uid()
    and new.approving_admin_id is not distinct from old.approving_admin_id
    and new.decided_by is null
    and new.decided_at is null;

  if (new.approval_status is distinct from old.approval_status
      or new.approving_admin_id is distinct from old.approving_admin_id
      or new.decided_by is distinct from old.decided_by
      or new.decided_at is distinct from old.decided_at
      or new.decision_note is distinct from old.decision_note)
     and not is_admin()
     and not is_driver_resubmit then
    raise exception 'Only an admin can change a booking''s approval status.';
  end if;

  return new;
end;
$$ language plpgsql security definer;

-- Notify the approving admin again when a driver's edit sends their
-- booking back to pending (a genuine resubmission, not the original
-- request — that case is already handled by the INSERT trigger).
create or replace function notify_approving_admin_on_resubmit()
returns trigger as $$
begin
  if old.approval_status = 'approved' and new.approval_status = 'pending' and new.approving_admin_id is not null then
    insert into notifications (recipient_id, type, message, related_table, related_id)
    values (
      new.approving_admin_id,
      'booking_created',
      (select name from profiles where id = new.driver_id) || ' changed and resubmitted: ' ||
      coalesce(new.title, 'Booking') || ' — needs re-approval',
      'bookings',
      new.id
    );
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_notify_resubmit on bookings;
create trigger trg_notify_resubmit
  after update on bookings
  for each row execute function notify_approving_admin_on_resubmit();
