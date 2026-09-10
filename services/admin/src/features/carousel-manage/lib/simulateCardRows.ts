import type { ButtonDTO } from "@/entities/carousel";

/**
 * Simulates Viber's left-to-right / wrap layout and returns total rows used.
 * Same algorithm as CarouselValidators.simulateCardRows.
 */
export const simulateCardRows = (
  buttons: Pick<ButtonDTO, "Columns" | "Rows">[],
  groupColumns: number
): number => {
  let row = 0;
  let col = 0;
  let maxRow = 0;
  for (const button of buttons) {
    if (col + button.Columns > groupColumns) {
      row = maxRow;
      col = 0;
    }
    maxRow = Math.max(maxRow, row + button.Rows);
    col += button.Columns;
    if (col >= groupColumns) {
      row = maxRow;
      col = 0;
    }
  }
  return maxRow;
};
