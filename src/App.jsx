import React, { useEffect, useMemo, useState } from "react";
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
  NavLink,
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";
import * as api from "./lib/apiClient";

/* =============================
   App Context
============================= */
const AppCtx = React.createContext(null);
const useApp = () => React.useContext(AppCtx);

/* =============================
   Cloud API mapping helpers
============================= */
const toClient = (row) => ({
  id: row.id,
  nama: row.nama,
  nip: row.nip,
  tmtPns: row.tmt_pns || row.tmtPns || "",
  riwayatTmtKgb: row.riwayat_tmt_kgb || row.riwayatTmtKgb || "",
  riwayatTmtPangkat: row.riwayat_tmt_pangkat || row.riwayatTmtPangkat || "",
  jadwalKgbBerikutnya: row.jadwal_kgb_berikutnya || row.jadwalKgbBerikutnya || "",
  jadwalPangkatBerikutnya: row.jadwal_pangkat_berikutnya || row.jadwalPangkatBerikutnya || "",
});
const toServer = (row) => ({
  nama: row.nama ?? null,
  nip: row.nip ?? null,
  tmt_pns: row.tmtPns || null,
  riwayat_tmt_kgb: row.riwayatTmtKgb || null,
  riwayat_tmt_pangkat: row.riwayatTmtPangkat || null,
  jadwal_kgb_berikutnya: row.jadwalKgbBerikutnya || null,
  jadwal_pangkat_berikutnya: row.jadwalPangkatBerikutnya || null,
});

/* =============================
   Helpers (Tanggal)
============================= */
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
const withinNextDays = (d, n) => {
  if (!d) return false;
  const x = daysUntil(d);
  return x >= 0 && x <= n;
};

/* =============================
   (Optional) Self tests
============================= */
function runSelfTests() {
  const base = new Date("2020-03-15");
  if (ymd(addYears(base, 2)) !== "2022-03-15") console.warn("addYears +2 mismatch");
  if (ymd(addYears(base, 4)) !== "2024-03-15") console.warn("addYears +4 mismatch");
}

/* =============================
   App Root
============================= */
export default function App() {
  const [authed, setAuthed] = useState(true); // bypass login by default

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
            authed ? <Navigate to="/dashboard" replace /> : <Login onSuccess={() => setAuthed(true)} />
          }
        />
        <Route
          path="/"
          element={
            <RequireAuth authed={authed}>
              <Shell asns={asns} notif={notif} refreshAsns={refreshAsns} />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<PanelDashboard />} />
          <Route path="input" element={<FormInput />} />
          <Route path="data" element={<TabelData />} />
          <Route path="notifikasi" element={<PanelNotifikasi />} />
        </Route>
      </Routes>
    </Router>
  );
}

function RequireAuth({ authed, children }) {
  if (!authed) return <Navigate to="/login" replace />;
  return children;
}

