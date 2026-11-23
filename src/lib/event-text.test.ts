import { describe, expect, it } from "vitest";
import { artistList, lineupByStage, parsePrices, withArtists } from "./event-text";

const artists = "# La Sala · 20:00 – 04:00\nWhatever Charles\nGio Porzio\n# Azza · 02:00 – 06:00\nWess Mayora";

describe("line-up por salas", () => {
  it("separa salas y horarios", () =>
    expect(lineupByStage({ artists })).toEqual([
      { name: "La Sala", time: "20:00 – 04:00", artists: ["Whatever Charles", "Gio Porzio"] },
      { name: "Azza", time: "02:00 – 06:00", artists: ["Wess Mayora"] },
    ]));
  it("sin salas sigue funcionando", () => expect(lineupByStage({ artists: "A\nB" })).toEqual([{ name: null, time: null, artists: ["A", "B"] }]));
  it("las salas no cuentan como artistas", () => {
    expect(artistList({ artists })).toEqual(["Whatever Charles", "Gio Porzio", "Wess Mayora"]);
    expect(withArtists({ artists }, 2)).toBe("Whatever Charles, Gio Porzio y 1 más");
  });
});

describe("precios", () => {
  it("filas, notas y precio desde (sin reservados)", () => {
    const p = parsePrices("La Sala: 13 € · 16 €\nReservado (5 personas): 150 €\nGastos de gestión aparte.");
    expect(p.rows).toHaveLength(2);
    expect(p.notes).toEqual(["Gastos de gestión aparte."]);
    expect(p.from).toBe(13);
  });
});
