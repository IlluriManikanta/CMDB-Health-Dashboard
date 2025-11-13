CMDB Health Dashboard:

- Simple dashboard to check the health of items in a Configuration Management Database (CMDB). You can spot stale records, duplicates, and missing data in any uploaded CI data file. Helps keep your asset inventory clean and up-to-date without needing to dig into big enterprise tools.

What This Project Does:

- Loads CI (Configuration Item) data from ci.json

- Flags items as Healthy, Missing Info, Duplicate, or Stale

- Lets you simulate quick remediation with a "Revalidate Health" button

- Nice, clean UI for checking status at a glance—no CLI wrangling

How It Works:

- The dashboard runs in your browser. Hit the "Revalidate Health" button anytime to force a new scan of your data. You can check issues per row and hit "Fix" to mock-remediate things like missing fields, old discovery dates, or duplicate names/IPs.

Columns shown:

- Name

- Class (e.g., computer, app server)

- IP Address

- Last Discovered

- Status (Healthy/Missing/Duplicate/Stale)

- Actions (Fix, Details)

- It color-codes each status for quick visual scanning.

Setup:

- Make sure you have a ci.json file in your project root. That's what gets loaded.

- Open index.html in your browser.

- Click buttons, check statuses, try fixing unhealthy items.

Acknowledgements:

- This project was built for personal practice. Sample data (ci.json) and initial styles (style.css) were generated with the help of ChatGPT to speed up prototyping. All application logic, UI behavior, and overall project structure were written manually.
