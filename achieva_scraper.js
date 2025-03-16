/***************************************************************
 * ACHIEVA FULL SCRAPER WITH ERROR HANDLING & TIMESTAMPED FILENAME
 *
 * Description:
 *  - Gathers transaction data from Achieva’s web interface
 *  - Outputs each transaction in one CSV row
 *  - Cleans out images & unnecessary text
 *  - Wraps each transaction in try/catch so one bad row won’t break the script
 *  - Automatically names the CSV with run date/time and earliest/latest tx date
 ***************************************************************/

/***************************************************************
 * (A) CLEAN UP IMAGES
 * We remove all <img> tags to ensure we never parse or download check images.
 ***************************************************************/
document.querySelectorAll("#transaction_grid_wrapper img").forEach(img => {
  img.remove();
});

/***************************************************************
 * (B) TEXT CLEANUP HELPER
 * Utility to remove extra spaces, “Add a category,” etc., from raw text
 ***************************************************************/
function cleanText(text) {
  if (!text) return "";
  return text
    .replace(/\s+/g, " ")         // collapse newlines/tabs into single spaces
    .replace(/Add a category/gi, "")
    .replace(/Uncategorized/gi, "")
    .replace(/Transaction memo/gi, "")
    .trim();
}

/***************************************************************
 * (C) DATE PARSING HELPER
 * Achieva typically shows date as “June 2, 2020”
 * parseAchievaDate("June 2, 2020") => Date(2020, 5, 2)
 * Returns null if unable to parse
 ***************************************************************/
function parseAchievaDate(str) {
  if (!str) return null;

  // Matches patterns like “June 2, 2020”
  let match = str.trim().match(/^([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})$/);
  if (!match) return null;

  let monthNames = {
    january: 0,   february: 1,   march: 2,    april: 3,
    may: 4,       june: 5,       july: 6,     august: 7,
    september: 8, october: 9,    november: 10, december: 11
  };
  
  let monthName = match[1].toLowerCase();
  let day = parseInt(match[2], 10);
  let year = parseInt(match[3], 10);

  let monthIndex = monthNames[monthName];
  if (monthIndex === undefined) return null;

  // Construct a Date object
  return new Date(year, monthIndex, day);
}

/***************************************************************
 * (D) FILENAME DATE FORMATTERS
 * formatYMD(date) -> “YYYY-MM-DD”
 * formatDateTime(date) -> “YYYY-MM-DD_HHMMSS”
 ***************************************************************/