/* =============================
   Shell Layout (Topbar + Outlet)
============================= */
function Shell({ asns, notif, refreshAsns }) {
  const [toast, setToast] = useState(null);
  const { pathname } = useLocation();

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <AppCtx.Provider value={{ setToast, asns, notif, refreshAsns }}>
      <div className="min-h-screen bg-slate-50 text-slate-800">
        {/* Topbar */}
        <header className="sticky top-0 z-40 backdrop-blur bg-white/75 border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white grid place-content-center font-bold">
              A
            </div>
            <div className="flex-1">
              <h1 className="text-lg font-semibold leading-tight">
                Monitoring Kenaikan Pangkat & Kenaikan Gaji (ASN)
              </h1>
              <p className="text-xs text-slate-500">
                {asns?.length || 0} data pegawai • {notif?.soon?.length || 0} due ≤90 hari •{" "}
                {notif?.overdue?.length || 0} terlewat
              </p>
            </div>

            <div className="hidden md:flex items-center gap-2">
              <TopLink to="/dashboard" icon={<Home className="w-4 h-4" />} label="Dashboard" active={pathname.startsWith("/dashboard")} />
              <TopLink to="/input" icon={<UserPlus className="w-4 h-4" />} label="Input" active={pathname.startsWith("/input")} />
              <TopLink to="/data" icon={<List className="w-4 h-4" />} label="Data" active={pathname.startsWith("/data")} />
              <TopLink to="/notifikasi" icon={<Bell className="w-4 h-4" />} label="Notifikasi" active={pathname.startsWith("/notifikasi")} />
            </div>
          </div>
        </header>

        {/* Outlet */}
        <main className="max-w-7xl mx-auto px-4 py-6">
          <Outlet />
        </main>

        {/* Toast */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg shadow ${
                toast.type === "success"
                  ? "bg-emerald-600 text-white"
                  : toast.type === "error"
                  ? "bg-rose-600 text-white"
                  : "bg-slate-800 text-white"
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

/* =============================
   Login
============================= */
function Login({ onSuccess }) {
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const submit = (e) => {
    e.preventDefault();
    onSuccess?.();
  };
  return (
    <div className="max-w-sm mx-auto mt-16 bg-white border rounded-xl shadow p-6">
      <h2 className="text-lg font-semibold mb-4">Masuk</h2>
      <form onSubmit={submit} className="space-y-3">
        <input className="w-full border rounded-lg px-3 py-2" placeholder="Username" value={u} onChange={(e)=>setU(e.target.value)} />
        <input className="w-full border rounded-lg px-3 py-2" placeholder="Password" type="password" value={p} onChange={(e)=>setP(e.target.value)} />
        <button className="w-full rounded-lg bg-indigo-600 text-white py-2 font-medium hover:bg-indigo-700">Masuk</button>
      </form>
    </div>
  );
}

/* =============================
   Form Input Data ASN
============================= */
function FormInput() {
  const { setToast, refreshAsns } = useApp() || {};
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
    await api.createASN(toServer(form));
    await refreshAsns?.();
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
          <div className="md:col-span-2 flex justify-end gap-2 mt-2">
            <button type="button" onClick={() => setConfirmOpen(true)} className="rounded-lg bg-indigo-600 text-white px-4 py-2 font-medium hover:bg-indigo-700">Simpan</button>
          </div>
        </form>
      </Card>

      {/* Verifikasi sebelum simpan */}
      <ConfirmDialog
        open={confirmOpen}
        title="Verifikasi Input"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={doSave}
        confirmText="Ya, Simpan"
        cancelText="Batal"
      >
        <ul className="text-sm text-slate-700 space-y-1">
          <li><b>Nama:</b> {form.nama || "-"}</li>
          <li><b>NIP:</b> {form.nip || "-"}</li>
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

/* =============================
   Tabel Data & Edit
============================= */
function TabelData() {
  const { setToast, asns, refreshAsns } = useApp() || {};
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [compact, setCompact] = useState(false);
  const [sortAsc, setSortAsc] = useState(true);

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

    let list = withMeta.filter((r) => {
      const qMatch = !term || (r.nama || "").toLowerCase().includes(term) || (r.nip || "").toLowerCase().includes(term);
      const statusMatch =
        statusFilter === "all" ? true :
        statusFilter === "ok" ? r.status === "ok" :
        r.status === statusFilter;
      return qMatch && statusMatch;
    });

    list.sort((a, b) => (a.nama || "").localeCompare(b.nama || "", "id", { sensitivity: "base" }));
    if (!sortAsc) list.reverse();
    return list;
  }, [asns, q, statusFilter, sortAsc]);

  const remove = async (id) => {
    if (!confirm("Hapus data ASN ini?")) return;
    await api.deleteASN(id);
    await refreshAsns?.();
    setToast?.({ type: "success", msg: "Data dihapus." });
  };

  // ...render tabel + EditDialog seperti sebelumnya
}

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

      <div className="flex items-center gap-2 ml-auto">
        <IconButton onClick={() => exportJSON(asns || [])} title="Export JSON">
          <Download className="w-4 h-4" />
          <span className="sr-only">Export</span>
        </IconButton>
        <IconButton
          onClick={() => importJSON(async () => { await refreshAsns?.(); setToast?.({ type: "success", msg: "Import selesai." }); })}
          title="Import JSON"
        >
          <Upload className="w-4 h-4" />
          <span className="sr-only">Import</span>
        </IconButton>

        <IconButton onClick={() => setCompact((x) => !x)} title="Kepadatan tampilan">
          <SlidersHorizontal className="w-4 h-4" />
          <span className="text-sm">{compact ? "Padat" : "Normal"}</span>
        </IconButton>
      </div>
    </div>
  );

  return (
    <Card title="Data ASN" toolbar={toolbar}>
      {filtered.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="overflow-x-auto">
          <table className={`w-full text-sm ${compact ? "table-fixed" : ""}`}>
            <thead>
              <tr className="text-left border-b bg-slate-50">
                <Th>Nama</Th>
                <Th>NIP</Th>
                <Th>TMT PNS</Th>
                <Th>Riwayat TMT KGB</Th>
                <Th>Jadwal KGB Berikutnya</Th>
                <Th>Riwayat TMT Pangkat</Th>
                <Th>Jadwal Pangkat Berikutnya</Th>
                <Th>Aksi</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b hover:bg-slate-50">
                  <Td className="font-medium">{r.nama || "-"}</Td>
                  <Td>{r.nip || "-"}</Td>
                  <Td>{human(r.tmtPns)}</Td>
                  <Td>
                    {human(r.riwayatTmtKgb)}{" "}
                    <StatusPill label="KGB" target={r.jadwalKgbBerikutnya} />
                  </Td>
                  <Td>{human(r.jadwalKgbBerikutnya)}</Td>
                  <Td>{human(r.riwayatTmtPangkat)}</Td>
                  <Td>
                    {human(r.jadwalPangkatBerikutnya)}{" "}
                    <StatusPill label="Pangkat" target={r.jadwalPangkatBerikutnya} />
                  </Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditing(r)}
                        className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 hover:bg-slate-50"
                        title="Edit"
                      >
                        <Edit3 className="w-4 h-4" /> Edit
                      </button>
                      <button
                        onClick={() => remove(r.id)}
                        className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 hover:bg-rose-50"
                        title="Hapus"
                      >
                        <Trash2 className="w-4 h-4" /> Hapus
                      </button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <EditDialog
        open={!!editing}
        record={editing}
        onClose={() => setEditing(null)}
        onSaved={async () => { await refreshAsns?.(); setToast?.({ type: "success", msg: "Perubahan disimpan." }); }}
      />
    </Card>
  );
}

