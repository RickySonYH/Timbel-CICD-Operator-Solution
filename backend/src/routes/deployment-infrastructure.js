const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { encrypt, decrypt } = require('../utils/encryption');
const { checkServiceHealth } = require('../utils/healthCheck');
const jwtAuth = require('../middleware/jwtAuth');

const pool = new Pool({
  user: process.env.DB_USER || 'timbel_user',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'timbel_db',
  password: process.env.DB_PASSWORD || 'timbel_password',
  port: process.env.DB_PORT || 5434,
});

// Helper to decrypt sensitive fields
const decryptInfrastructure = (infra) => {
  if (!infra) return null;
  const decryptedInfra = { ...infra };
  if (decryptedInfra.admin_password_encrypted) {
    decryptedInfra.admin_password = decrypt(decryptedInfra.admin_password_encrypted);
    delete decryptedInfra.admin_password_encrypted;
  }
  if (decryptedInfra.service_accounts && typeof decryptedInfra.service_accounts === 'object') {
    const decryptedServiceAccounts = {};
    for (const key in decryptedInfra.service_accounts) {
      decryptedServiceAccounts[key] = decrypt(decryptedInfra.service_accounts[key]);
    }
    decryptedInfra.service_accounts = decryptedServiceAccounts;
  }
  return decryptedInfra;
};

// Helper to encrypt sensitive fields
const encryptInfrastructure = (infra) => {
  if (!infra) return null;
  const encryptedInfra = { ...infra };
  if (encryptedInfra.admin_password) {
    encryptedInfra.admin_password_encrypted = encrypt(encryptedInfra.admin_password);
    delete encryptedInfra.admin_password;
  }
  if (encryptedInfra.service_accounts && typeof encryptedInfra.service_accounts === 'object') {
    const encryptedServiceAccounts = {};
    for (const key in encryptedInfra.service_accounts) {
      encryptedServiceAccounts[key] = encrypt(encryptedInfra.service_accounts[key]);
    }
    encryptedInfra.service_accounts = encryptedServiceAccounts;
  }
  return encryptedInfra;
};

// GET all deployment infrastructures
router.get('/', jwtAuth.verifyToken, jwtAuth.requireRole(['admin', 'operations']), async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM deployment_infrastructure ORDER BY created_at DESC');
    const infrastructures = result.rows.map(decryptInfrastructure);

    // Perform health checks concurrently
    const infrastructuresWithHealth = await Promise.all(
      infrastructures.map(async (infra) => {
        const health = await checkServiceHealth(infra);
        return { ...infra, health_status: health.status, health_message: health.message };
      })
    );

    res.json({ success: true, data: infrastructuresWithHealth });
  } catch (error) {
    console.error('❌ 배포 인프라 조회 오류:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch deployment infrastructures', message: error.message });
  }
});

// GET a single deployment infrastructure by ID
router.get('/:id', jwtAuth.verifyToken, jwtAuth.requireRole(['admin', 'operations']), async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM deployment_infrastructure WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Infrastructure not found', message: '해당 인프라를 찾을 수 없습니다.' });
    }
    const infrastructure = decryptInfrastructure(result.rows[0]);
    const health = await checkServiceHealth(infrastructure);
    res.json({ success: true, data: { ...infrastructure, health_status: health.status, health_message: health.message } });
  } catch (error) {
    console.error('❌ 배포 인프라 상세 조회 오류:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch deployment infrastructure', message: error.message });
  }
});

// POST a new deployment infrastructure
router.post('/', jwtAuth.verifyToken, jwtAuth.requireRole(['admin', 'operations']), async (req, res) => {
  const { service_type, environment, service_url, admin_username, admin_password, service_accounts, health_check_url, metadata } = req.body;

  if (!service_type || !service_url) {
    return res.status(400).json({ success: false, error: 'Missing required fields', message: '필수 필드를 입력해주세요 (service_type, service_url).' });
  }

  const encryptedData = encryptInfrastructure({ admin_password, service_accounts });

  try {
    const result = await pool.query(
      `INSERT INTO deployment_infrastructure (service_type, environment, service_url, admin_username, admin_password_encrypted, service_accounts, health_check_url, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [service_type, environment, service_url, admin_username, encryptedData.admin_password_encrypted, encryptedData.service_accounts, health_check_url, metadata]
    );
    const newInfrastructure = decryptInfrastructure(result.rows[0]);
    res.status(201).json({ success: true, data: newInfrastructure });
  } catch (error) {
    console.error('❌ 배포 인프라 생성 오류:', error);
    res.status(500).json({ success: false, error: 'Failed to create deployment infrastructure', message: error.message });
  }
});

// PUT (update) an existing deployment infrastructure
router.put('/:id', jwtAuth.verifyToken, jwtAuth.requireRole(['admin', 'operations']), async (req, res) => {
  const { id } = req.params;
  const { service_type, environment, service_url, admin_username, admin_password, service_accounts, health_check_url, metadata, status } = req.body;

  const encryptedData = encryptInfrastructure({ admin_password, service_accounts });

  try {
    const result = await pool.query(
      `UPDATE deployment_infrastructure
       SET service_type = $1, environment = $2, service_url = $3, admin_username = $4, admin_password_encrypted = $5, service_accounts = $6, health_check_url = $7, metadata = $8, status = $9, updated_at = NOW()
       WHERE id = $10 RETURNING *`,
      [service_type, environment, service_url, admin_username, encryptedData.admin_password_encrypted, encryptedData.service_accounts, health_check_url, metadata, status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Infrastructure not found', message: '해당 인프라를 찾을 수 없습니다.' });
    }
    const updatedInfrastructure = decryptInfrastructure(result.rows[0]);
    res.json({ success: true, data: updatedInfrastructure });
  } catch (error) {
    console.error('❌ 배포 인프라 업데이트 오류:', error);
    res.status(500).json({ success: false, error: 'Failed to update deployment infrastructure', message: error.message });
  }
});

// DELETE a deployment infrastructure
router.delete('/:id', jwtAuth.verifyToken, jwtAuth.requireRole(['admin']), async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM deployment_infrastructure WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Infrastructure not found', message: '해당 인프라를 찾을 수 없습니다.' });
    }
    res.json({ success: true, message: '배포 인프라가 성공적으로 삭제되었습니다.' });
  } catch (error) {
    console.error('❌ 배포 인프라 삭제 오류:', error);
    res.status(500).json({ success: false, error: 'Failed to delete deployment infrastructure', message: error.message });
  }
});

module.exports = router;