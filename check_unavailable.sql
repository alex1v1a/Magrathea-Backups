SELECT entity_id, state, last_updated FROM states WHERE state = 'unavailable' ORDER BY last_updated DESC LIMIT 20;
