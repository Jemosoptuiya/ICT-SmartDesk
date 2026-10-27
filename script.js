
/* ========================================
   ICT SMARTDESK
   Supabase-connected incident management
======================================== */

/* ========================================
   SUPABASE CONNECTION
======================================== */

const SUPABASE_URL =
    "https://qsacqcajdooorxuygrry.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_XwwFXd9EHBiTgju9ysf0iw_uF--myW_";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);

/* ========================================
   DATA
======================================== */

// Incidents are loaded from Supabase after administrator login.
let incidents = [];
let assets = JSON.parse(
    localStorage.getItem("ictSmartDeskAssets") || "[]"
);
let nextAssetNumber = Number(
    localStorage.getItem("ictSmartDeskNextAsset") || "1"
);

/* ========================================
   HTML ELEMENTS
======================================== */

const newIncidentBtn = document.getElementById("newIncidentBtn");
const incidentsNewBtn = document.getElementById("incidentsNewBtn");
const viewAllBtn = document.getElementById("viewAllBtn");
const incidentTableBody = document.getElementById("incidentTableBody");
const dashboardIncidentTableBody =
    document.getElementById("dashboardIncidentTableBody");

const totalIncidents = document.getElementById("totalIncidents");
const openIncidents = document.getElementById("openIncidents");
const inProgressIncidents =
    document.getElementById("inProgressIncidents");
const resolvedIncidents = document.getElementById("resolvedIncidents");

const addAssetBtn = document.getElementById("addAssetBtn");
const assetTableBody = document.getElementById("assetTableBody");

/* ========================================
   SUPABASE INCIDENT LOADING
======================================== */

async function loadIncidentsFromSupabase() {
    const { data, error } = await supabaseClient
        .from("incidents")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Could not load incidents:", error);
        alert(
            "Could not load incidents from Supabase. " +
            "Check administrator permissions and try refreshing."
        );
        return false;
    }

    incidents = (data || []).map(function (row) {
        return {
            dbId: row.id,
            id: row.ticket_number ||
                "ICT-" + String(row.id).padStart(4, "0"),
            reporter: row.staff_name,
            department: row.department,
            staffEmail: row.staff_email,
            title: row.title,
            category: row.category,
            priority: row.priority,
            description: row.description,
            assetId: "",
            status: row.status,
            createdAt: new Date(row.created_at).toLocaleString(),
            createdAtRaw: row.created_at
        };
    });

    return true;
}

/* ========================================
   SAFE TABLE CELLS
======================================== */

function createCell(value) {
    const cell = document.createElement("td");
    cell.textContent = value == null ? "" : String(value);
    return cell;
}

function addReportCell(row, value) {
    row.appendChild(createCell(value));
}

/* ========================================
   INCIDENT FORM
======================================== */

