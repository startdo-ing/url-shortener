-- F-001: links + click_events (see docs/features/F-001-redirect-core.md)

CREATE TABLE links (
    id UUID PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    destination_url TEXT NOT NULL,
    display_title TEXT,
    target_preview JSONB,
    preview_fetched_at TIMESTAMPTZ,
    redirect_type SMALLINT NOT NULL CHECK (redirect_type IN (301, 302)),
    status TEXT NOT NULL CHECK (status IN ('active', 'paused')),
    expires_at TIMESTAMPTZ,
    notes_markdown TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX links_slug_idx ON links (slug);

CREATE TABLE click_events (
    id BIGSERIAL PRIMARY KEY,
    link_id UUID NOT NULL REFERENCES links (id) ON DELETE CASCADE,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ip INET,
    referrer TEXT,
    user_agent TEXT,
    accept_language TEXT,
    country_code CHAR(2),
    region TEXT,
    city TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    browser TEXT,
    os TEXT,
    device_type TEXT,
    is_bot BOOLEAN NOT NULL DEFAULT false,
    raw_headers JSONB
);

CREATE INDEX click_events_link_id_occurred_at_idx ON click_events (link_id, occurred_at DESC);
