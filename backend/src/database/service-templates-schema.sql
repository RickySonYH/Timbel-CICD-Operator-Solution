-- [advice from AI] 동적 서비스 관리 시스템 스키마
-- 기본 8개 서비스 + 사용자 정의 서비스 템플릿 관리

-- ===== 서비스 템플릿 테이블 =====

-- [advice from AI] 서비스 템플릿 정의
CREATE TABLE service_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_name VARCHAR(100) UNIQUE NOT NULL, -- 'callbot', 'chatbot', 'advisor', 'custom-service-1' 등
    display_name VARCHAR(200) NOT NULL,
    description TEXT,
    
    -- [advice from AI] 서비스 분류
    category VARCHAR(50) DEFAULT 'custom', -- 'core', 'ai', 'infrastructure', 'custom'
    service_type VARCHAR(50) NOT NULL, -- 'api', 'web', 'ai', 'data', 'monitoring' 등
    is_default BOOLEAN DEFAULT false, -- ECP-AI 기본 8개 서비스 여부
    
    -- [advice from AI] 기본 리소스 설정
    default_cpu DECIMAL(10,2) DEFAULT 0.5,
    default_memory_gb DECIMAL(10,2) DEFAULT 1.0,
    default_gpu INTEGER DEFAULT 0,
    default_storage_gb INTEGER DEFAULT 10,
    default_replicas INTEGER DEFAULT 1,
    
    -- [advice from AI] 컨테이너 설정
    default_image VARCHAR(500),
    default_tag VARCHAR(100) DEFAULT 'latest',
    default_registry VARCHAR(500) DEFAULT 'harbor.ecp-ai.com',
    default_ports INTEGER[],
    
    -- [advice from AI] 고급 설정 템플릿 (JSON)
    advanced_settings_template JSONB DEFAULT '{}',
    environment_variables_template JSONB DEFAULT '{}',
    health_check_template JSONB DEFAULT '{"path": "/health", "port": 8080}',
    
    -- [advice from AI] 메트릭 설정
    default_metrics TEXT[], -- ['response_time', 'cpu_usage', 'memory_usage'] 등
    monitoring_endpoints TEXT[], -- ['/health', '/ready', '/metrics'] 등
    
    -- [advice from AI] 상태 관리
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'deprecated', 'disabled'
    version VARCHAR(20) DEFAULT '1.0.0',
    
    -- [advice from AI] 메타데이터
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(100),
    
    CONSTRAINT chk_service_category CHECK (category IN ('core', 'ai', 'infrastructure', 'custom')),
     CONSTRAINT chk_service_type CHECK (service_type IN ('api', 'web', 'ai', 'data', 'monitoring', 'storage', 'queue', 'infrastructure', 'custom')),
    CONSTRAINT chk_service_status CHECK (status IN ('active', 'deprecated', 'disabled'))
);

-- [advice from AI] 서비스 의존성 관리
CREATE TABLE service_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID REFERENCES service_templates(id) ON DELETE CASCADE,
    depends_on_service_id UUID REFERENCES service_templates(id) ON DELETE CASCADE,
    dependency_type VARCHAR(50) NOT NULL, -- 'required', 'optional', 'recommended'
    description TEXT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT chk_dependency_type CHECK (dependency_type IN ('required', 'optional', 'recommended')),
    UNIQUE(service_id, depends_on_service_id)
);

-- ===== 기본 ECP-AI 8개 서비스 템플릿 삽입 =====

