// This is a sample CMDB health checker I built to practice my Javascirpt skills and CMDB data concepts. 


const STALE_TIME = 14;
const CI_BODY = document.getElementById("ci-body");
const CHECK_BTN = document.getElementById("revalidate");
const STATS = document.getElementById("stats");


// Each class will have these feilds filled in. 
const REQUIRED_FIELDS = {
  "cmdb_ci_computer": ["os", "owner"],
  "cmdb_ci_app_server": ["os", "owner"],
  "cmdb_ci_database": ["engine", "owner"],
  "cmdb_ci_network": ["vendor", "owner"]
};

// Storing raw CI info and health results.
const state = {
  cis: [],
  results: []
};

// Helper func to check stale time of a CI based on when it was last discovered. 
function daysSince(isoString) {
  const then = new Date(isoString).getTime();
  const now = Date.now();
  const diffMs = now - then;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return diffDays;
}

// Helper func to format timestamp.
function formatDateTime(isoString) {
  const d = new Date(isoString);
  const pretty = d.toLocaleString();
  return pretty;
}

// Generates random ips. Similar to how Discovery assigns new IPs. 
function randomIP() {
  const x = Math.floor(Math.random() * 10) + 1;
  const ip = "Random generated IP: 10.0.0." + x;
  return ip;
}

// Loads CI data from Json file.  
async function loadData() {
  try {
    const res = await fetch("./data/ci.json");
    if (!res.ok) {
      throw new Error(`Failed loading ci.json: ${res.status}`);
    }

    state.cis = await res.json();
    console.log("CI file loaded:", state.cis.length, state.cis);

    checkCIHealth();
    updateUI();

  } catch (err) {
    console.error(err);
    alert("Failed loading ci.json.");
  }
}

document.addEventListener("DOMContentLoaded", loadData);


// Checks for duplicate CI names and IPs.
function findDuplicateKeys(cis) {
  const nameCounts = new Map();
  const ipCounts = new Map();

  cis.forEach((ci) => {
    let name = "";
    if (ci && ci.name) {
      name = String(ci.name).trim();
    }

    let ip = "";
    if (ci && ci.ip_address) {
      ip = String(ci.ip_address).trim();
    }

    if (name) {
      const oldCount = nameCounts.get(name) || 0;
      const newCount = oldCount + 1;
      nameCounts.set(name, newCount);
    }

    if (ip) {
      const oldCount = ipCounts.get(ip) || 0;
      const newCount = oldCount + 1;
      ipCounts.set(ip, newCount);
    }
  });

  const dupNames = new Set();
  const dupIps = new Set();

// More than one occurance is classified as a duplicate. 
  for (const [key, count] of nameCounts.entries()) {
    if (count > 1) {
      dupNames.add(key);
    }
  }

  
  for (const [key, count] of ipCounts.entries()) {
    if (count > 1) {
      dupIps.add(key);
    }
  }

  return { dupNames, dupIps };
}

