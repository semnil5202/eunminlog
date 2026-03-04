#!/bin/bash

interrupt_handler() {
  echo ""
  echo "> 사용자가 스크립트를 중단했습니다."
  exit 130
}

trap interrupt_handler SIGINT

HOSTS_FILE="/etc/hosts"
LOCAL_DOMAIN="local-client.eunminlog.site"
CERT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# /etc/hosts 확인
echo "> /etc/hosts에서 로컬 도메인을 확인합니다..."

if grep -q "127\.0\.0\.1.*$LOCAL_DOMAIN" "$HOSTS_FILE"; then
  echo "  $LOCAL_DOMAIN 이미 등록됨"
else
  echo "  $LOCAL_DOMAIN 누락됨"
  echo ""
  echo "> $HOSTS_FILE에 로컬 도메인을 추가합니다. 기기 비밀번호를 입력하세요."
  sudo -k

  if ! echo "127.0.0.1	$LOCAL_DOMAIN" | sudo tee -a "$HOSTS_FILE" >/dev/null; then
    echo "> /etc/hosts 수정에 실패했습니다."
    exit 1
  fi
  echo "  $LOCAL_DOMAIN 등록 완료"
fi

# mkcert 확인
echo ""
echo "> mkcert 설치를 확인합니다..."

if ! command -v mkcert &>/dev/null; then
  echo "  mkcert가 설치되어 있지 않습니다. 설치를 진행합니다..."

  if command -v brew &>/dev/null; then
    brew install mkcert
    echo "  mkcert 설치 완료"
  else
    echo "  Homebrew가 설치되어 있지 않습니다. 먼저 Homebrew를 설치해주세요."
    exit 1
  fi
else
  echo "  mkcert 이미 설치됨"
fi

# 로컬 CA 설정
echo ""
echo "> mkcert 로컬 CA를 설정합니다..."
mkcert -install

# HTTPS 인증서 생성
echo ""
echo "> 로컬 HTTPS 인증서를 생성합니다..."

if ! mkcert -key-file "$CERT_DIR/local-key.pem" -cert-file "$CERT_DIR/local.pem" "$LOCAL_DOMAIN"; then
  echo "> HTTPS 인증서 생성에 실패했습니다."
  exit 1
fi

echo ""
echo "> 설정 완료!"
echo "  인증서: $CERT_DIR/local.pem"
echo "  키: $CERT_DIR/local-key.pem"
echo "  도메인: https://$LOCAL_DOMAIN:4321"
