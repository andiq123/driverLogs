package exchange

import (
	"context"
	"encoding/xml"
	"fmt"
	"math"
	"net/http"
	"net/url"
	"strconv"
	"time"
)

const bnmEndpoint = "https://bnm.md/en/official_exchange_rates"

type Conversion struct {
	AmountBase   float64
	BaseCurrency string
	AmountMDL    float64
	AmountEUR    float64
	AmountUSD    float64
	RateEUR      float64
	RateUSD      float64
	Date         string
	Source       string
}

type BNMClient struct {
	httpClient *http.Client
}

func NewBNMClient() BNMClient {
	return BNMClient{httpClient: &http.Client{Timeout: 8 * time.Second}}
}

func (c BNMClient) ConvertMDL(ctx context.Context, amountMDL float64, date string) (Conversion, error) {
	return c.Convert(ctx, amountMDL, "MDL", date)
}

func (c BNMClient) Convert(ctx context.Context, amount float64, currency string, date string) (Conversion, error) {
	rates, rateDate, err := c.rates(ctx, date)
	if err != nil {
		return Conversion{}, err
	}
	amountMDL := amount
	if currency != "MDL" {
		rate := rates[currency]
		if rate <= 0 {
			return Conversion{}, fmt.Errorf("missing %s exchange rate", currency)
		}
		amountMDL = amount * rate
	}
	eur := rates["EUR"]
	usd := rates["USD"]
	if eur <= 0 || usd <= 0 {
		return Conversion{}, fmt.Errorf("missing eur/usd exchange rates")
	}
	return Conversion{
		AmountBase:   amount,
		BaseCurrency: currency,
		AmountMDL:    roundMoney(amountMDL),
		AmountEUR:    roundMoney(amountMDL / eur),
		AmountUSD:    roundMoney(amountMDL / usd),
		RateEUR:      eur,
		RateUSD:      usd,
		Date:         rateDate,
		Source:       "National Bank of Moldova",
	}, nil
}

func roundMoney(value float64) float64 {
	return math.Round(value*100) / 100
}

func (c BNMClient) ConvertDecimalToMDL(ctx context.Context, amount float64, currency string, date string) (float64, error) {
	if currency == "MDL" {
		return amount, nil
	}
	rates, _, err := c.rates(ctx, date)
	if err != nil {
		return 0, err
	}
	rate := rates[currency]
	if rate <= 0 {
		return 0, fmt.Errorf("missing %s exchange rate", currency)
	}
	return amount * rate, nil
}

func (c BNMClient) rates(ctx context.Context, date string) (map[string]float64, string, error) {
	requestURL := bnmEndpoint + "?date=" + url.QueryEscape(displayDate(date)) + "&get_xml=1"
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, requestURL, nil)
	if err != nil {
		return nil, "", err
	}
	response, err := c.httpClient.Do(request)
	if err != nil {
		return nil, "", err
	}
	defer response.Body.Close()
	if response.StatusCode < http.StatusOK || response.StatusCode >= http.StatusMultipleChoices {
		return nil, "", fmt.Errorf("bnm status %d", response.StatusCode)
	}
	var payload struct {
		Date    string `xml:"Date,attr"`
		Valutes []struct {
			Code    string `xml:"CharCode"`
			Nominal int    `xml:"Nominal"`
			Value   string `xml:"Value"`
		} `xml:"Valute"`
	}
	if err := xml.NewDecoder(response.Body).Decode(&payload); err != nil {
		return nil, "", err
	}
	rates := make(map[string]float64, len(payload.Valutes))
	for _, valute := range payload.Valutes {
		value, err := strconv.ParseFloat(valute.Value, 64)
		if err != nil || valute.Nominal <= 0 {
			continue
		}
		rates[valute.Code] = value / float64(valute.Nominal)
	}
	return rates, isoDate(payload.Date), nil
}

func displayDate(value string) string {
	date, err := time.Parse("2006-01-02", value)
	if err != nil {
		return time.Now().Format("02.01.2006")
	}
	return date.Format("02.01.2006")
}

func isoDate(value string) string {
	date, err := time.Parse("02.01.2006", value)
	if err != nil {
		return value
	}
	return date.Format("2006-01-02")
}
