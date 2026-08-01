package exchange

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestConversionFromRatesUsesNominalMDLValues(t *testing.T) {
	rates := map[string]float64{"RON": 4, "EUR": 20, "USD": 18}
	conversion, err := conversionFromRates(100, "RON", "2026-08-01", rates)
	if err != nil {
		t.Fatal(err)
	}
	if conversion.AmountMDL != 400 || conversion.AmountEUR != 20 || conversion.AmountUSD != 22.22 {
		t.Fatalf("unexpected conversion: %+v", conversion)
	}
}

func TestNormalizeCurrency(t *testing.T) {
	currency, ok := NormalizeCurrency(" ron ")
	if !ok || currency != "RON" {
		t.Fatalf("NormalizeCurrency() = %q, %v", currency, ok)
	}
	if _, ok := NormalizeCurrency("BTC"); ok {
		t.Fatal("unsupported currency was accepted")
	}
}

func TestConvertExpenseUsesOneDatedSnapshot(t *testing.T) {
	requests := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requests++
		w.Header().Set("Content-Type", "application/xml")
		fmt.Fprint(w, `<ValCurs Date="01.08.2026"><Valute><CharCode>RON</CharCode><Nominal>1</Nominal><Value>3.8356</Value></Valute><Valute><CharCode>EUR</CharCode><Nominal>1</Nominal><Value>20.1111</Value></Valute><Valute><CharCode>USD</CharCode><Nominal>1</Nominal><Value>17.5278</Value></Valute></ValCurs>`)
	}))
	defer server.Close()

	client := BNMClient{httpClient: server.Client(), endpoint: server.URL}
	conversion, unitPriceMDL, err := client.ConvertExpense(t.Context(), 300, "RON", "2026-08-01", 7.5, "RON")
	if err != nil {
		t.Fatal(err)
	}
	if requests != 1 {
		t.Fatalf("requests = %d, want one official snapshot", requests)
	}
	if conversion.Date != "2026-08-01" || conversion.AmountMDL != 1150.68 || unitPriceMDL != 28.767 {
		t.Fatalf("unexpected stamped values: conversion=%+v unit_price_mdl=%v", conversion, unitPriceMDL)
	}
}
