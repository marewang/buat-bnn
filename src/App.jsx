import React, { useEffect, useMemo, useState } from "react";
import Dexie from "dexie";
import { useLiveQuery } from "dexie-react-hooks";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  CalendarDays,
  Search,
  Download,
  Upload,
  Edit3,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Home,
  UserPlus,
  List,
  SlidersHorizontal,
  ArrowUpDown,
} from "lucide-react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";

// =============================
// Context
// =============================
const AppCtx = React.createContext(null);
const useApp = () => React.useContext(AppCtx);

// =============================
// Dexie (IndexedDB)
// =============================
const db = new Dexie("asnMonitoringDB");
db.version(1).stores({
  asns:
    "++id, nama, nip, tmtPns, riwayatTmtKgb, riwayatTmtPangkat, jadwalKgbBerikutnya, jadwalPangkatBerikutnya",
});

// =============================
// Helpers (Tanggal)
// =============================
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const todayYMD = () => new Date().toISOString().slice(0, 10);
const toDate = (v) => (v ? new Date(v) : null);
const addYears = (date, years) => {
  if (!date) return null;
  const d = new Date(date);
  d.setFullYear(d.getFullYear() + years);
  return d;
};
const ymd = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");
const human = (d) =>
  d
    ? new Date(d).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "-";
const daysUntil = (d) => Math.ceil((new Date(d) - new Date()) / MS_PER_DAY);
const withinNextDays = (d, days) => {
  if (!d) return false;
  const n = daysUntil(d);
  return n >= 0 && n <= days;
};

// =============================
// Login (dummy)
// =============================
const DEFAULT_USER = { username: "admin", password: "123456" };

// =============================
// Self-tests (do not change unless wrong) + a few extras
// =============================
function runSelfTests() {
  try {
    const base = new Date("2020-03-15");
    console.assert(ymd(addYears(base, 2)) === "2022-03-15", "addYears +2 failed");
    console.assert(ymd(addYears(base, 4)) === "2024-03-15", "addYears +4 failed");

    const kgb = "2023-08-01";
    const pangkat = "2022-01-10";
    const nextKgb = ymd(addYears(toDate(kgb), 2));
    const nextPangkat = ymd(addYears(toDate(pangkat), 4));
    console.assert(nextKgb === "2025-08-01", "Kenaikan Gaji Berikutnya schedule failed");
    console.assert(nextPangkat === "2026-01-10", "Kenaikan Pangkat Berikutnya schedule failed");

    // ymd null safety
    console.assert(ymd(null) === "", "ymd(null) failed");

    // withinNextDays sanity
    const in30 = new Date(); in30.setDate(in30.getDate() + 30);
    const in120 = new Date(); in120.setDate(in120.getDate() + 120);
    console.assert(withinNextDays(in30, 90) === true, "withinNextDays 30/90 failed");
    console.assert(withinNextDays(in120, 90) === false, "withinNextDays 120/90 failed");

    // name sort comparator (case-insensitive)
    const byName = (a, b) => (a || "").localeCompare(b || "", "id", { sensitivity: "base" });
    console.assert(byName("Andi", "beni") < 0, "byName Andi before beni");

    // Leap-year behavior (JS Date roll)
    console.assert(ymd(addYears(new Date("2020-02-29"), 1)) === "2021-02-28", "+1y from 2020-02-29 should roll to 2021-02-28");
    console.assert(ymd(addYears(new Date("2020-02-29"), 4)) === "2024-02-29", "+4y from 2020-02-29 should hit 2024-02-29");
  } catch (e) {
    console.warn("Self tests encountered an error:", e);
  }
}

