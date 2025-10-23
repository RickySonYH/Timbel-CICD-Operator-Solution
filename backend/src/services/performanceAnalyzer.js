// [advice from AI] 프로덕션 레벨 성능 분석 및 예측 시스템
// 트렌드 분석, 용량 계획, 성능 병목 감지

class PerformanceAnalyzer {
  constructor(options = {}) {
    this.name = options.name || 'PerformanceAnalyzer';
    this.analysisWindow = options.analysisWindow || 24 * 60 * 60 * 1000; // 24시간
    this.predictionHorizon = options.predictionHorizon || 7 * 24 * 60 * 60 * 1000; // 7일
    this.trendSensitivity = options.trendSensitivity || 0.1;
    this.anomalyThreshold = options.anomalyThreshold || 2.5; // 표준편차 배수
    
    // 분석 결과 캐시
    this.analysisCache = new Map();
    this.trendCache = new Map();
    this.predictionCache = new Map();
    
    // 성능 지표 정의
    this.performanceIndicators = {
      cpu: {
        metrics: ['cpu_usage', 'cpu_load_1m', 'cpu_load_5m', 'cpu_load_15m'],
        thresholds: { warning: 70, critical: 85, emergency: 95 },
        unit: 'percent'
      },
      memory: {
        metrics: ['memory_usage', 'app_memory_heap'],
        thresholds: { warning: 75, critical: 90, emergency: 95 },
        unit: 'percent'
      },
      disk: {
        metrics: ['disk_usage'],
        thresholds: { warning: 80, critical: 90, emergency: 95 },
        unit: 'percent'
      },
      database: {
        metrics: ['db_active_connections', 'db_avg_query_time'],
        thresholds: { warning: 50, critical: 80, emergency: 95 },
        unit: 'count'
      },
      network: {
        metrics: ['network_throughput', 'network_latency'],
        thresholds: { warning: 100, critical: 500, emergency: 1000 },
        unit: 'ms'
      }
    };
    
    console.log(`📈 성능 분석기 '${this.name}' 초기화 완료`);
  }

  // [advice from AI] 메트릭 데이터 분석
  async analyzeMetrics(metricsData, timeRange = this.analysisWindow) {
    const analysisId = `analysis_${Date.now()}`;
    const startTime = Date.now();
    
    try {
      console.log(`🔍 성능 분석 시작: ${analysisId}`);
      
      const analysis = {
        id: analysisId,
        timestamp: startTime,
        timeRange,
        metrics: {},
        trends: {},
        anomalies: [],
        predictions: {},
        recommendations: [],
        summary: {}
      };
      
      // 각 성능 지표별 분석
      for (const [category, config] of Object.entries(this.performanceIndicators)) {
        const categoryMetrics = this.extractCategoryMetrics(metricsData, config.metrics);
        
        if (categoryMetrics.length > 0) {
          analysis.metrics[category] = await this.analyzeCategoryMetrics(
            category, 
            categoryMetrics, 
            config
          );
        }
      }
      
      // 전체 시스템 트렌드 분석
      analysis.trends = await this.analyzeTrends(metricsData, timeRange);
      
      // 이상 징후 감지
      analysis.anomalies = await this.detectAnomalies(metricsData);
      
      // 성능 예측
      analysis.predictions = await this.generatePredictions(metricsData);
      
      // 권장사항 생성
      analysis.recommendations = this.generateRecommendations(analysis);
      
      // 분석 요약
      analysis.summary = this.generateSummary(analysis);
      
      // 분석 완료 시간
      analysis.duration = Date.now() - startTime;
      
      // 캐시에 저장
      this.analysisCache.set(analysisId, analysis);
      
      console.log(`✅ 성능 분석 완료: ${analysisId} (${analysis.duration}ms)`);
      
      return analysis;
      
    } catch (error) {
      console.error(`❌ 성능 분석 실패: ${analysisId}`, error);
      throw error;
    }
  }

  // [advice from AI] 카테고리별 메트릭 추출
  extractCategoryMetrics(metricsData, metricNames) {
    const categoryMetrics = [];
    
    metricsData.forEach(metric => {
      if (metric.data) {
        metricNames.forEach(metricName => {
          const value = this.extractNestedValue(metric.data, metricName);
          if (value !== null && value !== undefined) {
            categoryMetrics.push({
              name: metricName,
              value: parseFloat(value),
              timestamp: metric.timestamp,
              collector: metric.collector
            });
          }
        });
      }
    });
    
    return categoryMetrics.sort((a, b) => a.timestamp - b.timestamp);
  }

