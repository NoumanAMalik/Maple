package httpapi

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net"
	"net/http"
	"net/mail"
	"strings"
	"time"

	"github.com/NoumanAMalik/maple/apps/collab/internal/auth"
	"github.com/NoumanAMalik/maple/apps/collab/internal/config"
	"github.com/NoumanAMalik/maple/apps/collab/internal/db"
	"github.com/NoumanAMalik/maple/apps/collab/internal/models"
)

const minPasswordLength = 8

type AuthHandlers struct {
	users    *db.UserRepo
	sessions *db.SessionRepo
	tokens   *auth.TokenManager
	hasher   *auth.PasswordHasher
	cfg      *config.Config
	logger   *slog.Logger
}

func NewAuthHandlers(users *db.UserRepo, sessions *db.SessionRepo, tokens *auth.TokenManager, hasher *auth.PasswordHasher, cfg *config.Config, logger *slog.Logger) *AuthHandlers {
	return &AuthHandlers{
		users:    users,
		sessions: sessions,
		tokens:   tokens,
		hasher:   hasher,
		cfg:      cfg,
		logger:   logger,
	}
}

type registerRequest struct {
	Email       string `json:"email"`
	Password    string `json:"password"`
	DisplayName string `json:"displayName"`
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type changePasswordRequest struct {
	CurrentPassword string `json:"currentPassword"`
	NewPassword     string `json:"newPassword"`
}

type UserResponse struct {
	ID          string `json:"id"`
	Email       string `json:"email"`
	DisplayName string `json:"displayName"`
}

type AuthResponse struct {
	User        UserResponse `json:"user"`
	AccessToken string       `json:"accessToken"`
	ExpiresIn   int          `json:"expiresIn"`
}

func (h *AuthHandlers) Register(w http.ResponseWriter, r *http.Request) {
	var req registerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", "Invalid JSON body")
		return
	}

	email, err := normalizeEmail(req.Email)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_email", "Email is invalid")
		return
	}

	if len(strings.TrimSpace(req.Password)) < minPasswordLength {
		writeError(w, http.StatusBadRequest, "invalid_password", "Password is too short")
		return
	}

	displayName := strings.TrimSpace(req.DisplayName)
	if displayName == "" {
		displayName = defaultDisplayName(email)
	}
	if len(displayName) > 64 {
		writeError(w, http.StatusBadRequest, "invalid_display_name", "Display name is too long")
		return
	}

	passwordHash, err := h.hasher.Hash(req.Password)
	if err != nil {
		h.logger.Error("password hash failed", "error", err)
		writeError(w, http.StatusInternalServerError, "server_error", "Could not create user")
		return
	}

	user, err := h.users.Create(r.Context(), email, displayName, passwordHash)
	if err != nil {
		if errors.Is(err, db.ErrDuplicate) {
			writeError(w, http.StatusConflict, "email_exists", "Email already registered")
			return
		}
		h.logger.Error("user create failed", "error", err)
		writeError(w, http.StatusInternalServerError, "server_error", "Could not create user")
		return
	}

	authResp, err := h.issueSession(w, r, user)
	if err != nil {
		h.logger.Error("session creation failed", "error", err)
		writeError(w, http.StatusInternalServerError, "server_error", "Could not create session")
		return
	}

	writeJSON(w, http.StatusCreated, authResp)
}

func (h *AuthHandlers) Login(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", "Invalid JSON body")
		return
	}

	email, err := normalizeEmail(req.Email)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "invalid_credentials", "Invalid credentials")
		return
	}

	user, err := h.users.GetByEmail(r.Context(), email)
	if err != nil {
		if errors.Is(err, db.ErrNotFound) {
			writeError(w, http.StatusUnauthorized, "invalid_credentials", "Invalid credentials")
			return
		}
		h.logger.Error("user lookup failed", "error", err)
		writeError(w, http.StatusInternalServerError, "server_error", "Could not login")
		return
	}

	valid, err := h.hasher.Verify(req.Password, user.PasswordHash)
	if err != nil {
		h.logger.Error("password verification failed", "error", err)
		writeError(w, http.StatusInternalServerError, "server_error", "Could not login")
		return
	}
	if !valid {
		writeError(w, http.StatusUnauthorized, "invalid_credentials", "Invalid credentials")
		return
	}

	authResp, err := h.issueSession(w, r, user)
	if err != nil {
		h.logger.Error("session creation failed", "error", err)
		writeError(w, http.StatusInternalServerError, "server_error", "Could not create session")
		return
	}

	writeJSON(w, http.StatusOK, authResp)
}

