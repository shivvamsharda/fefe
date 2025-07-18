
-- Fix the ambiguous column reference in generate_space_room_name function
CREATE OR REPLACE FUNCTION generate_space_room_name() RETURNS TEXT AS $$
DECLARE
    adjectives TEXT[] := ARRAY['bright', 'swift', 'calm', 'bold', 'wise', 'cool', 'warm', 'fresh', 'happy', 'sunny', 'clever', 'quick', 'smart', 'kind'];
    nouns TEXT[] := ARRAY['space', 'room', 'meet', 'chat', 'talk', 'flow', 'wave', 'beam', 'link', 'hub', 'zone', 'spot', 'place', 'area'];
    adjective TEXT;
    noun TEXT;
    number_suffix TEXT;
    generated_room_name TEXT;
    counter INT := 0;
BEGIN
    LOOP
        adjective := adjectives[1 + FLOOR(RANDOM() * array_length(adjectives, 1))::INT];
        noun := nouns[1 + FLOOR(RANDOM() * array_length(nouns, 1))::INT];
        number_suffix := LPAD((FLOOR(RANDOM() * 1000))::TEXT, 3, '0');
        generated_room_name := adjective || '-' || noun || '-' || number_suffix;
        
        -- Check if this room name already exists - using the renamed variable
        IF NOT EXISTS (SELECT 1 FROM public.spaces_v2 WHERE spaces_v2.room_name = generated_room_name) THEN
            RETURN generated_room_name;
        END IF;
        
        counter := counter + 1;
        -- Prevent infinite loop
        IF counter > 100 THEN
            generated_room_name := generated_room_name || '-' || FLOOR(RANDOM() * 1000)::TEXT;
            EXIT;
        END IF;
    END LOOP;
    
    RETURN generated_room_name;
END;
$$ LANGUAGE plpgsql;
