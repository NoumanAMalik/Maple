package auth

import (
	"errors"
	"time"

	"github.com/NoumanAMalik/maple/apps/collab/internal/models"
	"github.com/golang-jwt/jwt/v5"
)

var ErrMissingJWTSecret = errors.New("JWT signing key is required")

type Claims struct {
	UserID      string `json:"sub"`
	Email       string `json:"email"`
	DisplayName string `json:"name"`
	jwt.RegisteredClaims
}

type TokenManager struct {
	secret    []byte
	issuer    string
	accessTTL time.Duration
}

func NewTokenManager(secret, issuer string, accessTTL time.Duration) (*TokenManager, error) {
	if secret == "" {
		return nil, ErrMissingJWTSecret
	}
	if issuer == "" {
		issuer = "maple"
	}
	if accessTTL <= 0 {
		accessTTL = 15 * time.Minute
	}
	return &TokenManager{
		secret:    []byte(secret),
		issuer:    issuer,
		accessTTL: accessTTL,
	}, nil
}

func (m *TokenManager) GenerateAccessToken(user models.User) (string, time.Time, error) {
	expiresAt := time.Now().Add(m.accessTTL)
	claims := Claims{
		UserID:      user.ID,
		Email:       user.Email,
		DisplayName: user.DisplayName,
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    m.issuer,
			Subject:   user.ID,
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			ExpiresAt: jwt.NewNumericDate(expiresAt),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString(m.secret)
	if err != nil {
		return "", time.Time{}, err
	}
	return signed, expiresAt, nil
}

func (m *TokenManager) ParseAccessToken(tokenString string) (*Claims, error) {
	parsed, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (any, error) {
		if token.Method != jwt.SigningMethodHS256 {
			return nil, errors.New("unexpected signing method")
		}
		return m.secret, nil
	})
	if err != nil {
		return nil, err
	}

	claims, ok := parsed.Claims.(*Claims)
	if !ok || !parsed.Valid {
		return nil, errors.New("invalid token")
	}
	if claims.Issuer != m.issuer {
		return nil, errors.New("invalid issuer")
	}
	return claims, nil
}
