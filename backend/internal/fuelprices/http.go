package fuelprices

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

func newHTTPClient() *http.Client {
	return &http.Client{Timeout: 8 * time.Second}
}

func getJSON[T any](ctx context.Context, client *http.Client, endpoint string) (T, int, error) {
	var value T
	response, err := get(ctx, client, endpoint)
	if err != nil {
		return value, 0, err
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return value, response.StatusCode, nil
	}
	if err := json.NewDecoder(response.Body).Decode(&value); err != nil {
		return value, response.StatusCode, err
	}
	return value, response.StatusCode, nil
}

func getText(ctx context.Context, client *http.Client, endpoint string) (string, int, error) {
	response, err := get(ctx, client, endpoint)
	if err != nil {
		return "", 0, err
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return "", response.StatusCode, nil
	}
	body, err := io.ReadAll(response.Body)
	return string(body), response.StatusCode, err
}

func get(ctx context.Context, client *http.Client, endpoint string) (*http.Response, error) {
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, err
	}
	request.Header.Set("Accept", "application/json,text/html;q=0.9,*/*;q=0.8")
	request.Header.Set("Accept-Language", "en-US,en;q=0.9,ro;q=0.7")
	request.Header.Set("User-Agent", "DriverLogs/0.1 (+local vehicle cost app; cached requests)")
	return client.Do(request)
}

func upstreamStatus(source string, status int) error {
	return fmt.Errorf("%s returned %s", source, http.StatusText(status))
}