function openIncidentForm() {
    if (document.getElementById("incidentModal")) return;

    const modal = document.createElement("div");
    modal.id = "incidentModal";
    modal.className = "modal-overlay";

    modal.innerHTML = `
        <div class="modal-card" role="dialog"
             aria-modal="true"
             aria-labelledby="incidentFormTitle">

            <div class="modal-header">
                <div>
                    <p class="eyebrow modal-eyebrow">ICT SUPPORT</p>
                    <h2 id="incidentFormTitle">Report an Incident</h2>
                    <p>Enter the staff and technical issue details.</p>
                </div>
                <button type="button" class="close-button"
                        id="closeModalBtn" aria-label="Close form">
                    &times;
                </button>
            </div>

            <form id="incidentForm">
                <div class="form-group">
                    <label for="reporterName">Staff Name</label>
                    <input id="reporterName" maxlength="100" required>
                </div>

                <div class="form-group">
                    <label for="reporterDepartment">Department</label>
                    <input id="reporterDepartment" maxlength="100" required>
                </div>

                <div class="form-group">
                    <label for="reporterEmail">Staff Email</label>
                    <input id="reporterEmail" type="email"
                           maxlength="254" required>
                </div>

                <div class="form-group">
                    <label for="incidentTitle">Issue Title</label>
                    <input id="incidentTitle" maxlength="120"
                           placeholder="e.g. Computer cannot connect to internet"
                           required>
                </div>

                <div class="form-group">
                    <label for="incidentCategory">Issue Category</label>
                    <select id="incidentCategory" required>
                        <option value="">Select a category</option>
                        <option>Hardware</option>
                        <option>Network</option>
                        <option>Software</option>
                        <option>Printer</option>
                        <option>Email</option>
                        <option>Other</option>
                    </select>
                </div>

                <div class="form-group">
                    <label for="incidentPriority">Priority</label>
                    <select id="incidentPriority" required>
                        <option>Low</option>
                        <option selected>Medium</option>
                        <option>High</option>
                        <option>Critical</option>
                    </select>
                </div>

                <div class="form-group">
                    <label for="incidentDescription">Problem Description</label>
                    <textarea id="incidentDescription" rows="4"
                              maxlength="1000" required></textarea>
                </div>

                <div class="form-actions">
                    <button type="button" class="secondary-button"
                            id="cancelIncidentBtn">Cancel</button>
                    <button type="submit" class="form-submit-button">
                        Submit Incident
                    </button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);

    document.getElementById("closeModalBtn")
        .addEventListener("click", closeIncidentForm);

    document.getElementById("cancelIncidentBtn")
        .addEventListener("click", closeIncidentForm);

    modal.addEventListener("click", function (event) {
        if (event.target === modal) closeIncidentForm();
    });

    document.getElementById("incidentForm")
        .addEventListener("submit", submitIncident);

    document.getElementById("reporterName").focus();
}

function closeIncidentForm() {
    document.getElementById("incidentModal")?.remove();
}

/* ========================================
   SUBMIT INCIDENT TO SUPABASE
======================================== */

async function submitIncident(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const submitButton = form.querySelector('[type="submit"]');

    const payload = {
        staff_name: document.getElementById("reporterName").value.trim(),
        department: document.getElementById("reporterDepartment").value.trim(),
        staff_email: document.getElementById("reporterEmail").value.trim(),
        title: document.getElementById("incidentTitle").value.trim(),
        category: document.getElementById("incidentCategory").value,
        priority: document.getElementById("incidentPriority").value,
        description: document.getElementById("incidentDescription").value.trim(),
        status: "Open",
        ticket_number: null
    };

    if (
        !payload.staff_name ||
        !payload.department ||
        !payload.staff_email ||
        !payload.title ||
        !payload.category ||
        !payload.description
    ) {
        alert("Please complete all required fields.");
        return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Submitting...";

    const { error } = await supabaseClient
        .from("incidents")
        .insert(payload);

    if (error) {
        console.error("Incident submission failed:", error);
        alert("Incident was not saved: " + error.message);
        submitButton.disabled = false;
        submitButton.textContent = "Submit Incident";
        return;
    }

    closeIncidentForm();

    const loaded = await loadIncidentsFromSupabase();
    if (loaded) renderDashboard();

    alert("Incident submitted successfully.");
}

/* ========================================
   UPDATE INCIDENT STATUS IN SUPABASE
======================================== */

async function updateIncidentStatus(incident, newStatus, select) {
    select.disabled = true;

    const { error } = await supabaseClient
        .from("incidents")
        .update({ status: newStatus })
        .eq("id", incident.dbId);

    if (error) {
        console.error("Status update failed:", error);
        alert("Could not update the incident status: " + error.message);
        select.value = incident.status;
        select.disabled = false;
        return;
    }

    const loaded = await loadIncidentsFromSupabase();

    if (loaded) {
        renderDashboard();
    } else {
        select.disabled = false;
    }
}

/* ========================================
   INCIDENT TABLES
======================================== */

function renderIncidentTable(tableBody) {
    if (!tableBody) return;

    tableBody.replaceChildren();

    if (!incidents.length) {
        const row = document.createElement("tr");
        const cell = createCell("No incidents have been submitted yet.");
        cell.colSpan = 7;
        cell.className = "empty-state";
        row.appendChild(cell);
        tableBody.appendChild(row);
        return;
    }

    incidents.forEach(function (incident) {
        const row = document.createElement("tr");

        const ticketCell = createCell(incident.id);
        ticketCell.className = "ticket-id";
        row.appendChild(ticketCell);

        row.appendChild(createCell(incident.createdAt));
        row.appendChild(createCell(incident.title));
        row.appendChild(createCell(incident.category));

        const priorityCell = createCell(incident.priority);
        priorityCell.className =
            "priority-" + incident.priority.toLowerCase();
        row.appendChild(priorityCell);

        const statusCell = createCell(incident.status);
        statusCell.className =
            "status-" + incident.status.toLowerCase().replaceAll(" ", "-");
        row.appendChild(statusCell);

        const actionCell = document.createElement("td");
        const statusSelect = document.createElement("select");
        statusSelect.className = "status-select";
        statusSelect.setAttribute(
            "aria-label", "Update status for " + incident.id
        );

        ["Open", "In Progress", "Resolved"].forEach(function (status) {
            const option = document.createElement("option");
            option.value = status;
            option.textContent = status;
            option.selected = incident.status === status;
            statusSelect.appendChild(option);
        });

        statusSelect.addEventListener("change", function () {
            updateIncidentStatus(incident, statusSelect.value, statusSelect);
        });

        actionCell.appendChild(statusSelect);
        row.appendChild(actionCell);
        tableBody.appendChild(row);
    });
}

/* ========================================
   DASHBOARD STATISTICS AND CHART
======================================== */

function renderStatistics() {
    if (totalIncidents) totalIncidents.textContent = incidents.length;

    if (openIncidents) {
        openIncidents.textContent =
            incidents.filter(item => item.status === "Open").length;
    }

    if (inProgressIncidents) {
        inProgressIncidents.textContent =
            incidents.filter(item => item.status === "In Progress").length;
    }

    if (resolvedIncidents) {
        resolvedIncidents.textContent =
            incidents.filter(item => item.status === "Resolved").length;
    }
}

function renderDashboard() {
    renderIncidentTable(incidentTableBody);
    renderIncidentTable(dashboardIncidentTableBody);
    renderStatistics();
    renderCategoryChart();
}

function renderCategoryChart() {
    const donut = document.getElementById("categoryDonut");
    const totalDisplay = document.getElementById("categoryChartTotal");
    const legend = document.getElementById("categoryChartLegend");

    if (!donut || !totalDisplay || !legend) return;

    const categories = [
        { name: "Hardware", color: "#2563eb" },
        { name: "Network", color: "#14b8a6" },
        { name: "Software", color: "#8b5cf6" },
        { name: "Printer", color: "#f59e0b" },
        { name: "Email", color: "#ec4899" },
        { name: "Other", color: "#64748b" }
    ];

    const counts = Object.fromEntries(
        categories.map(category => [category.name, 0])
    );

    incidents.forEach(function (incident) {
        const name = counts[incident.category] !== undefined
            ? incident.category
            : "Other";
        counts[name]++;
    });

    const total = incidents.length;
    totalDisplay.textContent = total;
    legend.replaceChildren();

    if (!total) {
        donut.style.background = "conic-gradient(#e2e8f0 0% 100%)";

        const message = document.createElement("p");
        message.className = "category-chart-empty";
        message.textContent = "No incidents available for the chart.";
        legend.appendChild(message);
        return;
    }

    let current = 0;
    const segments = [];

    categories.forEach(function (category) {
        const count = counts[category.name];
        const percentage = count / total * 100;

        if (count > 0) {
            segments.push(
                `${category.color} ${current}% ${current + percentage}%`
            );
            current += percentage;
        }

        const item = document.createElement("div");
        item.className = "category-legend-item";

        const dot = document.createElement("span");
        dot.className = "category-legend-dot";
        dot.style.backgroundColor = category.color;

        const name = document.createElement("span");
        name.className = "category-legend-name";
        name.textContent = category.name;

        const values = document.createElement("div");
        values.className = "category-legend-values";

        const countLabel = document.createElement("span");
        countLabel.className = "category-legend-count";
        countLabel.textContent =
            `${count} ${count === 1 ? "incident" : "incidents"}`;

        const percentLabel = document.createElement("span");
        percentLabel.className = "category-legend-percent";
        percentLabel.textContent = percentage.toFixed(1) + "%";

        values.append(countLabel, percentLabel);
        item.append(dot, name, values);
        legend.appendChild(item);
    });

    donut.style.background = `conic-gradient(${segments.join(", ")})`;
}

/* ========================================
   ICT ASSET MANAGEMENT
======================================== */

function openAssetForm() {
    if (document.getElementById("assetModal")) return;

    const modal = document.createElement("div");
    modal.id = "assetModal";
    modal.className = "modal-overlay";

    modal.innerHTML = `
        <div class="modal-card" role="dialog" aria-modal="true">
            <div class="modal-header">
                <div>
                    <p class="eyebrow modal-eyebrow">ICT EQUIPMENT</p>
                    <h2>Register an Asset</h2>
                    <p>Enter the equipment details below.</p>
                </div>
                <button type="button" class="close-button"
                        id="closeAssetModalBtn" aria-label="Close form">
                    &times;
                </button>
            </div>

            <form id="assetForm">
                <div class="form-group">
                    <label for="assetName">Equipment Name</label>
                    <input id="assetName" maxlength="100" required>
                </div>

                <div class="form-group">
                    <label for="assetModel">Brand / Model</label>
                    <input id="assetModel" maxlength="100">
                </div>

                <div class="form-group">
                    <label for="assetLocation">Location</label>
                    <input id="assetLocation" maxlength="100" required>
                </div>

                <div class="form-group">
                    <label for="assetCondition">Condition</label>
                    <select id="assetCondition" required>
                        <option>Good</option>
                        <option>Needs Maintenance</option>
                        <option>Faulty</option>
                    </select>
                </div>

                <div class="form-actions">
                    <button type="button" class="secondary-button"
                            id="cancelAssetBtn">Cancel</button>
                    <button type="submit" class="form-submit-button">
                        Save Asset
                    </button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);

    document.getElementById("closeAssetModalBtn")
        .addEventListener("click", closeAssetForm);

    document.getElementById("cancelAssetBtn")
        .addEventListener("click", closeAssetForm);

    modal.addEventListener("click", function (event) {
        if (event.target === modal) closeAssetForm();
    });

    document.getElementById("assetForm")
        .addEventListener("submit", saveAsset);
}

