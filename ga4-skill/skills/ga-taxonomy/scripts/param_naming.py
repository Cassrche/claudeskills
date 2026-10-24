"""[stdlib] Matching rules between taxonomy parameters and GA4 custom definitions. Pure logic — no API access.

This module does not invent lookup names. Whether a parameter is a dimension
or a metric lives only in the API response (custom_definitions.json), so this
module 'looks up' that registry rather than 'guessing' names.
"""

# Parameter name -> standard dimension name. These are queryable without
# registration, so flagging them as 'unregistered' would be a false positive.
# Every entry was confirmed against live property metadata before being added —
# never guess a name into this table. The dated blocks further down record which
# session added which entries and what evidence each one rests on; read those
# rather than trusting a running total here, which is the kind of number that
# goes stale the next time someone appends a row.
STANDARD_EQUIVALENTS = {
    "page_location": "pageLocation",
    "page_path": "pagePath",
    "page_title": "pageTitle",
    "page_referrer": "pageReferrer",
    "search_term": "searchTerm",
    "percent_scrolled": "percentScrolled",
    "link_url": "linkUrl",
    "file_name": "fileName",
    "video_title": "videoTitle",
    "method": "method",
    "content_type": "contentType",
    # Added 2026-07-22. Enhanced measurement sends these alongside the entries
    # above, from the same events, and GA4 populates the matching standard
    # dimension directly. Five were confirmed by querying a live property and
    # getting real values back: linkDomain, linkClasses, outbound (outbound
    # click), videoUrl, videoProvider (video events).
    "link_domain": "linkDomain",
    "link_classes": "linkClasses",
    "outbound": "outbound",
    "video_url": "videoUrl",
    "video_provider": "videoProvider",
    # These three came back "(not set)" on that property only because it has no
    # such data — no file_download events at all, and its outbound links carry
    # neither id nor text. The dimensions do exist in its metadata, and each is a
    # documented parameter of the very events whose siblings above are already
    # confirmed (link_url/file_name). Weaker evidence than the five above, so
    # recorded as such rather than presented as measured.
    "link_id": "linkId",
    "link_text": "linkText",
    "file_extension": "fileExtension",
    # Ecommerce event-level parameters. Added 2026-07-22 after running a real
    # taxonomy through the parser: a purchase event's currency, transaction_id
    # and coupon were all reported as "Not registered — cannot query", which
    # writes off a large part of ecommerce analysis for no reason. GA4 populates
    # each of these standard dimensions directly from the parameter, and all
    # four returned real values when queried on the measured property.
    #
    # transaction_id is the sharpest case: that property had a *custom
    # dimension* registered for it (customEvent:transaction_id) when GA4 already
    # provides transactionId as standard. Without this entry the guide's own
    # "prefer a standard dimension when one exists" advice can never fire.
    #
    # `coupon` is event-scope only, and that distinction is load-bearing: the
    # items array also has a `coupon` field, and GA4 has NO itemCoupon dimension
    # (checked against the property's metadata — its 18 item dimensions are
    # exactly the ones in ITEM_STANDARD_DIMENSIONS). An item-scoped `coupon`
    # therefore does need registering, and gets it right only because this table
    # is consulted for event scope alone.
    "currency": "currencyCode",
    "transaction_id": "transactionId",
    "coupon": "orderCoupon",
    "shipping_tier": "shippingTier",
}

# Event-scope parameters that GA4 exposes only as an aggregate metric, never as
# a dimension — the event-scope twin of ITEM_STANDARD_METRICS.
#
# `value` maps to eventValue rather than purchaseRevenue on purpose. eventValue
# is the sum of the `value` parameter across all events, which is what the
# parameter actually means; purchaseRevenue is what `value` happens to feed on
# the purchase event specifically. Mapping to purchaseRevenue would be right for
# one event and wrong for every other one that carries a value.
#
# Evidence differs across these three and is recorded rather than smoothed over:
# eventValue returned real data on the measured property, while shippingAmount
# and taxAmount came back empty there because the site never sends those
# parameters. The dimensions exist in its metadata eitherway — an empty result
# means "not populated here", not "not queryable".
EVENT_STANDARD_METRICS = {
    "value": "eventValue",
    "shipping": "shippingAmount",
    "tax": "taxAmount",
}

EVENT_METRIC_NOTE = ("Queryable without registration, but this is an aggregate "
                     "metric summed over the events, not the raw per-event value.")

