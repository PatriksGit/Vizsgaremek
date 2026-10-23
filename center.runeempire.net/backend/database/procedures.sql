-- Stored procedures of the RuneEmpire Center backend (MySQL 8).
--
-- Run it on the auth ("global") database. It can be run again at any time:
-- every procedure is dropped and recreated, the table is only created if missing.
-- The list of what each procedure is for is in procedures.txt.
--
-- The accounts table is owned by the PAxAuth plugin and is not created here.
-- Columns used: id, uuid, username, display_name, password_hash, email, created_at.
--
-- Collations: procedure parameters get the database's default collation
-- (utf8mb4_0900_ai_ci on MySQL 8+), which accounts uses too. The
-- pending_registrations table was created by Laravel with utf8mb4_unicode_ci,
-- so its email comparisons name that collation; without it MySQL refuses
-- them with "Illegal mix of collations".

-- ---------------------------------------------------------------------------
-- Table: pending_registrations (same as the Laravel migrations)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS pending_registrations (
    id            BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
    username      VARCHAR(16)      CHARACTER SET ascii NOT NULL,
    display_name  VARCHAR(16)      CHARACTER SET ascii NOT NULL,
    email         VARCHAR(255)     NOT NULL,
    password_hash VARCHAR(255)     NOT NULL,
    code_hash     CHAR(64)         NOT NULL,
    owner_hash    CHAR(64)         NULL,
    attempts      TINYINT UNSIGNED NOT NULL DEFAULT 0,
    expires_at    DATETIME         NOT NULL,
    created_at    DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    -- The backend tells which value was taken by these index names.
    UNIQUE KEY pending_registrations_username_unique (username),
    UNIQUE KEY pending_registrations_email_unique (email),
    KEY pending_registrations_expires_at_index (expires_at)
) DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

DELIMITER $$

-- ---------------------------------------------------------------------------
-- accounts
-- ---------------------------------------------------------------------------

-- 1. The logged-in player, loaded on every request from the id in the session.
DROP PROCEDURE IF EXISTS FindAccountById $$
CREATE PROCEDURE FindAccountById(IN p_id BIGINT UNSIGNED)
BEGIN
    SELECT id, uuid, username, display_name, password_hash, email, created_at
    FROM accounts
    WHERE id = p_id
    LIMIT 1;
END $$

-- 2. Login: the account of a (lowercase) username; the password is checked in PHP.
DROP PROCEDURE IF EXISTS FindAccountByUsername $$
CREATE PROCEDURE FindAccountByUsername(IN p_username VARCHAR(16))
BEGIN
    SELECT id, uuid, username, display_name, password_hash, email, created_at
    FROM accounts
    WHERE username = p_username
    LIMIT 1;
END $$

-- 3. Registration check: is the name taken? Returns found = 0 or 1.
DROP PROCEDURE IF EXISTS AccountUsernameExists $$
CREATE PROCEDURE AccountUsernameExists(IN p_username VARCHAR(16))
BEGIN
    SELECT EXISTS(SELECT 1 FROM accounts WHERE username = p_username) AS found;
END $$

-- 4. Registration check: is the email taken? Returns found = 0 or 1.
DROP PROCEDURE IF EXISTS AccountEmailExists $$
CREATE PROCEDURE AccountEmailExists(IN p_email VARCHAR(255))
BEGIN
    SELECT EXISTS(SELECT 1 FROM accounts WHERE email = p_email) AS found;
END $$

-- 5. Verification: did someone take the name or the email meanwhile? Returns found = 0 or 1.
DROP PROCEDURE IF EXISTS AccountUsernameOrEmailExists $$
CREATE PROCEDURE AccountUsernameOrEmailExists(IN p_username VARCHAR(16), IN p_email VARCHAR(255))
BEGIN
    SELECT EXISTS(SELECT 1 FROM accounts WHERE username = p_username OR email = p_email) AS found;
END $$

