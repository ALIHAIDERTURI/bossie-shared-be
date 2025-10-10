-- SELECT CONSTRAINT_NAME 
-- FROM information_schema.TABLE_CONSTRAINTS 
-- WHERE TABLE_SCHEMA = 'bossie' 
-- AND TABLE_NAME = 'users' 
-- AND CONSTRAINT_NAME = 'users_ibfk_1';

-- ALTER TABLE users DROP FOREIGN KEY users_ibfk_2;
DROP TABLE IF EXISTS notifications;


-- ALTER TABLE users 
-- ADD CONSTRAINT users_ibfk_1 
-- FOREIGN KEY (rejectedBy) REFERENCES admin(id);

-- Remove notifications table from database
DROP TABLE IF EXISTS notifications;

-- Clear all entries from pushNotification table
DELETE FROM pushNotification;
