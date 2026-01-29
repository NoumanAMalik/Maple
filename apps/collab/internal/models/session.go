package models

import "time"

type Session struct {
	ID               string     `json:"id"`
	UserID           string     `json:"userId"`
	RefreshTokenHash string     `json:"-"`
	UserAgent        *string    `json:"userAgent,omitempty"`
	IPAddress        *string    `json:"ipAddress,omitempty"`
	CreatedAt        time.Time  `json:"createdAt"`
	ExpiresAt        time.Time  `json:"expiresAt"`
	RevokedAt        *time.Time `json:"revokedAt,omitempty"`
}
