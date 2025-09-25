const crypto = require('crypto');

// 암호화 설정
const ALGORITHM = 'aes-256-gcm';
const SECRET_KEY = process.env.ENCRYPTION_SECRET_KEY || 'timbel-infrastructure-secret-key-2025';
const IV_LENGTH = 16; // For GCM, this is always 16
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;

/**
 * 비밀번호 암호화
 * @param {string} text - 암호화할 텍스트
 * @returns {string} - 암호화된 텍스트 (base64)
 */
function encryptPassword(text) {
    try {
        // Salt 생성
        const salt = crypto.randomBytes(SALT_LENGTH);
        
        // Key 파생
        const key = crypto.pbkdf2Sync(SECRET_KEY, salt, 100000, 32, 'sha256');
        
        // IV 생성
        const iv = crypto.randomBytes(IV_LENGTH);
        
        // 암호화
        const cipher = crypto.createCipherGCM(ALGORITHM, key, iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        // Auth tag 가져오기
        const authTag = cipher.getAuthTag();
        
        // 결과 조합: salt + iv + authTag + encrypted
        const result = Buffer.concat([
            salt,
            iv,
            authTag,
            Buffer.from(encrypted, 'hex')
        ]);
        
        return result.toString('base64');
    } catch (error) {
        console.error('❌ 암호화 오류:', error);
        throw new Error('암호화에 실패했습니다.');
    }
}

/**
 * 비밀번호 복호화
 * @param {string} encryptedText - 암호화된 텍스트 (base64)
 * @returns {string} - 복호화된 텍스트
 */
function decryptPassword(encryptedText) {
    try {
        // Base64 디코딩
        const buffer = Buffer.from(encryptedText, 'base64');
        
        // 구성 요소 분리
        const salt = buffer.slice(0, SALT_LENGTH);
        const iv = buffer.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
        const authTag = buffer.slice(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
        const encrypted = buffer.slice(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
        
        // Key 파생
        const key = crypto.pbkdf2Sync(SECRET_KEY, salt, 100000, 32, 'sha256');
        
        // 복호화
        const decipher = crypto.createDecipherGCM(ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);
        
        let decrypted = decipher.update(encrypted, null, 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    } catch (error) {
        console.error('❌ 복호화 오류:', error);
        throw new Error('복호화에 실패했습니다.');
    }
}

/**
 * 암호화된 비밀번호인지 확인
 * @param {string} text - 확인할 텍스트
 * @returns {boolean} - 암호화된 텍스트 여부
 */
function isEncrypted(text) {
    if (!text || typeof text !== 'string') return false;
    
    try {
        // Base64 디코딩 시도
        const buffer = Buffer.from(text, 'base64');
        
        // 최소 길이 확인 (salt + iv + authTag + 최소 암호화 데이터)
        const minLength = SALT_LENGTH + IV_LENGTH + TAG_LENGTH + 1;
        return buffer.length >= minLength;
    } catch (error) {
        return false;
    }
}

/**
 * 서비스 계정 배열 암호화
 * @param {Array} accounts - 계정 배열
 * @returns {Array} - 암호화된 계정 배열
 */
function encryptServiceAccounts(accounts) {
    if (!Array.isArray(accounts)) return [];
    
    return accounts.map(account => ({
        ...account,
        password_encrypted: account.password ? encryptPassword(account.password) : account.password_encrypted
    }));
}

/**
 * 서비스 계정 배열 복호화
 * @param {Array} accounts - 암호화된 계정 배열
 * @returns {Array} - 복호화된 계정 배열
 */
function decryptServiceAccounts(accounts) {
    if (!Array.isArray(accounts)) return [];
    
    return accounts.map(account => ({
        ...account,
        password: account.password_encrypted ? decryptPassword(account.password_encrypted) : null
    }));
}

/**
 * 인프라 정보 암호화 (저장 전)
 * @param {Object} infrastructure - 인프라 정보
 * @returns {Object} - 암호화된 인프라 정보
 */
function encryptInfrastructureData(infrastructure) {
    const encrypted = { ...infrastructure };
    
    // 관리자 비밀번호 암호화
    if (encrypted.admin_password && !isEncrypted(encrypted.admin_password)) {
        encrypted.admin_password_encrypted = encryptPassword(encrypted.admin_password);
        delete encrypted.admin_password;
    }
    
    // 서비스 계정들 암호화
    if (encrypted.service_accounts) {
        encrypted.service_accounts = encryptServiceAccounts(encrypted.service_accounts);
    }
    
    return encrypted;
}

/**
 * 인프라 정보 복호화 (조회 후)
 * @param {Object} infrastructure - 암호화된 인프라 정보
 * @param {boolean} includePasswords - 비밀번호 포함 여부
 * @returns {Object} - 복호화된 인프라 정보
 */
function decryptInfrastructureData(infrastructure, includePasswords = false) {
    const decrypted = { ...infrastructure };
    
    if (includePasswords) {
        // 관리자 비밀번호 복호화
        if (decrypted.admin_password_encrypted) {
            try {
                decrypted.admin_password = decryptPassword(decrypted.admin_password_encrypted);
            } catch (error) {
                console.error('❌ 관리자 비밀번호 복호화 실패:', error);
                decrypted.admin_password = null;
            }
        }
        
        // 서비스 계정들 복호화
        if (decrypted.service_accounts) {
            try {
                decrypted.service_accounts = decryptServiceAccounts(decrypted.service_accounts);
            } catch (error) {
                console.error('❌ 서비스 계정 복호화 실패:', error);
                decrypted.service_accounts = [];
            }
        }
    } else {
        // 비밀번호 정보 제거
        delete decrypted.admin_password_encrypted;
        if (decrypted.service_accounts) {
            decrypted.service_accounts = decrypted.service_accounts.map(account => {
                const { password_encrypted, ...accountWithoutPassword } = account;
                return accountWithoutPassword;
            });
        }
    }
    
    return decrypted;
}

module.exports = {
    encryptPassword,
    decryptPassword,
    isEncrypted,
    encryptServiceAccounts,
    decryptServiceAccounts,
    encryptInfrastructureData,
    decryptInfrastructureData
};