// =============================
// App Root
// =============================
export default function App() {
  const [authed, setAuthed] = useState(true); // bypass login by default

  useEffect(() => {
    runSelfTests();
  }, []);

  const asns = useLiveQuery(() => db.table("asns").toArray(), [], []);

  const notif = useMemo(() => {
    if (!asns) return { soon: [], overdue: [] };
    const soon = [];
    const overdue = [];
    const in90 = (d) => withinNextDays(d, 90);
    asns.forEach((row) => {
      const items = [];
      if (row.jadwalKgbBerikutnya)
        items.push({ jenis: "Kenaikan Gaji Berikutnya", tanggal: row.jadwalKgbBerikutnya });
      if (row.jadwalPangkatBerikutnya)
        items.push({ jenis: "Kenaikan Pangkat Berikutnya", tanggal: row.jadwalPangkatBerikutnya });
      items.forEach((it) => {
        if (in90(it.tanggal)) {
          soon.push({ ...row, ...it });
        } else if (new Date(it.tanggal) < new Date()) {
          overdue.push({ ...row, ...it });
        }
      });
    });
    const byDate = (a, b) => new Date(a.tanggal) - new Date(b.tanggal);
    return { soon: soon.sort(byDate), overdue: overdue.sort(byDate) };
  }, [asns]);

  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={
            authed ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Login onSuccess={() => setAuthed(true)} />
            )
          }
        />

        <Route
          path="/"
          element={
            <RequireAuth authed={authed}>
              <Shell asns={asns || []} notif={notif} />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<PanelDashboard />} />
          <Route path="notifikasi" element={<PanelNotifikasi />} />
          <Route path="input" element={<FormInput />} />
          <Route path="data" element={<TabelData />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

function RequireAuth({ authed, children }) {
  if (!authed) return <Navigate to="/login" replace />;
  return children;
}

// =============================
// Shell Layout (Topbar + Top Nav + Outlet)
// =============================
function Shell({ asns, notif }) {
  const [toast, setToast] = useState(null);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <AppCtx.Provider value={{ setToast, asns, notif }}>
      <div className="min-h-screen bg-slate-50 text-slate-800">
        {/* Topbar */}
        <header className="sticky top-0 z-40 backdrop-blur bg-white/75 border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white grid place-content-center font-bold">
              A
            </div>
            <div className="flex-1">
              <h1 className="text-lg font-semibold leading-tight">
                Monitoring Jadwal Kenaikan Pangkat Berikutnya & Kenaikan Gaji Berikutnya (ASN)
              </h1>
              <p className="text-xs text-slate-500 -mt-0.5">
                Pantau Kenaikan Gaji Berikutnya & Kenaikan Pangkat Berikutnya secara proaktif
              </p>
            </div>

            <NavButton
              icon={<Bell className="w-4 h-4" />}
              active={pathname.startsWith("/notifikasi")}
              onClick={() => navigate("/notifikasi")}
            >
              Notifikasi
              <span className="ml-2 px-1.5 py-0.5 rounded-md text-[10px] bg-amber-100 text-amber-800 border border-amber-200">
                {(notif?.overdue?.length || 0) + (notif?.soon?.length || 0)}
              </span>
            </NavButton>
          </div>
        </header>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* Top Nav */}
          <div className="mb-3 overflow-x-auto">
            <div className="flex items-center gap-2">
              <TopLink
                active={pathname.startsWith("/dashboard")}
                onClick={() => navigate("/dashboard")}
                icon={<Home className="w-4 h-4" />}
                label="Dashboard"
              />
              <TopLink
                active={pathname.startsWith("/notifikasi")}
                onClick={() => navigate("/notifikasi")}
                icon={<Bell className="w-4 h-4" />}
                label="Notifikasi"
                badge={(notif?.overdue?.length || 0) + (notif?.soon?.length || 0)}
              />
              <TopLink
                active={pathname.startsWith("/input")}
                onClick={() => navigate("/input")}
                icon={<UserPlus className="w-4 h-4" />}
                label="Input Data Pegawai"
              />
              <TopLink
                active={pathname.startsWith("/data")}
                onClick={() => navigate("/data")}
                icon={<List className="w-4 h-4" />}
                label="Tampilkan Data Pegawai"
              />
            </div>
          </div>

          {/* Routed screen */}
          <main>
            <AnimatePresence mode="wait">
              <motion.div
                key={pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </main>
        </div>

        {/* Toast */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className={`fixed bottom-5 left-1/2 -translate-x-1/2 rounded-xl shadow-lg px-4 py-2 text-sm border ${
                toast.type === "success"
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : "bg-rose-50 text-rose-800 border-rose-200"
              }`}
            >
              {toast.msg}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppCtx.Provider>
  );
}

// =============================
// Login
// =============================
function Login({ onSuccess }) {
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [err, setErr] = useState("");
  const navigate = useNavigate();

  const submit = (e) => {
    e.preventDefault();
    if (u === DEFAULT_USER.username && p === DEFAULT_USER.password) {
      onSuccess?.();
      navigate("/dashboard", { replace: true });
    } else {
      setErr("Username / password salah.");
    }
  };

  return (
    <div className="min-h-screen grid place-content-center bg-slate-50">
      <div className="w-[420px] rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white grid place-content-center font-bold text-lg">
            A
          </div>
          <div>
            <h2 className="text-lg font-semibold">Masuk ke Monitoring ASN</h2>
            <p className="text-xs text-slate-500">Masukkan kredensial Anda</p>
          </div>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <FormRow label="Username">
            <input
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              value={u}
              onChange={(e) => setU(e.target.value)}
              placeholder="username"
            />
          </FormRow>
          <FormRow label="Password">
            <input
              type="password"
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              value={p}
              onChange={(e) => setP(e.target.value)}
              placeholder="••••••••"
            />
          </FormRow>
          {err && <p className="text-rose-600 text-sm">{err}</p>}
          <button className="w-full bg-indigo-600 text-white rounded-lg py-2 font-medium hover:bg-indigo-700 transition">
            Masuk
          </button>
        </form>
      </div>
    </div>
  );
}

// =============================
// Form Input Data ASN
// =============================
function FormInput() {
  const { setToast } = useApp() || {};
  const [form, setForm] = useState({
    nama: "",
    nip: "",
    tmtPns: "",
    riwayatTmtKgb: "",
    riwayatTmtPangkat: "",
    jadwalKgbBerikutnya: "",
    jadwalPangkatBerikutnya: "",
  });
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    const kgb = form.riwayatTmtKgb ? ymd(addYears(toDate(form.riwayatTmtKgb), 2)) : "";
    const pangkat = form.riwayatTmtPangkat ? ymd(addYears(toDate(form.riwayatTmtPangkat), 4)) : "";
    setForm((f) => ({ ...f, jadwalKgbBerikutnya: kgb, jadwalPangkatBerikutnya: pangkat }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.riwayatTmtKgb, form.riwayatTmtPangkat]);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const doSave = async () => {
    await db.table("asns").add({ ...form, createdAt: new Date().toISOString() });
    setForm({ nama: "", nip: "", tmtPns: "", riwayatTmtKgb: "", riwayatTmtPangkat: "", jadwalKgbBerikutnya: "", jadwalPangkatBerikutnya: "" });
    setConfirmOpen(false);
    setToast?.({ type: "success", msg: "Data ASN disimpan." });
  };

  const submit = (e) => {
    e.preventDefault();
    if (!form.nama || !form.nip) return;
    setConfirmOpen(true);
  };

  return (
    <div className="grid grid-cols-1 gap-6">
      <Card title="Input Data Pegawai" subtitle="Lengkapi data berikut. Jadwal otomatis dihitung.">
        <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormRow label="Nama" required>
            <input name="nama" value={form.nama} onChange={onChange} className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-200" placeholder="Nama Lengkap" />
          </FormRow>
          <FormRow label="Nomor Pegawai (NIP)" required>
            <input name="nip" value={form.nip} onChange={onChange} className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-200" placeholder="1985xxxxxxxxxxxx" />
          </FormRow>
          <FormRow label="TMT PNS">
            <input type="date" name="tmtPns" value={form.tmtPns} onChange={onChange} className="w-full border rounded-lg px-3 py-2" max={todayYMD()} />
          </FormRow>
          <FormRow label="Riwayat TMT Kenaikan Gaji">
            <input type="date" name="riwayatTmtKgb" value={form.riwayatTmtKgb} onChange={onChange} className="w-full border rounded-lg px-3 py-2" />
          </FormRow>
          <FormRow label="Riwayat TMT Pangkat">
            <input type="date" name="riwayatTmtPangkat" value={form.riwayatTmtPangkat} onChange={onChange} className="w-full border rounded-lg px-3 py-2" />
          </FormRow>
          <FormRow label="Jadwal Kenaikan Gaji Berikutnya (otomatis +2 thn)">
            <input type="date" name="jadwalKgbBerikutnya" value={form.jadwalKgbBerikutnya} readOnly className="w-full border rounded-lg px-3 py-2 bg-slate-50" />
          </FormRow>
          <FormRow label="Jadwal Kenaikan Pangkat Berikutnya (otomatis +4 thn)">
            <input type="date" name="jadwalPangkatBerikutnya" value={form.jadwalPangkatBerikutnya} readOnly className="w-full border rounded-lg px-3 py-2 bg-slate-50" />
          </FormRow>
          <div className="md:col-span-2 flex gap-3 mt-2">
            <button className="bg-indigo-600 text-white rounded-lg px-4 py-2 font-medium hover:bg-indigo-700">Simpan</button>
            <button type="button" onClick={() => setForm({ nama: "", nip: "", tmtPns: "", riwayatTmtKgb: "", riwayatTmtPangkat: "", jadwalKgbBerikutnya: "", jadwalPangkatBerikutnya: "" })} className="border rounded-lg px-4 py-2 hover:bg-slate-50">Reset</button>
          </div>
        </form>
      </Card>

      {/* Verifikasi sebelum simpan */}
      <ConfirmDialog
        open={confirmOpen}
        title="Verifikasi Data Pegawai"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={doSave}
        confirmText="Ya, Simpan"
        cancelText="Batal"
      >
        <ul className="text-sm text-slate-700 space-y-1">
          <li><b>Nama:</b> {form.nama || '-'}</li>
          <li><b>NIP:</b> {form.nip || '-'}</li>
          <li><b>TMT PNS:</b> {human(form.tmtPns)}</li>
          <li><b>Riwayat TMT Kenaikan Gaji:</b> {human(form.riwayatTmtKgb)}</li>
          <li><b>Jadwal Kenaikan Gaji Berikutnya:</b> {human(form.jadwalKgbBerikutnya)}</li>
          <li><b>Riwayat TMT Pangkat:</b> {human(form.riwayatTmtPangkat)}</li>
          <li><b>Jadwal Kenaikan Pangkat Berikutnya:</b> {human(form.jadwalPangkatBerikutnya)}</li>
        </ul>
      </ConfirmDialog>
    </div>
  );
}

// =============================
// Tabel Data & Edit
// =============================
function TabelData() {
  const { setToast } = useApp() || {};
  const asns = useLiveQuery(() => db.table("asns").toArray(), [], []);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all"); // all | soon | overdue | ok
  const [compact, setCompact] = useState(false);
  const [sortAsc, setSortAsc] = useState(true); // A→Z by default

  const filtered = useMemo(() => {
    if (!asns) return [];
    const term = q.trim().toLowerCase();

    const withMeta = (asns || []).map((r) => {
      const dueInKgb = r.jadwalKgbBerikutnya ? daysUntil(r.jadwalKgbBerikutnya) : null;
      const dueInPangkat = r.jadwalPangkatBerikutnya ? daysUntil(r.jadwalPangkatBerikutnya) : null;
      const nearest = Math.min(dueInKgb ?? Infinity, dueInPangkat ?? Infinity);
      let status = "ok";
      if (nearest < 0) status = "overdue";
      else if (nearest <= 90) status = "soon";
      return { ...r, dueInKgb, dueInPangkat, nearest, status };
    });

    let list = withMeta;
    if (term) {
      list = list.filter(
        (r) => r.nama?.toLowerCase().includes(term) || (r.nip || "").toLowerCase().includes(term)
      );
    }
    if (statusFilter !== "all") list = list.filter((r) => r.status === statusFilter);

    list.sort((a, b) => (a.nama || "").localeCompare(b.nama || "", "id", { sensitivity: "base" }));
    if (!sortAsc) list.reverse();
    return list;
  }, [asns, q, statusFilter, sortAsc]);

  const remove = async (id) => {
    if (!confirm("Hapus data ASN ini?")) return;
    await db.table("asns").delete(id);
    setToast?.({ type: "success", msg: "Data dihapus." });
  };

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari nama atau NIP..."
          className="border rounded-lg pl-9 pr-3 py-2 w-72 max-w-full focus:ring-2 focus:ring-indigo-200"
        />
      </div>

      <SegmentedControl
        value={statusFilter}
        onChange={setStatusFilter}
        options={[
          { value: "all", label: "Semua" },
          { value: "soon", label: "≤3 bln" },
          { value: "overdue", label: "Terlewat" },
          { value: "ok", label: "Aman" },
        ]}
      />

      <button
        onClick={() => setSortAsc((x) => !x)}
        className="inline-flex items-center gap-1 border rounded-lg px-2.5 py-2 hover:bg-slate-50"
        title="Urutkan Nama A↔Z"
      >
        <ArrowUpDown className="w-4 h-4" />
        <span className="text-sm">Nama {sortAsc ? "A→Z" : "Z→A"}</span>
      </button>

      <button
        onClick={() => setCompact((x) => !x)}
        className="inline-flex items-center gap-2 border rounded-lg px-2.5 py-2 hover:bg-slate-50"
        title="Kepadatan tampilan"
      >
        <SlidersHorizontal className="w-4 h-4" />
        <span className="text-sm">{compact ? "Padat" : "Normal"}</span>
      </button>

      <div className="flex items-center gap-2 ml-auto">
        <IconButton onClick={() => exportJSON(asns || [])} title="Export JSON">
          <Download className="w-4 h-4" />
          <span className="sr-only">Export</span>
        </IconButton>
        <IconButton
          onClick={() => importJSON(() => setToast?.({ type: "success", msg: "Import selesai." }))}
          title="Import JSON"
        >
          <Upload className="w-4 h-4" />
          <span className="sr-only">Import</span>
        </IconButton>
      </div>
    </div>
  );

  return (
    <Card title="Tampilkan Data Pegawai" subtitle="Cari, filter, dan urutkan data pegawai." extra={toolbar}>
      <div className={`overflow-auto rounded-xl border border-slate-200 ${compact ? "text-xs" : "text-sm"}`}>
        <table className="min-w-full">
          <thead className="sticky top-0 z-10">
            <tr className="bg-white/95 backdrop-blur text-slate-600 border-b">
              <Th>Nama</Th>
              <Th>NIP</Th>
              <Th>TMT PNS</Th>
              <Th>Riwayat TMT Kenaikan Gaji</Th>
              <Th>Jadwal Kenaikan Gaji Berikutnya</Th>
              <Th>Riwayat TMT Pangkat</Th>
              <Th>Jadwal Kenaikan Pangkat Berikutnya</Th>
              <Th>Status</Th>
              <Th align="right">Aksi</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, idx) => (
              <tr
                key={r.id}
                className={`group transition ${idx % 2 ? "bg-white" : "bg-slate-50/40"} hover:bg-indigo-50/30`}
              >
                <Td>
                  <div className="flex items-center gap-3">
                    <Avatar name={r.nama} />
                    <div>
                      <div className="font-medium leading-tight">{r.nama}</div>
                      <div className="text-[11px] text-slate-500">ID: {r.id}</div>
                    </div>
                  </div>
                </Td>
                <Td>{r.nip}</Td>
                <Td>{human(r.tmtPns)}</Td>
                <Td>{human(r.riwayatTmtKgb)}</Td>
                <Td>{human(r.jadwalKgbBerikutnya)}</Td>
                <Td>{human(r.riwayatTmtPangkat)}</Td>
                <Td>{human(r.jadwalPangkatBerikutnya)}</Td>
                <Td>
                  <div className="flex flex-wrap gap-2">
                    <StatusPill label="Kenaikan Gaji Berikutnya" target={r.jadwalKgbBerikutnya} />
                    <StatusPill label="Kenaikan Pangkat Berikutnya" target={r.jadwalPangkatBerikutnya} />
                  </div>
                </Td>
                <Td align="right">
                  <div className="flex justify-end gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition">
                    <IconButton onClick={() => setEditing(r)} title="Edit">
                      <Edit3 className="w-4 h-4" />
                    </IconButton>
                    <IconButton danger onClick={() => remove(r.id)} title="Hapus">
                      <Trash2 className="w-4 h-4" />
                    </IconButton>
                  </div>
                </Td>
              </tr>
            ))}
            {!filtered.length && (
              <tr>
                <td className="p-8 text-center text-slate-500" colSpan={9}>
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-slate-100" />
                    <div className="text-sm">Belum ada data yang cocok.</div>
                    <div className="text-xs text-slate-500">Coba ganti kata kunci atau reset filter.</div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {editing && (
          <EditDialog
            data={editing}
            onClose={() => setEditing(null)}
            onSaved={() => setToast?.({ type: "success", msg: "Perubahan disimpan." })}
          />
        )}
      </AnimatePresence>
    </Card>
  );
}