INSERT INTO service_templates (
    service_name, display_name, description, category, service_type, is_default,
    default_cpu, default_memory_gb, default_gpu, default_storage_gb, default_replicas,
    default_image, default_ports, advanced_settings_template, environment_variables_template,
    default_metrics, monitoring_endpoints, version, created_by
) VALUES 
-- [advice from AI] 1. 콜봇 서비스
(
    'callbot', '콜봇 서비스', '음성 통화 기반 AI 봇 서비스', 'core', 'ai', true,
    0.5, 1.0, 0, 10, 2,
    'ecp-ai/callbot', ARRAY[8080, 9090],
    '{"sttEndpoint": "http://stt-service:8080", "ttsEndpoint": "http://tts-service:8080", "maxConcurrentCalls": 100, "callTimeout": 300}',
    '{"STT_ENDPOINT": "http://stt-service:8080", "TTS_ENDPOINT": "http://tts-service:8080", "MAX_CONCURRENT_CALLS": "100"}',
    ARRAY['concurrent_calls', 'call_duration', 'stt_accuracy', 'tts_quality'],
    ARRAY['/health', '/ready', '/call-status'],
    '1.2.0', 'system'
),
-- [advice from AI] 2. 챗봇 서비스
(
    'chatbot', '챗봇 서비스', '텍스트 기반 대화형 AI 봇 서비스', 'core', 'ai', true,
    0.2, 0.5, 0, 5, 3,
    'ecp-ai/chatbot', ARRAY[8080],
    '{"nlpEndpoint": "http://nlp-service:8080", "chatHistorySize": 1000, "maxSessions": 500, "sessionTimeout": 1800}',
    '{"NLP_ENDPOINT": "http://nlp-service:8080", "CHAT_HISTORY_SIZE": "1000", "MAX_SESSIONS": "500"}',
    ARRAY['active_sessions', 'response_time', 'nlp_accuracy', 'satisfaction'],
    ARRAY['/health', '/ready', '/chat-status'],
    '1.1.8', 'system'
),
-- [advice from AI] 3. 어드바이저 서비스
(
    'advisor', '어드바이저 서비스', 'AI 보조 인간 상담사 서비스', 'core', 'ai', true,
    1.0, 2.0, 1, 25, 1,
    'ecp-ai/advisor', ARRAY[8080, 9090],
    '{"hybridMode": true, "expertHandoffThreshold": 0.7, "knowledgeBase": "vector-db", "multiServiceIntegration": ["callbot", "chatbot"]}',
    '{"HYBRID_MODE": "true", "HANDOFF_THRESHOLD": "0.7", "KNOWLEDGE_BASE": "vector-db"}',
    ARRAY['hybrid_usage', 'handoff_rate', 'resolution_rate', 'expert_time'],
    ARRAY['/health', '/ready', '/advisor-status'],
    '2.0.1', 'system'
),
-- [advice from AI] 4. STT 서비스
(
    'stt', 'STT (Speech-to-Text)', '음성을 텍스트로 변환하는 서비스', 'ai', 'ai', true,
    0.8, 1.5, 0, 15, 1,
    'ecp-ai/stt', ARRAY[8080],
    '{"modelPath": "/models/stt", "languageCode": "ko-KR", "samplingRate": 16000, "maxAudioLength": 300}',
    '{"MODEL_PATH": "/models/stt", "LANGUAGE_CODE": "ko-KR", "SAMPLING_RATE": "16000"}',
    ARRAY['processing_time', 'accuracy', 'queue_length', 'language_support'],
    ARRAY['/health', '/ready', '/stt-status'],
    '1.3.2', 'system'
),
-- [advice from AI] 5. TTS 서비스
(
    'tts', 'TTS (Text-to-Speech)', '텍스트를 음성으로 변환하는 서비스', 'ai', 'ai', true,
    1.0, 2.0, 1, 25, 2,
    'ecp-ai/tts', ARRAY[8080],
    '{"voiceType": "female", "speed": 1.0, "audioFormat": "wav", "maxTextLength": 1000}',
    '{"VOICE_TYPE": "female", "SPEED": "1.0", "AUDIO_FORMAT": "wav"}',
    ARRAY['synthesis_time', 'voice_quality', 'gpu_utilization', 'audio_output'],
    ARRAY['/health', '/ready', '/tts-status'],
    '1.4.0', 'system'
),
-- [advice from AI] 6. TA 서비스
(
    'ta', 'TA (Text Analytics)', '텍스트 분석 및 처리 서비스', 'ai', 'data', true,
    0.4, 0.8, 0, 10, 1,
    'ecp-ai/text-analytics', ARRAY[8080],
    '{"analysisMode": "batch", "batchSize": 100, "reportInterval": 3600, "sentimentAnalysis": true}',
    '{"ANALYSIS_MODE": "batch", "BATCH_SIZE": "100", "SENTIMENT_ANALYSIS": "true"}',
    ARRAY['analysis_time', 'sentiment_accuracy', 'entity_detection', 'batch_throughput'],
    ARRAY['/health', '/ready', '/analysis-status'],
    '1.0.5', 'system'
),
-- [advice from AI] 7. QA 서비스
(
    'qa', 'QA (Question Answering)', '질문 응답 AI 서비스', 'ai', 'ai', true,
    0.3, 0.5, 0, 5, 1,
    'ecp-ai/qa-service', ARRAY[8080],
    '{"qualityThreshold": 0.8, "evaluationMode": "automatic", "reportFormat": "json"}',
    '{"QUALITY_THRESHOLD": "0.8", "EVALUATION_MODE": "automatic"}',
    ARRAY['answer_time', 'answer_accuracy', 'knowledge_coverage', 'confidence_score'],
    ARRAY['/health', '/ready', '/qa-status'],
    '1.2.3', 'system'
),
-- [advice from AI] 8. 공통 인프라 서비스
(
    'common', '공통 인프라 서비스', '공통 인프라 및 유틸리티 서비스', 'infrastructure', 'infrastructure', true,
    0.2, 0.25, 0, 5, 1,
    'ecp-ai/common-infrastructure', ARRAY[8080, 3000],
    '{"logLevel": "info", "apiTimeout": 30000}',
    '{"LOG_LEVEL": "info", "API_TIMEOUT": "30000"}',
    ARRAY['api_response_time', 'load_balancer_health', 'db_connections', 'cache_hit_ratio'],
    ARRAY['/health', '/ready', '/system-status'],
    '1.0.2', 'system'
);