func (h *AuthHandlers) ChangePassword(w http.ResponseWriter, r *http.Request) {
	userID, ok := userIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized", "Missing user")
		return
	}

	var req changePasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", "Invalid JSON body")
		return
	}

	if len(strings.TrimSpace(req.NewPassword)) < minPasswordLength {
		writeError(w, http.StatusBadRequest, "invalid_password", "Password is too short")
		return
	}

	user, err := h.users.GetByID(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthorized", "User not found")
		return
	}

	valid, err := h.hasher.Verify(req.CurrentPassword, user.PasswordHash)
	if err != nil {
		h.logger.Error("password verification failed", "error", err)
		writeError(w, http.StatusInternalServerError, "server_error", "Could not update password")
		return
	}
	if !valid {
		writeError(w, http.StatusUnauthorized, "invalid_credentials", "Invalid credentials")
		return
	}

	passwordHash, err := h.hasher.Hash(req.NewPassword)
	if err != nil {
		h.logger.Error("password hash failed", "error", err)
		writeError(w, http.StatusInternalServerError, "server_error", "Could not update password")
		return
	}

	if err := h.users.UpdatePassword(r.Context(), user.ID, passwordHash); err != nil {
		h.logger.Error("password update failed", "error", err)
		writeError(w, http.StatusInternalServerError, "server_error", "Could not update password")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *AuthHandlers) Refresh(w http.ResponseWriter, r *http.Request) {
	refreshToken, err := h.readRefreshToken(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthorized", "Missing refresh token")
		return
	}

	hash := auth.HashRefreshToken(refreshToken, h.cfg.RefreshTokenPepper)
	session, err := h.sessions.GetByTokenHash(r.Context(), hash)
	if err != nil {
		if errors.Is(err, db.ErrNotFound) {
			writeError(w, http.StatusUnauthorized, "unauthorized", "Invalid refresh token")
			return
		}
		h.logger.Error("session lookup failed", "error", err)
		writeError(w, http.StatusInternalServerError, "server_error", "Could not refresh session")
		return
	}

	if session.RevokedAt != nil || time.Now().After(session.ExpiresAt) {
		writeError(w, http.StatusUnauthorized, "unauthorized", "Refresh token expired")
		return
	}

	user, err := h.users.GetByID(r.Context(), session.UserID)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthorized", "Invalid session")
		return
	}

	newRefresh, err := auth.NewRefreshToken()
	if err != nil {
		h.logger.Error("refresh token generation failed", "error", err)
		writeError(w, http.StatusInternalServerError, "server_error", "Could not refresh session")
		return
	}

	newHash := auth.HashRefreshToken(newRefresh, h.cfg.RefreshTokenPepper)
	newExpiry := time.Now().Add(h.cfg.RefreshTokenExpiry)
	if err := h.sessions.Rotate(r.Context(), session.ID, newHash, newExpiry); err != nil {
		h.logger.Error("session rotation failed", "error", err)
		writeError(w, http.StatusInternalServerError, "server_error", "Could not refresh session")
		return
	}

	accessToken, expiresAt, err := h.tokens.GenerateAccessToken(*user)
	if err != nil {
		h.logger.Error("access token generation failed", "error", err)
		writeError(w, http.StatusInternalServerError, "server_error", "Could not refresh session")
		return
	}

	h.setRefreshCookie(w, newRefresh, newExpiry)

	writeJSON(w, http.StatusOK, AuthResponse{
		User:        userResponse(user),
		AccessToken: accessToken,
		ExpiresIn:   int(time.Until(expiresAt).Seconds()),
	})
}

func (h *AuthHandlers) Logout(w http.ResponseWriter, r *http.Request) {
	refreshToken, err := h.readRefreshToken(r)
	if err == nil {
		hash := auth.HashRefreshToken(refreshToken, h.cfg.RefreshTokenPepper)
		session, err := h.sessions.GetByTokenHash(r.Context(), hash)
		if err == nil {
			if err := h.sessions.Revoke(r.Context(), session.ID); err != nil {
				h.logger.Warn("failed to revoke session", "error", err)
			}
		}
	}

	h.clearRefreshCookie(w)
	w.WriteHeader(http.StatusNoContent)
}

