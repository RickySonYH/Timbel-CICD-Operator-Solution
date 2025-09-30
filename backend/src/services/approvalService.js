// [advice from AI] 결제 승인 및 의사결정 메시지 서비스
// 협업을 위한 승인 요청, 의사결정, 메시지 관리 기능 구현

const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const EmailService = require('./emailService');
const PushNotificationService = require('./pushNotificationService');
const ApprovalWorkflowEngine = require('./approvalWorkflowEngine');

// [advice from AI] PostgreSQL 연결 풀
const pool = new Pool({
  user: process.env.DB_USER || 'timbel_user',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'timbel_knowledge',
  password: process.env.DB_PASSWORD || 'timbel_password',
  port: process.env.DB_PORT || 5434,
});

class ApprovalService {
  constructor() {
    this.pool = new Pool({
      user: process.env.DB_USER || 'timbel_user',
      host: process.env.DB_HOST || 'postgres',
      database: process.env.DB_NAME || 'timbel_knowledge',
      password: process.env.DB_PASSWORD || 'timbel_password',
      port: process.env.DB_PORT || 5432,
    });
    
    this.emailService = new EmailService();
    this.pushService = new PushNotificationService();
    this.workflowEngine = new ApprovalWorkflowEngine();
  }

  // [advice from AI] 승인 요청 생성
  async createApprovalRequest(requestData) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const {
        title,
        description,
        type,
        category,
        priority = 'medium',
        requesterId,
        requester_id,
        department_id,
        project_id,
        due_date,
        approvers = [],
        metadata = {}
      } = requestData;
      
      const finalRequesterId = requesterId || requester_id;

      // [advice from AI] 승인 요청 생성 - amount 컴럼 제거
      const requestResult = await client.query(`
        INSERT INTO approval_requests (
          title, description, type, category, priority,
          requester_id, department_id, project_id, due_date, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id, request_id, created_at
      `, [
        title, description, type, category, priority,
        finalRequesterId, department_id, project_id, due_date, JSON.stringify(metadata)
      ]);

      const request = requestResult.rows[0];

      // [advice from AI] 워크플로우 엔진을 통한 승인자 자동 할당
      const workflowResult = await this.workflowEngine.createApprovalWorkflow({
        approval_type: type,
        requester_id: finalRequesterId,
        department_id,
        project_id,
        priority
      });

      // [advice from AI] 워크플로우 실행은 트랜잭션 커밋 후 진행
      let workflowSteps = null;
      if (workflowResult.success) {
        workflowSteps = workflowResult.data.workflowSteps;
      } else {
        // [advice from AI] 수동 승인자 할당 (워크플로우 생성 실패 시)
        for (let i = 0; i < approvers.length; i++) {
          const approver = approvers[i];
          await client.query(`
            INSERT INTO approval_assignments (
              request_id, approver_id, level, timeout_hours, escalation_config
            ) VALUES ($1, $2, $3, $4, $5)
          `, [
            request.request_id,
            approver.user_id,
            i + 1,
            24,
            JSON.stringify(approver.config || {})
          ]);
        }
      }

      // [advice from AI] 로그 기록
      await client.query(`
        INSERT INTO approval_logs (request_id, action, actor_id, details)
        VALUES ($1, 'created', $2, $3)
      `, [
        request.request_id,
        finalRequesterId,
        JSON.stringify({ title, type, priority })
      ]);

      await client.query('COMMIT');

      // [advice from AI] 트랜잭션 커밋 후 워크플로우 실행
      if (workflowSteps) {
        try {
          await this.workflowEngine.executeWorkflow(request.request_id, workflowSteps);
        } catch (workflowError) {
          console.error('워크플로우 실행 실패:', workflowError);
          // 워크플로우 실행 실패해도 승인 요청은 성공으로 처리
        }
      }

      // [advice from AI] 알림 전송
      await this.sendApprovalNotifications(request.request_id, 'request_created');