function closeAssetForm() {
    document.getElementById("assetModal")?.remove();
}

function saveAsset(event) {
    event.preventDefault();

    const name = document.getElementById("assetName").value.trim();
    const model = document.getElementById("assetModel").value.trim();
    const location = document.getElementById("assetLocation").value.trim();
    const condition = document.getElementById("assetCondition").value;

    if (!name || !location) {
        alert("Enter the equipment name and location.");
        return;
    }

    const asset = {
        id: "AST-" + String(nextAssetNumber).padStart(4, "0"),
        name,
        model: model || "Not specified",
        location,
        condition
    };

    assets.unshift(asset);
    nextAssetNumber++;

    localStorage.setItem("ictSmartDeskAssets", JSON.stringify(assets));
    localStorage.setItem("ictSmartDeskNextAsset", String(nextAssetNumber));

    closeAssetForm();
    renderAssets();
    alert("Asset registered successfully. Asset ID: " + asset.id);
}

function renderAssets() {
    if (!assetTableBody) return;

    assetTableBody.replaceChildren();

    if (!assets.length) {
        const row = document.createElement("tr");
        const cell = createCell("No equipment registered yet.");
        cell.colSpan = 5;
        cell.className = "empty-state";
        row.appendChild(cell);
        assetTableBody.appendChild(row);
        return;
    }

    assets.forEach(function (asset) {
        const row = document.createElement("tr");
        [asset.id, asset.name, asset.model, asset.location, asset.condition]
            .forEach(value => row.appendChild(createCell(value)));
        assetTableBody.appendChild(row);
    });
}