/* =============================
   Edit Dialog
============================= */
function EditDialog({ open, record, onClose, onSaved }) {
  const [f, setF] = useState(() => record || null);

  useEffect(() => setF(record || null), [record]);

  useEffect(() => {
    if (!f) return;
    const kgb = f.riwayatTmtKgb ? ymd(addYears(toDate(f.riwayatTmtKgb), 2)) : "";
    const pangkat = f.riwayatTmtPangkat ? ymd(addYears(toDate(f.riwayatTmtPangkat), 4)) : "";
    setF((x) => ({ ...x, jadwalKgbBerikutnya: kgb, jadwalPangkatBerikutnya: pangkat }));
  }, [f?.riwayatTmtKgb, f?.riwayatTmtPangkat]);

  if (!open || !f) return null;

  const onChange = (e) => setF({ ...f, [e.target.name]: e.target.value });

  const save = async () => {
    await api.updateASN(f.id, toServer(f));
    onSaved?.();
    onClose?.();
  };

  return (
    <div className="fixed inset-0 bg-black/30 grid place-items-center p-4">
      <div className="bg-white rounded-xl border shadow max-w-2xl w-full p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold">Edit Data ASN</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700">✕</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormRow label="Nama">
            <input name="nama" value={f.nama || ""} onChange={onChange} className="w-full border rounded-lg px-3 py-2" />
          </FormRow>
          <FormRow label="NIP">
            <input name="nip" value={f.nip || ""} onChange={onChange} className="w-full border rounded-lg px-3 py-2" />
          </FormRow>
          <FormRow label="TMT PNS">
            <input type="date" name="tmtPns" value={f.tmtPns || ""} onChange={onChange} className="w-full border rounded-lg px-3 py-2" />
          </FormRow>
          <FormRow label="Riwayat TMT Kenaikan Gaji">
            <input type="date" name="riwayatTmtKgb" value={f.riwayatTmtKgb || ""} onChange={onChange} className="w-full border rounded-lg px-3 py-2" />
          </FormRow>
          <FormRow label="Riwayat TMT Pangkat">
            <input type="date" name="riwayatTmtPangkat" value={f.riwayatTmtPangkat || ""} onChange={onChange} className="w-full border rounded-lg px-3 py-2" />
          </FormRow>
          <FormRow label="Jadwal KGB Berikutnya (otomatis +2 thn)">
            <input type="date" name="jadwalKgbBerikutnya" value={f.jadwalKgbBerikutnya || ""} readOnly className="w-full border rounded-lg px-3 py-2 bg-slate-50" />
          </FormRow>
          <FormRow label="Jadwal Pangkat Berikutnya (otomatis +4 thn)">
            <input type="date" name="jadwalPangkatBerikutnya" value={f.jadwalPangkatBerikutnya || ""} readOnly className="w-full border rounded-lg px-3 py-2 bg-slate-50" />
          </FormRow>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="border rounded-lg px-4 py-2 hover:bg-slate-50">Batal</button>
          <button onClick={save} className="rounded-lg bg-indigo-600 text-white px-4 py-2 font-medium hover:bg-indigo-700">Simpan</button>
        </div>
      </div>
    </div>
  );
}

