package fuelprices

import (
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