-- ===== 서비스 의존성 설정 =====

-- [advice from AI] 콜봇은 STT, TTS에 의존
INSERT INTO service_dependencies (service_id, depends_on_service_id, dependency_type, description) VALUES
((SELECT id FROM service_templates WHERE service_name = 'callbot'), (SELECT id FROM service_templates WHERE service_name = 'stt'), 'required', '음성 인식을 위해 STT 서비스 필요'),
((SELECT id FROM service_templates WHERE service_name = 'callbot'), (SELECT id FROM service_templates WHERE service_name = 'tts'), 'required', '음성 합성을 위해 TTS 서비스 필요');

-- [advice from AI] 어드바이저는 콜봇, 챗봇과 연동
INSERT INTO service_dependencies (service_id, depends_on_service_id, dependency_type, description) VALUES
((SELECT id FROM service_templates WHERE service_name = 'advisor'), (SELECT id FROM service_templates WHERE service_name = 'callbot'), 'optional', '하이브리드 모드에서 콜봇 연동'),
((SELECT id FROM service_templates WHERE service_name = 'advisor'), (SELECT id FROM service_templates WHERE service_name = 'chatbot'), 'optional', '하이브리드 모드에서 챗봇 연동');

-- [advice from AI] 모든 서비스는 공통 인프라에 의존
INSERT INTO service_dependencies (service_id, depends_on_service_id, dependency_type, description)
SELECT 
    s.id,
    (SELECT id FROM service_templates WHERE service_name = 'common'),
    'recommended',
    '공통 인프라 서비스 연동 권장'
FROM service_templates s 
WHERE s.service_name != 'common';

-- ===== 인덱스 생성 =====

CREATE INDEX idx_service_templates_name ON service_templates(service_name);
CREATE INDEX idx_service_templates_category ON service_templates(category);
CREATE INDEX idx_service_templates_type ON service_templates(service_type);
CREATE INDEX idx_service_templates_status ON service_templates(status);
CREATE INDEX idx_service_templates_default ON service_templates(is_default);

CREATE INDEX idx_service_dependencies_service ON service_dependencies(service_id);
CREATE INDEX idx_service_dependencies_depends_on ON service_dependencies(depends_on_service_id);

-- ===== 뷰 생성 =====

-- [advice from AI] 서비스 템플릿 요약 뷰
CREATE VIEW view_service_templates_summary AS
SELECT 
    st.id,
    st.service_name,
    st.display_name,
    st.category,
    st.service_type,
    st.is_default,
    st.default_cpu,
    st.default_memory_gb,
    st.default_gpu,
    st.status,
    st.version,
    COUNT(sd.depends_on_service_id) as dependency_count,
    COUNT(tenant_usage.tenant_id) as usage_count
FROM service_templates st
LEFT JOIN service_dependencies sd ON st.id = sd.service_id
LEFT JOIN (
    SELECT DISTINCT 
        unnest(string_to_array(advanced_settings->>'services', ',')) as service_name,
        tenant_id
    FROM operations_tenant_services 
    WHERE advanced_settings ? 'services'
) tenant_usage ON st.service_name = tenant_usage.service_name
GROUP BY st.id;

-- [advice from AI] 서비스 카테고리별 통계 뷰
CREATE VIEW view_service_category_stats AS
SELECT 
    category,
    COUNT(*) as total_services,
    COUNT(CASE WHEN is_default THEN 1 END) as default_services,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_services,
    AVG(default_cpu) as avg_cpu,
    AVG(default_memory_gb) as avg_memory,
    SUM(default_gpu) as total_gpu_required
FROM service_templates
GROUP BY category;