// Checks CI for missing fields, duplicate name/IP, stale records and gives health status. 
function checkCI(ci, duplicateKeys) {
  const issues = [];

  
  const required = REQUIRED_FIELDS[ci.class] || [];
  const missing = [];

  required.forEach((attr) => {
    let value;

    if (ci && ci.attributes) {
      value = ci.attributes[attr];
    } else {
      value = undefined;
    }

    let valueStr = "";
    if (value !== undefined && value !== null) {
      valueStr = String(value).trim();
    }

    if (!valueStr) {
      missing.push(attr);
    }
  });

  if (missing.length > 0) {
    issues.push(`Missing: ${missing.join(", ")}`);
  }

  
  let isNameDup = false;
  let isIpDup = false;

  if (ci && ci.name) {
    const nameStr = String(ci.name).trim();
    if (duplicateKeys.dupNames.has(nameStr)) {
      isNameDup = true;
    }
  }

  if (ci && ci.ip_address) {
    const ipStr = String(ci.ip_address).trim();
    if (duplicateKeys.dupIps.has(ipStr)) {
      isIpDup = true;
    }
  }

  if (isNameDup || isIpDup) {
    const parts = [];
    if (isNameDup) {
      parts.push("name");
    }
    if (isIpDup) {
      parts.push("ip");
    }
    issues.push(`Duplicate (${parts.join(" & ")})`);
  }

  
  const age = daysSince(ci.last_discovered);
  if (age > STALE_TIME) {
    issues.push(`Stale (${age}d)`);
  }


  let status = "Healthy";
  const hasMissing = issues.some((i) => i.startsWith("Missing"));
  const hasDuplicate = issues.some((i) => i.startsWith("Duplicate"));
  const hasStale = issues.some((i) => i.startsWith("Stale"));

  if (hasMissing) {
    status = "Missing";
  } else if (hasDuplicate) {
    status = "Duplicate";
  } else if (hasStale) {
    status = "Stale";
  }

  const resultRow = { ci, status, issues };
  return resultRow;
}

// Does health checks for all CI and stores the results. 
function checkCIHealth() {
  const duplicates = findDuplicateKeys(state.cis);
  const rows = [];

  state.cis.forEach((ci) => {
    const row = checkCI(ci, duplicates);
    rows.push(row);
  });

  state.results = rows;
  console.log("Health computed:", state.results);
}


// Updates UI with new health results and edits the summary count. 
function updateUI() {
  CI_BODY.innerHTML = "";

  state.results.forEach((row) => {
    const tr = document.createElement("tr");

    let nameCell = "";
    if (row.ci && row.ci.name) {
      nameCell = row.ci.name;
    }

    let classCell = "";
    if (row.ci && row.ci.class) {
      classCell = row.ci.class;
    }

    let ipCell;
    if (row.ci && row.ci.ip_address && String(row.ci.ip_address).trim() !== "") {
      ipCell = row.ci.ip_address;
    } else {
      ipCell = '<span style="color:#999">—</span>';
    }

    const lastDiscCell = formatDateTime(row.ci.last_discovered);
    const statusCell = `<span class="status ${row.status}">${row.status}</span>`;

    tr.innerHTML = `
      <td>${nameCell}</td>
      <td>${classCell}</td>
      <td>${ipCell}</td>
      <td>${lastDiscCell}</td>
      <td>${statusCell}</td>
      <td>
        <button data-action="fix" data-id="${row.ci.sys_id}">Fix</button>
        <button data-action="details" data-id="${row.ci.sys_id}">Details</button>
      </td>
    `;

    CI_BODY.appendChild(tr);
  });


  // Handles summary count of healthy and missing records. 
  const counts = {};
  state.results.forEach((r) => {
    const key = r.status;
    if (!counts[key]) {
      counts[key] = 0;
    }
    counts[key] = counts[key] + 1;
  });

  const order = ["Healthy", "Missing", "Duplicate", "Stale"];
  const summary = order.map((k) => {
    const n = counts[k] ? counts[k] : 0;
    return `${k}: ${n}`;
  }).join(" • ");

  STATS.textContent = summary;
}


