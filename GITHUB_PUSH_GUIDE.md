# GitHub 푸시 가이드 - v0.8 버전

## 📦 현재 상태

✅ **로컬 준비 완료:**
- Commit: `305fbf1` (README.md 업데이트)
- Commit: `2ccd990` (v0.8 메인 커밋)
- Tag: `v0.8`
- 변경: 240개 파일 (22,326 추가, 106,261 삭제)

## 🔐 GitHub 푸시 방법

### 방법 1: SSH 키 설정 (추천)

```bash
# 1. SSH 키 생성 (없는 경우)
ssh-keygen -t ed25519 -C "rickyson@timbel.com"

# 2. 공개 키 확인
cat ~/.ssh/id_ed25519.pub

# 3. GitHub에 SSH 키 등록
# https://github.com/settings/keys 에서 "New SSH key" 클릭
# 위에서 복사한 공개 키 붙여넣기

# 4. 리모트 URL을 SSH로 변경
git remote set-url origin git@github.com:RickySonYH/timbel-knowledge-deployment-solution.git

# 5. 푸시
git push origin main
git push origin v0.8
```

### 방법 2: Personal Access Token 사용

```bash
# 1. GitHub에서 Personal Access Token 생성
# https://github.com/settings/tokens 에서 "Generate new token" 클릭
# repo 권한 선택

# 2. 리모트 URL을 토큰 포함으로 변경
git remote set-url origin https://YOUR_TOKEN@github.com/RickySonYH/timbel-knowledge-deployment-solution.git

# 3. 푸시
git push origin main
git push origin v0.8
```

### 방법 3: GitHub CLI 사용

```bash
# 1. GitHub CLI 설치 (없는 경우)
# Ubuntu/WSL
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
sudo apt update
sudo apt install gh

# 2. 인증
gh auth login

# 3. 푸시
git push origin main
git push origin v0.8
```

### 방법 4: Git Credential Manager 사용

```bash
# 1. Git Credential Manager 설치
# https://github.com/git-ecosystem/git-credential-manager/releases

# 2. 푸시 시도 (브라우저에서 인증)
git push origin main
git push origin v0.8
```

## 📊 v0.8 버전 정보

### 주요 변경사항

**운영센터 메뉴 재구성:**
- 프로세스 기반 메뉴 구조 (4개 그룹 + 10개 메뉴)
- 파이프라인 현황 통합 대시보드
- 배포 요청 처리 시스템
- 배포 히스토리 및 롤백 관리

**성능 & 보안:**
- DB 인덱스 8개 생성
- API 압축 및 캐싱
- Rate Limiting (인증 5회/15분, 일반 100회/15분)
- 입력 검증 및 요청 로깅

**버그 수정:**
- toFixed undefined 오류 수정
- List is not defined 오류 수정
- 모든 런타임 오류 해결

## 🎯 푸시 후 확인

푸시 성공 후 다음 링크에서 확인하세요:

- **Repository**: https://github.com/RickySonYH/timbel-knowledge-deployment-solution
- **Commits**: https://github.com/RickySonYH/timbel-knowledge-deployment-solution/commits/main
- **Tag v0.8**: https://github.com/RickySonYH/timbel-knowledge-deployment-solution/releases/tag/v0.8

## ❓ 문제 해결

### "Permission denied (publickey)" 오류
→ SSH 키가 GitHub에 등록되지 않았습니다. 방법 1의 1-3단계를 실행하세요.

### "Authentication failed" 오류
→ Personal Access Token이 만료되었거나 권한이 부족합니다. 방법 2를 사용하세요.

### "could not read Username" 오류
→ Git Credential이 설정되지 않았습니다. 방법 3 또는 4를 사용하세요.

---

**💡 가장 간단한 방법: GitHub CLI (방법 3)를 추천합니다!**

