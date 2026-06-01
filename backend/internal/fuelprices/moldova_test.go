package fuelprices

import "testing"

func TestExtractMoldovaTrendRows(t *testing.T) {
	html := `<h2 id="local">Trends in gasoline prices in the national currency</h2>
<td>Regular 92</td><td>MDL 31.10</td><td>+ MDL 0.44<br/><sub>1.44 %</sub></td><td>+ MDL 2.03<br/><sub>6.98 %</sub></td><td>+ MDL 8.49<br/><sub>37.55 %</sub></td>
<td>Super 95</td><td>MDL 31.35</td><td>+ MDL 0.44<br/><sub>1.42 %</sub></td><td>+ MDL 2.03<br/><sub>6.92 %</sub></td><td>+ MDL 8.49<br/><sub>37.14 %</sub></td>
<td>Premium 95</td><td>MDL 33.10</td><td>MDL 0.00<br/><sub>0.00 %</sub></td><td>MDL 0.00<br/><sub>0.00 %</sub></td><td>+ MDL 3.15<br/><sub>10.52 %</sub></td>
<td>Diesel</td><td>MDL 29.15</td><td>+ MDL 0.15<br/><sub>0.52 %</sub></td><td>- MDL 1.11<br/><sub>3.67 %</sub></td><td>+ MDL 10.54<br/><sub>56.64 %</sub></td>
<td>LPG</td><td>MDL 16.05</td><td>MDL 0.00<br/><sub>0.00 %</sub></td><td>- MDL 0.20<br/><sub>1.23 %</sub></td><td>+ MDL 1.80<br/><sub>12.63 %</sub></td>`

	rows, err := extractMoldovaTrendRows(html)
	if err != nil {
		t.Fatalf("extractMoldovaTrendRows() error = %v", err)
	}
	if len(rows) != 4 {
		t.Fatalf("len(rows) = %d, want 4", len(rows))
	}
	if rows[2].FuelType != "Diesel" || rows[2].Month.Amount != -1.11 || rows[2].Month.Percent != -3.67 {
		t.Fatalf("diesel month = %+v, want negative amount and percent", rows[2])
	}
	if rows[3].Now != 16.05 {
		t.Fatalf("LPG now = %.2f, want 16.05", rows[3].Now)
	}
}

func TestExtractAutotravelerMDLPriceUsesNationalCurrencyTable(t *testing.T) {
	html := `<td>Super 95</td><td>€ 1.58</td>
<h2 id="local">Trends in gasoline prices in the national currency</h2>
<td>Regular 92</td><td>MDL 31.10</td><td>+ MDL 0.44<br/><sub>1.44 %</sub></td><td>+ MDL 2.03<br/><sub>6.98 %</sub></td><td>+ MDL 8.49<br/><sub>37.55 %</sub></td>
<td>Super 95</td><td>MDL 31.35</td><td>+ MDL 0.44<br/><sub>1.42 %</sub></td><td>+ MDL 2.03<br/><sub>6.92 %</sub></td><td>+ MDL 8.49<br/><sub>37.14 %</sub></td>
<td>Premium 95</td><td>MDL 33.10</td><td>MDL 0.00<br/><sub>0.00 %</sub></td><td>MDL 0.00<br/><sub>0.00 %</sub></td><td>+ MDL 3.15<br/><sub>10.52 %</sub></td>
<td>Diesel</td><td>MDL 29.15</td><td>+ MDL 0.15<br/><sub>0.52 %</sub></td><td>- MDL 1.11<br/><sub>3.67 %</sub></td><td>+ MDL 10.54<br/><sub>56.64 %</sub></td>
<td>LPG</td><td>MDL 16.05</td><td>MDL 0.00<br/><sub>0.00 %</sub></td><td>- MDL 0.20<br/><sub>1.23 %</sub></td><td>+ MDL 1.80<br/><sub>12.63 %</sub></td>`

	price, err := extractAutotravelerMDLPrice(html, "Super 95")
	if err != nil {
		t.Fatalf("extractAutotravelerMDLPrice() error = %v", err)
	}
	if price != 31.35 {
		t.Fatalf("price = %.2f, want 31.35", price)
	}
}