      return {
        success: true,
        data: {
          id: request.id,
          request_id: request.request_id,
          created_at: request.created_at
        },
        message: '승인 요청이 생성되었습니다'
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('승인 요청 생성 실패:', error);
      throw new Error(`승인 요청 생성 실패: ${error.message}`);
    } finally {
      client.release();
    }
  }

  // [advice from AI] 승인 응답 처리
  async respondToApproval(request_id, approver_id, response) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const {
        status = response.action === 'approve' ? 'approved' : response.action === 'reject' ? 'rejected' : response.status, // 'approved', 'rejected', 'skipped'
        action = response.action,
        comment = response.comment || '',
        metadata = response.metadata || {}
      } = response;
      
      console.log('respondToApproval 처리:', { status, action, comment, response });

      // [advice from AI] 승인자 할당 업데이트
      const assignmentResult = await client.query(`
        UPDATE approval_assignments 
        SET status = $1, response_comment = $2, response_metadata = $3, 
            responded_at = NOW(), updated_at = NOW()
        WHERE request_id = $4 AND approver_id = $5 AND status = 'pending'
        RETURNING id, level
      `, [status, comment, JSON.stringify(metadata), request_id, approver_id]);

      if (assignmentResult.rows.length === 0) {
        throw new Error('승인할 수 있는 요청이 없습니다');
      }

      const assignment = assignmentResult.rows[0];

      // [advice from AI] 요청 상태 업데이트
      let newStatus = 'pending';
      if (status === 'rejected') {
        newStatus = 'rejected';
      } else if (status === 'approved') {
        // [advice from AI] 다음 단계 승인자 확인
        const nextApproverResult = await client.query(`
          SELECT COUNT(*) as count FROM approval_assignments 
          WHERE request_id = $1 AND level > $2 AND status = 'pending'
        `, [request_id, assignment.level]);

        if (parseInt(nextApproverResult.rows[0].count) === 0) {
          newStatus = 'approved';
        }
      }

      if (newStatus !== 'pending') {
        await client.query(`
          UPDATE approval_requests 
          SET status = $1, updated_at = NOW()
          WHERE request_id = $2
        `, [newStatus, request_id]);
      }

      // [advice from AI] 로그 기록
      const logAction = status || action || 'unknown';
      console.log('approval_logs 삽입:', { request_id, logAction, approver_id, comment });
      await client.query(`
        INSERT INTO approval_logs (request_id, action, actor_id, details)
        VALUES ($1, $2, $3, $4)
      `, [
        request_id,
        logAction,
        approver_id,
        JSON.stringify({ comment, level: assignment.level })
      ]);

      await client.query('COMMIT');

      // [advice from AI] 알림 전송
      await this.sendApprovalNotifications(request_id, 'approval_response', {
        approver_id,
        status,
        comment
      });

      return {
        success: true,
        data: {
          request_id,
          status: newStatus,
          assignment_id: assignment.id
        },
        message: `승인이 ${status === 'approved' ? '승인' : status === 'rejected' ? '거부' : '건너뛰기'}되었습니다`
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('승인 응답 처리 실패:', error);
      throw new Error(`승인 응답 처리 실패: ${error.message}`);
    } finally {
      client.release();
    }
  }

  // [advice from AI] 승인 처리 (승인/거부)
  async processApproval(approvalData) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const { requestId, approverId, action, comment, metadata = {} } = approvalData;

      console.log('승인 처리 시작:', { requestId, approverId, action });

      // [advice from AI] 승인 할당 업데이트
      const updateResult = await client.query(`
        UPDATE approval_assignments 
        SET 
          status = $1,
          response_comment = $2,
          responded_at = NOW(),
          response_metadata = $3,
          updated_at = NOW()
        WHERE request_id = $4 AND approver_id = $5 AND status = 'pending'
        RETURNING *
      `, [action === 'approve' ? 'approved' : 'rejected', comment, JSON.stringify(metadata), requestId, approverId]);

      if (updateResult.rows.length === 0) {
        throw new Error('승인 할당을 찾을 수 없거나 이미 처리되었습니다');
      }

      const assignment = updateResult.rows[0];

      // [advice from AI] 승인 로그 기록
      await client.query(`
        INSERT INTO approval_logs (request_id, action, actor_id, details)
        VALUES ($1, $2, $3, $4)
      `, [
        requestId,
        action === 'approve' ? 'approved' : 'rejected',
        approverId,
        JSON.stringify({ comment, level: assignment.level, metadata })
      ]);

      // [advice from AI] 전체 승인 상태 확인
      const allAssignmentsResult = await client.query(`
        SELECT status, level FROM approval_assignments 
        WHERE request_id = $1 
        ORDER BY level ASC
      `, [requestId]);

      const assignments = allAssignmentsResult.rows;
      let overallStatus = 'pending';

      // 거부가 하나라도 있으면 전체 거부
      if (assignments.some(a => a.status === 'rejected')) {
        overallStatus = 'rejected';
      }
      // 모든 단계가 승인되면 전체 승인
      else if (assignments.every(a => a.status === 'approved')) {
        overallStatus = 'approved';
      }

      // [advice from AI] 승인 요청 상태 업데이트
      await client.query(`
        UPDATE approval_requests 
        SET 
          status = $1,
          updated_at = NOW()
        WHERE request_id = $2
      `, [overallStatus, requestId]);

      await client.query('COMMIT');

      console.log(`✅ 승인 처리 완료: ${requestId} → ${action} (전체 상태: ${overallStatus})`);

      return {
        success: true,
        assignment: assignment,
        overallStatus: overallStatus,
        message: `${action === 'approve' ? '승인' : '거부'} 처리가 완료되었습니다`
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('승인 처리 실패:', error);
      throw new Error(`승인 처리 실패: ${error.message}`);
    } finally {
      client.release();
    }
  }

  // [advice from AI] 의사결정 요청 생성
  async createDecisionRequest(requestData) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const {
        title,
        description,
        type,
        category,
        priority = 'medium',
        requester_id,
        department_id,
        project_id,
        due_date,
        voting_deadline,
        decision_deadline,
        participants = [],
        metadata = {}
      } = requestData;

      // [advice from AI] 의사결정 요청 생성
      const requestResult = await client.query(`
        INSERT INTO decision_requests (
          title, description, type, category, priority,
          requester_id, department_id, project_id, due_date,
          voting_deadline, decision_deadline, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id, request_id, created_at
      `, [
        title, description, type, category, priority,
        requester_id, department_id, project_id, due_date,
        voting_deadline, decision_deadline, JSON.stringify(metadata)
      ]);

      const request = requestResult.rows[0];

      // [advice from AI] 참여자 추가
      for (const participant of participants) {
        await client.query(`
          INSERT INTO decision_participants (
            request_id, participant_id, role
          ) VALUES ($1, $2, $3)
        `, [
          request.request_id,
          participant.user_id,
          participant.role || 'voter'
        ]);
      }

      await client.query('COMMIT');

      // [advice from AI] 알림 전송
      await this.sendDecisionNotifications(request.request_id, 'decision_created');

      return {
        success: true,
        data: {
          id: request.id,
          request_id: request.request_id,
          created_at: request.created_at
        },
        message: '의사결정 요청이 생성되었습니다'
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('의사결정 요청 생성 실패:', error);
      throw new Error(`의사결정 요청 생성 실패: ${error.message}`);
    } finally {
      client.release();
    }
  }

  // [advice from AI] 의사결정 투표
  async voteOnDecision(request_id, participant_id, voteData) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const {
        vote, // 'approve', 'reject', 'abstain', 'conditional'
        comment = '',
        confidence_level = 3
      } = voteData;

      // [advice from AI] 참여자 확인
      const participantResult = await client.query(`
        SELECT id, role FROM decision_participants 
        WHERE request_id = $1 AND participant_id = $2
      `, [request_id, participant_id]);

      if (participantResult.rows.length === 0) {
        throw new Error('의사결정에 참여할 권한이 없습니다');
      }

      // [advice from AI] 투표 기록
      await client.query(`
        INSERT INTO decision_votes (request_id, participant_id, vote, vote_comment, confidence_level)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (request_id, participant_id) 
        DO UPDATE SET vote = $3, vote_comment = $4, confidence_level = $5, voted_at = NOW()
      `, [request_id, participant_id, vote, comment, confidence_level]);

      // [advice from AI] 참여자 상태 업데이트
      await client.query(`
        UPDATE decision_participants 
        SET status = 'voted', responded_at = NOW()
        WHERE request_id = $1 AND participant_id = $2
      `, [request_id, participant_id]);

      // [advice from AI] 투표 결과 확인
      const voteStats = await client.query(`
        SELECT 
          COUNT(*) as total_votes,
          COUNT(CASE WHEN vote = 'approve' THEN 1 END) as approve_votes,
          COUNT(CASE WHEN vote = 'reject' THEN 1 END) as reject_votes,
          COUNT(CASE WHEN vote = 'abstain' THEN 1 END) as abstain_votes
        FROM decision_votes 
        WHERE request_id = $1
      `, [request_id]);

      const stats = voteStats.rows[0];
      const totalParticipants = await client.query(`
        SELECT COUNT(*) as count FROM decision_participants 
        WHERE request_id = $1 AND role IN ('voter', 'decision_maker')
      `, [request_id]);

      const participantCount = parseInt(totalParticipants.rows[0].count);
      const approvalRate = participantCount > 0 ? (parseInt(stats.approve_votes) / participantCount) * 100 : 0;

      // [advice from AI] 의사결정 상태 업데이트
      let newStatus = 'voting';
      if (parseInt(stats.total_votes) >= participantCount) {
        if (approvalRate >= 50) {
          newStatus = 'decided';
        } else {
          newStatus = 'decided';
        }
      }

      if (newStatus === 'decided') {
        await client.query(`
          UPDATE decision_requests 
          SET status = $1, updated_at = NOW()
          WHERE request_id = $2
        `, [newStatus, request_id]);
      }

      await client.query('COMMIT');

      // [advice from AI] 알림 전송
      await this.sendDecisionNotifications(request_id, 'vote_cast', {
        participant_id,
        vote,
        approval_rate: approvalRate
      });

      return {
        success: true,
        data: {
          request_id,
          vote,
          approval_rate: approvalRate,
          total_votes: parseInt(stats.total_votes),
          status: newStatus
        },
        message: '투표가 완료되었습니다'
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('의사결정 투표 실패:', error);
      throw new Error(`의사결정 투표 실패: ${error.message}`);
    } finally {
      client.release();
    }
  }

  // [advice from AI] 메시지 전송
  async sendMessage(messageData) {
    const client = await this.pool.connect();
    try {
      const {
        request_id,
        request_type,
        sender_id,
        recipient_id,
        subject,
        content,
        message_type = 'comment',
        priority = 'medium',
        is_urgent = false,
        attachments = [],
        metadata = {}
      } = messageData;

      // [advice from AI] 메시지 저장
      const messageResult = await client.query(`
        INSERT INTO approval_messages (
          request_id, request_type, sender_id, recipient_id, subject, content,
          message_type, priority, is_urgent, attachments, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id, message_id, sent_at
      `, [
        request_id, request_type, sender_id, recipient_id, subject, content,
        message_type, priority, is_urgent, JSON.stringify(attachments), JSON.stringify(metadata)
      ]);

      const message = messageResult.rows[0];

      // [advice from AI] 알림 전송
      if (recipient_id) {
        await this.sendMessageNotification(message.message_id, recipient_id, {
          subject,
          content,
          priority,
          is_urgent
        });
      }

      return {
        success: true,
        data: {
          id: message.id,
          message_id: message.message_id,
          sent_at: message.sent_at
        },
        message: '메시지가 전송되었습니다'
      };

    } catch (error) {
      console.error('메시지 전송 실패:', error);
      throw new Error(`메시지 전송 실패: ${error.message}`);
    } finally {
      client.release();
    }
  }

  // [advice from AI] 승인 알림 전송
  async sendApprovalNotifications(request_id, event_type, additionalData = {}) {
    try {
      // [advice from AI] 요청 정보 조회
      const requestResult = await this.pool.query(`
        SELECT ar.*, u.full_name as requester_name, u.email as requester_email
        FROM approval_requests ar
        JOIN timbel_users u ON ar.requester_id = u.id
        WHERE ar.request_id = $1
      `, [request_id]);

      if (requestResult.rows.length === 0) return;

      const request = requestResult.rows[0];

      // [advice from AI] 승인자 목록 조회
      const approversResult = await this.pool.query(`
        SELECT aa.*, u.full_name, u.email
        FROM approval_assignments aa
        JOIN timbel_users u ON aa.approver_id = u.id
        WHERE aa.request_id = $1
      `, [request_id]);

      const approvers = approversResult.rows;

      // [advice from AI] 이벤트별 알림 처리
      switch (event_type) {
        case 'request_created':
          for (const approver of approvers) {
            if (approver.status === 'pending') {
              await this.sendApprovalEmail(approver, request, 'new_request');
              await this.sendApprovalPush(approver.approver_id, {
                title: '새로운 승인 요청',
                body: `${request.title} - ${request.requester_name}님이 승인을 요청했습니다`,
                url: `/approvals/${request_id}`,
                data: { request_id, type: 'approval_request' }
              });
              // [advice from AI] 메신저 알림 추가
              await this.sendMessage({
                request_id: request_id,
                request_type: 'approval',
                sender_id: request.requester_id,
                recipient_id: approver.approver_id,
                subject: `[승인 요청] ${request.title}`,
                content: `${request.requester_name}님이 "${request.title}"에 대한 승인을 요청했습니다.\n\n설명: ${request.description}`,
                message_type: 'request',
                priority: request.priority
              });
            }
          }
          break;

        case 'approval_response':
          // [advice from AI] 요청자에게 응답 알림
          await this.sendApprovalEmail({ email: request.requester_email, full_name: request.requester_name }, request, 'approval_response', additionalData);
          await this.sendApprovalPush(request.requester_id, {
            title: '승인 응답 알림',
            body: `${request.title}에 대한 승인이 ${additionalData.status === 'approved' ? '승인' : '거부'}되었습니다`,
            url: `/approvals/${request_id}`,
            data: { request_id, type: 'approval_response' }
          });

          // [advice from AI] 다음 승인자에게 알림
          const nextApprover = approvers.find(a => a.status === 'pending' && a.level > (additionalData.level || 0));
          if (nextApprover) {
            await this.sendApprovalEmail(nextApprover, request, 'next_approver');
            await this.sendApprovalPush(nextApprover.approver_id, {
              title: '승인 대기 중',
              body: `${request.title} - 다음 단계 승인이 필요합니다`,
              url: `/approvals/${request_id}`,
              data: { request_id, type: 'approval_pending' }
            });
          }
          break;
      }

    } catch (error) {
      console.error('승인 알림 전송 실패:', error);
    }
  }

  // [advice from AI] 의사결정 알림 전송
  async sendDecisionNotifications(request_id, event_type, additionalData = {}) {
    try {
      // [advice from AI] 요청 정보 조회
      const requestResult = await this.pool.query(`
        SELECT dr.*, u.full_name as requester_name, u.email as requester_email
        FROM decision_requests dr
        JOIN timbel_users u ON dr.requester_id = u.id
        WHERE dr.request_id = $1
      `, [request_id]);

      if (requestResult.rows.length === 0) return;

      const request = requestResult.rows[0];

      // [advice from AI] 참여자 목록 조회
      const participantsResult = await this.pool.query(`
        SELECT dp.*, u.full_name, u.email
        FROM decision_participants dp
        JOIN timbel_users u ON dp.participant_id = u.id
        WHERE dp.request_id = $1
      `, [request_id]);

      const participants = participantsResult.rows;

      // [advice from AI] 이벤트별 알림 처리
      switch (event_type) {
        case 'decision_created':
          for (const participant of participants) {
            await this.sendDecisionEmail(participant, request, 'new_decision');
            await this.sendDecisionPush(participant.participant_id, {
              title: '새로운 의사결정 요청',
              body: `${request.title} - 의사결정에 참여해주세요`,
              url: `/decisions/${request_id}`,
              data: { request_id, type: 'decision_request' }
            });
          }
          break;

        case 'vote_cast':
          // [advice from AI] 요청자에게 투표 현황 알림
          await this.sendDecisionEmail({ email: request.requester_email, full_name: request.requester_name }, request, 'vote_update', additionalData);
          break;
      }

    } catch (error) {
      console.error('의사결정 알림 전송 실패:', error);
    }
  }

  // [advice from AI] 이메일 전송 헬퍼 메서드들
  async sendApprovalEmail(recipient, request, template_type, additionalData = {}) {
    try {
      const emailData = {
        to: recipient.email,
        templateName: `approval_${template_type}`,
        variables: {
          recipient_name: recipient.full_name,
          request_title: request.title,
          request_type: request.type,
          priority: request.priority,
          requester_name: request.requester_name,
          due_date: request.due_date,
          ...additionalData
        }
      };

      await this.emailService.sendEmail(emailData);
    } catch (error) {
      console.error('승인 이메일 전송 실패:', error);
    }
  }

  async sendDecisionEmail(recipient, request, template_type, additionalData = {}) {
    try {
      const emailData = {
        to: recipient.email,
        templateName: `decision_${template_type}`,
        variables: {
          recipient_name: recipient.full_name,
          request_title: request.title,
          request_type: request.type,
          requester_name: request.requester_name,
          due_date: request.due_date,
          voting_deadline: request.voting_deadline,
          ...additionalData
        }
      };

      await this.emailService.sendEmail(emailData);
    } catch (error) {
      console.error('의사결정 이메일 전송 실패:', error);
    }
  }

  async sendApprovalPush(user_id, notificationData) {
    try {
      await this.pushService.sendNotification(user_id, notificationData);
    } catch (error) {
      console.error('승인 푸시 알림 전송 실패:', error);
    }
  }

  async sendDecisionPush(user_id, notificationData) {
    try {
      await this.pushService.sendNotification(user_id, notificationData);
    } catch (error) {
      console.error('의사결정 푸시 알림 전송 실패:', error);
    }
  }

  async sendMessageNotification(message_id, recipient_id, notificationData) {
    try {
      await this.pushService.sendNotification(recipient_id, {
        title: notificationData.subject || '새로운 메시지',
        body: notificationData.content,
        url: `/messages/${message_id}`,
        data: { message_id, type: 'message' }
      });
    } catch (error) {
      console.error('메시지 알림 전송 실패:', error);
    }
  }

  // [advice from AI] 승인 요청 상세 정보 조회
  async getRequestDetail(requestId) {
    try {
      // [advice from AI] 승인 요청 기본 정보 조회
      const requestQuery = `
        SELECT 
          ar.*,
          u.full_name as requester_name,
          u.email as requester_email,
          d.name as department_name,
          p.name as project_name
        FROM approval_requests ar
        LEFT JOIN users u ON ar.requester_id = u.id
        LEFT JOIN departments d ON ar.department_id = d.id
        LEFT JOIN projects p ON ar.project_id = p.id
        WHERE ar.request_id = $1
      `;
      
      const requestResult = await this.pool.query(requestQuery, [requestId]);
      
      if (requestResult.rows.length === 0) {
        return { success: false, message: '승인 요청을 찾을 수 없습니다.' };
      }

      const request = requestResult.rows[0];

      // [advice from AI] 승인자 목록 조회
      const approversQuery = `
        SELECT 
          aa.*,
          u.full_name,
          u.email,
          u.role_type
        FROM approval_assignments aa
        LEFT JOIN users u ON aa.approver_id = u.id
        WHERE aa.request_id = $1
        ORDER BY aa.level, aa.assigned_at
      `;
      
      const approversResult = await this.pool.query(approversQuery, [requestId]);

      // [advice from AI] 댓글 목록 조회
      const commentsQuery = `
        SELECT 
          c.*,
          u.full_name as author_name
        FROM comments c
        LEFT JOIN users u ON c.author_id = u.id
        WHERE c.request_id = $1 AND c.request_type = 'approval'
        ORDER BY c.created_at DESC
      `;
      
      const commentsResult = await this.pool.query(commentsQuery, [requestId]);

      return {
        success: true,
        data: {
          request: request,
          approvers: approversResult.rows,
          comments: commentsResult.rows
        }
      };
    } catch (error) {
      console.error('승인 요청 상세 조회 실패:', error);
      return { success: false, message: '승인 요청 상세 정보를 불러올 수 없습니다.' };
    }
  }

  // [advice from AI] 승인 요청 응답 처리
  async respondToRequest(requestId, approverId, action, comment, metadata = {}) {
    try {
      console.log('승인 처리 시작:', { requestId, approverId, action, comment });
      
      // [advice from AI] 승인자 할당 확인
      const assignmentQuery = `
        SELECT * FROM approval_assignments 
        WHERE request_id = $1 AND approver_id = $2 AND status = 'pending'
      `;
      
      const assignmentResult = await this.pool.query(assignmentQuery, [requestId, approverId]);
      console.log('승인자 할당 조회 결과:', assignmentResult.rows.length);
      
      if (assignmentResult.rows.length === 0) {
        console.log('승인 권한 없음 - 모든 할당 조회');
        const allAssignments = await this.pool.query(
          'SELECT * FROM approval_assignments WHERE request_id = $1', 
          [requestId]
        );
        console.log('전체 할당 목록:', allAssignments.rows);
        return { success: false, message: '승인 권한이 없습니다.' };
      }

      const assignment = assignmentResult.rows[0];

      // [advice from AI] 승인자 응답 업데이트
      const updateAssignmentQuery = `
        UPDATE approval_assignments 
        SET 
          status = $1,
          response_comment = $2,
          responded_at = NOW(),
          metadata = $3
        WHERE id = $4
      `;
      
      const finalStatus = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : action;
      console.log('할당 상태 업데이트:', { finalStatus, comment, assignmentId: assignment.id });
      
      await this.pool.query(updateAssignmentQuery, [
        finalStatus,
        comment,
        JSON.stringify(metadata),
        assignment.id
      ]);

      // [advice from AI] 승인 요청 상태 업데이트
      const updateRequestQuery = `
        UPDATE approval_requests 
        SET 
          status = CASE 
            WHEN $1 = 'reject' THEN 'rejected'
            WHEN (SELECT COUNT(*) FROM approval_assignments WHERE request_id = $2 AND status = 'pending') = 0 
            THEN 'approved'
            ELSE 'pending'
          END,
          updated_at = NOW()
        WHERE request_id = $2
      `;
      
      console.log('요청 상태 업데이트 실행:', { action, requestId });
      const updateResult = await this.pool.query(updateRequestQuery, [action, requestId]);
      console.log('요청 상태 업데이트 결과:', updateResult.rowCount);

      // [advice from AI] 로그 기록
      await this.pool.query(`
        INSERT INTO approval_logs (request_id, action, actor_id, details)
        VALUES ($1, $2, $3, $4)
      `, [
        requestId,
        finalStatus,
        approverId,
        JSON.stringify({ comment, level: assignment.level, metadata })
      ]);

      // [advice from AI] 알림 발송
      await this.sendApprovalNotifications(requestId, 'approval_response', {
        approver_id: approverId,
        status: finalStatus,
        comment
      });

      console.log('승인 처리 완료:', { requestId, action });
      return { success: true, message: '응답이 처리되었습니다.' };
    } catch (error) {
      console.error('승인 응답 처리 실패:', error);
      return { success: false, message: '응답 처리 중 오류가 발생했습니다.' };
    }
  }

  // [advice from AI] 댓글 추가
  async addComment(requestId, authorId, content, isInternal = false) {
    try {
      const commentId = uuidv4();
      
      const query = `
        INSERT INTO comments (
          comment_id, request_id, request_type, author_id, 
          content, is_internal, created_at
        ) VALUES ($1, $2, 'approval', $3, $4, $5, NOW())
        RETURNING *
      `;
      
      const result = await this.pool.query(query, [
        commentId, requestId, authorId, content, isInternal
      ]);

      return { success: true, data: result.rows[0] };
    } catch (error) {
      console.error('댓글 추가 실패:', error);
      return { success: false, message: '댓글 추가 중 오류가 발생했습니다.' };
    }
  }

  // [advice from AI] 워크플로우 전체 현황 조회
  async getWorkflowOverview() {
    try {
      // [advice from AI] 전체 통계
      const statsQuery = `
        SELECT 
          COUNT(*) as total_requests,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_requests,
          COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_requests,
          COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_requests,
          ROUND(AVG(CASE 
            WHEN status IN ('approved', 'rejected') 
            THEN EXTRACT(EPOCH FROM (updated_at - created_at)) / 3600 
          END), 1) as avg_approval_time_hours,
          ROUND(
            COUNT(CASE WHEN status = 'approved' THEN 1 END)::numeric / 
            NULLIF(COUNT(CASE WHEN status IN ('approved', 'rejected') THEN 1 END), 0) * 100, 
            1
          ) as approval_rate
        FROM approval_requests
        WHERE created_at >= NOW() - INTERVAL '30 days'
      `;
      
      const statsResult = await this.pool.query(statsQuery);
      const stats = statsResult.rows[0];

      // [advice from AI] 워크플로우 단계별 상세 현황
      const stagesQuery = `
        SELECT 
          aa.level as stage,
          CASE aa.level
            WHEN 1 THEN '1차 승인 (초기 검토)'
            WHEN 2 THEN '2차 승인 (관리자 검토)'
            WHEN 3 THEN '3차 승인 (최종 승인)'
            ELSE aa.level || '차 승인'
          END as name,
          COUNT(CASE WHEN aa.status = 'pending' THEN 1 END) as pending_count,
          COUNT(CASE WHEN aa.status = 'approved' THEN 1 END) as approved_count,
          COUNT(CASE WHEN aa.status = 'rejected' THEN 1 END) as rejected_count,
          COUNT(*) as total_count,
          ROUND(AVG(CASE 
            WHEN aa.status IN ('approved', 'rejected') 
            THEN EXTRACT(EPOCH FROM (aa.responded_at - aa.assigned_at)) / 3600 
          END), 1) as avg_time_hours,
          ROUND(
            COUNT(CASE WHEN aa.status = 'approved' THEN 1 END)::numeric / 
            NULLIF(COUNT(CASE WHEN aa.status IN ('approved', 'rejected') THEN 1 END), 0) * 100, 
            1
          ) as approval_rate,
          ARRAY_AGG(
            CASE WHEN aa.status = 'pending' 
            THEN JSON_BUILD_OBJECT(
              'request_id', ar.request_id,
              'title', ar.title,
              'priority', ar.priority,
              'waiting_hours', ROUND(EXTRACT(EPOCH FROM (NOW() - aa.assigned_at)) / 3600, 1)
            ) END
          ) FILTER (WHERE aa.status = 'pending') as pending_items
        FROM approval_assignments aa
        JOIN approval_requests ar ON aa.request_id = ar.request_id
        WHERE ar.created_at >= NOW() - INTERVAL '30 days'
        GROUP BY aa.level
        ORDER BY aa.level
      `;
      
      const stagesResult = await this.pool.query(stagesQuery);

      // [advice from AI] 최근 활동
      const activitiesQuery = `
        SELECT 
          ar.request_id as id,
          CASE 
            WHEN ar.status = 'pending' AND ar.created_at >= NOW() - INTERVAL '1 hour' THEN 'request_created'
            WHEN ar.status = 'approved' THEN 'approved'
            WHEN ar.status = 'rejected' THEN 'rejected'
            ELSE 'updated'
          END as type,
          ar.title,
          ar.description,
          u.full_name as user_name,
          GREATEST(ar.created_at, ar.updated_at) as created_at,
          ar.status
        FROM approval_requests ar
        LEFT JOIN timbel_users u ON ar.requester_id = u.id
        WHERE ar.updated_at >= NOW() - INTERVAL '7 days'
        ORDER BY ar.updated_at DESC
        LIMIT 20
      `;
      
      const activitiesResult = await this.pool.query(activitiesQuery);

      return {
        success: true,
        data: {
          total_requests: parseInt(stats.total_requests) || 0,
          pending_requests: parseInt(stats.pending_requests) || 0,
          approved_requests: parseInt(stats.approved_requests) || 0,
          rejected_requests: parseInt(stats.rejected_requests) || 0,
          avg_approval_time: stats.avg_approval_time_hours ? `${stats.avg_approval_time_hours}시간` : '데이터 없음',
          approval_rate: parseFloat(stats.approval_rate) || 0,
          workflow_stages: stagesResult.rows.map(stage => ({
            stage: stage.stage.toString(),
            name: stage.name,
            pending_count: parseInt(stage.pending_count) || 0,
            approved_count: parseInt(stage.approved_count) || 0,
            rejected_count: parseInt(stage.rejected_count) || 0,
            total_count: parseInt(stage.total_count) || 0,
            avg_time_hours: parseFloat(stage.avg_time_hours) || 0,
            approval_rate: parseFloat(stage.approval_rate) || 0,
            pending_items: stage.pending_items || []
          })),
          recent_activities: activitiesResult.rows
        }
      };
    } catch (error) {
      console.error('워크플로우 현황 조회 실패:', error);
      return { success: false, message: '워크플로우 현황을 불러올 수 없습니다.' };
    }
  }

  // [advice from AI] 특정 승인 요청의 흐름 조회
  async getRequestFlow(requestId) {
    try {
      // [advice from AI] 승인 요청 기본 정보
      const requestQuery = `
        SELECT 
          ar.*,
          u.full_name as requester_name,
          u.email as requester_email,
          d.name as department_name
        FROM approval_requests ar
        LEFT JOIN users u ON ar.requester_id = u.id
        LEFT JOIN departments d ON ar.department_id = d.id
        WHERE ar.request_id = $1
      `;
      
      const requestResult = await this.pool.query(requestQuery, [requestId]);
      
      if (requestResult.rows.length === 0) {
        return { success: false, message: '승인 요청을 찾을 수 없습니다.' };
      }

      const request = requestResult.rows[0];

      // [advice from AI] 승인 단계별 진행 상황
      const flowQuery = `
        SELECT 
          aa.*,
          u.full_name,
          u.email,
          u.role_type,
          EXTRACT(EPOCH FROM (
            COALESCE(aa.responded_at, NOW()) - aa.assigned_at
          )) / 3600 as elapsed_hours
        FROM approval_assignments aa
        LEFT JOIN users u ON aa.approver_id = u.id
        WHERE aa.request_id = $1
        ORDER BY aa.level, aa.assigned_at
      `;
      
      const flowResult = await this.pool.query(flowQuery, [requestId]);

      // [advice from AI] 관련 댓글
      const commentsQuery = `
        SELECT 
          c.*,
          u.full_name as author_name
        FROM comments c
        LEFT JOIN users u ON c.author_id = u.id
        WHERE c.request_id = $1 AND c.request_type = 'approval'
        ORDER BY c.created_at DESC
        LIMIT 10
      `;
      
      const commentsResult = await this.pool.query(commentsQuery, [requestId]);

      return {
        success: true,
        data: {
          request: request,
          flow_stages: flowResult.rows,
          comments: commentsResult.rows,
          // 기본 통계도 포함
          total_requests: 1,
          pending_requests: request.status === 'pending' ? 1 : 0,
          approved_requests: request.status === 'approved' ? 1 : 0,
          rejected_requests: request.status === 'rejected' ? 1 : 0,
          approval_rate: request.status === 'approved' ? 100 : request.status === 'rejected' ? 0 : 50,
          avg_approval_time: '계산 중',
          workflow_stages: [],
          recent_activities: []
        }
      };
    } catch (error) {
      console.error('승인 흐름 조회 실패:', error);
      return { success: false, message: '승인 흐름을 불러올 수 없습니다.' };
    }
  }

  // [advice from AI] 승인/반려 취소 기능
  async cancelApprovalDecision(requestId, cancelerId, reason = '') {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // [advice from AI] 1. 승인 로그에서 최근 결정 찾기 (24시간 이내)
      const logQuery = `
        SELECT al.*, ar.status as current_request_status, ar.id as ar_id
        FROM approval_logs al
        JOIN approval_requests ar ON al.request_id = ar.request_id
        WHERE ar.request_id = $1 
        AND al.actor_id = $2 
        AND al.action IN ('approved', 'rejected')
        AND al.created_at > NOW() - INTERVAL '24 hours'
        ORDER BY al.created_at DESC
        LIMIT 1
      `;
      
      const logResult = await client.query(logQuery, [requestId, cancelerId]);
      
      if (logResult.rows.length === 0) {
        throw new Error('취소할 수 있는 승인/반려 결정이 없습니다. (24시간 이내, 본인 처리 건만 취소 가능)');
      }
      
      const lastDecision = logResult.rows[0];
      
      // [advice from AI] 2. 이미 최종 완료된 요청인지 확인
      if (lastDecision.current_request_status === 'completed') {
        throw new Error('이미 완료된 승인 요청은 취소할 수 없습니다.');
      }
      
      // [advice from AI] 3. 승인 할당에서 해당 승인자의 상태를 pending으로 되돌리기
      const updateAssignmentQuery = `
        UPDATE approval_assignments 
        SET status = 'pending', 
            decided_at = NULL,
            updated_at = NOW()
        WHERE request_id = $1 AND approver_id = $2
        RETURNING *
      `;
      
      const assignmentResult = await client.query(updateAssignmentQuery, [lastDecision.ar_id, cancelerId]);
      
      if (assignmentResult.rows.length === 0) {
        throw new Error('승인 할당 정보를 찾을 수 없습니다.');
      }
      
      // [advice from AI] 4. 승인 요청의 전체 상태를 pending으로 변경
      const updateRequestQuery = `
        UPDATE approval_requests 
        SET status = 'pending',
            updated_at = NOW()
        WHERE request_id = $1
        RETURNING *
      `;
      
      const requestResult = await client.query(updateRequestQuery, [requestId]);
      
      // [advice from AI] 5. 취소 로그 기록
      const cancelLogQuery = `
        INSERT INTO approval_logs (
          request_id, actor_id, action, details, 
          created_at
        ) VALUES ($1, $2, $3, $4, NOW())
        RETURNING *
      `;
      
      const cancelMetadata = {
        cancelled_decision: lastDecision.action,
        cancelled_at: lastDecision.created_at,
        cancel_reason: reason,
        original_details: lastDecision.details,
        comment: `${lastDecision.action === 'approved' ? '승인' : '반려'} 결정을 취소했습니다.${reason ? ` 사유: ${reason}` : ''}`
      };
      
      await client.query(cancelLogQuery, [
        lastDecision.request_id,
        cancelerId,
        'cancelled',
        JSON.stringify(cancelMetadata)
      ]);
      
      await client.query('COMMIT');
      
      console.log(`✅ 승인 결정 취소 완료:`, {
        requestId,
        cancelerId,
        originalDecision: lastDecision.action,
        reason
      });
      
      return {
        success: true,
        message: `${lastDecision.action === 'approved' ? '승인' : '반려'} 결정이 성공적으로 취소되었습니다.`,
        data: {
          requestId,
          cancelledDecision: lastDecision.action,
          cancelledAt: new Date().toISOString(),
          newStatus: 'pending'
        }
      };
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ 승인 결정 취소 실패:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // [advice from AI] 팀/부서별 승인 현황 조회
  async getTeamApprovalStats() {
    try {
      // [advice from AI] 부서별 전체 통계
      const departmentStatsQuery = `
        SELECT 
          d.id as department_id,
          d.name as department_name,
          COUNT(ar.id) as total_requests,
          COUNT(CASE WHEN ar.status = 'pending' THEN 1 END) as pending_requests,
          COUNT(CASE WHEN ar.status = 'approved' THEN 1 END) as approved_requests,
          COUNT(CASE WHEN ar.status = 'rejected' THEN 1 END) as rejected_requests,
          ROUND(
            COUNT(CASE WHEN ar.status = 'approved' THEN 1 END)::numeric / 
            NULLIF(COUNT(CASE WHEN ar.status IN ('approved', 'rejected') THEN 1 END), 0) * 100, 
            1
          ) as approval_rate,
          ROUND(AVG(CASE 
            WHEN ar.status IN ('approved', 'rejected') 
            THEN EXTRACT(EPOCH FROM (ar.updated_at - ar.created_at)) / 3600 
          END), 1) as avg_processing_time
        FROM departments d
        LEFT JOIN approval_requests ar ON d.id = ar.department_id
        WHERE ar.created_at >= NOW() - INTERVAL '30 days' OR ar.created_at IS NULL
        GROUP BY d.id, d.name
        HAVING COUNT(ar.id) > 0
        ORDER BY approval_rate DESC NULLS LAST
      `;
      
      const departmentStatsResult = await this.pool.query(departmentStatsQuery);

      // [advice from AI] 각 부서별 상세 정보
      const detailedStats = await Promise.all(
        departmentStatsResult.rows.map(async (dept) => {
          // 부서별 단계별 대기 현황
          const stageStatsQuery = `
            SELECT 
              aa.level as stage,
              CASE aa.level
                WHEN 1 THEN '1차 승인 (초기 검토)'
                WHEN 2 THEN '2차 승인 (관리자 검토)'
                WHEN 3 THEN '3차 승인 (최종 승인)'
                ELSE aa.level || '차 승인'
              END as stage_name,
              COUNT(CASE WHEN aa.status = 'pending' THEN 1 END) as pending_count,
              ROUND(AVG(CASE 
                WHEN aa.status = 'pending' 
                THEN EXTRACT(EPOCH FROM (NOW() - aa.assigned_at)) / 3600 
              END), 1) as avg_time_hours
            FROM approval_assignments aa
            JOIN approval_requests ar ON aa.request_id = ar.request_id
            WHERE ar.department_id = $1 AND ar.created_at >= NOW() - INTERVAL '30 days'
            GROUP BY aa.level
            ORDER BY aa.level
          `;
          
          const stageStatsResult = await this.pool.query(stageStatsQuery, [dept.department_id]);

          // 부서별 주요 승인자 현황
          const approverStatsQuery = `
            SELECT 
              u.id as approver_id,
              u.full_name as approver_name,
              u.role_type,
              COUNT(CASE WHEN aa.status = 'pending' THEN 1 END) as pending_count,
              COUNT(CASE WHEN aa.status IN ('approved', 'rejected') THEN 1 END) as processed_count,
              ROUND(
                COUNT(CASE WHEN aa.status = 'approved' THEN 1 END)::numeric / 
                NULLIF(COUNT(CASE WHEN aa.status IN ('approved', 'rejected') THEN 1 END), 0) * 100, 
                1
              ) as approval_rate,
              ROUND(AVG(CASE 
                WHEN aa.status IN ('approved', 'rejected') 
                THEN EXTRACT(EPOCH FROM (aa.responded_at - aa.assigned_at)) / 3600 
              END), 1) as avg_response_time
            FROM timbel_users u
            JOIN approval_assignments aa ON u.id = aa.approver_id
            JOIN approval_requests ar ON aa.request_id = ar.request_id
            WHERE ar.department_id = $1 AND ar.created_at >= NOW() - INTERVAL '30 days'
            GROUP BY u.id, u.full_name, u.role_type
            HAVING COUNT(aa.id) > 0
            ORDER BY pending_count DESC, processed_count DESC
            LIMIT 5
          `;
          
          const approverStatsResult = await this.pool.query(approverStatsQuery, [dept.department_id]);

          // 부서별 최근 활동
          const recentActivitiesQuery = `
            SELECT 
              ar.request_id,
              ar.title,
              CASE 
                WHEN ar.status = 'approved' THEN 'approved'
                WHEN ar.status = 'rejected' THEN 'rejected'
                ELSE 'created'
              END as action,
              u.full_name as actor_name,
              ar.updated_at as created_at
            FROM approval_requests ar
            LEFT JOIN timbel_users u ON ar.requester_id = u.id
            WHERE ar.department_id = $1 AND ar.updated_at >= NOW() - INTERVAL '7 days'
            ORDER BY ar.updated_at DESC
            LIMIT 5
          `;
          
          const recentActivitiesResult = await this.pool.query(recentActivitiesQuery, [dept.department_id]);

          return {
            ...dept,
            pending_by_stage: stageStatsResult.rows,
            top_approvers: approverStatsResult.rows,
            recent_activities: recentActivitiesResult.rows
          };
        })
      );

      return {
        success: true,
        data: detailedStats
      };
    } catch (error) {
      console.error('팀 승인 현황 조회 실패:', error);
      return { success: false, message: '팀 승인 현황을 불러올 수 없습니다.' };
    }
  }

  // [advice from AI] 서비스 종료
  async close() {
    await this.pool.end();
    await this.emailService.close();
    await this.pushService.close();
  }
}

module.exports = ApprovalService;
