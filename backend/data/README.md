# backend/data/

Runtime data mounted into the backend container at `/app/data`.

## csv/

CSV backups of tournament registrations. One file per tournament, named
`<tournament-match-date>.csv` (falling back to `<tournament-date>.csv`
or `<tournament-id>.csv` when both dates are null).

The file is rewritten from the DB after every:

- player registration / unregistration (`POST|DELETE /tournaments/:id/register`)
- captain assignment (`POST /tournaments/:id/captains`)
- admin add/remove player (`POST /tournaments/:id/add-player`,
  `DELETE /tournaments/:id/players/:playerId`)

So the file is always a consistent snapshot of the current registration
state for that tournament. CSV files themselves are gitignored — only
this README and the empty directory marker are tracked.

Columns (RFC 4180):

```
registered_at, tournament_id, tournament_name, tournament_match_date,
tournament_status, player_id, name, mobile, email, age, position,
is_captain, team_id, team_name, player_role,
gdpr_accepted, gdpr_accepted_at,
pace, shooting, passing, dribbling, defense, physical, overall,
player_created_at
```

Override the output directory with the `CSV_BACKUP_DIR` env var
(default: `/app/data/csv`).
