"""[stdlib] Canonical taxonomy fields, alias tables, and header mapping.
Pure logic — no libraries required.

Taxonomy sheets label their columns inconsistently and sometimes omit columns,
so instead of fixed headers we map each column onto a canonical field through
an alias table. Aliases are stored in normalize() form.
"""
import re

# Operational template header for generated and draft CSVs (9 columns).
OPERATIONAL_HEADERS = [
    "Category",
    "Event Label",
    "GA4 Event Name",
    "Description",
    "Parameter Name",
    "Parameter Type",
    "Parameter Description",
    "Example Value",
    # Blank is allowed. When blank, scope is resolved from an `items.` prefix
    # on the parameter name, and failing that from the registered custom
    # definitions at classification time.
    "Parameter Scope",
]

# Values are stored in normalize() form (whitespace and punctuation stripped,
# lowercased). Korean aliases come from real-world taxonomy sheets and MUST be
# kept — removing them breaks parsing for existing Korean users. They are not
# untranslated leftovers.
EVENT_FIELD_ALIASES = {
    "category": ["카테고리", "구분", "category"],
    "event_label": ["이벤트명", "이벤트이름", "이벤트",
                    "eventname", "eventlabel", "event"],
    "ga4_name": ["ga4이벤트명", "수집이벤트명",
                 "ga4eventname", "ga4name"],
    "event_description": ["설명", "이벤트설명",
                          "description", "desc", "eventdescription"],
    "param_name": ["이벤트매개변수명", "매개변수이름", "매개변수명", "이벤트매개변수",
                   # Names used in a parameter-type reference tab. One tab can
                   # carry several name/type pairs side by side, such as
                   # "custom parameter | type | (blank) | default parameter | type".
                   "맞춤매개변수", "기본매개변수", "커스텀매개변수", "공통매개변수",
                   "parametername", "paramname", "parameter", "eventparameter",
                   "customparameter", "defaultparameter"],
    "param_type": ["이벤트매개변수타입", "매개변수타입", "타입",
                   "type", "parametertype", "paramtype"],
    "param_description": ["이벤트매개변수설명", "매개변수설명", "이벤트매개변수값",
                          "parameterdescription", "paramdescription"],
    "param_example": ["이벤트매개변수값예시", "매개변수값예시", "값예시", "예시",
                      "example", "examplevalue", "samplevalue"],
    "param_scope": ["범위", "스코프", "적용범위", "매개변수범위", "매개변수스코프",
                    "scope", "paramscope", "parameterscope"],
}

