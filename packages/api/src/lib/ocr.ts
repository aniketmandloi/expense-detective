// OCR service for extracting data from receipt images
// Using Tesseract.js for MVP, can be replaced with cloud services later

// Dynamic import to handle optional dependency
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Tesseract: any = null;

async function getTesseract() {
  if (!Tesseract) {
    try {
      // @ts-expect-error - tesseract.js is an optional dependency
      const tesseractModule = await import("tesseract.js");
      Tesseract = tesseractModule.default;
    } catch (error) {
      console.warn(
        "Tesseract.js not installed. OCR functionality will be limited."
      );
      return null;
    }
  }
  return Tesseract;
}

export interface OCRResult {
  merchantName?: string;
  merchantAddress?: string;
  transactionDate?: Date;
  items?: Array<{ description: string; amount: number }>;
  totalAmount?: number;
  taxAmount?: number;
  rawText: string;
  confidence: number;
}

/**
 * Extract text and data from receipt image using OCR
 */
export async function extractReceiptData(
  imagePath: string
): Promise<OCRResult> {
  try {
    const TesseractInstance = await getTesseract();
    if (!TesseractInstance) {
      return {
        rawText: "",
        confidence: 0,
      };
    }

    const { data } = await TesseractInstance.recognize(imagePath, "eng", {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      logger: (m: any) => {
        // Log progress if needed
        if (m.status === "recognizing text") {
          console.log(`OCR Progress: ${Math.round((m.progress || 0) * 100)}%`);
        }
      },
    });

    const rawText = data.text;
    const confidence = data.confidence ?? 0;

    // Parse the extracted text to find key information
    // This is a basic implementation - can be enhanced with ML/NLP
    const parsed = parseReceiptText(rawText);

    return {
      ...parsed,
      rawText,
      confidence,
    };
  } catch (error) {
    console.error("OCR Error:", error);
    throw new Error("Failed to process receipt image");
  }
}

/**
 * Parse receipt text to extract structured data
 * This is a basic parser - can be enhanced with ML models
 */
function parseReceiptText(text: string): Partial<OCRResult> {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const result: Partial<OCRResult> = {
    items: [],
  };

  // Try to extract merchant name (usually first line or contains common patterns)
  const merchantPatterns = [
    /^([A-Z][A-Z\s&]+(?:INC|LLC|LTD|CORP|RESTAURANT|CAFE|STORE)?)/i,
    /^([A-Z\s]+(?:\.COM|\.NET|\.ORG))/i,
  ];
  for (const pattern of merchantPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      result.merchantName = match[1].trim();
      break;
    }
  }

  // Try to extract date
  const datePatterns = [
    /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/,
    /(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/,
    /([A-Z][a-z]+\s+\d{1,2},?\s+\d{4})/,
  ];
  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      try {
        result.transactionDate = new Date(match[1]);
      } catch {
        // Invalid date, skip
      }
      break;
    }
  }

  // Try to extract total amount (look for patterns like "TOTAL", "AMOUNT", "$XX.XX")
  const totalPatterns = [
    /(?:TOTAL|AMOUNT|TOTAL DUE)[:\s]*\$?(\d+\.\d{2})/i,
    /\$(\d+\.\d{2})\s*(?:TOTAL|AMOUNT)?/i,
  ];
  for (const pattern of totalPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      result.totalAmount = parseFloat(match[1]);
      break;
    }
  }

  // Try to extract tax amount
  const taxPatterns = [/(?:TAX|TAX AMOUNT)[:\s]*\$?(\d+\.\d{2})/i];
  for (const pattern of taxPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      result.taxAmount = parseFloat(match[1]);
      break;
    }
  }

  // Try to extract line items (lines with prices)
  const itemPattern = /(.+?)\s+\$?(\d+\.\d{2})/;
  for (const line of lines) {
    const match = line.match(itemPattern);
    if (
      match &&
      match[1] &&
      match[2] &&
      !line.match(/(?:TOTAL|TAX|SUBTOTAL)/i)
    ) {
      if (!result.items) {
        result.items = [];
      }
      result.items.push({
        description: match[1].trim(),
        amount: parseFloat(match[2]),
      });
    }
  }

  return result;
}

/**
 * Process receipt from file buffer (for API use)
 */
export async function extractReceiptDataFromBuffer(
  buffer: Buffer,
  mimeType: string
): Promise<OCRResult> {
  // For Tesseract.js, we need to save the buffer temporarily or use a different approach
  // For MVP, we'll use a workaround with a temporary file or base64
  // In production, use cloud OCR services that accept buffers directly

  const TesseractInstance = await getTesseract();
  if (!TesseractInstance) {
    return {
      rawText: "",
      confidence: 0,
    };
  }

  const base64 = buffer.toString("base64");
  const dataUrl = `data:${mimeType};base64,${base64}`;

  const { data } = await TesseractInstance.recognize(dataUrl, "eng");

  const rawText = data.text;
  const confidence = data.confidence ?? 0;
  const parsed = parseReceiptText(rawText);

  return {
    ...parsed,
    rawText,
    confidence,
  };
}
