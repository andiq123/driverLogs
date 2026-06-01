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
	entry, ok := c.entries[key]
	if !ok || time.Now().After(entry.expiresAt) {
		delete(c.entries, key)
		return nil, false
	}
	return entry.value, true
}

func (c *memoryCache) set(key string, value any) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.entries[key] = cacheEntry{value: value, expiresAt: time.Now().Add(thirdPartyCacheTTL)}
}