func (h *AuthHandlers) Me(w http.ResponseWriter, r *http.Request) {
	userID, ok := userIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized", "Missing user")
		return
	}

	user, err := h.users.GetByID(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthorized", "User not found")
		return
	}

	writeJSON(w, http.StatusOK, userResponse(user))
}

func (h *AuthHandlers) issueSession(w http.ResponseWriter, r *http.Request, user *models.User) (*AuthResponse, error) {
	refreshToken, err := auth.NewRefreshToken()
	if err != nil {
		return nil, err
	}

	refreshHash := auth.HashRefreshToken(refreshToken, h.cfg.RefreshTokenPepper)
	userAgent := strings.TrimSpace(r.UserAgent())
	var userAgentPtr *string
	if userAgent != "" {
		userAgentPtr = &userAgent
	}

	ip := requestIP(r)
	var ipPtr *string
	if ip != "" {
		ipPtr = &ip
	}

	expiresAt := time.Now().Add(h.cfg.RefreshTokenExpiry)
	if _, err := h.sessions.Create(r.Context(), user.ID, refreshHash, userAgentPtr, ipPtr, expiresAt); err != nil {
		return nil, err
	}

	accessToken, accessExpiry, err := h.tokens.GenerateAccessToken(*user)
	if err != nil {
		return nil, err
	}

	h.setRefreshCookie(w, refreshToken, expiresAt)

	return &AuthResponse{
		User:        userResponse(user),
		AccessToken: accessToken,
		ExpiresIn:   int(time.Until(accessExpiry).Seconds()),
	}, nil
}

func (h *AuthHandlers) setRefreshCookie(w http.ResponseWriter, token string, expiresAt time.Time) {
	http.SetCookie(w, &http.Cookie{
		Name:     h.cfg.RefreshCookieName,
		Value:    token,
		Path:     "/",
		HttpOnly: true,
		Secure:   h.cfg.CookieSecure,
		SameSite: parseSameSite(h.cfg.CookieSameSite),
		Expires:  expiresAt,
		Domain:   h.cfg.CookieDomain,
	})
}

func (h *AuthHandlers) clearRefreshCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:     h.cfg.RefreshCookieName,
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		Secure:   h.cfg.CookieSecure,
		SameSite: parseSameSite(h.cfg.CookieSameSite),
		Expires:  time.Unix(0, 0),
		MaxAge:   -1,
		Domain:   h.cfg.CookieDomain,
	})
}

func (h *AuthHandlers) readRefreshToken(r *http.Request) (string, error) {
	cookie, err := r.Cookie(h.cfg.RefreshCookieName)
	if err != nil || cookie.Value == "" {
		return "", err
	}
	return cookie.Value, nil
}

func normalizeEmail(email string) (string, error) {
	trimmed := strings.TrimSpace(strings.ToLower(email))
	if trimmed == "" {
		return "", errors.New("empty")
	}
	if _, err := mail.ParseAddress(trimmed); err != nil {
		return "", err
	}
	return trimmed, nil
}

func defaultDisplayName(email string) string {
	parts := strings.Split(email, "@")
	if len(parts) > 0 && parts[0] != "" {
		return parts[0]
	}
	return "maple user"
}

func userResponse(user *models.User) UserResponse {
	return UserResponse{
		ID:          user.ID,
		Email:       user.Email,
		DisplayName: user.DisplayName,
	}
}

func requestIP(r *http.Request) string {
	if forwarded := r.Header.Get("X-Forwarded-For"); forwarded != "" {
		parts := strings.Split(forwarded, ",")
		if len(parts) > 0 {
			candidate := strings.TrimSpace(parts[0])
			if net.ParseIP(candidate) != nil {
				return candidate
			}
		}
	}
	if realIP := strings.TrimSpace(r.Header.Get("X-Real-IP")); realIP != "" {
		if net.ParseIP(realIP) != nil {
			return realIP
		}
	}
	if host, _, err := net.SplitHostPort(r.RemoteAddr); err == nil {
		if net.ParseIP(host) != nil {
			return host
		}
	}
	if net.ParseIP(r.RemoteAddr) != nil {
		return r.RemoteAddr
	}
	return ""
}

func parseSameSite(value string) http.SameSite {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "strict":
		return http.SameSiteStrictMode
	case "none":
		return http.SameSiteNoneMode
	default:
		return http.SameSiteLaxMode
	}
}
