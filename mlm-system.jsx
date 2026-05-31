import { useState, useEffect } from "react";

// ============================================================
// DATABASE (localStorage simulation)
// ============================================================
const DB = {
  getUsers: () => JSON.parse(localStorage.getItem("mlm_users") || "[]"),
  saveUsers: (users) => localStorage.setItem("mlm_users", JSON.stringify(users)),
  getCurrentUser: () => JSON.parse(localStorage.getItem("mlm_current") || "null"),
  setCurrentUser: (user) => localStorage.setItem("mlm_current", JSON.stringify(user)),
  logout: () => localStorage.removeItem("mlm_current"),
  getPV: () => JSON.parse(localStorage.getItem("mlm_pv") || "[]"),
  savePV: (pv) => localStorage.setItem("mlm_pv", JSON.stringify(pv)),
};

// Generate unique code
const generateCode = (name) => {
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return name.substring(0, 3).toUpperCase() + rand;
};

// Initialize admin if not exists
const initAdmin = () => {
  const users = DB.getUsers();
  if (!users.find((u) => u.role === "admin")) {
    const admin = {
      id: "admin_001",
      fullName: "Mr. Gebo",
      memberNumber: "1214387",
      email: "admin@gebo.com",
      password: "admin123",
      phone: "0672949116",
      passport: "ADMIN001",
      code: "GEBO0001",
      sponsorCode: null,
      role: "admin",
      joinDate: new Date().toISOString(),
    };
    DB.saveUsers([admin]);
  }
};

// Get all downline members for a user (recursive)
const getDownlineIds = (userId, users) => {
  const direct = users.filter((u) => {
    const sponsor = users.find((s) => s.code === u.sponsorCode);
    return sponsor && sponsor.id === userId;
  });
  let all = [...direct];
  direct.forEach((d) => {
    all = [...all, ...getDownlineIds(d.id, users)];
  });
  return all;
};