# Names GA4 refuses to register as custom dimensions/metrics, from
# support.google.com/analytics/answer/13316687 (checked 2026-07-23). Google's
# wording: "Analytics will display an error message".
#
# This matters because "not registered" and "cannot be registered" lead to
# opposite advice. The first says ask an administrator; the second says the
# request will be rejected and the value will never be queryable through the
# Data API at all. Measured on a live taxonomy, it used 15 reserved names —
# `user_id` at event scope and `google_business_vertical` on every ecommerce
# event — and both were being reported as registration candidates.
#
# Checked *after* the standard-equivalent and registered branches on purpose:
# `currency` is on this list yet queryable as the standard currencyCode
# dimension, so the useful answer there is "use currencyCode", not "reserved".
RESERVED_PARAMETER_NAMES = frozenset({
    "cid", "currency", "customer_id", "customerid", "dclid", "gclid",
    "session_id", "sessionid", "sfmc_id", "sid", "srsltid", "uid",
    "user_id", "userid",
})
RESERVED_USER_PROPERTY_NAMES = frozenset({
    "cid", "customer_id", "customerid", "first_open_time", "session_id",
    "sessionid", "uid", "user_id", "userid",
})
RESERVED_PARAMETER_PREFIXES = ("_", "firebase_", "ga_", "google_", "gtag.")
RESERVED_USER_PROPERTY_PREFIXES = ("_", "firebase_", "ga_", "google_")


def reserved_reason(name, scope):
    """Why GA4 will not register this name, or None if it will."""
    text = str(name or "").strip().lower()
    if not text:
        return None
    # Item and event scope share the reserved list; only the noun differs, since
    # calling an items-array field an "event parameter" is inaccurate to the
    # author reading the message.
    if scope == "user":
        names, prefixes = RESERVED_USER_PROPERTY_NAMES, RESERVED_USER_PROPERTY_PREFIXES
    else:
        names, prefixes = RESERVED_PARAMETER_NAMES, RESERVED_PARAMETER_PREFIXES
    kind = {"user": "user property name",
            "item": "item parameter name"}.get(scope, "event parameter name")
    if text in names:
        return f"{name!r} is a reserved GA4 {kind}"
    for prefix in prefixes:
        if text.startswith(prefix):
            return f"{name!r} starts with {prefix!r}, a reserved GA4 prefix"
    return None


RESERVED_NOTE_TAIL = (
    " — GA4 rejects it as a custom definition, so this is not a registration "
    "request to make: it cannot be queried through the Data API at all "
    "(support.google.com/analytics/answer/13316687). The site can still send "
    "the parameter; it just never becomes a queryable dimension."
)

# Deliberately NOT in the table above, though each has a standard dimension that
# exists — and two of them return real data on a live property, which is exactly
# what makes them tempting:
#   language -> language     the device/browser language GA4 derives itself. A
#                            taxonomy parameter that happens to be named
#                            `language` is a different value entirely.
#   visible  -> visible      returns true/false live, but which event parameter
#                            feeds it could not be established. Unattributed.
#   achievement_id, character, group_id
#                            gaming recommended-event parameters, which require
#                            registration like any other custom parameter.
# This is the same trap the source/medium/campaign block below describes: a
# matching name is not evidence of a matching source.

# items array field name -> standard item-scoped dimension. Consulted ONLY when
# scope == "item". Applying it to an event-scoped parameter would reproduce the
# exact error the comment block below warns about: a bare `item_name` sent as a
# direct event parameter is a different value from itemName in the items array.
#
# Verified on 2026-07-21 against a live property's metadata: all 18 entries are
# real, and they cover every item-scoped dimension the property exposes.
# When adding an entry, always confirm it appears in the metadata first (no guessing).
ITEM_STANDARD_DIMENSIONS = {
    "item_id": "itemId",
    "item_name": "itemName",
    "item_brand": "itemBrand",
    "item_variant": "itemVariant",
    "item_category": "itemCategory",
    "item_category2": "itemCategory2",
    "item_category3": "itemCategory3",
    "item_category4": "itemCategory4",
    "item_category5": "itemCategory5",
    "item_list_id": "itemListId",
    "item_list_name": "itemListName",
    "index": "itemListPosition",
    "affiliation": "itemAffiliation",
    "location_id": "itemLocationID",
    "promotion_id": "itemPromotionId",
    "promotion_name": "itemPromotionName",
    "creative_name": "itemPromotionCreativeName",
    "creative_slot": "itemPromotionCreativeSlot",
}

# items array fields that have NO equivalent dimension — only an aggregate
# metric. Registration is neither required nor possible, so these count as
# standard_equivalent, but the value is an aggregate rather than the raw
# per-item figure. The note carries that caveat.
ITEM_STANDARD_METRICS = {
    "price": "itemRevenue",
    "quantity": "itemsPurchased",
    "discount": "itemDiscountAmount",
}

ITEM_METRIC_NOTE = ("Queryable without registration, but this is an aggregate "
                    "metric over the items array, not the raw per-item value.")

