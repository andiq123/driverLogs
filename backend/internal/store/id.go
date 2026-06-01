package store

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
)

func newID(prefix string) (string, error) {
	bytes := make([]byte, 12)
	if _, err := rand.Read(bytes); err != nil {
		return "", fmt.Errorf("create id: %w", err)
	}
	return prefix + "_" + hex.EncodeToString(bytes), nil
}