# GA4 automatically collected + enhanced measurement events, plus app-stream
# automatically collected events. Single source of truth: taxonomy_diff.py
# derives its lookup frozenset from these keys, and taxonomy_draft.py uses
# these descriptions directly when drafting a taxonomy back from live data.
# Before this, the two modules each hardcoded their own copy of the same 13
# web event names with nothing keeping them in sync.
# The API does not expose "is this auto-collected", so this has to be
# hardcoded — same pattern as param_naming.STANDARD_EQUIVALENTS. Add an entry
# only after confirming it in the official documentation.
#
# Checked against the full official list (support.google.com/analytics/answer/
# 9234069) on 2026-07-22: it holds 43 names, this held 21. The 22 that were
# missing were all app-stream events — store purchases/refunds/subscriptions,
# AdMob, FCM notifications, Firebase in-app messaging and dynamic links.
# Anything absent here is classified as "collected but undefined", i.e. reported
# to the marketer as a gap in their taxonomy — so an incomplete list tells them
# to go document events that no one on their team can control or remove. The
# app_store_* four make that worst: they look like deliberate ecommerce
# instrumentation, so the false gap is also the most believable one.
#
# The list is one-directional in its failure mode. A name missing here produces
# a confident false gap; a name wrongly present here silently hides a real one.
# Neither is visible from the output, so re-check against the official page
# rather than reasoning about whether a name "looks automatic".
AUTO_COLLECTED_EVENTS = {
    # Web: enhanced measurement / automatically collected
    "first_visit": "When a user visits for the first time",
    "session_start": "When a session starts",
    "page_view": "When a page is viewed",
    "scroll": "When the user scrolls to the bottom of the page (90%)",
    "user_engagement": "When the page is active in the foreground",
    "form_start": "When a user first interacts with a form",
    "form_submit": "When a form is submitted",
    "click": "When a link leading off-site is clicked",
    "view_search_results": "When an on-site search is performed",
    "video_start": "When video playback starts",
    "video_progress": "When video playback reaches a progress checkpoint",
    "video_complete": "When video playback finishes",
    "file_download": "When a file is downloaded",
    # App streams: automatically collected
    "first_open": "When a user opens the app for the first time after installing or reinstalling",
    "screen_view": "When a screen is displayed in the app",
    "in_app_purchase": "When a user completes an in-app purchase through the App Store or Play Store",
    "os_update": "When the device's operating system updates to a new version",
    "app_update": "When the app updates to a new version and is then opened",
    "app_remove": "When the app is removed from an Android device (Play Store-detected)",
    "app_clear_data": "When a user clears the app's data on an Android device",
    "app_exception": "When the app crashes or throws an exception",
    "error": "When an event could not be recorded properly",
    # App streams: store purchases, refunds and subscriptions. Ecommerce-relevant
    # and easy to mistake for events the site/app team implemented deliberately —
    # they are not, so asking anyone to document them is asking for the
    # impossible.
    "app_store_refund": "When an in-app purchase is refunded by the store",
    "app_store_subscription_cancel": "When a paid subscription is cancelled",
    "app_store_subscription_convert": "When a free trial converts to a paid subscription",
    "app_store_subscription_renew": "When a paid subscription renews",
    # App streams: AdMob / Mobile Ads SDK
    "ad_click": "When a user clicks an ad",
    "ad_exposure": "When an ad from the Mobile Ads SDK appears on screen",
    # Also a GA4 *recommended* event: auto-collected from the Mobile Ads SDK on
    # app streams, but sent by hand on web. The draft cannot tell which stream a
    # name came from, so the description says both rather than picking one.
    "ad_impression": "When a user sees an ad impression (auto-collected from the Mobile Ads SDK on app streams; sent manually on web)",
    "ad_query": "When the Mobile Ads SDK makes an ad request",
    "ad_reward": "When a rewarded ad grants a reward",
    "adunit_exposure": "When an ad unit from the Mobile Ads SDK is displayed",
    # App streams: Firebase Cloud Messaging notifications
    "notification_dismiss": "When a user dismisses an FCM notification",
    "notification_foreground": "When an FCM notification arrives with the app in the foreground",
    "notification_open": "When a user opens an FCM notification",
    "notification_receive": "When an FCM notification arrives with the app in the background",
    # App streams: Firebase campaigns, in-app messaging, dynamic links
    "firebase_campaign": "When the app is launched with campaign parameters",
    "firebase_in_app_message_action": "When a user acts on a Firebase In-App Message",
    "firebase_in_app_message_dismiss": "When a user dismisses a Firebase In-App Message",
    "firebase_in_app_message_impression": "When a user sees a Firebase In-App Message",
    "dynamic_link_app_open": "When a user reopens the app via a dynamic link",
    "dynamic_link_app_update": "When the app is updated and opened via a dynamic link",
    "dynamic_link_first_open": "When a user opens the app for the first time via a dynamic link",
}

