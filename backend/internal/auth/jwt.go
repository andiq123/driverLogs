package auth

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"math/big"
	"strings"
	"time"
)

const TokenTTL = 31 * 24 * time.Hour

var ErrInvalidToken = errors.New("invalid token")

type Claims struct {
	UserID string `json:"sub"`
	Exp    int64  `json:"exp"`
}

func NewLoginID() (string, error) {
	max := big.NewInt(900000000000)
	n, err := rand.Int(rand.Reader, max)
	if err != nil {
		return "", fmt.Errorf("random login id: %w", err)
	}
	return fmt.Sprintf("%012d", n.Int64()+100000000000), nil
}

func Sign(userID, secret string, now time.Time) (string, error) {
	header := map[string]string{"alg": "HS256", "typ": "JWT"}
	claims := Claims{UserID: userID, Exp: now.Add(TokenTTL).Unix()}
	headerJSON, err := json.Marshal(header)
	if err != nil {
		return "", fmt.Errorf("marshal jwt header: %w", err)
	}
	claimsJSON, err := json.Marshal(claims)
	if err != nil {
		return "", fmt.Errorf("marshal jwt claims: %w", err)
	}
	unsigned := encode(headerJSON) + "." + encode(claimsJSON)
	return unsigned + "." + signature(unsigned, secret), nil
}

func Verify(token, secret string, now time.Time) (Claims, error) {
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return Claims{}, ErrInvalidToken
	}
	unsigned := parts[0] + "." + parts[1]
	if !hmac.Equal([]byte(parts[2]), []byte(signature(unsigned, secret))) {
		return Claims{}, ErrInvalidToken
	}
	payload, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return Claims{}, ErrInvalidToken
	}
	var claims Claims
	if err := json.Unmarshal(payload, &claims); err != nil {
		return Claims{}, ErrInvalidToken
	}
	if claims.UserID == "" || claims.Exp <= now.Unix() {
		return Claims{}, ErrInvalidToken
	}
	return claims, nil
}

func Bearer(header string) string {
	token, ok := strings.CutPrefix(header, "Bearer ")
	if !ok {
		return ""
	}
	return strings.TrimSpace(token)
}

func encode(value []byte) string {
	return base64.RawURLEncoding.EncodeToString(value)
}

func signature(unsigned, secret string) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(unsigned))
	return encode(mac.Sum(nil))
}
