-- F-008: UTM templates, tags, link_tags (see docs/features/F-008-marketer-utm-tags-qr.md)

CREATE TABLE utm_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT utm_templates_name_len CHECK (char_length(trim(name)) >= 1 AND char_length(name) <= 128)
);

CREATE UNIQUE INDEX utm_templates_name_lower_idx ON utm_templates (lower(trim(name)));

CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT tags_name_len CHECK (char_length(name) >= 1 AND char_length(name) <= 64),
  CONSTRAINT tags_name_format CHECK (name ~ '^[a-z0-9]([a-z0-9._-]{0,62})$')
);

CREATE UNIQUE INDEX tags_name_idx ON tags (name);

CREATE TABLE link_tags (
  link_id UUID NOT NULL REFERENCES links (id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags (id) ON DELETE CASCADE,
  PRIMARY KEY (link_id, tag_id)
);

CREATE INDEX link_tags_tag_id_idx ON link_tags (tag_id);