// =============================
// Edit Dialog (reusable)
// =============================
function EditDialog({ data, onClose, onSaved }) {
  const [f, setF] = useState({ ...data });
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    const kgb = f.riwayatTmtKgb ? ymd(addYears(toDate(f.riwayatTmtKgb), 2)) : "";
    const pangkat = f.riwayatTmtPangkat ? ymd(addYears(toDate(f.riwayatTmtPangkat), 4)) : "";
    setF((x) => ({ ...x, jadwalKgbBerikutnya: kgb, jadwalPangkatBerikutnya: pangkat }));
  }, [f.riwayatTmtKgb, f.riwayatTmtPangkat]);

  const onChange = (e) => setF({ ...f, [e.target.name]: e.target.value });

  const doSave = async () => {
    await db.table("asns").update(f.id, { ...f });
    onSaved?.();
    onClose?.();
  };

  return (
    <motion.div className="fixed inset-0 bg-black/30 grid place-items-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }} className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold">Edit Data ASN</h4>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700">Tutup</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormRow label="Nama">
            <input name="nama" value={f.nama || ""} onChange={onChange} className="w-full border rounded-lg px-3 py-2" />
          </FormRow>
          <FormRow label="NIP">
            <input name="nip" value={f.nip || ""} onChange={onChange} className="w-full border rounded-lg px-3 py-2" />
          </FormRow>
          <FormRow label="TMT PNS">
            <input type="date" name="tmtPns" value={ymd(f.tmtPns)} onChange={onChange} className="w-full border rounded-lg px-3 py-2" />
          </FormRow>
          <FormRow label="Riwayat TMT Kenaikan Gaji">
            <input type="date" name="riwayatTmtKgb" value={ymd(f.riwayatTmtKgb)} onChange={onChange} className="w-full border rounded-lg px-3 py-2" />
          </FormRow>
          <FormRow label="Riwayat TMT Pangkat">
            <input type="date" name="riwayatTmtPangkat" value={ymd(f.riwayatTmtPangkat)} onChange={onChange} className="w-full border rounded-lg px-3 py-2" />
          </FormRow>
          <FormRow label="Jadwal Kenaikan Gaji Berikutnya (otomatis +2 thn)">
            <input type="date" name="jadwalKgbBerikutnya" value={ymd(f.jadwalKgbBerikutnya)} readOnly className="w-full border rounded-lg px-3 py-2 bg-slate-50" />
          </FormRow>
          <FormRow label="Jadwal Kenaikan Pangkat Berikutnya (otomatis +4 thn)">
            <input type="date" name="jadwalPangkatBerikutnya" value={ymd(f.jadwalPangkatBerikutnya)} readOnly className="w-full border rounded-lg px-3 py-2 bg-slate-50" />
          </FormRow>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="border rounded-lg px-4 py-2 hover:bg-slate-50">Batal</button>
          <button onClick={() => setConfirmOpen(true)} className="bg-indigo-600 text-white rounded-lg px-4 py-2 font-medium hover:bg-indigo-700">Simpan</button>
        </div>

        {/* Verifikasi sebelum simpan perubahan */}
        <ConfirmDialog
          open={confirmOpen}
          title="Verifikasi Perubahan"
          onCancel={() => setConfirmOpen(false)}
          onConfirm={doSave}
          confirmText="Ya, Simpan"
          cancelText="Batal"
        >
          <ul className="text-sm text-slate-700 space-y-1">
            <li><b>Nama:</b> {f.nama || '-'}</li>
            <li><b>NIP:</b> {f.nip || '-'}</li>
            <li><b>TMT PNS:</b> {human(f.tmtPns)}</li>
            <li><b>Riwayat TMT Kenaikan Gaji:</b> {human(f.riwayatTmtKgb)}</li>
            <li><b>Jadwal Kenaikan Gaji Berikutnya:</b> {human(f.jadwalKgbBerikutnya)}</li>
            <li><b>Riwayat TMT Pangkat:</b> {human(f.riwayatTmtPangkat)}</li>
            <li><b>Jadwal Kenaikan Pangkat Berikutnya:</b> {human(f.jadwalPangkatBerikutnya)}</li>
          </ul>
        </ConfirmDialog>
      </motion.div>
    </motion.div>
  );
}

