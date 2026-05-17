/* ================================================================
   Dashboard — App Logic
   File: dashboard/app.js
================================================================ */

/* ── KONFIGURASI APLIKASI ────────────────────────────────────────
   Ubah bagian ini untuk setiap aplikasi.
──────────────────────────────────────────────────────────────── */
const APP_CONFIG = {
  name:      'Dashboard',  // Nama aplikasi
  baseColor: '#1e3a5f',  // Warna dasar brand aplikasi (hex)
  user: {
    name:     '[Nama Pengguna]',    // Dari session / auth
    role:     '[Peran / Jabatan]',
    initials: 'AD',                 // 2 huruf untuk avatar
  },
};


/* ── THEME GENERATOR ─────────────────────────────────────────────
   Generate semua CSS token brand dari satu warna dasar.
──────────────────────────────────────────────────────────────── */

function hexToHSL(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = n => {
    const k = (n + h / 30) % 12;
    return Math.round(255 * (l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)))
      .toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

function setAppTheme(baseColor) {
  const [h, s, l] = hexToHSL(baseColor);
  const ri = parseInt(baseColor.slice(1, 3), 16);
  const gi = parseInt(baseColor.slice(3, 5), 16);
  const bi = parseInt(baseColor.slice(5, 7), 16);

  const tokens = {
    '--color-brand':         baseColor,
    '--color-brand-default': baseColor,
    '--color-brand-dark':    hslToHex(h, s,                      clamp(l - 10,  5,  90)),
    '--color-brand-darker':  hslToHex(h, s,                      clamp(l - 20,  3,  80)),
    '--color-brand-light':   hslToHex(h, clamp(s - 30, 10, 80),  clamp(l + 40, 85,  97)),
    '--color-brand-mid':     hslToHex(h, clamp(s - 15, 15, 85),  clamp(l + 18, 50,  80)),
    '--color-brand-text':    baseColor,
    '--color-brand-accent':  hslToHex(h, clamp(s + 10, 50, 100), clamp(l + 5,  30,  65)),
    '--color-brand-rgb':     `${ri}, ${gi}, ${bi}`,
  };

  const root = document.documentElement;
  Object.entries(tokens).forEach(([k, v]) => root.style.setProperty(k, v));
  return tokens;
}


/* ── INISIALISASI ────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', function () {

  /* 1. Terapkan warna tema aplikasi */
  setAppTheme(APP_CONFIG.baseColor);

  /* 2. Isi info pengguna */
  const u = APP_CONFIG.user;
  const setTextById = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  setTextById('userDropdownName',     u.name);
  setTextById('userDropdownRole',     u.role);
  setTextById('topbarAvatarInitials', u.initials);
  document.title = APP_CONFIG.name + ' - ' + document.title;

  /* 3. Sidebar — sinkronkan margin wrapper saat collapse/expand */
  const sidebarEl    = document.getElementById('mainSidebar');
  const appWrapper   = document.getElementById('appWrapper');
  const sidebarOverlay = document.getElementById('sidebarOverlay');

  const sidebar = new Fondasi.Sidebar(sidebarEl, {
    onChange: ({ isCollapsed }) => {
      appWrapper.classList.toggle('sidebar-is-collapsed', isCollapsed);
    },
  });

  /* 4. Komponen lain */
  const tabs         = new Fondasi.Tabs(document.getElementById('mainTabs'));
  const filterDrawer = new Fondasi.Drawer(document.getElementById('filterDrawer'));
  const detailModal  = new Fondasi.Modal(document.getElementById('detailModal'));
  const formModal    = new Fondasi.Modal(document.getElementById('formModal'));
  const toast        = new Fondasi.ToastManager({ position: 'top-right' });

  /* 5. Semua dropdown (notifikasi, user, filter tabel) */
  document.querySelectorAll('.dropdown').forEach(el => new Fondasi.Dropdown(el));

  /* 6. Mobile: toggle sidebar via topbar button */
  const mobileSidebarBtn = document.getElementById('mobileSidebarToggle');

  function syncMobileBtn() {
    const isMobile = window.innerWidth < 1024;
    if (mobileSidebarBtn) {
      mobileSidebarBtn.style.display = isMobile ? 'flex' : 'none';
    }
  }
  syncMobileBtn();
  window.addEventListener('resize', syncMobileBtn);

  if (mobileSidebarBtn) {
    mobileSidebarBtn.addEventListener('click', () => {
      sidebarEl.classList.toggle('sidebar-open');
      sidebarOverlay.classList.toggle('sidebar-overlay-open');
    });
  }

  if (sidebarOverlay) {
    sidebarOverlay.addEventListener('click', () => {
      sidebarEl.classList.remove('sidebar-open');
      sidebarOverlay.classList.remove('sidebar-overlay-open');
    });
  }

  /* 7. Tombol Profil di sidebar footer */
  const btnProfile = document.getElementById('btnProfile');
  if (btnProfile) {
    btnProfile.addEventListener('click', () => {
      // Arahkan ke halaman profil atau buka modal profil
      toast.show({ type: 'info', message: 'Halaman profil belum dikonfigurasi.' });
    });
  }

  /* 8. Tombol Logout di sidebar footer */
  const btnLogout = document.getElementById('btnLogout');
  if (btnLogout) {
    btnLogout.addEventListener('click', () => {
      // Tambahkan logika logout di sini (redirect, clear session, dll.)
      toast.show({ type: 'warning', title: 'Keluar', message: 'Sesi Anda akan diakhiri...' });
    });
  }

  /* 9. Refresh */
  const btnRefresh = document.getElementById('btnRefresh');
  if (btnRefresh) {
    btnRefresh.addEventListener('click', () => {
      toast.show({ type: 'info', title: 'Memuat ulang', message: 'Data sedang diperbarui...' });
    });
  }

  /* 10. Simpan form */
  const btnSimpan = document.getElementById('btnSimpan');
  if (btnSimpan) {
    btnSimpan.addEventListener('click', () => {
      const form = document.getElementById('dataForm');
      const nama = form ? form.querySelector('[name="nama"]').value.trim() : '';
      if (!nama) {
        toast.show({ type: 'danger', title: 'Validasi gagal', message: 'Nama tidak boleh kosong.' });
        return;
      }
      formModal.close();
      toast.show({ type: 'success', title: 'Berhasil disimpan', message: `Data "${nama}" berhasil ditambahkan.` });
      form.reset();
    });
  }

  /* 11. DataTable — init dengan fitur lengkap */
  const tableWrapEl = document.getElementById('tableWrap');
  let mainTable = null;

  if (tableWrapEl) {
    mainTable = new Fondasi.DataTable(tableWrapEl, {
      sortable:   true,
      selectable: true,
      paginate:   true,
      pageSize:   3,
      expandable: true,

      // Bulk actions handler
      onBulk: ({ action, selected }) => {
        if (action === 'export') {
          mainTable.exportCSV('[APP_NAME]-data.csv');
          toast.show({ type: 'success', title: 'Ekspor berhasil', message: `${selected.length} baris diekspor ke CSV.` });
        }
        if (action === 'delete') {
          toast.show({ type: 'danger', title: 'Hapus data', message: `${selected.length} baris akan dihapus. (demo)` });
        }
      },

      onSort: ({ col, dir }) => {
        // opsional: sync breadcrumb atau update URL
      },
    });
  }

  /* 12. Ekspor semua data yang tampil */
  const btnExport = document.getElementById('btnExport');
  if (btnExport) {
    btnExport.addEventListener('click', () => {
      if (mainTable) {
        mainTable.exportCSV('[APP_NAME]-data.csv');
        toast.show({ type: 'success', title: 'Ekspor berhasil', message: 'Data berhasil diekspor ke CSV.' });
      }
    });
  }

});
