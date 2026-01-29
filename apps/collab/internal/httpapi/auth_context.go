package httpapi

import "context"

type contextKey string

const userIDKey contextKey = "userId"

func withUserID(ctx context.Context, userID string) context.Context {
	return context.WithValue(ctx, userIDKey, userID)
}

func userIDFromContext(ctx context.Context) (string, bool) {
	value := ctx.Value(userIDKey)
	if value == nil {
		return "", false
	}
	userID, ok := value.(string)
	return userID, ok
}