/* =============================
   Dashboard
============================= */
function PanelDashboard() {
  const { asns, notif } = useApp() || {};
  const total = asns?.length || 0;
  const soon = notif?.soon?.length || 0;
  const overdue = notif?.overdue?.length || 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card title="Total ASN" icon={<UsersCircle />}>
        <div className="text-3xl font-bold">{total}</div>
        <p className="text-sm text-slate-500 mt-1">Total data pegawai</p>
      </Card>
      <Card title="Due ≤90 hari" icon={<Clock className="w-5 h-5" />}>
        <div className="text-3xl font-bold">{soon}</div>
        <p className="text-sm text-slate-500 mt-1">Butuh perhatian segera</p>
      </Card>
      <Card title="Terlewat" icon={<AlertTriangle className="w-5 h-5 text-rose-600" />}>
        <div className="text-3xl font-bold">{overdue}</div>
        <p className="text-sm text-slate-500 mt-1">Sudah lewat jadwal</p>
      </Card>
      <Card title="Tips">
        <ul className="text-sm list-disc pl-5 leading-6">
          <li>Gunakan menu <b>Input</b> untuk menambah data.</li>
          <li>Kelola data di menu <b>Data</b>.</li>
          <li>Lihat yang segera jatuh tempo di menu <b>Notifikasi</b>.</li>
        </ul>
      </Card>
    </div>
  );
}
function UsersCircle() {
  return (
    <div className="w-5 h-5 rounded-full bg-indigo-600 text-white grid place-content-center text-[10px] font-bold">
      U
    </div>
  );
}

