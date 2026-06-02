package fuelprices

import (
	"strings"
	"sync"
	"time"
)

const thirdPartyCacheTTL = 20 * time.Hour

type memoryCache struct {
	mu      sync.Mutex
	entries map[string]cacheEntry
}

type cacheEntry struct {
	value     any
	expiresAt time.Time
}

type CacheInfo struct {
	ExpiresAt        time.Time `json:"expires_at,omitempty"`
	ExpiresInSeconds int64     `json:"expires_in_seconds"`
}

type cachedFailure struct {
	message string
}

func (f cachedFailure) Error() string {
	return f.message
}

func newMemoryCache() *memoryCache {
	return &memoryCache{entries: map[string]cacheEntry{}}
}

func (c *memoryCache) get(key string) (any, bool) {
	c.mu.Lock()
	defer c.mu.Unlock()
	now := time.Now()
	entry, ok := c.entries[key]
	if !ok || !now.Before(entry.expiresAt) {
		delete(c.entries, key)
		return nil, false
	}
	return entry.value, true
}

func (c *memoryCache) info(keys ...string) CacheInfo {
	c.mu.Lock()
	defer c.mu.Unlock()
	now := time.Now()
	var expiresAt time.Time
	for _, key := range keys {
		entry, ok := c.entries[key]
		if !ok || !now.Before(entry.expiresAt) {
			delete(c.entries, key)
			continue
		}
		if expiresAt.IsZero() || entry.expiresAt.Before(expiresAt) {
			expiresAt = entry.expiresAt
		}
	}
	if expiresAt.IsZero() {
		return CacheInfo{}
	}
	return CacheInfo{ExpiresAt: expiresAt, ExpiresInSeconds: int64(time.Until(expiresAt).Seconds())}
}

func (c *memoryCache) deletePrefixes(prefixes ...string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	for key := range c.entries {
		for _, prefix := range prefixes {
			if strings.HasPrefix(key, prefix) {
				delete(c.entries, key)
				break
			}
		}
	}
}

func (c *memoryCache) set(key string, value any) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.entries[key] = cacheEntry{value: value, expiresAt: cacheExpiry(time.Now())}
}

func cacheExpiry(now time.Time) time.Time {
	ttlExpiry := now.Add(thirdPartyCacheTTL)
	nextMidnight := time.Date(now.Year(), now.Month(), now.Day()+1, 0, 0, 0, 0, now.Location())
	if ttlExpiry.Before(nextMidnight) {
		return ttlExpiry
	}
	return nextMidnight
}