# GA4's *recommended* events: names Google defines a meaning for, but that the
# site or app has to send itself. Checked against the official list
# (support.google.com/analytics/answer/9267735) on 2026-07-22.
#
# Distinct from AUTO_COLLECTED_EVENTS in what it is used for. That list answers
# "the author cannot control this, so do not report it as a taxonomy gap".
# This one answers "the author does control this, and Google already defines
# what it means" — so a drafted taxonomy can fill the description in instead of
# handing back a blank row for one of the best-documented events in GA4.
# Getting `purchase` defined as something non-standard is upstream of every
# ecommerce analysis that follows.
#
# Failure mode is mild in both directions, unlike AUTO_COLLECTED_EVENTS: a name
# missing here costs a description the author writes anyway, and a wrong one is
# edited on sight. That is why a description is offered here but no claim about
# whether the event is instrumented.
#
# `ad_impression` is deliberately absent even though the official page lists it.
# It is also in AUTO_COLLECTED_EVENTS (the Mobile Ads SDK collects it on app
# streams) and the two tables must not both claim a name — the draft checks
# auto-collected first, so listing it here would be dead. Its auto-collected
# description carries the "sent manually on web" caveat instead.
RECOMMENDED_EVENTS = {
    # All properties
    "earn_virtual_currency": "When a user earns virtual currency",
    "generate_lead": "When a user submits a form or information request",
    "join_group": "When a user joins a group",
    "login": "When a user logs in",
    "search": "When a user searches the site or app",
    "select_content": "When a user selects content",
    "share": "When a user shares content",
    "sign_up": "When a user signs up for an account",
    "spend_virtual_currency": "When a user spends virtual currency",
    "tutorial_begin": "When a user begins a tutorial",
    "tutorial_complete": "When a user completes a tutorial",
    # Online sales / ecommerce
    "add_payment_info": "When a user submits payment information during checkout",
    "add_shipping_info": "When a user submits shipping information during checkout",
    "add_to_cart": "When a user adds items to the cart",
    "add_to_wishlist": "When a user adds items to a wishlist",
    "begin_checkout": "When a user begins checkout",
    "purchase": "When a user completes a purchase",
    "refund": "When a user receives a refund",
    "remove_from_cart": "When a user removes items from the cart",
    "select_item": "When a user selects an item from a list",
    "select_promotion": "When a user selects a promotion",
    "view_cart": "When a user views their cart",
    "view_item": "When a user views an item",
    "view_item_list": "When a user views a list of items",
    "view_promotion": "When a user views a promotion",
}


# up_ga4_name is deliberately given few aliases. The sheet that motivated it
# had a BLANK header on that column, so no alias could have found it — the
# reliable path is --map with a column letter. These are the header texts seen
# in the wild; none of them overlaps up_name's list, because detect_mapping
# takes the first field whose alias matches and an overlap would make the two
# columns fight for the same row.
USER_PROP_FIELD_ALIASES = {
    "up_name": ["사용자속성명", "속성명", "사용자속성",
                "userproperty", "userpropertyname", "name"],
    "up_ga4_name": ["ga4속성명", "속성api명", "apiname", "userpropertyapiname"],
    "up_type": ["타입", "type"],
    "up_description": ["설명", "description"],
    "up_example": ["값예시", "예시", "example", "examplevalue"],
}


# GA4 identifier rules: a name starts with a letter and then holds only
# letters, digits and underscores. That makes this a rule rather than a guess —
# a Korean label or anything with a space cannot be a GA4 name, so warning on
# one is never a false positive.
# support.google.com/analytics/answer/13316687 (checked 2026-08-15)
GA4_NAME_RE = re.compile(r"^[A-Za-z][A-Za-z0-9_]*$")


def is_valid_ga4_name(name) -> bool:
    """Whether this string could be a GA4 event/parameter/user-property name."""
    if not name:
        return False
    return bool(GA4_NAME_RE.match(str(name).strip()))


def normalize(s) -> str:
    """Lowercase, then strip whitespace/underscores/hyphens/dots. The baseline used for alias comparison."""
    return re.sub(r"[\s_\-.]+", "", str(s).strip().lower())


COLUMN_LETTER_RE = re.compile(r"^[A-Za-z]+$")


def column_letter_to_index(letter):
    """Spreadsheet column letter -> 0-based index. 'A'->0, 'B'->1, 'AA'->26.

    None when the value is not a column letter, which is how the caller decides
    whether a --map key is addressing a column or naming a header.

    Only letters are accepted; a numeric index is deliberately not supported,
    because 0-based and 1-based are both defensible and a reader cannot tell
    which was meant. The spreadsheet UI shows letters, so one notation is
    enough.
    """
    if letter is None:
        return None
    s = str(letter).strip().upper()
    if not s or not COLUMN_LETTER_RE.match(s):
        return None
    idx = 0
    for ch in s:
        idx = idx * 26 + (ord(ch) - ord("A") + 1)
    return idx - 1