/* =============================
   Panel Notifikasi
============================= */
function PanelNotifikasi() {
  const { notif } = useApp() || {};

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card title="Akan Jatuh Tempo (≤90 hari)">
        <NotifList items={notif?.soon || []} empty="Tidak ada yang akan jatuh tempo." />
      </Card>
      <Card title="Terlewat">
        <NotifList items={notif?.overdue || []} empty="Tidak ada yang terlewat." />
      </Card>
    </div>
  );
}
function NotifList({ items, empty }) {
  if (!items?.length) return <EmptyState label={empty} />;
  return (
    <ul className="divide-y">
      {items.map((r, idx) => (
        <li key={idx} className="py-3 flex items-start gap-3">
          <div className="mt-0.5">
            {new Date(r.tanggal) < new Date() ? (
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            ) : (
              <CalendarDays className="w-4 h-4 text-amber-600" />
            )}
          </div>
          <div className="flex-1">
            <div className="font-medium">{r.nama}</div>
            <div className="text-xs text-slate-600">{r.nip}</div>
            <div className="text-sm mt-1">
              <b>{r.jenis}</b> • {human(r.tanggal)}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

/* =============================
   UI Primitives
============================= */
function Card({ title, subtitle, icon, toolbar, children }) {
  return (
    <div className="bg-white border rounded-xl shadow-sm">
      <div className="px-4 py-3 border-b flex items-center gap-3">
        {icon ? <div>{icon}</div> : null}
        <div className="flex-1 min-w-0">
          {title ? <h3 className="font-semibold leading-tight truncate">{title}</h3> : null}
          {subtitle ? <div className="text-xs text-slate-500">{subtitle}</div> : null}
        </div>
        {toolbar ? <div className="ml-auto">{toolbar}</div> : null}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}
function FormRow({ label, required, children }) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="text-slate-600">
        {label} {required ? <span className="text-rose-600">*</span> : null}
      </span>
      {children}
    </label>
  );
}
function IconButton({ onClick, title, children }) {
  return (
    <button onClick={onClick} title={title} className="inline-flex items-center gap-1 border rounded-lg px-2.5 py-2 hover:bg-slate-50">
      {children}
    </button>
  );
}
function Th({ children }) {
  return <th className="px-3 py-2 text-xs font-semibold text-slate-600">{children}</th>;
}
function Td({ children, className = "" }) {
  return <td className={`px-3 py-2 ${className}`}>{children}</td>;
}
function EmptyState({ label = "Belum ada data." }) {
  return (
    <div className="text-center text-slate-500 py-10 text-sm">
      <div className="flex items-center justify-center gap-2 mb-2">
        <CheckCircle2 className="w-4 h-4" />
        <span>{label}</span>
      </div>
      <div>Mulai tambah data lewat menu <b>Input</b>.</div>
    </div>
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
    <span className={`${base} bg-emerald-50 text-emerald-700 border-emerald-200`}>
      {label}: Aman
    </span>
  );
}
function TopLink({ to, icon, label, active }) {
  return (
    <NavLink to={to} className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm border ${active ? "bg-slate-900 text-white border-slate-900" : "bg-white hover:bg-slate-50"}`}>
      {icon}
      <span>{label}</span>
    </NavLink>
  );
}
function SegmentedControl({ value, onChange, options }) {
  return (
    <div className="inline-flex border rounded-lg overflow-hidden">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 text-sm ${value === opt.value ? "bg-slate-900 text-white" : "bg-white hover:bg-slate-50"}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
function ConfirmDialog({ open, title, children, onCancel, onConfirm, confirmText = "OK", cancelText = "Batal" }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/30 grid place-items-center p-4 z-50">
      <div className="bg-white rounded-xl border shadow max-w-md w-full p-4">
        <h3 className="text-base font-semibold mb-2">{title}</h3>
        <div className="text-sm text-slate-700">{children}</div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onCancel} className="border rounded-lg px-3 py-1.5 hover:bg-slate-50">{cancelText}</button>
          <button onClick={onConfirm} className="rounded-lg bg-indigo-600 text-white px-3 py-1.5 hover:bg-indigo-700">{confirmText}</button>
        </div>
      </div>
    </div>
  );
}

/* =============================
   Export / Import JSON
============================= */
export function exportJSON(rows) {
  const blob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `asn-export-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
export async function importJSON(onDone) {
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
      for (const r of data) {
        try { await api.createASN(toServer(r)); } catch (err) { console.warn("Gagal import satu baris:", err); }
      }
      onDone?.();
    } catch (err) {
      console.warn("Import gagal:", err);
      alert("Import gagal: " + err.message);
    }
  };
  input.click();
}
