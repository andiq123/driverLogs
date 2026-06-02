package fuelprices

import (
	"testing"
	"time"
)

func TestCacheExpiryUsesTwentyHoursWhenItDoesNotCrossMidnight(t *testing.T) {
	now := time.Date(2026, 6, 2, 1, 30, 0, 0, time.Local)

	got := cacheExpiry(now)
	want := now.Add(thirdPartyCacheTTL)

	if !got.Equal(want) {
		t.Fatalf("cacheExpiry() = %v, want %v", got, want)
	}
}

func TestCacheExpiryCapsAtNextMidnight(t *testing.T) {
	now := time.Date(2026, 6, 2, 9, 30, 0, 0, time.Local)

	got := cacheExpiry(now)
	want := time.Date(2026, 6, 3, 0, 0, 0, 0, time.Local)

	if !got.Equal(want) {
		t.Fatalf("cacheExpiry() = %v, want %v", got, want)
	}
}