/* ========================================
   PAGE NAVIGATION
======================================== */

const pageViews = {
    dashboard: document.getElementById("dashboardView"),
    incidents: document.getElementById("incidentsView"),
    assets: document.getElementById("assetsView"),
    reports: document.getElementById("reportsView")
};

const pageTitles = {
    dashboard: "ICT Support Dashboard",
    incidents: "Incident Management",
    assets: "ICT Asset Management",
    reports: "ICT Support Reports"
};

const pageHeading = document.querySelector(".topbar h1");
const breadcrumb = document.querySelector(".topbar .breadcrumb");
const navigationLinks = document.querySelectorAll(".sidebar-nav .nav-link");

function showPage(pageName) {
    if (!pageViews[pageName]) return;

    Object.keys(pageViews).forEach(function (name) {
        if (pageViews[name]) pageViews[name].hidden = name !== pageName;
    });

    navigationLinks.forEach(function (link) {
        const isActive = link.getAttribute("href").replace("#", "") === pageName;
        link.classList.toggle("active", isActive);

        if (isActive) {
            link.setAttribute("aria-current", "page");
        } else {
            link.removeAttribute("aria-current");
        }
    });

    if (pageHeading) pageHeading.textContent = pageTitles[pageName];
    if (breadcrumb) breadcrumb.textContent = "Workspace / " + pageTitles[pageName];

    window.scrollTo({ top: 0, behavior: "smooth" });
}

