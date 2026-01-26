-- Migration: Enforce Single Conversation per Client
-- 1. Merge duplicate conversations
-- 2. Add UNIQUE constraint

DO $$ 
DECLARE 
    r RECORD;
    primary_id UUID;
BEGIN
    -- Loop through clients who have > 1 conversation
    FOR r IN 
        SELECT client_id 
        FROM conversations 
        GROUP BY client_id 
        HAVING count(*) > 1
    LOOP
        RAISE NOTICE 'Merging conversations for client %', r.client_id;

        -- Get the ID of the oldest conversation (Primary) - this will be the one we keep
        SELECT id INTO primary_id
        FROM conversations
        WHERE client_id = r.client_id
        ORDER BY created_at ASC
        LIMIT 1;

        -- Move messages from other conversations to Primary
        UPDATE messages
        SET conversation_id = primary_id
        WHERE conversation_id IN (
            SELECT id FROM conversations 
            WHERE client_id = r.client_id AND id != primary_id
        );

        -- Delete the other conversations (now empty of messages)
        DELETE FROM conversations
        WHERE client_id = r.client_id AND id != primary_id;
        
    END LOOP;
END $$;

-- Add Constraint to prevent future duplicates
ALTER TABLE conversations
ADD CONSTRAINT unique_client_chat UNIQUE (client_id);