-- 6. A new account (registered_ip and created_at are left to their defaults). Returns its id.
DROP PROCEDURE IF EXISTS CreateAccount $$
CREATE PROCEDURE CreateAccount(
    IN p_uuid          CHAR(36),
    IN p_username      VARCHAR(16),
    IN p_display_name  VARCHAR(16),
    IN p_password_hash VARCHAR(255),
    IN p_email         VARCHAR(255)
)
BEGIN
    INSERT INTO accounts (uuid, username, display_name, password_hash, email)
    VALUES (p_uuid, p_username, p_display_name, p_password_hash, p_email);

    SELECT LAST_INSERT_ID() AS id;
END $$

-- 7. Password change: stores the new argon2id hash.
DROP PROCEDURE IF EXISTS UpdateAccountPassword $$
CREATE PROCEDURE UpdateAccountPassword(IN p_id BIGINT UNSIGNED, IN p_password_hash VARCHAR(255))
BEGIN
    UPDATE accounts
    SET password_hash = p_password_hash
    WHERE id = p_id;
END $$

-- ---------------------------------------------------------------------------
-- pending_registrations
-- ---------------------------------------------------------------------------

-- 8. Clears registrations whose code has expired. p_now comes from the
--    backend, so the comparison uses the same clock and time zone as expires_at.
DROP PROCEDURE IF EXISTS DeleteExpiredPendingRegistrations $$
CREATE PROCEDURE DeleteExpiredPendingRegistrations(IN p_now DATETIME)
BEGIN
    DELETE FROM pending_registrations
    WHERE expires_at <= p_now;
END $$

-- 9. The rows that already hold this name or this email (at most two).
DROP PROCEDURE IF EXISTS FindPendingRegistrationsByUsernameOrEmail $$
CREATE PROCEDURE FindPendingRegistrationsByUsernameOrEmail(IN p_username VARCHAR(16), IN p_email VARCHAR(255))
BEGIN
    SELECT id, username, display_name, email, password_hash, code_hash, owner_hash, attempts, expires_at, created_at
    FROM pending_registrations
    WHERE username = p_username OR email = p_email COLLATE utf8mb4_unicode_ci;
END $$

-- 10. A new registration waiting for its emailed code. Returns its id.
DROP PROCEDURE IF EXISTS CreatePendingRegistration $$
CREATE PROCEDURE CreatePendingRegistration(
    IN p_username      VARCHAR(16),
    IN p_display_name  VARCHAR(16),
    IN p_email         VARCHAR(255),
    IN p_password_hash VARCHAR(255),
    IN p_code_hash     CHAR(64),
    IN p_owner_hash    CHAR(64),
    IN p_expires_at    DATETIME
)
BEGIN
    INSERT INTO pending_registrations (username, display_name, email, password_hash, code_hash, owner_hash, expires_at)
    VALUES (p_username, p_display_name, p_email, p_password_hash, p_code_hash, p_owner_hash, p_expires_at);

    SELECT LAST_INSERT_ID() AS id;
END $$

-- 11. The registration of an email, locked until the transaction ends, so
--     parallel guesses are counted one by one. Call it inside a transaction.
DROP PROCEDURE IF EXISTS FindPendingRegistrationByEmailForUpdate $$
CREATE PROCEDURE FindPendingRegistrationByEmailForUpdate(IN p_email VARCHAR(255))
BEGIN
    SELECT id, username, display_name, email, password_hash, code_hash, owner_hash, attempts, expires_at, created_at
    FROM pending_registrations
    WHERE email = p_email COLLATE utf8mb4_unicode_ci
    LIMIT 1
    FOR UPDATE;
END $$

-- 12. Counts a wrong code.
DROP PROCEDURE IF EXISTS UpdatePendingRegistrationAttempts $$
CREATE PROCEDURE UpdatePendingRegistrationAttempts(IN p_id BIGINT UNSIGNED, IN p_attempts TINYINT UNSIGNED)
BEGIN
    UPDATE pending_registrations
    SET attempts = p_attempts
    WHERE id = p_id;
END $$

-- 13. Removes one registration (used up, replaced, expired or too many wrong codes).
DROP PROCEDURE IF EXISTS DeletePendingRegistration $$
CREATE PROCEDURE DeletePendingRegistration(IN p_id BIGINT UNSIGNED)
BEGIN
    DELETE FROM pending_registrations
    WHERE id = p_id;
END $$

DELIMITER ;
