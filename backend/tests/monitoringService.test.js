/**
 * [advice from AI] 모니터링 서비스 테스트
 * Prometheus 연동 및 Fallback 로직 테스트
 */

const MonitoringService = require('../src/services/monitoringService');
const axios = require('axios');

// axios mock
jest.mock('axios');

describe('MonitoringService - Prometheus Integration', () => {
  let monitoringService;

  beforeEach(() => {
    monitoringService = new MonitoringService();
    jest.clearAllMocks();
  });

  describe('queryPrometheusRange', () => {
    it('Prometheus 쿼리 성공 시 데이터 반환', async () => {
      // Mock Prometheus 응답
      const mockPrometheusData = {
        data: {
          status: 'success',
          data: {
            resultType: 'matrix',
            result: [{
              metric: { instance: 'test' },
              values: [
                [1634567890, '75.5'],
                [1634567920, '80.2']
              ]
            }]
          }
        }
      };

      axios.get.mockResolvedValue(mockPrometheusData);

      const result = await monitoringService.queryPrometheusRange(
        'cpu_usage',
        1634567890,
        1634567920,
        '30s'
      );

      expect(result.success).toBe(true);
      expect(result.data.result).toHaveLength(1);
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/query_range'),
        expect.objectContaining({
          params: expect.objectContaining({
            query: 'cpu_usage',
            start: 1634567890,
            end: 1634567920,
            step: '30s'
          })
        })
      );
    });

    it('Prometheus 연결 실패 시 fallback 데이터 반환', async () => {
      axios.get.mockRejectedValue(new Error('Connection refused'));

      const result = await monitoringService.queryPrometheusRange(
        'cpu_usage',
        1634567890,
        1634567920
      );

      expect(result.success).toBe(true);
      expect(result.fallback).toBe(true);
      expect(result.data.result).toBeDefined();
    });
  });

  describe('collect MetricsFromPrometheus', () => {
    it('테넌트별 메트릭 수집 성공', async () => {
      // Mock Prometheus 응답
      const mockMetricResponse = {
        data: {
          status: 'success',
          data: {
            resultType: 'matrix',
            result: [{
              metric: { instance: 'test' },
              values: [[Date.now() / 1000, '75']]
            }]
          }
        }
      };

      axios.get.mockResolvedValue(mockMetricResponse);

      const result = await monitoringService.collectMetricsFromPrometheus(
        'test-tenant',
        '1h'
      );

      expect(result.success).toBe(true);
      expect(result.data.tenant_id).toBe('test-tenant');
      expect(result.data.metrics).toHaveProperty('cpu_usage');
      expect(result.data.metrics).toHaveProperty('memory_usage');
      expect(result.data.source).toBe('prometheus');
    });

    it('Prometheus 연결 실패 시 Mock 데이터 반환', async () => {
      axios.get.mockRejectedValue(new Error('Network error'));

      const result = await monitoringService.collectMetricsFromPrometheus(
        'test-tenant',
        '1h'
      );

      expect(result.success).toBe(true);
      expect(result.data.source).toBe('mock');
      expect(result.mock).toBe(true);
    });
  });

  describe('formatMetricData', () => {
    it('Prometheus 데이터 포맷팅', () => {
      const prometheusData = {
        resultType: 'matrix',
        result: [{
          metric: { instance: 'test' },
          values: [
            [1634567890, '75.5'],
            [1634567920, '80.2']
          ]
        }]
      };

      const formatted = monitoringService.formatMetricData(prometheusData);

      expect(formatted).toHaveLength(2);
      expect(formatted[0]).toHaveProperty('timestamp');
      expect(formatted[0]).toHaveProperty('value');
      expect(typeof formatted[0].value).toBe('number');
    });

    it('빈 데이터 처리', () => {
      const formatted = monitoringService.formatMetricData({ result: [] });
      expect(formatted).toEqual([]);
    });
  });

  describe('calculateStep', () => {
    it('시간 범위에 따른 적절한 간격 반환', () => {
      expect(monitoringService.calculateStep(300)).toBe('15s');
      expect(monitoringService.calculateStep(3600)).toBe('1m');
      expect(monitoringService.calculateStep(21600)).toBe('5m');
      expect(monitoringService.calculateStep(86400)).toBe('15m');
      expect(monitoringService.calculateStep(604800)).toBe('1h');
    });
  });

  describe('createGrafanaDashboard', () => {
    it('Grafana 토큰이 있을 때 실제 대시보드 생성', async () => {
      monitoringService.grafanaToken = 'test-token';
      
      const mockGrafanaResponse = {
        data: {
          url: '/d/test-dashboard',
          uid: 'test-uid'
        }
      };

      axios.post.mockResolvedValue(mockGrafanaResponse);

      const dashboardConfig = {
        dashboard_id: 'test-dashboard-id',
        dashboard_name: 'Test Dashboard',
        tenant_id: 'test-tenant',
        refresh_interval: '30s',
        panels: []
      };

      const result = await monitoringService.createGrafanaDashboard(dashboardConfig);

      expect(result.grafana_url).toContain('/d/test-dashboard');
      expect(result.grafana_uid).toBe('test-uid');
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/dashboards/db'),
        expect.any(Object),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token'
          })
        })
      );
    });

    it('Grafana 토큰이 없을 때 Mock 반환', async () => {
      monitoringService.grafanaToken = '';

      const dashboardConfig = {
        dashboard_id: 'test-dashboard-id',
        dashboard_name: 'Test Dashboard',
        tenant_id: 'test-tenant',
        refresh_interval: '30s',
        panels: []
      };

      const result = await monitoringService.createGrafanaDashboard(dashboardConfig);

      expect(result.mock).toBe(true);
      expect(result.grafana_url).toBeDefined();
    });
  });
});

describe('MonitoringService - Fallback Behavior', () => {
  let monitoringService;

  beforeEach(() => {
    monitoringService = new MonitoringService();
  });

  it('Mock 메서드에 경고 로그 포함', () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

    monitoringService.mockCollectMetrics('test-tenant', '1h');

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Mock 메트릭 수집 사용 중')
    );

    consoleSpy.mockRestore();
  });
});