def index_to_column_letter(idx) -> str:
    """0-based index -> spreadsheet column letter. Inverse of the above."""
    n = int(idx) + 1
    out = ""
    while n > 0:
        n, rem = divmod(n - 1, 26)
        out = chr(ord("A") + rem) + out
    return out


def detect_mapping(header_row, aliases):
    """Map a header row onto canonical fields. Returns ({field: col_index}, [unmapped original headers...])."""
    mapping = {}
    unmapped = []
    for idx, h in enumerate(header_row):
        header = "" if h is None else str(h).strip()
        if not header:
            continue
        norm = normalize(header)
        matched = None
        for field, names in aliases.items():
            if field in mapping:
                continue
            if norm in names:
                matched = field
                break
        if matched is not None:
            mapping[matched] = idx
        else:
            unmapped.append(header)
    return mapping, unmapped


# Rule A: headers that get reassigned to the GA4 name column when paired
# with `이벤트`/`Event` (the label). If one of these appears alone, it stays
# event_label as before — this list only applies when there's a pairing.
GA4_NAME_WHEN_PAIRED = ("이벤트명", "이벤트이름", "eventname")
LABEL_PAIR_TRIGGER = ("이벤트", "event")


def apply_event_context_rules(header_row, mapping, unmapped):
    """Apply the context-based reassignment rule for event headers.

    Rule A — if `이벤트`/`Event` and `이벤트명`/`Event Name` both appear in
    the header row, the latter is the GA4 name. If `이벤트명`/`Event Name`
    appears alone, this does nothing (keeps the existing behavior). If
    `ga4_name` is already mapped (an explicit `GA4 이벤트명` column), this
    does not intervene.
    """
    if "ga4_name" in mapping:
        return mapping, unmapped
    norms = {}
    for idx, h in enumerate(header_row):
        head = "" if h is None else str(h).strip()
        if head:
            norms.setdefault(normalize(head), (idx, head))
    trigger = next((t for t in LABEL_PAIR_TRIGGER if t in norms), None)
    if trigger is None:
        return mapping, unmapped
    if mapping.get("event_label") != norms[trigger][0]:
        return mapping, unmapped
    for cand in GA4_NAME_WHEN_PAIRED:
        if cand in norms:
            idx, head = norms[cand]
            mapping["ga4_name"] = idx
            unmapped = [h for h in unmapped if normalize(h) != cand]
            break
    return mapping, unmapped


# Rule B: user-property-only column names → canonical fields.
# up_description's aliases include the generic `설명`, so if an event
# description column sits further left, detect_mapping grabs that one
# first. When a dedicated column exists, it always wins.
USER_PROP_DEDICATED = {
    "사용자속성타입": "up_type",
    "사용자속성값": "up_description",
    "사용자속성설명": "up_description",
    "사용자속성값예시": "up_example",
    "사용자속성예시": "up_example",
}


def apply_user_prop_context_rules(header_row, mapping, unmapped):
    """Apply the context-based reassignment rule for user-property headers.

    Rule B — if a dedicated user-property column exists, it beats the
    generic columns (`설명`, `타입`, `값 예시`). If no dedicated column
    exists, this does nothing (keeps the existing behavior).
    """
    consumed = set()
    for idx, h in enumerate(header_row):
        head = "" if h is None else str(h).strip()
        if not head:
            continue
        norm = normalize(head)
        field = USER_PROP_DEDICATED.get(norm)
        if not field:
            continue
        mapping[field] = idx
        consumed.add(norm)
    if consumed:
        unmapped = [h for h in unmapped if normalize(h) not in consumed]
    return mapping, unmapped


def parse_map_arg(arg: str) -> dict:
    """'header=field,header2=field2' → {normalize(header): field}. For explicit mapping overrides."""
    out = {}
    if not arg:
        return out
    for pair in arg.split(","):
        pair = pair.strip()
        if not pair or "=" not in pair:
            continue
        header, field = pair.split("=", 1)
        key = normalize(header)
        # An empty key addresses nothing, and letting it through poisons
        # find_header_row: it joins the known-alias set, every blank cell then
        # scores, and a blank spacer row wins the header search.
        if not key:
            continue
        out[key] = field.strip()
    return out
