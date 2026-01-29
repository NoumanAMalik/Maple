package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"strings"
)

func NewRefreshToken() (string, error) {
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(buf), nil
}

func HashRefreshToken(token, pepper string) string {
	payload := token
	if pepper != "" {
		payload = token + ":" + pepper
	}
	sum := sha256.Sum256([]byte(payload))
	return base64.RawURLEncoding.EncodeToString(sum[:])
}

func NormalizeBearer(value string) string {
	value = strings.TrimSpace(value)
	if len(value) < 7 {
		return ""
	}
	if strings.ToLower(value[:7]) != "bearer " {
		return ""
	}
	return strings.TrimSpace(value[7:])
}