navigationLinks.forEach(function (link) {
    link.addEventListener("click", function (event) {
        event.preventDefault();
        showPage(link.getAttribute("href").replace("#", ""));
    });
});

newIncidentBtn?.addEventListener("click", openIncidentForm);
incidentsNewBtn?.addEventListener("click", openIncidentForm);
viewAllBtn?.addEventListener("click", () => showPage("incidents"));
addAssetBtn?.addEventListener("click", openAssetForm);

/* ========================================
   REPORTS
======================================== */

const reportForm = document.getElementById("reportForm");
const printReportBtn = document.getElementById("printReportBtn");
const reportStartDate = document.getElementById("reportStartDate");
const reportEndDate = document.getElementById("reportEndDate");
const reportStatus = document.getElementById("reportStatus");
const reportPeriod = document.getElementById("reportPeriod");
const reportTotal = document.getElementById("reportTotal");
const reportOpen = document.getElementById("reportOpen");
const reportInProgress = document.getElementById("reportInProgress");
const reportResolved = document.getElementById("reportResolved");
const reportIncidentTableBody =
    document.getElementById("reportIncidentTableBody");
const reportAssetTotal = document.getElementById("reportAssetTotal");
const reportAssetTableBody =
    document.getElementById("reportAssetTableBody");

let reportHasBeenGenerated = false;

function getIncidentDate(incident) {
    const date = new Date(incident.createdAtRaw || incident.createdAt);
    return Number.isNaN(date.getTime()) ? null : date;
}

