import fs from "fs";
import path from "path";
import express from "express";
import { parse } from "csv-parse";
import XLSX from "xlsx";

const app = express();
const PORT = process.env.PORT || 4000;

// Change this to point at your CSV file path if needed.
const SOURCE_PATH =
  process.env.BUILDING_DATA_PATH ||
  path.join(process.cwd(), "Coffee Shop Sales.xlsx");

// Update this string to filter a different neighborhood (case-insensitive).
const NEIGHBORHOOD_FILTER =
  process.env.BUILDING_NEIGHBORHOOD ?? "Lower Manhattan";

// Adjust the interval (in milliseconds) to control update speed.
const STREAM_INTERVAL_MS = Number(
  process.env.BUILDING_STREAM_INTERVAL_MS ?? 2000,
);

// Switch this to change which field is treated as the building value.
const VALUE_FIELD = process.env.BUILDING_VALUE_FIELD ?? "building_value";

let filteredRows = [];
let simpleOrderSuggestions = [];

async function loadCsv(filePath) {
  return new Promise((resolve, reject) => {
    const rows = [];

    if (!fs.existsSync(filePath)) {
      reject(
        new Error(
          `Data file not found at ${filePath}. Update BUILDING_DATA_PATH or place the file there.`,
        ),
      );
      return;
    }

    fs.createReadStream(filePath)
      .pipe(parse({ columns: true, trim: true }))
      .on("data", (row) => {
        rows.push(row);
      })
      .on("error", (error) => {
        reject(error);
      })
      .on("end", () => {
        resolve(rows);
      });
  });
}

async function loadXlsx(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `Data file not found at ${filePath}. Update BUILDING_DATA_PATH or place the file there.`,
    );
  }

  const workbook = XLSX.readFile(filePath, { cellDates: false });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  return rows;
}

async function loadData() {
  const extension = path.extname(SOURCE_PATH).toLowerCase();

  if (extension === ".csv") {
    return loadCsv(SOURCE_PATH);
  }

  if (extension === ".xlsx" || extension === ".xls") {
    return loadXlsx(SOURCE_PATH);
  }

  throw new Error(
    `Unsupported file extension "${extension}". Please provide a CSV or XLSX file.`,
  );
}

function toLocalISOString(date) {
  const tzOffsetMinutes = date.getTimezoneOffset();
  const absoluteOffset = Math.abs(tzOffsetMinutes);
  const sign = tzOffsetMinutes <= 0 ? "+" : "-";
  const hours = String(Math.floor(absoluteOffset / 60)).padStart(2, "0");
  const minutes = String(absoluteOffset % 60).padStart(2, "0");

  const localTime = new Date(date.getTime() - tzOffsetMinutes * 60000);
  const iso = localTime.toISOString().slice(0, -1);

  return `${iso}${sign}${hours}:${minutes}`;
}

function buildSimpleSuggestions(rows) {
  const itemTotals = new Map();

  const excelDateToJS = (dateSerial, timeSerial = 0) => {
    if (!Number.isFinite(dateSerial) || dateSerial <= 0) {
      return null;
    }
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const millisFromDays = dateSerial * 24 * 60 * 60 * 1000;
    const millisFromTime = Number.isFinite(timeSerial) ? timeSerial * 24 * 60 * 60 * 1000 : 0;
    return new Date(excelEpoch.getTime() + millisFromDays + millisFromTime);
  };

  rows.forEach((row) => {
    const productDetail =
      row.product_detail ||
      row.product_type ||
      row.product_category ||
      row.product ||
      row.item ||
      row.name;

    if (!productDetail) return;

    const quantity = Number(row.transaction_qty || row.quantity || row.qty || 0);
    const price = Number(row.unit_price || row.price || row.unit_cost || 0);
    const timestamp = excelDateToJS(
      Number(row.transaction_date),
      Number(row.transaction_time),
    );

    const existing = itemTotals.get(productDetail) || {
      totalQty: 0,
      totalRevenue: 0,
      lastSeen: timestamp,
    };

    existing.totalQty += quantity;
    existing.totalRevenue += quantity > 0 ? price * quantity : price;
    if (timestamp && (!existing.lastSeen || timestamp > existing.lastSeen)) {
      existing.lastSeen = timestamp;
    }

    itemTotals.set(productDetail, existing);
  });

  const suggestions = Array.from(itemTotals.entries())
    .map(([productDetail, summary]) => {
      const averagePrice =
        summary.totalQty > 0
          ? summary.totalRevenue / summary.totalQty
          : summary.totalRevenue || 0;
      const recommendedReorder = Math.max(Math.round(summary.totalQty * 0.25), 6);
      const estimatedCost = recommendedReorder * (averagePrice || 4);

      let urgency = "stable";
      if (summary.totalQty >= 400) urgency = "urgent";
      else if (summary.totalQty >= 200) urgency = "soon";

      const formattedLastSeen = summary.lastSeen
        ? summary.lastSeen.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })
        : "recently";

      const friendlyNote = `${productDetail} has been a customer favorite with ${summary.totalQty} sold ${formattedLastSeen === "recently" ? "" : `around ${formattedLastSeen}`} — restock soon to keep guests happy.`;

      return {
        ingredient: productDetail,
        recommendedReorder,
        cost: Number(estimatedCost.toFixed(2)),
        note: friendlyNote,
        urgency,
      };
    })
    .sort((a, b) => b.recommendedReorder - a.recommendedReorder)
    .slice(0, 15);

  simpleOrderSuggestions = suggestions;
}

async function prepareData() {
  const rows = await loadData();

  filteredRows = rows
    .filter((row) => {
      const neighborhood = (row.neighborhood || "").toLowerCase();
      return neighborhood.includes(NEIGHBORHOOD_FILTER.toLowerCase());
    })
    .filter((row) => Boolean(row.timestamp))
    .sort(
      (a, b) => new Date(a.timestamp).valueOf() - new Date(b.timestamp).valueOf(),
    );

  buildSimpleSuggestions(rows);

  if (!filteredRows.length) {
    console.warn(
      `No rows matched neighborhood filter "${NEIGHBORHOOD_FILTER}".`,
    );
  } else {
    console.log(
      `Loaded ${filteredRows.length} rows for neighborhood "${NEIGHBORHOOD_FILTER}".`,
    );
  }
}

app.get("/api/buildingStream", async (req, res) => {
  if (!filteredRows.length) {
    res.status(503).json({
      error:
        "Building data not ready. Ensure the CSV exists and matches the filter.",
    });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  if (typeof res.flushHeaders === "function") {
    res.flushHeaders();
  }

  let index = 0;

  const intervalId = setInterval(() => {
    if (index >= filteredRows.length) {
      res.write("event: end\n");
      res.write("data: {}\n\n");
      clearInterval(intervalId);
      res.end();
      return;
    }

    const row = filteredRows[index++];
    const originalDate = new Date(row.timestamp);
    const payload = {
      timestamp: toLocalISOString(originalDate),
      address: row.address,
      building_value: Number(row[VALUE_FIELD]) || 0,
    };

    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  }, STREAM_INTERVAL_MS);

  req.on("close", () => {
    clearInterval(intervalId);
  });
});

app.get("/api/ai-results", (req, res) => {
  if (!simpleOrderSuggestions.length) {
    res.status(503).json({
      error: "Order suggestions not ready. Ensure the data file is accessible.",
    });
    return;
  }

  res.json({ data: simpleOrderSuggestions });
});

prepareData()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Building stream server running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to load CSV:", error);
    process.exit(1);
  });

