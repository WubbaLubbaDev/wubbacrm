-- Make refresh_token nullable — Google may not return a refresh_token on every
-- authorization (e.g. if the user re-authenticates and Google reuses the existing
-- grant). With prompt=consent we usually get one, but the column must not break
-- the UPSERT if it's absent.
ALTER TABLE public.google_oauth_tokens ALTER COLUMN refresh_token DROP NOT NULL;