# The names below are **deliberately left out. Do not add them back.**
#
# STANDARD_EQUIVALENTS means "queryable as a standard dimension without
# registration." The entries above qualify because GA4's automatic collection
# and enhanced measurement **receive that exact parameter and use it directly
# to populate the matching standard dimension** (confirmed by measurement: the
# taxonomy's `method` value matched the standard `method` lookup result exactly).
#
# By contrast, the names below only look similar but come from a different
# source:
#   source   -> sessionSource        a **session-attribution** value GA4 computes
#   medium   -> sessionMedium        from UTM parameters/referrer
#   campaign -> sessionCampaignName  (unrelated to a directly-sent event parameter)
#   item_name -> itemName            an item-scoped value from the ecommerce
#                                     **items array**
#
# Adding these to the lookup table would tell users "no registration needed,"
# but querying them in practice returns plausible-looking data that belongs to
# something else entirely — not your parameter — and no error is raised.
# If you send these as direct event parameters, a custom dimension
# **registration is actually required**, so classifying them as
# defined_not_registered is the factually correct outcome.

# Reporting order for a metric's aggregation variants. default (the sum) comes first.
_AGGREGATION_ORDER = {"default": 0, "average": 1, "count": 2}

# Valid scopes for a GA4 custom definition. Guarded against literal values so a
# typo'd scope doesn't silently get classified as 'unregistered', which would
# send administrators a bogus registration request.
VALID_SCOPES = ("event", "user", "item")


def _validate_scope(scope):
    """Raises ValueError with the shared, user-facing message if scope is invalid.

    Shared by describe_parameter and resolve_scope so the error text can't
    drift between the two call sites — a report surfaces whichever one
    validated first, so the wording has to stay identical.
    """
    if scope not in VALID_SCOPES:
        raise ValueError(f"scope must be one of {VALID_SCOPES}: {scope!r}")


def registry_entries(registry, name):
    """Entries for one parameter from custom_definitions.json, defensively.

    taxonomy_diff degrades a registry that fails to parse or isn't an object,
    but never checked the shape INSIDE it — so a `by_parameter` that is a
    string, an entry that isn't a list, or a null element all reached
    `e.get(...)` and crashed with a raw AttributeError. This repo defends
    corrupt config.json and taxonomy.json explicitly (load_config,
    _event_names, _defined_parameters all degrade); custom_definitions.json
    was the one cache file left without that treatment, and a marketer must
    never be shown a stack trace.

    Found by enumerating dict-reading sites mechanically, the same way the
    ga-use sweep was finally done.
    """
    if not isinstance(registry, dict):
        return []
    by_param = registry.get("by_parameter")
    if not isinstance(by_param, dict):
        return []
    entries = by_param.get(name)
    if not isinstance(entries, list):
        return []
    return [e for e in entries if isinstance(e, dict)]


def describe_parameter(name, scope, registry):
    """Pull lookup info for a parameter from the registry (does not decide classification).

    -> {"parameter", "scope", "kind", "api_names", "unit"}
    If unregistered, kind/unit are None and api_names is an empty list.
    """
    _validate_scope(scope)

    entries = [e for e in registry_entries(registry, name) if e.get("scope") == scope]
    entries.sort(key=lambda e: _AGGREGATION_ORDER.get(e.get("aggregation", "default"),
                                                      len(_AGGREGATION_ORDER)))

    # Confirmed on 2026-07-20: on this property, no name is registered as both
    # a dimension and a metric at once (dimension suffixes ∩ metric suffixes = 0).
    # Whether GA4 forbids this outright is unconfirmed, so if a mixed case is
    # ever observed, kind should become a set instead.
    kind = entries[0].get("kind") if entries else None
    # Unit is only read from the default variant. The count variant is always
    # TYPE_INTEGER, and picking it up would turn a millisecond metric into an integer.
    # The kind guard is a harmless redundancy under the current schema (DimensionMetadata
    # has no type field, so dimension entries are None anyway regardless). Kept in case
    # the schema changes.
    unit = None
    for e in entries:
        if e.get("kind") == "metric" and e.get("aggregation", "default") == "default":
            unit = e.get("type")
            break

    return {
        "parameter": name,
        "scope": scope,
        "kind": kind,
        "api_names": [e["api_name"] for e in entries if e.get("api_name")],
        "unit": unit,
    }


