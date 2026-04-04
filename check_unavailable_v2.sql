SELECT sm.entity_id, s.state, datetime(s.last_updated_ts, 'unixepoch') as last_updated 
FROM states_meta sm 
JOIN states s ON s.metadata_id = sm.metadata_id 
WHERE s.state = 'unavailable' 
ORDER BY s.last_updated_ts DESC 
LIMIT 20;
