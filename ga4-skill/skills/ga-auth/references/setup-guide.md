# Setup Guide (Python venv)

`{SKILLS_DIR}` = the directory these ga skills are installed in (the parent of this skill's
directory; `.claude/skills` in a Claude Code project). Substitute the actual path.

The GA4 libraries can conflict with protobuf in the global environment, so we use an isolated venv.
The gcloud CLI is **not required.**

## 1. Create the venv and install the libraries
All four skills share one venv, so install **all three requirements files**. If you only install
ga-auth's, the taxonomy skill's (ga-taxonomy) Google Sheets/xlsx path later fails with
`No module named 'googleapiclient'`.

```bash
python3 -m venv .ga4/venv
.ga4/venv/bin/pip install -r {SKILLS_DIR}/ga-auth/requirements.txt
.ga4/venv/bin/pip install -r {SKILLS_DIR}/ga-taxonomy/requirements.txt
.ga4/venv/bin/pip install -r {SKILLS_DIR}/ga-use/requirements.txt
```

Verify — you're ready once the status check reports `deps_ready: true` (run with the system `python3`):
```bash
python3 {SKILLS_DIR}/ga-auth/scripts/ga4_status.py
```
If `deps_ready` is `false`, just run the `deps_fix` command that comes with it.
If it's `null`, the check itself failed (the venv's Python may be broken), so recreate the venv.

## 2. Log In (marketer)
Place the `oauth_client.json` you received from the administrator at `.ga4/oauth_client.json`, then:
```bash
.ga4/venv/bin/python {SKILLS_DIR}/ga-auth/scripts/ga4_login.py
```
When the browser opens, log in with a Google account that has GA4 access → **Allow**.
The token is saved to `.ga4/token.json` and refreshed automatically afterward.

> **Note:** this login must run with the browser and the script on the **same machine**
> (it uses loopback `localhost` redirection). Running it on a remote SSH/headless server means
> the local browser can't reach the server's localhost, and login will hang. In that case, log in
> on your own PC and copy the resulting `.ga4/token.json` to the server.

## 3. Verify the property connection
```bash
.ga4/venv/bin/python {SKILLS_DIR}/ga-auth/scripts/ga4_admin.py list-properties
```
It's working if this prints your GA4 properties as JSON.

## Troubleshooting
- **No oauth_client.json**: request one from your administrator (`references/admin-setup-guide.md`).
- **Login blocked/warned**: check whether the consent screen is Internal, or whether you're registered as a test user.
  For a personal gmail account: "unverified app → Advanced → Continue".
- **Token expired**: re-run `ga4_login.py` to log in again.