// Simulates remediation: it fills missing required attributes,
// refreshes last_discovered time, 
// and fixes duplicate names by adding a suffix.
function fixCI(sysId) {
  let target = null;
  for (let i = 0; i < state.cis.length; i++) {
    if (state.cis[i].sys_id === sysId) {
      target = state.cis[i];
      break;
    }
  }
  if (!target) {
    alert("Could not find any CI to fix.");
    return;
  }


  if (!target.attributes) {
    target.attributes = {};
  }

  const req = REQUIRED_FIELDS[target.class] || [];
  for (let i = 0; i < req.length; i++) {
    const attr = req[i];
    let val = target.attributes[attr];

    let needsDefault = false;
    if (val === undefined || val === null) {
      needsDefault = true;
    } else {
      const s = String(val).trim();
      if (!s) {
        needsDefault = true;
      }
    }


// Fills in placeholders if a field is missing or is blank. 
    if (needsDefault) {
        if (attr === "owner") {
            target.attributes[attr] = "unassigned";
        } else if (attr === "os") {
            target.attributes[attr] = "unknown-os";
        } else if (attr === "engine") {
            target.attributes[attr] = "unknown-engine";
        } else if (attr === "vendor") {
            target.attributes[attr] = "unknown-vendor";
        } else {
            target.attributes[attr] = "unknown";
        }
    }
  }

// Assigns randomIP to devices that should have IP. 
  let hasIp = false;
  if (target.ip_address && String(target.ip_address).trim() !== "") {
    hasIp = true;
  }
  if (!hasIp) {
    if (target.class && (
      target.class.indexOf("computer") >= 0 ||
      target.class.indexOf("app_server") >= 0 ||
      target.class.indexOf("database") >= 0 ||
      target.class.indexOf("network") >= 0
    )) {
      target.ip_address = randomIP();
    }
  }

// Marks it as freshly discovered.
  target.last_discovered = new Date().toISOString();

// Double checks for duplicates and cleans up name/ip conflicts. 
  const dups = findDuplicateKeys(state.cis);

// Added logic to find name collisions and automatically fix them by appending a suffix like “-A” or “-B” to duplicate CI names.
  if (target.name && dups.dupNames.has(String(target.name).trim())) {
    const siblings = [];
    for (let i = 0; i < state.cis.length; i++) {
      if (state.cis[i].name === target.name) {
        siblings.push(state.cis[i]);
      }
    }

    if (siblings.length > 1) {
      let myIndex = -1;
      for (let i = 0; i < siblings.length; i++) {
        if (siblings[i].sys_id === target.sys_id) {
          myIndex = i;
          break;
        }
      }
      if (myIndex >= 0) {
        const suffixCharCode = "A".charCodeAt(0) + myIndex;
        const suffix = String.fromCharCode(suffixCharCode);
        target.name = target.name + "-" + suffix;
      }
    }
  }

  checkCIHealth();
  updateUI();
}

// When you click a Details button on a row 
// it finds that CI in state.results and shows a sample alert with all of the data. 
function showDetails(sysId) {
  let found = null;

  for (let i = 0; i < state.results.length; i++) {
    if (state.results[i].ci.sys_id === sysId) {
      found = state.results[i];
      break;
    }
  }

  if (!found) {
    alert("Details not found.");
    return;
  }

  const ci = found.ci;
  const req = REQUIRED_FIELDS[ci.class] || [];
  const msg =
    "CI: " + ci.name + "\n" +
    "Class: " + ci.class + "\n" +
    "IP: " + (ci.ip_address ? ci.ip_address : "—") + "\n" +
    "Last Discovered: " + formatDateTime(ci.last_discovered) + "\n" +
    "Status: " + found.status + "\n" +
    "Issues: " + (found.issues.length ? found.issues.join(" | ") : "None") + "\n" +
    "Required for class: " + (req.length ? req.join(", ") : "None") + "\n" +
    "Attributes: " + JSON.stringify(ci.attributes, null, 2);

  alert(msg);
}


// Use event delegation so Fix/Details buttons inside the table work
// even after the rows are re-rendered. One listener on the document
// checks for clicks and routes them to proper action. 
document.addEventListener("click", function (e) {
  const target = e.target;

  if (!target || !target.getAttribute) {
    return;
  }

  const action = target.getAttribute("data-action");
  const sysId = target.getAttribute("data-id");

  if (!action || !sysId) {
    return;
  }

  if (action === "fix") {
    fixCI(sysId);
  }

  if (action === "details") {
    showDetails(sysId);
  }
});


// Re-run CMDB health check button. 
CHECK_BTN.addEventListener("click", () => {
  checkCIHealth();
  updateUI();
});