if (reportForm) {
    reportForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const startValue = reportStartDate.value;
        const endValue = reportEndDate.value;
        const selectedStatus = reportStatus.value;

        if (startValue && endValue && startValue > endValue) {
            alert("The start date cannot be after the end date.");
            return;
        }

        // Refresh incidents from the shared database before reporting.
        const loaded = await loadIncidentsFromSupabase();
        if (!loaded) return;

        assets = JSON.parse(
            localStorage.getItem("ictSmartDeskAssets") || "[]"
        );

        const filtered = incidents.filter(function (incident) {
            const date = getIncidentDate(incident);
            if (!date) return false;

            const day = [
                date.getFullYear(),
                String(date.getMonth() + 1).padStart(2, "0"),
                String(date.getDate()).padStart(2, "0")
            ].join("-");

            if (startValue && day < startValue) return false;
            if (endValue && day > endValue) return false;
            if (selectedStatus !== "All" &&
                incident.status !== selectedStatus) return false;

            return true;
        });

        if (reportPeriod) {
            reportPeriod.textContent =
                `Reporting period: ${startValue || "Earliest available"} to ` +
                `${endValue || "Latest available"} | Status: ${selectedStatus} | ` +
                `Generated: ${new Date().toLocaleString()}`;
        }

        if (reportTotal) reportTotal.textContent = filtered.length;
        if (reportOpen) {
            reportOpen.textContent =
                filtered.filter(item => item.status === "Open").length;
        }
        if (reportInProgress) {
            reportInProgress.textContent =
                filtered.filter(item => item.status === "In Progress").length;
        }
        if (reportResolved) {
            reportResolved.textContent =
                filtered.filter(item => item.status === "Resolved").length;
        }

        if (reportIncidentTableBody) {
            reportIncidentTableBody.replaceChildren();

            if (!filtered.length) {
                const row = document.createElement("tr");
                const cell = createCell("No incidents match the selected filters.");
                cell.colSpan = 6;
                cell.className = "empty-state";
                row.appendChild(cell);
                reportIncidentTableBody.appendChild(row);
            } else {
                filtered.forEach(function (incident) {
                    const row = document.createElement("tr");
                    [
                        incident.id,
                        incident.createdAt,
                        incident.title,
                        incident.category,
                        incident.priority,
                        incident.status
                    ].forEach(value => addReportCell(row, value));
                    reportIncidentTableBody.appendChild(row);
                });
            }
        }

        if (reportAssetTotal) reportAssetTotal.textContent = assets.length;

        if (reportAssetTableBody) {
            reportAssetTableBody.replaceChildren();

            if (!assets.length) {
                const row = document.createElement("tr");
                const cell = createCell("No assets have been registered.");
                cell.colSpan = 5;
                cell.className = "empty-state";
                row.appendChild(cell);
                reportAssetTableBody.appendChild(row);
            } else {
                assets.forEach(function (asset) {
                    const row = document.createElement("tr");
                    [
                        asset.id,
                        asset.name,
                        asset.model,
                        asset.location,
                        asset.condition
                    ].forEach(value => addReportCell(row, value));
                    reportAssetTableBody.appendChild(row);
                });
            }
        }

        reportHasBeenGenerated = true;
        alert("Report generated successfully.");
    });
}

printReportBtn?.addEventListener("click", function () {
    if (!reportHasBeenGenerated) {
        alert("Please generate a report before printing.");
        return;
    }

    window.print();
});

/* ========================================
   ADMINISTRATOR LOGIN
======================================== */