// Get PV for one user only (personal)
const getUserPV = (userId, pvRecords) => {
  const records = pvRecords.filter((p) => p.userId === userId);
  const total = records.reduce((sum, p) => sum + p.amount, 0);
  const now = new Date();
  const thisMonth = records
    .filter((p) => {
      const d = new Date(p.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((sum, p) => sum + p.amount, 0);
  return { total, thisMonth };
};

// Get TOTAL team PV: user + wanachama wote chini yake
const getTeamPV = (userId, users, pvRecords) => {
  const downline = getDownlineIds(userId, users);
  const allIds = [userId, ...downline.map((u) => u.id)];
  const records = pvRecords.filter((p) => allIds.includes(p.userId));
  const total = records.reduce((sum, p) => sum + p.amount, 0);
  const now = new Date();
  const thisMonth = records
    .filter((p) => {
      const d = new Date(p.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((sum, p) => sum + p.amount, 0);
  return { total, thisMonth, memberCount: downline.length };
};

// Build tree node
const buildTree = (userId, users, pvRecords, depth = 0) => {
  const user = users.find((u) => u.id === userId);
  if (!user) return null;
  const pv = getUserPV(userId, pvRecords);
  const teamPV = getTeamPV(userId, users, pvRecords);
  const children = users
    .filter((u) => {
      const sponsor = users.find((s) => s.code === u.sponsorCode);
      return sponsor && sponsor.id === userId;
    })
    .map((c) => buildTree(c.id, users, pvRecords, depth + 1))
    .filter(Boolean);
  return { ...user, pv, teamPV, children, depth };
};

// ============================================================
// STYLES
// ============================================================
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #0a0a0f;
    --surface: #13131a;
    --surface2: #1c1c28;
    --border: #2a2a3d;
    --accent: #7c6aff;
    --accent2: #ff6a9b;
    --accent3: #6affd4;
    --text: #e8e8f0;
    --muted: #6b6b8a;
    --gold: #ffd066;
  }

  body { background: var(--bg); color: var(--text); font-family: 'DM Sans', sans-serif; min-height: 100vh; }

  .app { min-height: 100vh; }

  /* AUTH */
  .auth-wrap {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: radial-gradient(ellipse at 20% 50%, #1a0a3d 0%, transparent 60%),
                radial-gradient(ellipse at 80% 20%, #0d2a1f 0%, transparent 50%),
                var(--bg);
    padding: 20px;
  }

  .auth-box {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 40px;
    width: 100%;
    max-width: 460px;
    box-shadow: 0 40px 80px rgba(0,0,0,0.5);
  }

  .auth-logo {
    font-family: 'Syne', sans-serif;
    font-size: 28px;
    font-weight: 800;
    background: linear-gradient(135deg, var(--accent), var(--accent2));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    margin-bottom: 8px;
  }

  .auth-sub { color: var(--muted); font-size: 14px; margin-bottom: 32px; }

  .tabs { display: flex; gap: 4px; background: var(--surface2); border-radius: 10px; padding: 4px; margin-bottom: 28px; }

  .tab {
    flex: 1; padding: 10px; border: none; border-radius: 8px; cursor: pointer;
    font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 500;
    background: transparent; color: var(--muted); transition: all 0.2s;
  }
  .tab.active { background: var(--accent); color: white; }

  .field { margin-bottom: 16px; }
  .field label { display: block; font-size: 12px; color: var(--muted); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
  .field input {
    width: 100%; padding: 12px 16px; background: var(--surface2);
    border: 1px solid var(--border); border-radius: 10px; color: var(--text);
    font-family: 'DM Sans', sans-serif; font-size: 14px; transition: border 0.2s;
    outline: none;
  }
  .field input:focus { border-color: var(--accent); }

  .btn {
    width: 100%; padding: 14px; border: none; border-radius: 10px; cursor: pointer;
    font-family: 'Syne', sans-serif; font-size: 15px; font-weight: 700;
    background: linear-gradient(135deg, var(--accent), var(--accent2));
    color: white; transition: opacity 0.2s; margin-top: 8px;
  }
  .btn:hover { opacity: 0.88; }
  .btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-sm {
    width: auto; padding: 8px 16px; font-size: 13px; border-radius: 8px; margin-top: 0;
    background: var(--accent);
  }
  .btn-outline {
    background: transparent; border: 1px solid var(--border); color: var(--text);
  }
  .btn-danger { background: linear-gradient(135deg, #ff4444, #ff6a9b); }
  .btn-success { background: linear-gradient(135deg, #22c55e, var(--accent3)); }

  .err { color: var(--accent2); font-size: 13px; margin-top: 10px; text-align: center; }
  .suc { color: var(--accent3); font-size: 13px; margin-top: 10px; text-align: center; }

  /* DASHBOARD LAYOUT */
  .layout { display: flex; min-height: 100vh; }

  .sidebar {
    width: 240px; background: var(--surface); border-right: 1px solid var(--border);
    display: flex; flex-direction: column; padding: 24px 0; flex-shrink: 0;
    position: sticky; top: 0; height: 100vh;
  }

  .sidebar-logo {
    font-family: 'Syne', sans-serif; font-size: 20px; font-weight: 800;
    background: linear-gradient(135deg, var(--accent), var(--accent2));
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    padding: 0 24px; margin-bottom: 32px;
  }

  .nav-item {
    display: flex; align-items: center; gap: 12px; padding: 12px 24px;
    cursor: pointer; color: var(--muted); font-size: 14px; font-weight: 500;
    transition: all 0.2s; border-left: 3px solid transparent;
  }
  .nav-item:hover { color: var(--text); background: var(--surface2); }
  .nav-item.active { color: var(--accent); border-left-color: var(--accent); background: rgba(124,106,255,0.08); }
  .nav-icon { font-size: 18px; width: 24px; text-align: center; }

  .sidebar-bottom { margin-top: auto; padding: 0 24px; }
  .user-chip {
    background: var(--surface2); border-radius: 12px; padding: 12px;
    font-size: 13px; margin-bottom: 12px;
  }
  .user-chip .name { font-weight: 600; color: var(--text); }
  .user-chip .code { color: var(--accent); font-size: 11px; margin-top: 2px; }
  .user-chip .role { color: var(--gold); font-size: 10px; text-transform: uppercase; letter-spacing: 1px; }

  .main { flex: 1; padding: 32px; overflow-y: auto; }

  .page-title {
    font-family: 'Syne', sans-serif; font-size: 26px; font-weight: 800;
    margin-bottom: 24px; color: var(--text);
  }

  /* CARDS */
  .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 28px; }

  .card {
    background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 24px;
  }
  .card-label { font-size: 12px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
  .card-value { font-family: 'Syne', sans-serif; font-size: 32px; font-weight: 800; }
  .card-value.purple { color: var(--accent); }
  .card-value.pink { color: var(--accent2); }
  .card-value.green { color: var(--accent3); }
  .card-value.gold { color: var(--gold); }

  /* TABLE */
  .table-wrap { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; overflow: hidden; }
  .table-head { padding: 20px 24px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; }
  .table-title { font-family: 'Syne', sans-serif; font-weight: 700; font-size: 16px; }

  table { width: 100%; border-collapse: collapse; }
  th { padding: 12px 20px; text-align: left; font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid var(--border); }
  td { padding: 14px 20px; font-size: 14px; border-bottom: 1px solid rgba(42,42,61,0.5); }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: var(--surface2); }

  .badge {
    display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600;
  }
  .badge-admin { background: rgba(255,208,102,0.15); color: var(--gold); }
  .badge-member { background: rgba(124,106,255,0.15); color: var(--accent); }

  /* TREE */
  .tree-wrap { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 24px; overflow-x: auto; }
  .tree-node { margin-left: 24px; }
  .tree-node-root { margin-left: 0; }

  .node-card {
    display: inline-flex; align-items: center; gap: 12px;
    background: var(--surface2); border: 1px solid var(--border);
    border-radius: 12px; padding: 12px 16px; margin: 6px 0;
    cursor: pointer; transition: all 0.2s; position: relative;
  }
  .node-card:hover { border-color: var(--accent); }
  .node-card.self { border-color: var(--accent); background: rgba(124,106,255,0.1); }
  .node-card.admin-node { border-color: var(--gold); background: rgba(255,208,102,0.05); }

  .node-avatar {
    width: 36px; height: 36px; border-radius: 50%;
    background: linear-gradient(135deg, var(--accent), var(--accent2));
    display: flex; align-items: center; justify-content: center;
    font-family: 'Syne', sans-serif; font-weight: 700; font-size: 14px; color: white;
    flex-shrink: 0;
  }

  .node-info .node-name { font-weight: 600; font-size: 14px; }
  .node-info .node-code { font-size: 11px; color: var(--accent); }
  .node-info .node-pv { font-size: 12px; color: var(--muted); margin-top: 2px; }

  .tree-children { border-left: 2px solid var(--border); margin-left: 18px; padding-left: 16px; }

  .toggle-btn {
    background: var(--surface); border: 1px solid var(--border); border-radius: 6px;
    padding: 2px 8px; font-size: 11px; cursor: pointer; color: var(--muted);
    transition: all 0.2s; margin-left: 8px;
  }
  .toggle-btn:hover { border-color: var(--accent); color: var(--accent); }

  /* PV FORM */
  .pv-form { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 24px; margin-bottom: 20px; }
  .pv-form h3 { font-family: 'Syne', sans-serif; font-weight: 700; margin-bottom: 16px; }
  .row { display: flex; gap: 12px; flex-wrap: wrap; }
  .row .field { flex: 1; min-width: 180px; }

  /* PV HISTORY */
  .pv-tag { 
    display: inline-block; padding: 4px 10px; border-radius: 20px;
    background: rgba(106,255,212,0.1); color: var(--accent3); font-size: 13px; font-weight: 600;
  }

  /* PROFILE */
  .profile-card { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 32px; max-width: 500px; }
  .profile-avatar {
    width: 72px; height: 72px; border-radius: 50%;
    background: linear-gradient(135deg, var(--accent), var(--accent2));
    display: flex; align-items: center; justify-content: center;
    font-family: 'Syne', sans-serif; font-weight: 800; font-size: 28px; color: white;
    margin-bottom: 20px;
  }
  .profile-name { font-family: 'Syne', sans-serif; font-size: 22px; font-weight: 800; }
  .profile-code { color: var(--accent); font-size: 14px; margin-bottom: 20px; }
  .info-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid var(--border); font-size: 14px; }
  .info-row:last-child { border-bottom: none; }
  .info-label { color: var(--muted); }
  .info-value { font-weight: 500; }

  select {
    width: 100%; padding: 12px 16px; background: var(--surface2);
    border: 1px solid var(--border); border-radius: 10px; color: var(--text);
    font-family: 'DM Sans', sans-serif; font-size: 14px; outline: none;
  }
  select:focus { border-color: var(--accent); }

  .empty { text-align: center; padding: 40px; color: var(--muted); font-size: 14px; }

  @media (max-width: 768px) {
    .sidebar { display: none; }
    .main { padding: 16px; }
    .cards { grid-template-columns: 1fr 1fr; }
  }
`;

// ============================================================
// TREE NODE COMPONENT
// ============================================================
function TreeNode({ node, currentUserId, depth = 0 }) {
  const [open, setOpen] = useState(depth < 2);
  const hasChildren = node.children && node.children.length > 0;
  const initials = node.fullName.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase();
  const isSelf = node.id === currentUserId;
  const isAdmin = node.role === "admin";

  return (
    <div className={depth === 0 ? "tree-node-root" : "tree-node"}>
      <div style={{ display: "flex", alignItems: "center" }}>
        <div className={`node-card ${isSelf ? "self" : ""} ${isAdmin ? "admin-node" : ""}`}>
          <div className="node-avatar">{initials}</div>
          <div className="node-info">
            <div className="node-name">
              {node.fullName} {isSelf && "👤"} {isAdmin && "👑"}
            </div>
            <div className="node-code">NAMBA: {node.memberNumber} | CODE: {node.code}</div>
            <div className="node-pv">
              PV Binafsi (Mwezi): <strong style={{ color: "#7c6aff" }}>{node.pv.thisMonth}</strong> &nbsp;|&nbsp;
              PV Binafsi (Jumla): <strong style={{ color: "#6affd4" }}>{node.pv.total}</strong>
            </div>
            <div className="node-pv">
              PV ya Team (Mwezi): <strong style={{ color: "#ffd066" }}>{node.teamPV.thisMonth}</strong> &nbsp;|&nbsp;
              PV ya Team (Jumla): <strong style={{ color: "#ff6a9b" }}>{node.teamPV.total}</strong> &nbsp;|&nbsp;
              Wanachama: <strong style={{ color: "#fff" }}>{node.teamPV.memberCount}</strong>
            </div>
          </div>
        </div>
        {hasChildren && (
          <button className="toggle-btn" onClick={() => setOpen(!open)}>
            {open ? "▲ Ficha" : `▼ Ona (${node.children.length})`}
          </button>
        )}
      </div>
      {hasChildren && open && (
        <div className="tree-children">
          {node.children.map((child) => (
            <TreeNode key={child.id} node={child} currentUserId={currentUserId} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// PAGES
// ============================================================

// Dashboard Page
function DashboardPage({ user, users, pvRecords }) {
  const personalPV = getUserPV(user.id, pvRecords);
  const teamPV = getTeamPV(user.id, users, pvRecords);
  const isAdmin = user.role === "admin";

  return (
    <div>
      <div className="page-title">Dashboard 📊</div>

      {/* Personal PV */}
      <div style={{ fontSize: 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>PV Yangu Binafsi</div>
      <div className="cards" style={{ marginBottom: 12 }}>
        <div className="card">
          <div className="card-label">PV Yangu - Mwezi Huu</div>
          <div className="card-value purple">{personalPV.thisMonth}</div>
        </div>
        <div className="card">
          <div className="card-label">Jumla ya PV Yangu</div>
          <div className="card-value green">{personalPV.total}</div>
        </div>
      </div>

      {/* Team PV */}
      <div style={{ fontSize: 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>PV ya Team Nzima (Wewe + Wanachama Wote)</div>
      <div className="cards" style={{ marginBottom: 28 }}>
        <div className="card">
          <div className="card-label">PV ya Team - Mwezi Huu</div>
          <div className="card-value gold">{teamPV.thisMonth}</div>
        </div>
        <div className="card">
          <div className="card-label">Jumla ya PV ya Team</div>
          <div className="card-value pink">{teamPV.total}</div>
        </div>
        <div className="card">
          <div className="card-label">{isAdmin ? "Wanachama Wote" : "Wanachama wa Team"}</div>
          <div className="card-value purple">{teamPV.memberCount}</div>
        </div>
      </div>

      <div className="pv-form">
        <h3>📋 Taarifa Zangu</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: 8 }}>
          <div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>Jina Kamili</div>
            <div style={{ fontWeight: 600 }}>{user.fullName}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>Namba ya Mwanachama</div>
            <div style={{ fontWeight: 600, color: "var(--gold)" }}>{user.memberNumber}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>Code Yangu (Wape Wengine)</div>
            <div style={{ fontWeight: 600, color: "var(--accent)" }}>{user.code}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>Namba ya Simu</div>
            <div style={{ fontWeight: 600 }}>{user.phone}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>Passport</div>
            <div style={{ fontWeight: 600 }}>{user.passport}</div>
          </div>
        </div>
        <div style={{ marginTop: 16, padding: "12px 16px", background: "rgba(124,106,255,0.1)", borderRadius: 10, fontSize: 13 }}>
          💡 <strong>Code yako ni: {user.code}</strong> — Wape watu wanaotaka kujiunga chini yako
        </div>
      </div>
    </div>
  );
}

// Team Tree Page
function TeamPage({ user, users, pvRecords }) {
  const isAdmin = user.role === "admin";
  const rootId = isAdmin ? user.id : user.id;
  const tree = buildTree(rootId, users, pvRecords);

  return (
    <div>
      <div className="page-title">Team Yangu 🌳</div>
      <div className="tree-wrap">
        {tree ? (
          <TreeNode node={tree} currentUserId={user.id} depth={0} />
        ) : (
          <div className="empty">Hakuna data ya team</div>
        )}
      </div>
    </div>
  );
}

// Admin - All Members
function MembersPage({ user, users, pvRecords, onRefresh }) {
  const [msg, setMsg] = useState("");
  const members = users.filter((u) => u.role !== "admin");

  const removeMember = (id) => {
    if (!window.confirm("Una uhakika unataka kumfuta mwanachama huyu?")) return;
    const updated = users.filter((u) => u.id !== id);
    DB.saveUsers(updated);
    // also remove their PV
    const pv = pvRecords.filter((p) => p.userId !== id);
    DB.savePV(pv);
    setMsg("Mwanachama amefutwa!");
    onRefresh();
  };

  return (
    <div>
      <div className="page-title">Wanachama Wote 👥</div>
      {msg && <div className="suc" style={{ marginBottom: 16 }}>{msg}</div>}
      <div className="table-wrap">
        <div className="table-head">
          <div className="table-title">Wanachama ({members.length})</div>
        </div>
        {members.length === 0 ? (
          <div className="empty">Hakuna wanachama bado</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Jina</th>
                <th>Namba ya Mwanachama</th>
                <th>Code</th>
                <th>Simu</th>
                <th>Passport</th>
                <th>Sponsor</th>
                <th>PV Mwezi</th>
                <th>PV Jumla</th>
                <th>Hatua</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => {
                const pv = getUserPV(m.id, pvRecords);
                const sponsor = users.find((u) => u.code === m.sponsorCode);
                return (
                  <tr key={m.id}>
                    <td>{m.fullName}</td>
                    <td><span style={{ color: "var(--gold)", fontWeight: 600 }}>{m.memberNumber}</span></td>
                    <td><span style={{ color: "var(--accent)", fontWeight: 600 }}>{m.code}</span></td>
                    <td>{m.phone}</td>
                    <td>{m.passport}</td>
                    <td>{sponsor ? sponsor.fullName : "—"}</td>
                    <td><span className="pv-tag">{pv.thisMonth}</span></td>
                    <td><span className="pv-tag">{pv.total}</span></td>
                    <td>
                      <button className="btn btn-danger btn-sm" onClick={() => removeMember(m.id)}>
                        Futa
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// Admin - Add PV
function AddPVPage({ users, pvRecords, onRefresh }) {
  const [selectedUser, setSelectedUser] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [history, setHistory] = useState(pvRecords);

  useEffect(() => { setHistory(DB.getPV()); }, [pvRecords]);

  const members = users.filter((u) => u.role !== "admin");

  const handleAdd = () => {
    setErr(""); setMsg("");
    if (!selectedUser) return setErr("Chagua mwanachama");
    if (!amount || isNaN(amount) || Number(amount) <= 0) return setErr("Weka PV sahihi");

    const record = {
      id: Date.now().toString(),
      userId: selectedUser,
      amount: Number(amount),
      note: note || "PV ya mauzo",
      date: new Date().toISOString(),
      addedBy: "admin",
    };
    const updated = [...DB.getPV(), record];
    DB.savePV(updated);
    setMsg(`PV ${amount} imeongezwa kwa mafanikio! ✅`);
    setAmount("");
    setNote("");
    setHistory(updated);
    onRefresh();
  };

  const user = users.find((u) => u.id === selectedUser);
  const pv = user ? getUserPV(user.id, history) : null;

  return (
    <div>
      <div className="page-title">Ongeza PV ➕</div>
      <div className="pv-form">
        <h3>Jaza PV kwa Mwanachama</h3>
        <div className="row">
          <div className="field" style={{ flex: 2 }}>
            <label>Chagua Mwanachama</label>
            <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)}>
              <option value="">-- Chagua --</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.fullName} ({m.code})</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Kiasi cha PV</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Mfano: 100" />
          </div>
        </div>
        <div className="field">
          <label>Maelezo (Optional)</label>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Mfano: Mauzo ya Cream" />
        </div>

        {user && pv && (
          <div style={{ padding: "12px 16px", background: "var(--surface2)", borderRadius: 10, fontSize: 13, marginBottom: 12 }}>
            <strong>{user.fullName}</strong> — PV Mwezi Huu: <strong style={{ color: "var(--accent)" }}>{pv.thisMonth}</strong> | Jumla: <strong style={{ color: "var(--accent3)" }}>{pv.total}</strong>
          </div>
        )}

        {err && <div className="err">{err}</div>}
        {msg && <div className="suc">{msg}</div>}
        <button className="btn btn-success" style={{ width: "auto", padding: "12px 32px" }} onClick={handleAdd}>
          Ongeza PV ✅
        </button>
      </div>

      <div className="table-wrap">
        <div className="table-head">
          <div className="table-title">Historia ya PV</div>
        </div>
        {history.length === 0 ? (
          <div className="empty">Hakuna rekodi bado</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Mwanachama</th>
                <th>PV</th>
                <th>Maelezo</th>
                <th>Tarehe</th>
              </tr>
            </thead>
            <tbody>
              {[...history].reverse().map((r) => {
                const u = users.find((u) => u.id === r.userId);
                return (
                  <tr key={r.id}>
                    <td>{u ? u.fullName : "—"}</td>
                    <td><span className="pv-tag">+{r.amount}</span></td>
                    <td>{r.note}</td>
                    <td>{new Date(r.date).toLocaleDateString("sw-TZ")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// Full Network Tree (Admin)
function NetworkPage({ users, pvRecords, currentUser }) {
  const admin = users.find((u) => u.role === "admin");
  if (!admin) return <div className="empty">Hakuna data</div>;
  const tree = buildTree(admin.id, users, pvRecords);

  return (
    <div>
      <div className="page-title">Network Yote 🌐</div>
      <div className="tree-wrap">
        {tree ? (
          <TreeNode node={tree} currentUserId={currentUser.id} depth={0} />
        ) : (
          <div className="empty">Hakuna wanachama</div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// AUTH FORMS
// ============================================================
function LoginForm({ onLogin }) {
  const [memberNumber, setMemberNumber] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  const handleLogin = () => {
    setErr("");
    const users = DB.getUsers();
    // Admin logs in with special admin number "ADMIN"
    const user = users.find(
      (u) => u.memberNumber === memberNumber.toUpperCase() && u.password === password
    );
    if (!user) return setErr("Namba ya Mwanachama au Password si sahihi");
    DB.setCurrentUser(user);
    onLogin(user);
  };

  return (
    <div>
      <div className="field">
        <label>Namba ya Mwanachama</label>
        <input
          value={memberNumber}
          onChange={(e) => setMemberNumber(e.target.value)}
          placeholder="Mfano: MEM001 au ADMIN"
        />
      </div>
      <div className="field">
        <label>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
      </div>
      {err && <div className="err">{err}</div>}
      <button className="btn" onClick={handleLogin}>Ingia</button>
      <div style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: "var(--muted)" }}>
        Admin: Namba <strong>1214387</strong> / Password: <strong>admin123</strong>
      </div>
    </div>
  );
}

function RegisterForm() {
  const [form, setForm] = useState({
    fullName: "",
    memberNumber: "",
    phone: "",
    passport: "",
    password: "",
    confirmPassword: "",
    sponsorCode: "",
  });
  const [err, setErr] = useState("");
  const [suc, setSuc] = useState("");

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleRegister = () => {
    setErr(""); setSuc("");
    const { fullName, memberNumber, phone, passport, password, confirmPassword, sponsorCode } = form;

    if (!fullName || !memberNumber || !phone || !passport || !password || !confirmPassword || !sponsorCode)
      return setErr("Jaza sehemu zote");

    if (password !== confirmPassword)
      return setErr("Password hazifanani");

    if (password.length < 6)
      return setErr("Password iwe na herufi 6 au zaidi");

    const users = DB.getUsers();

    if (users.find((u) => u.memberNumber === memberNumber.toUpperCase()))
      return setErr("Namba ya Mwanachama hii tayari ipo");

    if (users.find((u) => u.passport === passport.toUpperCase()))
      return setErr("Namba ya Passport hii tayari ipo");

    const sponsor = users.find((u) => u.code === sponsorCode.toUpperCase());
    if (!sponsor) return setErr("Code ya Sponsor si sahihi — angalia upya");

    const newUser = {
      id: "usr_" + Date.now(),
      fullName,
      memberNumber: memberNumber.toUpperCase(),
      phone,
      passport: passport.toUpperCase(),
      password,
      sponsorCode: sponsorCode.toUpperCase(),
      code: generateCode(fullName),
      role: "member",
      joinDate: new Date().toISOString(),
    };

    DB.saveUsers([...users, newUser]);
    setSuc(`Umesajiliwa! Ingia kwa Namba: ${newUser.memberNumber} ✅`);
    setForm({ fullName: "", memberNumber: "", phone: "", passport: "", password: "", confirmPassword: "", sponsorCode: "" });
  };

  return (
    <div>
      <div className="row">
        <div className="field">
          <label>Jina Kamili</label>
          <input value={form.fullName} onChange={(e) => set("fullName", e.target.value)} placeholder="John Doe" />
        </div>
        <div className="field">
          <label>Namba ya Mwanachama</label>
          <input value={form.memberNumber} onChange={(e) => set("memberNumber", e.target.value)} placeholder="Mfano: MEM001" />
        </div>
      </div>
      <div className="row">
        <div className="field">
          <label>Namba ya Simu</label>
          <input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="0700000000" />
        </div>
        <div className="field">
          <label>Namba ya Passport</label>
          <input value={form.passport} onChange={(e) => set("passport", e.target.value)} placeholder="A1234567" />
        </div>
      </div>
      <div className="field">
        <label>Code ya Sponsor (aliyekuleta)</label>
        <input value={form.sponsorCode} onChange={(e) => set("sponsorCode", e.target.value)} placeholder="Mfano: GEBO0001" />
      </div>
      <div className="row">
        <div className="field">
          <label>Password</label>
          <input type="password" value={form.password} onChange={(e) => set("password", e.target.value)} placeholder="••••••••" />
        </div>
        <div className="field">
          <label>Thibitisha Password</label>
          <input type="password" value={form.confirmPassword} onChange={(e) => set("confirmPassword", e.target.value)} placeholder="••••••••" />
        </div>
      </div>
      {err && <div className="err">{err}</div>}
      {suc && <div className="suc">{suc}</div>}
      <button className="btn" onClick={handleRegister}>Jisajili</button>
    </div>
  );
}

// ============================================================
// MAIN APP
// ============================================================
export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [pvRecords, setPvRecords] = useState([]);
  const [page, setPage] = useState("dashboard");
  const [authTab, setAuthTab] = useState("login");

  useEffect(() => {
    initAdmin();
    const u = DB.getCurrentUser();
    if (u) setCurrentUser(u);
    refresh();
  }, []);

  const refresh = () => {
    setUsers(DB.getUsers());
    setPvRecords(DB.getPV());
  };

  const handleLogin = (user) => {
    setCurrentUser(user);
    refresh();
  };

  const handleLogout = () => {
    DB.logout();
    setCurrentUser(null);
    setPage("dashboard");
  };

  const isAdmin = currentUser?.role === "admin";

  const adminNav = [
    { id: "dashboard", icon: "📊", label: "Dashboard" },
    { id: "network", icon: "🌐", label: "Network Yote" },
    { id: "members", icon: "👥", label: "Wanachama" },
    { id: "addpv", icon: "➕", label: "Ongeza PV" },
  ];

  const memberNav = [
    { id: "dashboard", icon: "📊", label: "Dashboard" },
    { id: "team", icon: "🌳", label: "Team Yangu" },
  ];

  const nav = isAdmin ? adminNav : memberNav;

  if (!currentUser) {
    return (
      <>
        <style>{styles}</style>
        <div className="auth-wrap">
          <div className="auth-box">
            <div className="auth-logo">GEBO NETWORK</div>
            <div className="auth-sub">Digital Marketing Platform</div>
            <div className="tabs">
              <button className={`tab ${authTab === "login" ? "active" : ""}`} onClick={() => setAuthTab("login")}>Ingia</button>
              <button className={`tab ${authTab === "register" ? "active" : ""}`} onClick={() => setAuthTab("register")}>Jisajili</button>
            </div>
            {authTab === "login"
              ? <LoginForm onLogin={handleLogin} onSwitch={() => setAuthTab("register")} />
              : <RegisterForm onLogin={handleLogin} onSwitch={() => setAuthTab("login")} />
            }
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{styles}</style>
      <div className="app">
        <div className="layout">
          <div className="sidebar">
            <div className="sidebar-logo">GEBO NETWORK</div>
            {nav.map((n) => (
              <div
                key={n.id}
                className={`nav-item ${page === n.id ? "active" : ""}`}
                onClick={() => setPage(n.id)}
              >
                <span className="nav-icon">{n.icon}</span>
                {n.label}
              </div>
            ))}
            <div className="sidebar-bottom">
              <div className="user-chip">
                <div className="name">{currentUser.fullName}</div>
                <div className="code">{currentUser.code}</div>
                <div className="role">{isAdmin ? "👑 Admin" : "🔵 Member"}</div>
              </div>
              <button className="btn btn-outline" style={{ width: "100%", padding: "10px", fontSize: 13 }} onClick={handleLogout}>
                Toka ↗
              </button>
            </div>
          </div>

          <div className="main">
            {page === "dashboard" && <DashboardPage user={currentUser} users={users} pvRecords={pvRecords} />}
            {page === "team" && !isAdmin && <TeamPage user={currentUser} users={users} pvRecords={pvRecords} />}
            {page === "network" && isAdmin && <NetworkPage users={users} pvRecords={pvRecords} currentUser={currentUser} />}
            {page === "members" && isAdmin && <MembersPage user={currentUser} users={users} pvRecords={pvRecords} onRefresh={refresh} />}
            {page === "addpv" && isAdmin && <AddPVPage users={users} pvRecords={pvRecords} onRefresh={refresh} />}
          </div>
        </div>
      </div>
    </>
  );
}
