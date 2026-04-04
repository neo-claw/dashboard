-- Sample: Deterministic recomputation of flattened_interaction for a single interaction_id
-- This is a simplified version for PoC; real query would mirror the original MV logic.

-- Assume materialized view flattened_interaction has a primary key (interaction_id)
-- and aggregates data from multiple tables.

-- Step: Compute the flattened row for interaction_id = $1
-- Using INSERT ... ON CONFLICT to upsert.

INSERT INTO flattened_interaction AS fi
SELECT
  ci.id AS interaction_id,
  ci.created_at,
  ci.updated_at,
  -- Example fields
  sts.session_type_state,
  sts.intent,
  sts.task,
  cls.classification,
  tr.transfer_case,
  -- coalesce overrides from interactions_reason_override
  COALESCE(iro.interaction_reason, fi.interaction_reason) AS interaction_reason,
  COALESCE(iro.interaction_subreason, fi.interaction_subreason) AS interaction_subreason,
  -- Add more fields as needed from joins
  ...
FROM
  customer_interaction ci
  LEFT JOIN session_type_state sts ON sts.interaction_id = ci.id AND sts.org_id = ci.org_id
  LEFT JOIN classification cls ON cls.interaction_id = ci.id AND cls.org_id = ci.org_id
  LEFT JOIN transfer_case tr ON tr.interaction_id = ci.id AND tr.org_id = ci.org_id
  LEFT JOIN interactions_reason_override iro ON iro.interaction_id = ci.id AND iro.org_id = ci.org_id
WHERE
  ci.id = $1
  AND ci.org_id = $2  -- if org-scoped
ON CONFLICT (interaction_id) DO UPDATE SET
  created_at = EXCLUDED.created_at,
  updated_at = EXCLUDED.updated_at,
  session_type_state = EXCLUDED.session_type_state,
  intent = EXCLUDED.intent,
  task = EXCLUDED.task,
  classification = EXCLUDED.classification,
  transfer_case = EXCLUDED.transfer_case,
  interaction_reason = EXCLUDED.interaction_reason,
  interaction_subreason = EXCLUDED.interaction_subreason;
-- Optionally RETURNING fi.interaction_id;
