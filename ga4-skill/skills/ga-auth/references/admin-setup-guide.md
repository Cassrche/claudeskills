# Administrator Setup Guide (once per organization)

This skill uses a model where the organization's administrator creates an **OAuth client in
the org's own GCP project** once, and distributes that JSON to the org's marketers. Marketers
then only need a browser login — no gcloud.

> **Note on console labels:** Button and menu names below are the English
> Google Cloud console labels. The console follows the user's Google account
> language, so when guiding a Korean-speaking user, give the Korean labels
> instead (for example, "APIs & Services" appears as "API 및 서비스").

> **Who:** the administrator (needs GCP project edit access) — one person per organization
> **How often:** once per organization. Once `oauth_client.json` is created and distributed to marketers, you're done.
> **Deliverable:** a desktop-app OAuth client JSON → placed at the marketer's `.ga4/oauth_client.json`

## 1. Enable APIs in the GCP project
At https://console.cloud.google.com, select (or create) a project, then under **APIs & Services → Library**,
**Enable** each of the following two APIs:
- **Google Analytics Admin API**
- **Google Analytics Data API**

## 2. Configure the OAuth consent screen
**APIs & Services → OAuth consent screen** (new UI: **Google Auth Platform → Audience**)

Path A — **Workspace organization (recommended, least friction):**
- Choose **User type / Audience = Internal**. No verification needed, and none of the 100-user cap, 7-day expiry, warnings, or blocks apply.
- Fill in only the app name, support email, and developer contact, then save.

Path B — **personal gmail or no organization:**
- Choose **User type = External**. Fill in only the app name, support email, and developer email; the rest can be left blank.
- ⚠️ **The step most people miss — registering test users:**
  **You must add the email of the account you'll log in with here** (**+ ADD USERS** → email → save, up to 100).
  **An unregistered account gets blocked at login with "Access blocked: app is in testing mode."**
  If you'll log in with multiple accounts, add **all** of them.
- If the "unverified app" warning appears at login, proceed via **Advanced → Continue** (this is normal — it's your own unverified app).
- (In testing mode, tokens expire every 7 days, so you may need to log in again periodically.)

> The scopes step can be left blank. At login, the script requests `analytics.readonly` and `spreadsheets.readonly` itself.

## 3. Create the OAuth client ID (desktop app)
**APIs & Services → Credentials → Create Credentials → OAuth client ID**
(new UI: **Google Auth Platform → Clients → Create Client**)
- **Application type = Desktop app**
- Enter a name and **Create** → once created, **download the JSON**

## 4. Distribute to marketers
Have each marketer place the downloaded JSON at their project's **`.ga4/oauth_client.json`**:
```bash
mkdir -p .ga4
cp ~/Downloads/client_secret_XXXX.json .ga4/oauth_client.json
```
- A desktop-app OAuth client's client_secret isn't a real secret (desktop apps can't keep one hidden),
  so it's fine to hand the same file to every marketer in the organization.
- `.ga4/` is gitignored, so it never ends up in the repository.

## 5. What the marketer's login screen looks like (good to know in advance)
Running `ga4_login.py` opens a browser, and for a personal gmail account (unverified app) the flow goes:
1. **Select the account to log in with** (the one registered as a test user)
2. **"Google hasn't verified this app"** warning → **this is normal** → **Advanced → "Go to ... (unsafe)" → Continue**
3. The **"View your Google Analytics data"** permission prompt → **Allow**
   - Because the taxonomy is also read from a **Google Sheet**, the **"View your Google Sheets"** permission also appears. **Allow** that one too (it's read-only).
4. **"The authentication flow has completed. You may close this window."** → success, close the window

## 6. Switching accounts (log in as a different account)
Re-running `ga4_login.py` lets you log in as a different account (it overwrites the token).
However, **if it's a personal gmail account, the new account must first be added as a test user** per step 2 above. Otherwise you'll get "Access blocked."

## 7. Notes
- Marketers must log in with a **Google account that has access to the GA4 property**
  (GA4 Admin → Property Access Management) for data to appear. If login succeeds but the property list is empty, it's almost always the wrong account.
- Quota is billed against the GCP project this OAuth client belongs to (the one where you enabled the APIs in step 1).
- Offboarding: just revoke that individual account's access. There's no need to redistribute the client JSON.