function showAdminLogin(message = "") {
    let screen = document.getElementById("adminLoginScreen");

    if (!screen) {
        screen = document.createElement("div");
        screen.id = "adminLoginScreen";
        screen.style.cssText = `
            position:fixed;inset:0;z-index:99999;
            display:flex;align-items:center;justify-content:center;
            padding:20px;background:#f1f5f9;font-family:Arial,sans-serif;
        `;

        screen.innerHTML = `
            <form id="adminLoginForm"
                style="width:100%;max-width:420px;background:white;
                padding:32px;border-radius:14px;
                box-shadow:0 10px 35px rgba(0,0,0,.10)">

                <h1 style="color:#003B70;margin-top:0">ICT SmartDesk</h1>
                <p>Administrator sign-in</p>

                <label for="adminEmail">Email address</label>
                <input id="adminEmail" type="email" required
                    autocomplete="username"
                    style="display:block;width:100%;box-sizing:border-box;
                    padding:12px;margin:8px 0 18px;border:1px solid #cbd5e1;
                    border-radius:6px">

                <label for="adminPassword">Password</label>
                <input id="adminPassword" type="password" required
                    autocomplete="current-password"
                    style="display:block;width:100%;box-sizing:border-box;
                    padding:12px;margin:8px 0 18px;border:1px solid #cbd5e1;
                    border-radius:6px">

                <p id="adminLoginMessage" role="alert" style="color:#b91c1c"></p>

                <button type="submit"
                    style="width:100%;padding:13px;background:#0056A6;
                    color:white;border:0;border-radius:6px;cursor:pointer">
                    Sign In
                </button>
            </form>
        `;

        document.body.appendChild(screen);

        document.getElementById("adminLoginForm")
            .addEventListener("submit", async function (event) {
                event.preventDefault();

                const button = event.currentTarget.querySelector(
                    'button[type="submit"]'
                );
                const messageElement =
                    document.getElementById("adminLoginMessage");

                button.disabled = true;
                button.textContent = "Signing in...";
                messageElement.textContent = "";

                const email = document.getElementById("adminEmail").value.trim();
                const password = document.getElementById("adminPassword").value;

                const { error } = await supabaseClient.auth.signInWithPassword({
                    email,
                    password
                });

                if (error) {
                    messageElement.textContent =
                        "Sign-in failed. Check your email, password, and account confirmation.";
                    button.disabled = false;
                    button.textContent = "Sign In";
                    return;
                }

                await checkAdminAccess();
            });
    }

    screen.style.display = "flex";
    document.getElementById("adminLoginMessage").textContent = message;
}

async function checkAdminAccess() {
    const { data: userData, error: userError } =
        await supabaseClient.auth.getUser();

    if (userError || !userData.user) {
        showAdminLogin("Please sign in to continue.");
        return;
    }

    const { data: adminRecord, error: adminError } =
        await supabaseClient
            .from("admin_users")
            .select("user_id")
            .eq("user_id", userData.user.id)
            .maybeSingle();

    if (adminError || !adminRecord) {
        await supabaseClient.auth.signOut();
        showAdminLogin(
            "This account is not authorized as an administrator. " +
            "Check that its user ID is in admin_users."
        );
        return;
    }

    document.getElementById("adminLoginScreen")?.remove();

    const loaded = await loadIncidentsFromSupabase();

    renderDashboard();
    renderAssets();
    showPage("dashboard");

    // Add a sign-out button if the page has a top bar.
    if (!document.getElementById("adminSignOutBtn")) {
        const topbar = document.querySelector(".topbar");

        if (topbar) {
            const button = document.createElement("button");
            button.id = "adminSignOutBtn";
            button.type = "button";
            button.textContent = "Sign Out";
            button.className = "secondary-button";
            button.style.marginLeft = "auto";

            button.addEventListener("click", async function () {
                await supabaseClient.auth.signOut();
                incidents = [];
                renderDashboard();
                showAdminLogin("You have signed out.");
            });

            topbar.appendChild(button);
        }
    }

    if (!loaded) {
        console.warn("Signed in, but incidents could not be loaded.");
    }
}

/* ========================================
   INITIAL STARTUP
======================================== */

async function initializeSmartDesk() {
    // Hide the dashboard until administrator access is confirmed.
    Object.values(pageViews).forEach(function (view) {
        if (view) view.hidden = true;
    });

    const { data } = await supabaseClient.auth.getSession();

    if (data.session) {
        await checkAdminAccess();
    } else {
        showAdminLogin();
    }
}

initializeSmartDesk();
