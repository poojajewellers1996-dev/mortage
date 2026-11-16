const ones = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"
];

const tens = [
  "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"
];

function convertBelowThousand(n: number): string {
  let str = "";
  if (n >= 100) {
    str += ones[Math.floor(n / 100)] + " Hundred ";
    n %= 100;
  }
  if (n > 0) {
    if (n < 20) {
      str += ones[n] + " ";
    } else {
      str += tens[Math.floor(n / 10)] + " ";
      if (n % 10 > 0) {
        str += ones[n % 10] + " ";
      }
    }
  }
  return str.trim();
}

/**
 * Converts a numeric amount to Indian Currency Words
 * Format: "Rupees [Words] Only"
 * Follows Indian Numbering System: Crore (10^7), Lakh (10^5), Thousand (10^3), Hundred
 */
export function numberToIndianWords(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num) || num === 0) return "Rupees Zero Only";

  const isNegative = num < 0;
  const absNum = Math.abs(num);

  const rupees = Math.floor(absNum);
  const paise = Math.round((absNum - rupees) * 100);

  let result = "";

  const crore = Math.floor(rupees / 10000000);
  let rem = rupees % 10000000;

  const lakh = Math.floor(rem / 100000);
  rem = rem % 100000;

  const thousand = Math.floor(rem / 1000);
  rem = rem % 1000;

  const hundred = rem;

  if (crore > 0) {
    result += convertBelowThousand(crore) + " Crore ";
  }
  if (lakh > 0) {
    result += convertBelowThousand(lakh) + " Lakh ";
  }
  if (thousand > 0) {
    result += convertBelowThousand(thousand) + " Thousand ";
  }
  if (hundred > 0) {
    result += convertBelowThousand(hundred) + " ";
  }

  result = (isNegative ? "Minus " : "") + "Rupees " + result.trim();

  if (paise > 0) {
    result += " and " + convertBelowThousand(paise) + " Paise";
  }

  return result.trim() + " Only";
}

/**
 * Formats a number to Indian currency format: ₹1,25,000.00
 */
export function formatIndianCurrency(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "₹0.00";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Formats weight to 3 decimal places (grams, milligrams)
 */
export function formatWeight(weight: number | string): string {
  const num = typeof weight === "string" ? parseFloat(weight) : weight;
  if (isNaN(num)) return "0.000 g";
  return `${num.toFixed(3)} g`;
}
