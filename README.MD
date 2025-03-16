// 1) Define the README contents as a string:
const readmeMd = `# Achieva Full Scraper

This script is designed to scrape transaction data from Achieva Credit Union’s
web interface and automatically download it as a CSV file. It gathers both
“basic” and “expanded” transaction fields (where available) and ensures each
transaction becomes exactly one CSV row.

## How It Works

- **Removes Images**: Strips out all <img> tags under the transaction grid.
- **Selects Transaction Rows**: Looks for .transaction-details elements in the DOM.
- **Extracts Text Fields**: Captures date, descriptions, amounts, category, memo, etc.
- **Error Handling**: Each row is wrapped in try/catch to avoid interruption.
- **CSV Output**:
  - One header row with multiple columns: Date, Description, Debit, Credit, Balance, etc.
  - Each subsequent line corresponds to one transaction.
  - Automatically downloads a file with a timestamp plus earliest and latest transaction dates.

## Usage

1. **Open** the Achieva transactions page and load as many entries as you want to export.
2. **Open** DevTools (F12) and switch to the **Console** tab.
3. **Paste** the scraper script, hit Enter, and let it run.
4. **Collect** the CSV it downloads (filename includes run date/time and transaction range).

## Notes

- Fields that are not present or require “expanded” views may be blank if they’re not loaded in the DOM.
- If Achieva changes their markup, you may need to adjust the CSS selectors in the script.
- Images (e.g. check images) are always omitted.

## License

Use or modify this script at your own discretion. No warranties provided.