  // [advice from AI] 중첩된 객체에서 값 추출
  extractNestedValue(obj, path) {
    // cpu_usage -> obj.cpu.usage
    // memory_usage -> obj.memory.usage
    // db_active_connections -> obj.connections.active
    
    const pathMappings = {
      'cpu_usage': 'cpu.usage',
      'memory_usage': 'memory.usage',
      'disk_usage': 'disk.usage',
      'db_active_connections': 'connections.active',
      'db_avg_query_time': 'queries.avgTime',
      'app_memory_heap': 'process.memory.heapUsed'
    };
    
    const actualPath = pathMappings[path] || path;
    const keys = actualPath.split('.');
    let value = obj;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return null;
      }
    }
    
    return value;
  }

  // [advice from AI] 카테고리별 메트릭 분석
  async analyzeCategoryMetrics(category, metrics, config) {
    if (metrics.length === 0) {
      return null;
    }
    
    const values = metrics.map(m => m.value);
    const timestamps = metrics.map(m => m.timestamp);
    
    // 기본 통계
    const stats = this.calculateBasicStats(values);
    
    // 시계열 분석
    const timeSeriesAnalysis = this.analyzeTimeSeries(values, timestamps);
    
    // 임계값 분석
    const thresholdAnalysis = this.analyzeThresholds(values, config.thresholds);
    
    // 성능 등급 계산
    const performanceGrade = this.calculatePerformanceGrade(stats, config.thresholds);
    
    return {
      category,
      stats,
      timeSeries: timeSeriesAnalysis,
      thresholds: thresholdAnalysis,
      grade: performanceGrade,
      dataPoints: metrics.length,
      timeRange: {
        start: Math.min(...timestamps),
        end: Math.max(...timestamps)
      }
    };
  }

  // [advice from AI] 기본 통계 계산
  calculateBasicStats(values) {
    if (values.length === 0) return null;
    
    const sorted = [...values].sort((a, b) => a - b);
    const sum = values.reduce((acc, val) => acc + val, 0);
    const mean = sum / values.length;
    const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    return {
      count: values.length,
      sum: Math.round(sum * 100) / 100,
      mean: Math.round(mean * 100) / 100,
      median: sorted[Math.floor(sorted.length / 2)],
      min: Math.min(...values),
      max: Math.max(...values),
      stdDev: Math.round(stdDev * 100) / 100,
      variance: Math.round(variance * 100) / 100,
      percentiles: {
        p25: sorted[Math.floor(sorted.length * 0.25)],
        p75: sorted[Math.floor(sorted.length * 0.75)],
        p90: sorted[Math.floor(sorted.length * 0.90)],
        p95: sorted[Math.floor(sorted.length * 0.95)],
        p99: sorted[Math.floor(sorted.length * 0.99)]
      }
    };
  }

  // [advice from AI] 시계열 분석
  analyzeTimeSeries(values, timestamps) {
    if (values.length < 2) return null;
    
    // 트렌드 계산 (선형 회귀)
    const trend = this.calculateLinearTrend(values, timestamps);
    
    // 변동성 분석
    const volatility = this.calculateVolatility(values);
    
    // 주기성 감지 (간단한 버전)
    const seasonality = this.detectSeasonality(values, timestamps);
    
    return {
      trend,
      volatility,
      seasonality,
      dataPoints: values.length,
      timeSpan: timestamps[timestamps.length - 1] - timestamps[0]
    };
  }

  // [advice from AI] 선형 트렌드 계산
  calculateLinearTrend(values, timestamps) {
    const n = values.length;
    if (n < 2) return null;
    
    // 시간을 정규화 (0부터 시작)
    const minTime = Math.min(...timestamps);
    const normalizedTimes = timestamps.map(t => t - minTime);
    
    // 선형 회귀 계산
    const sumX = normalizedTimes.reduce((sum, x) => sum + x, 0);
    const sumY = values.reduce((sum, y) => sum + y, 0);
    const sumXY = normalizedTimes.reduce((sum, x, i) => sum + x * values[i], 0);
    const sumXX = normalizedTimes.reduce((sum, x) => sum + x * x, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // 결정계수 (R²) 계산
    const meanY = sumY / n;
    const ssRes = values.reduce((sum, y, i) => {
      const predicted = slope * normalizedTimes[i] + intercept;
      return sum + Math.pow(y - predicted, 2);
    }, 0);
    const ssTot = values.reduce((sum, y) => sum + Math.pow(y - meanY, 2), 0);
    const rSquared = 1 - (ssRes / ssTot);
    
    // 트렌드 방향 분류
    let direction = 'stable';
    if (Math.abs(slope) > this.trendSensitivity) {
      direction = slope > 0 ? 'increasing' : 'decreasing';
    }
    
    return {
      slope: Math.round(slope * 10000) / 10000,
      intercept: Math.round(intercept * 100) / 100,
      rSquared: Math.round(rSquared * 100) / 100,
      direction,
      confidence: rSquared > 0.7 ? 'high' : rSquared > 0.4 ? 'medium' : 'low'
    };
  }

  // [advice from AI] 변동성 계산
  calculateVolatility(values) {
    if (values.length < 2) return 0;
    
    const changes = [];
    for (let i = 1; i < values.length; i++) {
      const change = (values[i] - values[i-1]) / values[i-1];
      changes.push(change);
    }
    
    const mean = changes.reduce((sum, change) => sum + change, 0) / changes.length;
    const variance = changes.reduce((sum, change) => sum + Math.pow(change - mean, 2), 0) / changes.length;
    
    return Math.round(Math.sqrt(variance) * 10000) / 10000;
  }

  // [advice from AI] 주기성 감지 (간단한 버전)
  detectSeasonality(values, timestamps) {
    if (values.length < 24) return null; // 최소 24개 데이터 포인트 필요
    
    // 시간 간격 계산
    const intervals = [];
    for (let i = 1; i < timestamps.length; i++) {
      intervals.push(timestamps[i] - timestamps[i-1]);
    }
    
    const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    
    // 간단한 주기성 검사 (1시간, 1일 주기)
    const hourlyPattern = this.checkPattern(values, Math.round(3600000 / avgInterval)); // 1시간
    const dailyPattern = this.checkPattern(values, Math.round(86400000 / avgInterval)); // 1일
    
    return {
      detected: hourlyPattern.strength > 0.3 || dailyPattern.strength > 0.3,
      patterns: {
        hourly: hourlyPattern,
        daily: dailyPattern
      }
    };
  }

  // [advice from AI] 패턴 강도 검사
  checkPattern(values, period) {
    if (values.length < period * 2) {
      return { strength: 0, confidence: 'low' };
    }
    
    let correlation = 0;
    let validPairs = 0;
    
    for (let i = 0; i < values.length - period; i++) {
      if (i + period < values.length) {
        correlation += values[i] * values[i + period];
        validPairs++;
      }
    }
    
    const strength = validPairs > 0 ? Math.abs(correlation / validPairs) / Math.max(...values) : 0;
    
    return {
      strength: Math.round(strength * 100) / 100,
      confidence: strength > 0.5 ? 'high' : strength > 0.3 ? 'medium' : 'low',
      period
    };
  }

  // [advice from AI] 임계값 분석
  analyzeThresholds(values, thresholds) {
    const analysis = {
      warning: { count: 0, percentage: 0, latest: null },
      critical: { count: 0, percentage: 0, latest: null },
      emergency: { count: 0, percentage: 0, latest: null }
    };
    
    values.forEach((value, index) => {
      if (value >= thresholds.emergency) {
        analysis.emergency.count++;
        analysis.emergency.latest = index;
      } else if (value >= thresholds.critical) {
        analysis.critical.count++;
        analysis.critical.latest = index;
      } else if (value >= thresholds.warning) {
        analysis.warning.count++;
        analysis.warning.latest = index;
      }
    });
    
    const total = values.length;
    analysis.warning.percentage = Math.round((analysis.warning.count / total) * 100 * 100) / 100;
    analysis.critical.percentage = Math.round((analysis.critical.count / total) * 100 * 100) / 100;
    analysis.emergency.percentage = Math.round((analysis.emergency.count / total) * 100 * 100) / 100;
    
    return analysis;
  }

  // [advice from AI] 성능 등급 계산
  calculatePerformanceGrade(stats, thresholds) {
    if (!stats) return 'Unknown';
    
    const avgValue = stats.mean;
    
    if (avgValue >= thresholds.emergency) return 'F'; // 매우 나쁨
    if (avgValue >= thresholds.critical) return 'D';  // 나쁨
    if (avgValue >= thresholds.warning) return 'C';   // 보통
    if (avgValue >= thresholds.warning * 0.7) return 'B'; // 좋음
    return 'A'; // 매우 좋음
  }

  // [advice from AI] 트렌드 분석
  async analyzeTrends(metricsData, timeRange) {
    const trends = {};
    
    for (const [category, config] of Object.entries(this.performanceIndicators)) {
      const categoryMetrics = this.extractCategoryMetrics(metricsData, config.metrics);
      
      if (categoryMetrics.length > 10) { // 최소 10개 데이터 포인트 필요
        const values = categoryMetrics.map(m => m.value);
        const timestamps = categoryMetrics.map(m => m.timestamp);
        
        trends[category] = this.calculateLinearTrend(values, timestamps);
      }
    }
    
    return trends;
  }

  // [advice from AI] 이상 징후 감지
  async detectAnomalies(metricsData) {
    const anomalies = [];
    
    // 카테고리별 이상 징후 감지
    for (const [category, config] of Object.entries(this.performanceIndicators)) {
      const categoryMetrics = this.extractCategoryMetrics(metricsData, config.metrics);
      
      if (categoryMetrics.length > 10) {
        const categoryAnomalies = this.detectCategoryAnomalies(category, categoryMetrics);
        anomalies.push(...categoryAnomalies);
      }
    }
    
    return anomalies.sort((a, b) => b.severity - a.severity);
  }

  // [advice from AI] 카테고리별 이상 징후 감지
  detectCategoryAnomalies(category, metrics) {
    const anomalies = [];
    const values = metrics.map(m => m.value);
    const stats = this.calculateBasicStats(values);
    
    if (!stats) return anomalies;
    
    const threshold = stats.mean + (this.anomalyThreshold * stats.stdDev);
    
    metrics.forEach((metric, index) => {
      if (metric.value > threshold) {
        const severity = this.calculateAnomalySeverity(metric.value, stats, threshold);
        
        anomalies.push({
          category,
          metricName: metric.name,
          value: metric.value,
          expectedRange: {
            min: stats.mean - stats.stdDev,
            max: stats.mean + stats.stdDev
          },
          threshold,
          severity,
          timestamp: metric.timestamp,
          deviation: Math.round(((metric.value - stats.mean) / stats.stdDev) * 100) / 100
        });
      }
    });
    
    return anomalies;
  }

  // [advice from AI] 이상 징후 심각도 계산
  calculateAnomalySeverity(value, stats, threshold) {
    const deviations = (value - stats.mean) / stats.stdDev;
    
    if (deviations > 4) return 5; // 매우 심각
    if (deviations > 3) return 4; // 심각
    if (deviations > 2.5) return 3; // 보통
    if (deviations > 2) return 2; // 경미
    return 1; // 낮음
  }

  // [advice from AI] 성능 예측 생성
  async generatePredictions(metricsData) {
    const predictions = {};
    
    for (const [category, config] of Object.entries(this.performanceIndicators)) {
      const categoryMetrics = this.extractCategoryMetrics(metricsData, config.metrics);
      
      if (categoryMetrics.length > 20) { // 예측을 위한 충분한 데이터
        predictions[category] = this.predictCategoryPerformance(category, categoryMetrics, config);
      }
    }
    
    return predictions;
  }

  // [advice from AI] 카테고리별 성능 예측
  predictCategoryPerformance(category, metrics, config) {
    const values = metrics.map(m => m.value);
    const timestamps = metrics.map(m => m.timestamp);
    
    // 선형 트렌드 기반 예측
    const trend = this.calculateLinearTrend(values, timestamps);
    
    if (!trend || trend.confidence === 'low') {
      return {
        method: 'insufficient_data',
        confidence: 'low',
        message: '예측을 위한 데이터가 부족합니다'
      };
    }
    
    const lastTimestamp = timestamps[timestamps.length - 1];
    const lastValue = values[values.length - 1];
    
    // 7일 후 예측값 계산
    const futureTimestamp = lastTimestamp + this.predictionHorizon;
    const timeElapsed = futureTimestamp - lastTimestamp;
    const predictedValue = lastValue + (trend.slope * timeElapsed);
    
    // 임계값 도달 시간 예측
    const timeToWarning = this.calculateTimeToThreshold(
      lastValue, trend.slope, config.thresholds.warning
    );
    const timeToCritical = this.calculateTimeToThreshold(
      lastValue, trend.slope, config.thresholds.critical
    );
    
    return {
      method: 'linear_trend',
      confidence: trend.confidence,
      currentValue: Math.round(lastValue * 100) / 100,
      predictedValue: Math.round(predictedValue * 100) / 100,
      trend: trend.direction,
      timeHorizon: this.predictionHorizon,
      thresholdAlerts: {
        warning: timeToWarning ? {
          timeToReach: timeToWarning,
          expectedDate: new Date(lastTimestamp + timeToWarning).toISOString()
        } : null,
        critical: timeToCritical ? {
          timeToReach: timeToCritical,
          expectedDate: new Date(lastTimestamp + timeToCritical).toISOString()
        } : null
      }
    };
  }

  // [advice from AI] 임계값 도달 시간 계산
  calculateTimeToThreshold(currentValue, slope, threshold) {
    if (slope <= 0 || currentValue >= threshold) {
      return null; // 증가 추세가 아니거나 이미 임계값 초과
    }
    
    const timeToThreshold = (threshold - currentValue) / slope;
    
    // 1년 이내의 예측만 유효하다고 간주
    const maxPredictionTime = 365 * 24 * 60 * 60 * 1000; // 1년
    
    return timeToThreshold <= maxPredictionTime ? timeToThreshold : null;
  }

  // [advice from AI] 권장사항 생성
  generateRecommendations(analysis) {
    const recommendations = [];
    
    // 성능 등급 기반 권장사항
    for (const [category, categoryAnalysis] of Object.entries(analysis.metrics)) {
      if (!categoryAnalysis) continue;
      
      const grade = categoryAnalysis.grade;
      const trend = analysis.trends[category];
      
      if (grade === 'F' || grade === 'D') {
        recommendations.push({
          category,
          priority: 'high',
          type: 'performance',
          title: `${category} 성능 개선 필요`,
          description: `${category} 성능이 ${grade} 등급으로 즉시 개선이 필요합니다.`,
          actions: this.getPerformanceActions(category, grade)
        });
      }
      
      if (trend && trend.direction === 'increasing' && trend.confidence !== 'low') {
        recommendations.push({
          category,
          priority: 'medium',
          type: 'trend',
          title: `${category} 증가 추세 감지`,
          description: `${category} 메트릭이 지속적으로 증가하고 있습니다.`,
          actions: this.getTrendActions(category, trend)
        });
      }
    }
    
    // 이상 징후 기반 권장사항
    analysis.anomalies.forEach(anomaly => {
      if (anomaly.severity >= 3) {
        recommendations.push({
          category: anomaly.category,
          priority: anomaly.severity >= 4 ? 'high' : 'medium',
          type: 'anomaly',
          title: `${anomaly.category} 이상 징후 감지`,
          description: `${anomaly.metricName}에서 비정상적인 값이 감지되었습니다.`,
          actions: this.getAnomalyActions(anomaly)
        });
      }
    });
    
    // 예측 기반 권장사항
    for (const [category, prediction] of Object.entries(analysis.predictions)) {
      if (prediction.thresholdAlerts) {
        if (prediction.thresholdAlerts.critical) {
          recommendations.push({
            category,
            priority: 'high',
            type: 'prediction',
            title: `${category} 임계값 도달 예상`,
            description: `현재 추세로는 ${new Date(prediction.thresholdAlerts.critical.expectedDate).toLocaleDateString()}에 임계값에 도달할 예정입니다.`,
            actions: this.getPredictionActions(category, prediction)
          });
        }
      }
    }
    
    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  // [advice from AI] 성능 개선 액션
  getPerformanceActions(category, grade) {
    const actions = {
      cpu: [
        '프로세스 최적화 및 불필요한 서비스 중단',
        'CPU 집약적 작업의 스케줄링 조정',
        '서버 리소스 업그레이드 검토'
      ],
      memory: [
        '메모리 누수 검사 및 수정',
        '캐시 크기 조정',
        '메모리 사용량이 높은 프로세스 최적화'
      ],
      disk: [
        '불필요한 파일 정리',
        '로그 로테이션 설정 확인',
        '디스크 공간 확장'
      ],
      database: [
        '쿼리 성능 최적화',
        '인덱스 추가 및 최적화',
        '데이터베이스 연결 풀 조정'
      ]
    };
    
    return actions[category] || ['성능 모니터링 강화', '리소스 사용량 분석'];
  }

  // [advice from AI] 트렌드 대응 액션
  getTrendActions(category, trend) {
    return [
      '리소스 사용량 증가 원인 분석',
      '용량 계획 수립',
      '알림 임계값 조정 검토',
      '자동 스케일링 설정 확인'
    ];
  }

  // [advice from AI] 이상 징후 대응 액션
  getAnomalyActions(anomaly) {
    return [
      '이상 징후 발생 시점 상세 분석',
      '관련 시스템 로그 확인',
      '외부 요인 영향 조사',
      '임시 리소스 할당 검토'
    ];
  }

  // [advice from AI] 예측 대응 액션
  getPredictionActions(category, prediction) {
    return [
      '리소스 확장 계획 수립',
      '예방적 최적화 작업 실시',
      '모니터링 주기 단축',
      '비상 대응 절차 준비'
    ];
  }

  // [advice from AI] 분석 요약 생성
  generateSummary(analysis) {
    const summary = {
      overallHealth: 'good',
      criticalIssues: 0,
      warnings: 0,
      trends: {},
      topConcerns: []
    };
    
    // 전체 건강도 평가
    let totalGradePoints = 0;
    let gradeCount = 0;
    
    for (const [category, categoryAnalysis] of Object.entries(analysis.metrics)) {
      if (categoryAnalysis && categoryAnalysis.grade) {
        const gradePoints = { A: 5, B: 4, C: 3, D: 2, F: 1 };
        totalGradePoints += gradePoints[categoryAnalysis.grade] || 3;
        gradeCount++;
      }
    }
    
    if (gradeCount > 0) {
      const avgGrade = totalGradePoints / gradeCount;
      if (avgGrade >= 4.5) summary.overallHealth = 'excellent';
      else if (avgGrade >= 3.5) summary.overallHealth = 'good';
      else if (avgGrade >= 2.5) summary.overallHealth = 'fair';
      else summary.overallHealth = 'poor';
    }
    
    // 문제 수 집계
    summary.criticalIssues = analysis.anomalies.filter(a => a.severity >= 4).length;
    summary.warnings = analysis.anomalies.filter(a => a.severity >= 2 && a.severity < 4).length;
    
    // 트렌드 요약
    for (const [category, trend] of Object.entries(analysis.trends)) {
      if (trend && trend.confidence !== 'low') {
        summary.trends[category] = trend.direction;
      }
    }
    
    // 주요 우려사항
    const highPriorityRecommendations = analysis.recommendations
      .filter(r => r.priority === 'high')
      .slice(0, 3);
    
    summary.topConcerns = highPriorityRecommendations.map(r => ({
      category: r.category,
      title: r.title,
      type: r.type
    }));
    
    return summary;
  }

  // [advice from AI] 시스템 상태 조회
  getSystemStatus() {
    return {
      name: this.name,
      isActive: true,
      configuration: {
        analysisWindow: this.analysisWindow,
        predictionHorizon: this.predictionHorizon,
        trendSensitivity: this.trendSensitivity,
        anomalyThreshold: this.anomalyThreshold
      },
      cache: {
        analyses: this.analysisCache.size,
        trends: this.trendCache.size,
        predictions: this.predictionCache.size
      },
      performanceIndicators: Object.keys(this.performanceIndicators)
    };
  }
}

// [advice from AI] 싱글톤 인스턴스
const performanceAnalyzer = new PerformanceAnalyzer({
  name: 'TimbelPerformanceAnalyzer',
  analysisWindow: 24 * 60 * 60 * 1000, // 24시간
  predictionHorizon: 7 * 24 * 60 * 60 * 1000, // 7일
  trendSensitivity: 0.1,
  anomalyThreshold: 2.5
});

module.exports = {
  PerformanceAnalyzer,
  performanceAnalyzer
};