// =============================
// Dashboard (grouped by jenis)
// =============================
function PanelDashboard() {
  const { asns = [], notif = { soon: [], overdue: [] } } = useApp() || {};
  const total = asns.length;
  const soon = notif.soon || [];
  const overdue = notif.overdue || [];

  const TYPES = ["Kenaikan Gaji Berikutnya", "Kenaikan Pangkat Berikutnya"];
  const byJenis = (list, jenis) => list.filter((r) => r.jenis === jenis);
  const top = (arr, n) => arr.slice(0, n);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <Card title="Ringkasan" subtitle="Ikhtisar status pegawai & jadwal">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
            <div className="text-xs text-slate-500">Total Pegawai</div>
            <div className="text-2xl font-semibold mt-1">{total}</div>
          </div>
          <div className="rounded-xl border border-amber-200 p-4 bg-amber-50">
            <div className="text-xs text-amber-700">Jatuh Tempo ≤ 3 Bulan</div>
            <div className="text-2xl font-semibold mt-1">{soon.length}</div>
          </div>
          <div className="rounded-xl border border-rose-200 p-4 bg-rose-50">
            <div className="text-xs text-rose-700">Terlewat</div>
            <div className="text-2xl font-semibold mt-1">{overdue.length}</div>
          </div>
        </div>
      </Card>

      <Card title="Notifikasi (Per Jenis)" subtitle="Menampilkan 3 teratas per status">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {TYPES.map((type) => (
            <div key={type} className="space-y-3">
              <div className="text-sm font-medium">{type}</div>
              <div>
                <div className="text-xs font-medium text-amber-700 mb-2">Segera (≤ 3 bulan)</div>
                <NotifList items={top(byJenis(soon, type), 3)} tone="amber" emptyText="—" />
              </div>
              <div>
                <div className="text-xs font-medium text-rose-700 mb-2">Terlewat</div>
                <NotifList items={top(byJenis(overdue, type), 3)} tone="rose" overdue emptyText="—" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// =============================
// Notifikasi (grouped by jenis)
// =============================
function PanelNotifikasi({ data }) {
  const ctx = useApp();
  const { soon = [], overdue = [] } = data || ctx?.notif || {};

  const TYPES = ["Kenaikan Gaji Berikutnya", "Kenaikan Pangkat Berikutnya"];
  const byJenis = (list, jenis) => list.filter((r) => r.jenis === jenis);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {TYPES.map((type) => (
        <Card key={type} title={type} subtitle="Dikelompokkan per status jadwal">
          <div className="space-y-5">
            <div>
              <div className="text-xs font-medium text-amber-700 mb-2">Segera (≤ 3 bulan)</div>
              <NotifList items={byJenis(soon, type)} tone="amber" emptyText="Tidak ada yang jatuh tempo." />
            </div>
            <div>
              <div className="text-xs font-medium text-rose-700 mb-2">Terlewat</div>
              <NotifList items={byJenis(overdue, type)} tone="rose" overdue emptyText="Tidak ada yang terlewat." />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function NotifItem({ r, tone = "amber", overdue = false }) {
  const Icon = overdue ? AlertTriangle : Bell;
  const days = Math.abs(daysUntil(r.tanggal));
  return (
    <div className={`border rounded-xl p-3 flex items-center justify-between ${tone === "amber" ? "bg-amber-50 border-amber-200" : "bg-rose-50 border-rose-200"}`}>
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-lg grid place-content-center ${tone === "amber" ? "bg-amber-100 text-amber-800" : "bg-rose-100 text-rose-800"}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <div className="font-medium">
            {r.nama} <span className="text-xs text-slate-500">({r.nip})</span>
          </div>
          <div className="text-xs text-slate-600">
            {r.jenis} pada <b>{human(r.tanggal)}</b> {overdue ? `(${days} hari yang lalu)` : `(sisa ${days} hari)`}
          </div>
        </div>
      </div>
      <span className={`text-xs px-2 py-1 rounded-full border ${tone === "amber" ? "bg-white text-amber-700 border-amber-300" : "bg-white text-rose-700 border-rose-300"}`}>
        Pengingat
      </span>
    </div>
  );
}

function NotifList({ items = [], tone = "amber", overdue = false, emptyText = "Tidak ada data." }) {
  if (!items.length) return <EmptyState text={emptyText} />;
  return (
    <div className="space-y-3">
      {items.map((r) => (
        <NotifItem key={`${r.id}-${r.jenis}`} r={r} tone={tone} overdue={overdue} />
      ))}
    </div>
  );
}

// =============================
// Small UI Building Blocks
// =============================
function Card({ title, subtitle, extra, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
        <div>
          {title && <h3 className="text-base font-semibold">{title}</h3>}
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        {extra}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function FormRow({ label, required, children }) {
  return (
    <div>
      <label className="block text-sm mb-1">
        {label} {required && <span className="text-rose-600">*</span>}
      </label>
      {children}
    </div>
  );
}

function NavButton({ icon, active, onClick, children }) {
  return (
    <button onClick={onClick} className={`px-3 py-1.5 rounded-lg border text-sm transition inline-flex items-center gap-2 ${active ? "bg-indigo-600 text-white border-indigo-600" : "bg-white hover:bg-slate-50"}`}>
      {icon}
      {children}
    </button>
  );
}

function TopLink({ active, onClick, icon, label, badge }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition ${
        active ? "bg-indigo-600 text-white border-indigo-600" : "bg-white hover:bg-slate-50"
      }`}
    >
      {icon}
      <span>{label}</span>
      {badge ? (
        <span className="ml-1 px-1.5 py-0.5 rounded-md text-[10px] bg-amber-100 text-amber-800 border border-amber-200">
          {badge}
        </span>
      ) : null}
    </button>
  );
}

function StatusPill({ label, target }) {
  if (!target) return null;
  const d = daysUntil(target);
  const base = "inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border font-medium";
  if (d < 0)
    return (
      <span className={`${base} bg-rose-50 text-rose-700 border-rose-200`}>
        <AlertTriangle className="w-3 h-3" /> {label}: Terlewat {Math.abs(d)}h
      </span>
    );
  if (d <= 90)
    return (
      <span className={`${base} bg-amber-50 text-amber-800 border-amber-200`}>
        <Clock className="w-3 h-3" /> {label}: {d}h lagi
      </span>
    );
  return (
    <span className={`${base} bg-emerald-50 text-emerald-800 border-emerald-200`}>
      <CheckCircle2 className="w-3 h-3" /> {label}: {d}h lagi
    </span>
  );
}

function EmptyState({ text }) {
  return <div className="text-sm text-slate-500 border border-dashed rounded-xl p-4">{text}</div>;
}

function IconButton({ children, onClick, title, danger }) {
  return (
    <button onClick={onClick} title={title} className={`px-2.5 py-2 rounded-lg border inline-flex items-center gap-2 hover:bg-slate-50 ${danger ? "border-rose-200 text-rose-700 hover:bg-rose-50" : ""}`}>
      {children}
    </button>
  );
}

function Th({ children, align = "left" }) {
  return <th className={`p-3 border-b text-${align}`}>{children}</th>;
}
function Td({ children, align = "left" }) {
  return <td className={`p-3 border-b text-${align}`}>{children}</td>;
}

// =============================
// Confirm Dialog (reusable)
// =============================
function ConfirmDialog({ open, title = "Konfirmasi", children, onConfirm, onCancel, confirmText = "Ya, Simpan", cancelText = "Batal" }) {
  if (!open) return null;
  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 bg-black/30 grid place-items-center p-4 z-50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }} className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 p-6">
          <h4 className="font-semibold mb-2">{title}</h4>
          <div className="mb-4 text-slate-700 text-sm">{children}</div>
          <div className="flex justify-end gap-2">
            <button onClick={onCancel} className="border rounded-lg px-4 py-2 hover:bg-slate-50">{cancelText}</button>
            <button onClick={onConfirm} className="bg-indigo-600 text-white rounded-lg px-4 py-2 font-medium hover:bg-indigo-700">{confirmText}</button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// =============================
// Extra UI helpers needed by Data page
// =============================
function SegmentedControl({ value, onChange, options = [] }) {
  return (
    <div className="inline-flex rounded-lg border bg-white p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange?.(opt.value)}
          className={`px-2.5 py-1.5 text-sm rounded-md ${value === opt.value ? "bg-indigo-600 text-white" : "hover:bg-slate-50"}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function Avatar({ name = "?" }) {
  const initials = (name || "?")
    .trim()
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("") || "?";
  return (
    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 grid place-content-center text-xs font-semibold">
      {initials}
    </div>
  );
}

// =============================
// Export / Import JSON helpers
// =============================
function exportJSON(rows = []) {
  try {
    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "data-asn.json";
    a.click();
    URL.revokeObjectURL(url);
  } catch (e) {
    console.warn("Export gagal:", e);
  }
}

function importJSON(onDone) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "application/json";
  input.onchange = async (e) => {
    try {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const text = await file.text();
      const data = JSON.parse(text);
      if (!Array.isArray(data)) throw new Error("Format JSON tidak valid (harus array)");
      await db.table("asns").bulkPut(data.map((r) => ({ ...r })));
      onDone?.();
    } catch (err) {
      console.warn("Import gagal:", err);
      alert("Import gagal: " + err.message);
    }
  };
  input.click();
}
