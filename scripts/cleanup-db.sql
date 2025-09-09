-- Disable triggers temporarily to avoid foreign key issues
ALTER TABLE quiz_attempts DISABLE TRIGGER ALL;
ALTER TABLE student_invitations DISABLE TRIGGER ALL;
ALTER TABLE scraped_content DISABLE TRIGGER ALL;
ALTER TABLE users DISABLE TRIGGER ALL;

-- Delete all data
DELETE FROM quiz_attempts;
DELETE FROM student_invitations;
DELETE FROM scraped_content;
DELETE FROM users;

-- Re-enable triggers
ALTER TABLE quiz_attempts ENABLE TRIGGER ALL;
ALTER TABLE student_invitations ENABLE TRIGGER ALL;
ALTER TABLE scraped_content ENABLE TRIGGER ALL;
ALTER TABLE users ENABLE TRIGGER ALL;
