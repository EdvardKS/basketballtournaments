-- Generic bracket plan: any (qualifiersPerGroup, wildcards) combination that
-- adds up to a power-of-two bracket size. Replaces the named-format approach
-- when both columns are non-null. Old format/size columns remain for
-- backward compatibility but the new plan takes precedence at provision time.
ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS bracket_qualifiers_per_group INT NULL,
  ADD COLUMN IF NOT EXISTS bracket_wildcards INT NULL;