function formatYMD(date) {
  if (!date) return "unknown";
  let y = date.getFullYear();
  let m = String(date.getMonth() + 1).padStart(2, "0");
  let d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDateTime(date) {
  let y = date.getFullYear();
  let m = String(date.getMonth() + 1).padStart(2, "0");
  let d = String(date.getDate()).padStart(2, "0");
  let hh = String(date.getHours()).padStart(2, "0");
  let mm = String(date.getMinutes()).padStart(2, "0");
  let ss = String(date.getSeconds()).padStart(2, "0");
  return `${y}-${m}-${d}_${hh}${mm}${ss}`;
}

/***************************************************************
 * (E) CSV HEADERS
 * We define the columns we want in our final CSV
 ***************************************************************/
let csvData = "Date,MainDescription,Debit,Credit,Balance,ExpandedDescription,Account,CheckNumber,Category,ExpandedAmount,Memo\n";

/***************************************************************
 * (F) ARRAYS & VARIABLES FOR TRACKING
 * errors -> to collect any exceptions from try/catch
 * allDates -> to store all parsed transaction dates
 ***************************************************************/
let errors = [];
let allDates = [];

/***************************************************************
 * (G) SELECT ALL TRANSACTION ROWS
 * Achieva typically renders each transaction in a .transaction-details element
 ***************************************************************/
let rows = document.querySelectorAll("#transaction_grid_wrapper .transaction-details");

/***************************************************************
 * (H) LOOP OVER EACH TRANSACTION (WITH ERROR HANDLING)
 ***************************************************************/
rows.forEach(row => {
  try {
    // ---------------------------
    // 1) BASIC (COLLAPSED) FIELDS
    // ---------------------------
    // DATE (like “June 2, 2020”)
    let dateEl = row.querySelector(".date .screenreader-only");
    let rawDate = dateEl ? dateEl.innerText.replace("Date:", "").trim() : "";
    
    // Parse & track earliest/latest
    let parsedDate = parseAchievaDate(rawDate);
    if (parsedDate) allDates.push(parsedDate);

    // MAIN DESCRIPTION
    let descEl = row.querySelector(".description");
    let mainDesc = cleanText(descEl ? descEl.innerText : "");

    // DEBIT / CREDIT
    let debitEl = row.querySelector(".amount.trans-debit");
    let debit = cleanText(debitEl ? debitEl.innerText : "");

    let creditEl = row.querySelector(".amount.trans-credit");
    let credit = cleanText(creditEl ? creditEl.innerText : "");

    // BALANCE
    let balanceEl = row.querySelector(".balance");
    let balance = cleanText(balanceEl ? balanceEl.innerText : "");

    // -----------------------------------------------------------
    // 2) EXPANDED FIELDS (If the transaction is expanded or loaded)
    // -----------------------------------------------------------
    let expandedSummary = null;
    // Achieva often places the expanded content in the sibling element
    let sibling = row.nextElementSibling;
    if (sibling && sibling.matches(".transaction-details-accordion, .transaction-accordion-panel, .expanded-transaction, .accordion-panel")) {
      expandedSummary = sibling.querySelector(".summary");
    }
    // If the expanded summary is actually nested in the same element, 
    // you'd do: expandedSummary = row.querySelector(".summary");

    let expandedDesc = "";
    let account = "";
    let checkNumber = "";
    let category = "";
    let expandedAmount = "";
    let memo = "";

    if (expandedSummary) {
      // Expanded Description
      let expandedDescEl = expandedSummary.querySelector(".description");
      expandedDesc = cleanText(expandedDescEl ? expandedDescEl.innerText : "");

      // Account
      let accountEl = expandedSummary.querySelector(".account");
      account = cleanText(accountEl ? accountEl.innerText : "");

      // Check Number
      let checkNumEl = expandedSummary.querySelector(".check-number");
      checkNumber = cleanText(checkNumEl ? checkNumEl.innerText : "");

      // Category
      let categoryEl = expandedSummary.querySelector(".category");
      category = cleanText(categoryEl ? categoryEl.innerText : "");

      // Possibly a second “Amount” in the expanded details
      let amountEl = expandedSummary.querySelector(".amount");
      expandedAmount = cleanText(amountEl ? amountEl.innerText : "");

      // Memo
      let memoEl = expandedSummary.querySelector(".transaction-memo");
      memo = cleanText(memoEl ? memoEl.innerText : "");
    }

    // ---------------------------
    // 3) BUILD A SINGLE CSV ROW
    // ---------------------------
    //  Each field is quoted in case it contains commas or special chars
    csvData += `"${rawDate}","${mainDesc}","${debit}","${credit}","${balance}","${expandedDesc}","${account}","${checkNumber}","${category}","${expandedAmount}","${memo}"\n`;

  } catch (err) {
    // If something fails for this row, log and store it
    console.error("Error scraping transaction:", err);
    errors.push(err);
  }
});

/***************************************************************
 * (I) CHECK FOR ANY ERRORS
 ***************************************************************/
if (errors.length > 0) {
  console.warn("Encountered errors on some transactions:", errors);
} else {
  console.log("No errors encountered.");
}

/***************************************************************
 * (J) DETERMINE EARLIEST & LATEST DATES
 * We take the min/max of our parsed allDates array
 ***************************************************************/
let earliestDate = null;
let latestDate = null;
if (allDates.length > 0) {
  earliestDate = new Date(Math.min(...allDates));
  latestDate = new Date(Math.max(...allDates));
}

/***************************************************************
 * (K) BUILD THE DYNAMIC FILENAME
 * e.g. “achieva_full_2025-03-15_201314_2020-06-02_to_2025-03-13.csv”
 ***************************************************************/
let now = new Date();
let nowStr = formatDateTime(now);
let earliestStr = formatYMD(earliestDate);
let latestStr = formatYMD(latestDate);
let fileName = `achieva_full_${nowStr}_${earliestStr}_to_${latestStr}.csv`;

/***************************************************************
 * (L) PRINT THE CSV TO THE CONSOLE (for debugging if desired)
 ***************************************************************/
console.log(csvData);

/***************************************************************
 * (M) AUTOMATICALLY DOWNLOAD THE CSV
 ***************************************************************/
let blob = new Blob([csvData], { type: "text/csv" });
let url = URL.createObjectURL(blob);
let link = document.createElement("a");
link.href = url;
link.download = fileName;  // The file name we built
document.body.appendChild(link);
link.click();
document.body.removeChild(link);
URL.revokeObjectURL(url);