def resolve_scope(name, declared_scope, registry):
    """Decide a parameter's scope. -> (scope, ambiguous)

    The taxonomy states the scope when it can (an `items.` prefix or a scope
    column); that statement always wins. When it can't, we do NOT guess from
    the name — we look up what is actually registered, which is a fact rather
    than an inference. Only when the registry is silent too do we fall back to
    'event' and flag the result as ambiguous, so the report can ask the user to
    make the scope explicit instead of quietly asserting one.

    `declared_scope` must be `None` (the parser looked and found nothing
    stated) or a member of VALID_SCOPES. Anything else is corrupt data, not
    "unstated" — raising here (like describe_parameter/classify_parameter)
    keeps a typo'd scope from being silently swallowed into a false
    ambiguous-event classification.
    """
    if declared_scope is not None:
        _validate_scope(declared_scope)
        return declared_scope, False
    scopes = {e.get("scope") for e in registry_entries(registry, name)}
    # GA4 permits registering the same name under both event and item scope at
    # once. When both are present this check order intentionally settles the
    # conflict in favor of event scope rather than flagging it ambiguous.
    if "event" in scopes:
        return "event", False
    if "item" in scopes:
        return "item", False
    return "event", True


# Every value classify_parameter can return, owned here so that consumers
# tallying classifications can derive their keys instead of restating them.
# taxonomy_diff._classify_section used to hardcode a three-key counter; when a
# fourth value (reserved_not_registerable) was added, that counter raised
# KeyError on any taxonomy containing a reserved name — a raw traceback where
# the marketer should have received one JSON blob. Restating a list is the kind
# of duplication a person is supposed to remember to update, and this repo has
# repeatedly learned that memory is the wrong enforcement mechanism.
CLASSIFICATIONS = (
    "defined_and_registered",
    "standard_equivalent",
    "reserved_not_registerable",
    "defined_not_registered",
)


def classify_parameter(name, scope, registry):
    """Classify a single parameter.

    -> {"parameter", "scope", "classification", "kind", "api_names",
       "standard_dimension", "standard_metric", "note", "ambiguous", "unit"}

    classification is one of four values:
      - defined_and_registered:  exists in the registry under the same scope
      - standard_equivalent:     unregistered but queryable as a standard
                                 dimension (or, for item metrics, as an
                                 aggregate metric)
      - reserved_not_registerable: GA4 refuses this name as a custom definition,
                                 so it is NOT a registration request to make —
                                 it can never be queried through the Data API
      - defined_not_registered:  none of the above -> a candidate for a
                                 registration request to the administrator
    """
    described = describe_parameter(name, scope, registry)
    standard = None
    standard_metric = None
    note = None
    if scope == "item":
        standard = ITEM_STANDARD_DIMENSIONS.get(name)
        if standard is None:
            standard_metric = ITEM_STANDARD_METRICS.get(name)
            if standard_metric:
                note = ITEM_METRIC_NOTE
    elif scope == "event":
        standard = STANDARD_EQUIVALENTS.get(name)
        if standard is None:
            standard_metric = EVENT_STANDARD_METRICS.get(name)
            if standard_metric:
                note = EVENT_METRIC_NOTE
    # else: scope == "user" — STANDARD_EQUIVALENTS is an event-scope table
    # (GA4's automatic collection/enhanced measurement receives these exact
    # parameters at event scope). A user-scoped parameter that merely shares a
    # name with an entry (e.g. "method") must not be matched against it.

    reserved = None
    if not described["api_names"] and not standard and not standard_metric:
        # Only asked when nothing else answered. A reserved name that is also a
        # standard equivalent (currency -> currencyCode) is queryable, and
        # "reserved" would be the less useful of the two true statements.
        reserved = reserved_reason(name, described["scope"])

    if described["api_names"]:
        classification = "defined_and_registered"
        # Registered as a custom definition even though GA4 already provides a
        # standard field for it. Observed on a live property: transaction_id and
        # search_term both had customEvent: dimensions registered while
        # transactionId and searchTerm exist as standard.
        #
        # The classification stays "registered" — it is. But saying only that
        # hides the cost: a custom dimension holds **no data from before it was
        # registered**, so querying orders through customEvent:transaction_id
        # silently drops every order that predates the registration, and the
        # standard field would have covered the whole history. It also spends one
        # of the property's limited custom-definition slots on something free.
        #
        # The guide already says to prefer a standard field when one exists; it
        # could never fire here because nothing reported that one existed.
        if standard or standard_metric:
            note = (
                f"Also available as the standard {standard or standard_metric} — "
                "prefer it. A custom definition holds no data from before it was "
                "registered, so the standard field covers periods this one cannot."
            )
    elif standard or standard_metric:
        classification = "standard_equivalent"
    elif reserved:
        classification = "reserved_not_registerable"
        note = reserved + RESERVED_NOTE_TAIL
    else:
        classification = "defined_not_registered"

    return {
        "parameter": described["parameter"],
        "scope": described["scope"],
        "classification": classification,
        "kind": described["kind"],
        "api_names": described["api_names"],
        "standard_dimension": standard,
        "standard_metric": standard_metric,
        "note": note,
        "ambiguous": False,
        "unit": described["unit"],
    }
