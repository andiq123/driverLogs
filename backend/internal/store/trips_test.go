package store

import (
	"strings"
	"testing"
	"unicode/utf8"
)

func TestCleanTripName(t *testing.T) {
	t.Run("default", func(t *testing.T) {
		if got := cleanTripName("   "); got != "Trip" {
			t.Fatalf("cleanTripName() = %q, want Trip", got)
		}
	})

	t.Run("trim and unicode limit", func(t *testing.T) {
		got := cleanTripName("  " + strings.Repeat("🚗", 81) + "  ")
		if !utf8.ValidString(got) || utf8.RuneCountInString(got) != 80 {
			t.Fatalf("cleanTripName() returned invalid limit: valid=%v runes=%d", utf8.ValidString(got), utf8.RuneCountInString(got))
		}
	})
}
