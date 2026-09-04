"use client";

import { useMemo, useState } from "react";
import { signOut } from "next-auth/react";
import {
  CalendarDays,
  Download,
  LogOut,
  Menu,
  Pencil,
  Plus,
  Printer,
  Search,
  Settings2,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { SettingsModule } from "@/features/settings/components/settings-module";
import { seedEmployees, seedSettings } from "@/lib/seed-data";
import type { Employee } from "@/types/employee";
import type { SettingItem, SettingKind } from "@/types/settings";

type WorkforceHubShellProps = { seedFlags: Record<SettingKind, boolean> };

export default function WorkforceHubShell({
  seedFlags,
}: Readonly<WorkforceHubShellProps>) {
  const [view, setView] = useState<"Employees" | "Settings">("Employees");
  const [employees, setEmployees] = useState(seedEmployees);
  const [settings, setSettings] = useState(seedSettings);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string>("All");
  const [selected, setSelected] = useState<Employee | null>(null);
  const [adding, setAdding] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const visible = useMemo(
    () =>
      employees.filter(
        (employee) =>
          `${employee.name} ${employee.employeeNumber} ${employee.position} ${employee.projectSite}`
            .toLowerCase()
            .includes(query.toLowerCase()) &&
          (status === "All" || employee.employmentStatus === status),
      ),
    [employees, query, status],
  );
  function exportCsv() {
    const headers = [
      "Employee number",
      "Employee name",
      "Position",
      "Project/site",
      "Date hired",
      "End of contract",
      "Employment status",
      "Contact number",
      "Address",
      "SSS no",
      "PhilHealth no",
      "Pag-ibig no",
      "TIN no",
      "SL",
      "VL",
    ];
    const rows = employees.map((employee) => [
      employee.employeeNumber,
      employee.name,
      employee.position,
      employee.projectSite,
      employee.dateHired,
      employee.endOfContract,
      employee.employmentStatus,
      employee.contactNumber,
      employee.address,
      employee.sssNumber,
      employee.philHealthNumber,
      employee.pagIbigNumber,
      employee.tinNumber,
      employee.leaveCredits.sickLeave,
      employee.leaveCredits.vacationLeave,
    ]);
    const csv = [headers, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","),
      )
      .join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    link.download = "pcas-workforcehub-employees.csv";
    link.click();
  }
  return (
    <main className="app-shell">
      <aside className={`sidebar ${mobileNav ? "open" : ""}`}>
        <div className="brand">
          <span className="brand-mark">W</span> Workforce{" "}
          <span className="brand-accent">Hub</span>
        </div>
        <div className="workspace">
          <b>Northstar Group</b>
          <small>People operations</small>
        </div>
        <nav>
          <small className="nav-title">Workspace</small>
          {["Employees", "Settings"].map((item) => (
            <button
              key={item}
              className={view === item ? "active" : ""}
              onClick={() => {
                setView(item as "Employees" | "Settings");
                setMobileNav(false);
              }}
            >
              {item === "Employees" ? (
                <Users size={17} />
              ) : (
                <Settings2 size={17} />
              )}
              <span>{item}</span>
              {item === "Employees" && <b>{employees.length}</b>}
            </button>
          ))}
          <button>
            <CalendarDays size={17} />
            <span>Leave &amp; time off</span>
          </button>
        </nav>
        <div className="user">
          <span className="avatar coral">JD</span>
          <div>
            <b>Jordan Dela Cruz</b>
            <small>Administrator</small>
          </div>
        </div>
      </aside>
      <section className="main-content">
        <header className="topbar">
          <button
            className="menu icon-button"
            onClick={() => setMobileNav((current) => !current)}
            aria-label="Open navigation"
          >
            <Menu size={19} />
          </button>
          <div className="header-brand">
            <span className="brand-mark">W</span>
            <span>
              Workforce<span className="brand-accent">Hub</span>
            </span>
          </div>
          <span className="crumb">
            Workspace / <b>{view}</b>
          </span>
          <div className="profile-menu">
            <span className="avatar coral">JD</span>
            <div className="profile-copy">
              <b>Jordan Dela Cruz</b>
              <small>Administrator</small>
            </div>
            <button
              className="logout-button"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut size={15} />
              <span>Log out</span>
            </button>
          </div>
        </header>
        <div className="content">
          {view === "Settings" ? (
            <SettingsModule
              settings={settings}
              seedFlags={seedFlags}
              onAdd={(item) => setSettings((current) => [...current, item])}
              onDelete={(id) =>
                setSettings((current) =>
                  current.filter((item) => item.id !== id),
                )
              }
              onToggle={(id) =>
                setSettings((current) =>
                  current.map((item) =>
                    item.id === id ? { ...item, active: !item.active } : item,
                  ),
                )
              }
              onUpdate={(item) =>
                setSettings((current) =>
                  current.map((currentItem) =>
                    currentItem.id === item.id ? item : currentItem,
                  ),
                )
              }
            />
          ) : (
            <>
              <div className="page-head">
                <div>
                  <p className="eyebrow">People directory</p>
                  <h1>Employee roster</h1>
                  <p className="muted">
                    Every record, including leave credits and statutory IDs.
                  </p>
                </div>
                <div className="actions">
                  <button
                    className="button secondary"
                    onClick={() => window.print()}
                  >
                    <Printer size={15} /> Print
                  </button>
                  <button className="button secondary" onClick={exportCsv}>
                    <Download size={15} /> Export CSV
                  </button>
                  <button
                    className="button primary"
                    onClick={() => setAdding(true)}
                  >
                    <Plus size={16} /> Add employee
                  </button>
                </div>
              </div>
              <div className="toolbar">
                <div className="search">
                  <Search size={16} />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search employees, roles, projects..."
                  />
                </div>
                <div className="filters">
                  {(
                    [
                      "All",
                      ...new Set(
                        settings
                          .filter(
                            (item) => item.kind === "status" && item.active,
                          )
                          .map((item) => item.name),
                      ),
                    ] as const
                  ).map((item) => (
                    <button
                      key={item}
                      className={status === item ? "selected" : ""}
                      onClick={() => setStatus(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
              <EmployeeTable employees={visible} onLeave={setSelected} />
            </>
          )}
        </div>
        <footer className="app-footer">
          PCAS WorkforceHub <span>·</span> Established 2026
        </footer>
      </section>
      {selected && (
        <LeaveDialog
          employee={selected}
          onClose={() => setSelected(null)}
          onSave={(leaveCredits) => {
            setEmployees((current) =>
              current.map((item) =>
                item.id === selected.id ? { ...item, leaveCredits } : item,
              ),
            );
            setSelected(null);
          }}
        />
      )}
      {adding && (
        <AddDialog
          positions={settings.filter(
            (item) => item.kind === "position" && item.active,
          )}
          projects={settings.filter(
            (item) => item.kind === "project" && item.active,
          )}
          statuses={settings.filter(
            (item) => item.kind === "status" && item.active,
          )}
          onClose={() => setAdding(false)}
          onCreate={(employee) => {
            setEmployees((current) => [employee, ...current]);
            setAdding(false);
          }}
        />
      )}
    </main>
  );
}

function EmployeeTable({
  employees,
  onLeave,
}: Readonly<{
  employees: Employee[];
  onLeave: (employee: Employee) => void;
}>) {
  return (
    <div className="table-card">
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Position</th>
              <th>Project / site</th>
              <th>Status</th>
              <th>Leave credits</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {employees.map((employee) => (
              <tr key={employee.id}>
                <td>
                  <div className="employee">
                    <span className="avatar blue">
                      {employee.name
                        .split(" ")
                        .map((part) => part[0])
                        .join("")
                        .slice(0, 2)}
                    </span>
                    <span>
                      <b>{employee.name}</b>
                      <small>{employee.employeeNumber}</small>
                    </span>
                  </div>
                </td>
                <td>{employee.position}</td>
                <td>{employee.projectSite}</td>
                <td>
                  <span
                    className={`status ${employee.employmentStatus.toLowerCase().replace(" ", "-")}`}
                  >
                    <i />
                    {employee.employmentStatus}
                  </span>
                </td>
                <td>
                  <button className="leave" onClick={() => onLeave(employee)}>
                    <b>{employee.leaveCredits.sickLeave}</b> SL{" "}
                    <b>{employee.leaveCredits.vacationLeave}</b> VL{" "}
                    <Pencil size={13} />
                  </button>
                </td>
                <td>
                  <Pencil size={14} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="table-foot">
        Showing <b>{employees.length}</b> employees
      </div>
    </div>
  );
}
function LeaveDialog({
  employee,
  onClose,
  onSave,
}: Readonly<{
  employee: Employee;
  onClose: () => void;
  onSave: (credits: Employee["leaveCredits"]) => void;
}>) {
  const [sl, setSl] = useState(employee.leaveCredits.sickLeave);
  const [vl, setVl] = useState(employee.leaveCredits.vacationLeave);
  return (
    <div className="backdrop">
      <div className="modal">
        <div className="modal-head">
          <div>
            <p className="eyebrow">Leave credits</p>
            <h2>{employee.name}</h2>
            <p className="muted">
              {employee.employeeNumber} · Admin and HR action
            </p>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="credit-grid">
          <label>
            Sick leave <b>SL</b>
            <input
              type="number"
              min="0"
              value={sl}
              onChange={(event) => setSl(Number(event.target.value))}
            />
            <small>days remaining</small>
          </label>
          <label>
            Vacation leave <b>VL</b>
            <input
              type="number"
              min="0"
              value={vl}
              onChange={(event) => setVl(Number(event.target.value))}
            />
            <small>days remaining</small>
          </label>
        </div>
        <div className="notice">
          <ShieldCheck size={16} /> Changes are validated and audit logged.
        </div>
        <div className="modal-actions">
          <button className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="button primary"
            onClick={() => onSave({ sickLeave: sl, vacationLeave: vl })}
          >
            <ShieldCheck size={15} /> Save changes
          </button>
        </div>
      </div>
    </div>
  );
}
function AddDialog({
  positions,
  projects,
  statuses,
  onClose,
  onCreate,
}: Readonly<{
  positions: SettingItem[];
  projects: SettingItem[];
  statuses: SettingItem[];
  onClose: () => void;
  onCreate: (employee: Employee) => void;
}>) {
  return (
    <div className="backdrop">
      <form
        className="modal"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const value = (field: string) => {
            const entry = data.get(field);
            return typeof entry === "string" ? entry : "";
          };
          const name = value("name");
          onCreate({
            id: crypto.randomUUID(),
            employeeNumber: `WH-2025-${Date.now().toString().slice(-3)}`,
            name,
            position: value("position"),
            projectSite: value("projectSite"),
            dateHired: new Date().toISOString().slice(0, 10),
            endOfContract: "2028-09-03",
            employmentStatus: value("employmentStatus"),
            contactNumber: value("contactNumber") || "Not provided",
            address: "Not provided",
            sssNumber: "Pending",
            philHealthNumber: "Pending",
            pagIbigNumber: "Pending",
            tinNumber: "Pending",
            leaveCredits: { sickLeave: 0, vacationLeave: 0 },
          });
        }}
      >
        <div className="modal-head">
          <div>
            <p className="eyebrow">New record</p>
            <h2>Add employee</h2>
            <p className="muted">Start with the core employment details.</p>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="form-grid">
          <label>
            Employee name <input name="name" required />
          </label>
          <label>
            Position{" "}
            <select name="position" required defaultValue="">
              <option value="" disabled>
                Select a position
              </option>
              {positions.map((item) => (
                <option key={item.id}>{item.name}</option>
              ))}
            </select>
          </label>
          <label>
            Project / site{" "}
            <select name="projectSite" required defaultValue="">
              <option value="" disabled>
                Select a project/site
              </option>
              {projects.map((item) => (
                <option key={item.id}>{item.name}</option>
              ))}
            </select>
          </label>
          <label>
            Employment status{" "}
            <select name="employmentStatus" required defaultValue="">
              <option value="" disabled>
                Select a status
              </option>
              {statuses.map((item) => (
                <option key={item.id}>{item.name}</option>
              ))}
            </select>
          </label>
          <label>
            Contact number <input name="contactNumber" />
          </label>
        </div>
        <div className="modal-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="button primary">
            <Plus size={15} /> Create employee
          </button>
        </div>
      </form>
    </div>
  );
}
