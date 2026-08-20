-- KEYS[1] = room:lock:{roomId}
-- ARGV[1] = pairing_code
-- ARGV[2] = TTL in seconds (600)
-- Returns 1 if locked successfully, 0 if already locked

local lock_key = KEYS[1]
local is_locked = redis.call('SETNX', lock_key, ARGV[1])

if is_locked == 1 then
    redis.call('EXPIRE', lock_key, ARGV[2])
    return 1
else
    return 0
end
