
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js';
import { getAnalytics } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-analytics.js';
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  getDoc,
  onSnapshot,
} from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js';

/* =========================================================
   Firebase Configuration
   ---------------------------------------------------------
   - ตั้งค่าการเชื่อมต่อ Firebase Project
   - ใช้ข้อมูลโปรเจกต์เดียวกับที่คุณให้มา
========================================================= */
const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
const authDomain = currentHost === 'localhost' || currentHost === '127.0.0.1' || currentHost === '[::1]'
  ? 'localhost'
  : 'mold-management-439a8.firebaseapp.com';

const firebaseConfig = {
  apiKey: 'AIzaSyCTN4mGAL35Nm_lpBkn8G7pZnZsRqlO_UU',
  authDomain,
  projectId: 'mold-management-439a8',
  storageBucket: 'mold-management-439a8.firebasestorage.app',
  messagingSenderId: '510438136864',
  appId: '1:510438136864:web:923ac4505b061ca7cc7045',
  measurementId: 'G-XC9FPDB8H1',
};

/* =========================================================
   Firebase Initialization
   ---------------------------------------------------------
   - initializeApp() : สร้าง instance ของ Firebase App
   - getAnalytics()  : เปิดใช้งาน Analytics (ถ้า environment รองรับ)
   - getFirestore()  : เปิดใช้งาน Cloud Firestore
========================================================= */
const firebaseApp = initializeApp(firebaseConfig);
let analytics = null;
try {
  analytics = getAnalytics(firebaseApp);
} catch (error) {
  // Analytics อาจไม่ทำงานในบาง environment เช่น local file หรือ browser policy บางแบบ
  console.warn('Firebase Analytics is not available in this environment:', error?.message || error);
}

const db = getFirestore(firebaseApp);

/* =========================================================
   Toggle Mode
   ---------------------------------------------------------
   - true  = ใช้ Firestore ฝั่ง client โดยตรง
   - false = ยิงผ่าน backend API ตาม URL ที่กำหนด
   ตอนนี้ตั้งเป็น true เพื่อให้หน้าเว็บ Real-time กับ Firestore
========================================================= */
const useFirebaseClient = true;

/* =========================================================
   API Route Map
   ---------------------------------------------------------
   ทำไว้เพื่อให้หน้า HTML เรียกผ่าน window.API ได้ง่าย
========================================================= */
const API = {
  molds: '/api/molds',
  kpi: '/api/molds/kpi/summary',
  cleanings: '/api/cleanings',
  issues: '/api/quality/issues',
  qualityPass: '/api/quality/pass',
};

/* =========================================================
   Utility Functions (ทั่วไป)
========================================================= */

/** คืนค่าเวลาในรูปแบบ ISO string */
const now = () => new Date().toISOString();

/** สร้าง id แบบง่ายด้วย prefix + timestamp */
const nextId = (prefix) => `${prefix}-${Date.now()}`;

/**
 * แปลง body จาก options ให้อยู่ในรูป object
 * รองรับทั้งกรณีส่งมาเป็น string JSON หรือส่งมาเป็น object ตรง ๆ
 */
const parseBody = (options) => {
  if (!options || !options.body) return {};
  return typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
};

/**
 * แปลง URL เพื่ออ่าน pathname และ query parameters
 * ตัวอย่าง:
 *   /api/molds?status=waiting_qcd
 * จะได้
 *   pathname = /api/molds
 *   params   = { status: 'waiting_qcd' }
 */
const parseUrl = (url) => {
  const base = location.origin === 'null' ? location.href : location.origin;
  const u = new URL(url, base);

  return {
    pathname: u.pathname,
    params: Object.fromEntries(u.searchParams.entries()),
  };
};

/* =========================================================
   Firestore Basic Helpers
========================================================= */

/**
 * ดึงข้อมูลทั้ง collection
 * หมายเหตุ:
 * - คืนค่าเฉพาะ doc.data()
 * - id ของ document ต้องถูกเก็บอยู่ใน field `id` ของ document เอง
 */
const getCollection = async (name) => {
  const snapshot = await getDocs(collection(db, name));
  return snapshot.docs.map((docSnap) => docSnap.data());
};

/** ดึงข้อมูล document เดี่ยวตาม id */
const getDocData = async (collectionName, id) => {
  const snapshot = await getDoc(doc(db, collectionName, id));
  return snapshot.exists() ? snapshot.data() : null;
};

/** สร้าง document ใหม่ */
const createDoc = async (collectionName, id, data) => {
  await setDoc(doc(db, collectionName, id), data);
  return data;
};

/** อัปเดต document และอ่านค่ากลับมาอีกครั้ง */
const updateDocData = async (collectionName, id, data) => {
  const ref = doc(db, collectionName, id);
  await updateDoc(ref, data);
  const updated = await getDoc(ref);
  return updated.data();
};

/* =========================================================
   Data Normalization
   ---------------------------------------------------------
   ใช้เพื่อให้ template เก่าที่ยังอ้าง field ชื่อ Problem ทำงานได้
========================================================= */
const normalizeMoldRow = (row) => ({
  ...row,
  Problem: row.Problem || row.item || row.problem,
});

function isWithinDateRange(value, startDate, endDate) {
  const candidate = parseDateInput(value);
  if (!candidate || Number.isNaN(candidate.getTime())) return false;

  if (startDate) {
    const start = new Date(`${startDate}T00:00:00`);
    if (candidate < start) return false;
  }

  if (endDate) {
    const end = new Date(`${endDate}T23:59:59.999`);
    if (candidate > end) return false;
  }

  return true;
}

function filterByDateRange(rows, startDate, endDate, fields = ['created_at', 'updated_at']) {
  if (!startDate && !endDate) return rows;

  return rows.filter((row) => fields.some((field) => isWithinDateRange(row[field], startDate, endDate)));
}

/* =========================================================
   Mold Logic
========================================================= */

/**
 * ดึง molds ทั้งหมด
 * รองรับ filter แบบ client-side ผ่าน params.status / params.department
 */
const getMolds = async (params = {}) => {
  let rows = await getCollection('molds');

  if (params.status) {
    rows = rows.filter((r) => r.status === params.status);
  }

  if (params.department) {
    rows = rows.filter((r) => r.current_department === params.department);
  }

  rows = rows.map(normalizeMoldRow);
  rows.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

  return rows;
};

/**
 * สร้าง mold ใหม่จากข้อมูลหน้า PDD
 * รองรับทั้งชื่อ field: item / problem / Problem
 */
const createMold = async (body) => {
  const itemValue = body.item || body.problem || body.Problem;
  const jobNumber = body['Job Number'] || body.job_number || body.jobNumber || '';
  const dueDate = body.due_date || body.dueDate || '';

  if (!itemValue || !jobNumber || !body.mold_no || !body.usage_date || !body.operator_name || !dueDate) {
    throw new Error('Problem, Job Number, mold_no, usage_date, operator_name, due_date are required');
  }

  const rec = {
    id: nextId('MOLD'),
    item: itemValue,
    Problem: itemValue,
    'Job Number': jobNumber,
    job_number: jobNumber,
    mold_no: body.mold_no,
    usage_date: body.usage_date,
    due_date: dueDate,
    operator_name: body.operator_name,
    status: 'waiting_qcd',
    current_department: 'QCD',
    created_at: now(),
    updated_at: now(),
    has_issue: false,
    issue_unresolved: false,
    pdd_remarks: body.remarks || '-',
    remarks: body.remarks || '-',
  };

  await createDoc('molds', rec.id, rec);
  return rec;
};

/** อัปเดตสถานะ/ข้อมูล mold */
const updateMoldStatus = async (id, body) => {
  const updated = await updateDocData('molds', id, {
    ...body,
    updated_at: now(),
  });
  return updated;
};

/* =========================================================
   Dashboard Summary
   ---------------------------------------------------------
   เผื่อหน้า Dashboard เดิมยังเรียกใช้อยู่ จะยังทำงานต่อได้
========================================================= */
const getDashboardSummary = async (params = {}) => {
  const startDate = params.startDate || '';
  const endDate = params.endDate || '';
  const molds = filterByDateRange(await getMolds(), startDate, endDate, ['created_at', 'updated_at', 'usage_date', 'due_date']);
  const cleanings = filterByDateRange(await getCollection('cleanings'), startDate, endDate, ['created_at', 'start_time', 'end_time']);
  const issues = filterByDateRange(await getCollection('issues'), startDate, endDate, ['created_at', 'resolved_at']);

  const totalMolds = molds.length;
  const waitingQcd = molds.filter((m) => m.status === 'waiting_qcd').length;
  const waitingQcdDebug = molds.filter((m) => m.status === 'waiting_qcd_debug').length;
  const waitingQad = molds.filter((m) => m.status === 'waiting_qad').length;
  const cleaning = molds.filter((m) => m.status === 'cleaning').length;
  const done = molds.filter((m) => m.status === 'done').length;

  const doneToday = cleanings.filter((c) => c.status === 'done').length;
  const openIssues = issues.filter((i) => i.status === 'open').length;
  const failedFix = issues.filter((i) => i.status === 'failed_fix').length;

  const avgCleaning = cleanings.length
    ? Math.round(cleanings.reduce((sum, c) => sum + (+c.total_minutes || 0), 0) / cleanings.length)
    : 0;

  const qualityRate = totalMolds
    ? Math.max(0, Math.round(((done + waitingQad) / totalMolds) * 100))
    : 0;

  const availabilityRate = totalMolds
    ? Math.max(0, Math.round(((totalMolds - failedFix) / totalMolds) * 100))
    : 0;

  const performanceRate = avgCleaning
    ? Math.max(0, Math.min(100, Math.round((72.52 / avgCleaning) * 100))) //217.57 หาร 3 WI
    : 100;

  const oee = Math.round((availabilityRate * performanceRate * qualityRate) / 10000);

  return {
    kpis: {
      totalMolds,
      waitingQcd,
      waitingQcdDebug,
      waitingQad,
      cleaning,
      done,
      doneToday,
      openIssues,
      failedFix,
      avgCleaning,
      qualityRate,
      availabilityRate,
      performanceRate,
      oee,
    },
    charts: {
      statusCount: {
        waiting_qcd: waitingQcd,
        waiting_qcd_debug: waitingQcdDebug,
        waiting_qad: waitingQad,
        cleaning,
        done,
        failed_fix: failedFix,
      },
      deptLabels: ['PDD', 'QCD', 'QAD'],
      deptSeries: [
        molds.filter((m) => m.current_department === 'PDD').length,
        molds.filter((m) => m.current_department === 'QCD').length,
        molds.filter((m) => m.current_department === 'QAD').length,
      ],
    },
    failedList: issues
      .filter((i) => i.status === 'failed_fix')
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    liveBoard: molds
      .slice()
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
      .slice(0, 8),
    lastUpdated: now(),
  };
};

/* =========================================================
   Cleaning Logic
========================================================= */
const getCleanings = async (params = {}) => {
  const rows = filterByDateRange(await getCollection('cleanings'), params.startDate || '', params.endDate || '', ['created_at', 'start_time', 'end_time']);
  rows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return rows;
};

const createCleaning = async (body) => {
  if (!body.mold_id || !body.mold_no || !body.tank_size || !body.cleaner_name || !body.start_time || !body.end_time) {
    throw new Error('mold_id, mold_no, tank_size, cleaner_name, start_time, end_time are required');
  }

  const totalMinutes = Math.max(0, Math.round((new Date(body.end_time) - new Date(body.start_time)) / 60000));

  const rec = {
    id: nextId('CLN'),
    mold_id: body.mold_id,
    mold_no: body.mold_no,
    tank_size: body.tank_size,
    cleaner_name: body.cleaner_name,
    start_date: body.start_time.slice(0, 10),
    start_time: body.start_time,
    end_time: body.end_time,
    total_minutes: totalMinutes,
    remark: body.remark || '-',
    status: 'done',
    created_at: now(),
  };

  await createDoc('cleanings', rec.id, rec);

  const mold = await getDocData('molds', body.mold_id);
  if (mold) {
    await updateDoc(doc(db, 'molds', body.mold_id), {
      status: 'done',
      current_department: 'QAD',
      updated_at: now(),
      remarks: body.remark || mold.remarks,
    });
  }

  return rec;
};

/* =========================================================
   Issue Logic
========================================================= */
const getIssues = async (params = {}) => {
  let rows = filterByDateRange(await getCollection('issues'), params.startDate || '', params.endDate || '', ['created_at', 'resolved_at']);

  if (params.status) {
    rows = rows.filter((r) => r.status === params.status);
  }

  rows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return rows;
};

const createIssue = async (body) => {
  if (!body.mold_id || !body.mold_no || !body.issue_detail || !body.reported_by) {
    throw new Error('mold_id, mold_no, issue_detail, reported_by are required');
  }

  const rec = {
    id: nextId('ISS'),
    mold_id: body.mold_id,
    mold_no: body.mold_no,
    issue_detail: body.issue_detail,
    severity: body.severity || 'Medium',
    reported_by: body.reported_by,
    action: body.action || '-',
    status: body.status || 'open',
    created_at: now(),
    resolved_at: null,
    owner: 'QC Control',
  };

  await createDoc('issues', rec.id, rec);

  const mold = await getDocData('molds', body.mold_id);
  if (mold) {
    await updateDoc(doc(db, 'molds', body.mold_id), {
      current_department: 'QCD',
      has_issue: true,
      issue_unresolved: true,
      updated_at: now(),
      remarks: body.issue_detail,
      status: rec.status === 'failed_fix' ? 'failed_fix' : 'waiting_qcd_debug',
    });
  }

  return rec;
};

const updateIssue = async (id, body) => {
  const issueRef = doc(db, 'issues', id);
  const updatePayload = {};

  if (body.action !== undefined) updatePayload.action = body.action;
  if (body.status !== undefined) updatePayload.status = body.status;
  if (body.status === 'resolved') updatePayload.resolved_at = now();

  await updateDoc(issueRef, updatePayload);

  const issue = await getDocData('issues', id);
  if (!issue) throw new Error('Issue not found');

  const mold = await getDocData('molds', issue.mold_id);
  if (mold) {
    if (issue.status === 'resolved') {
      await updateDoc(doc(db, 'molds', issue.mold_id), {
        status: 'waiting_qad',
        current_department: 'QAD',
        issue_unresolved: false,
        updated_at: now(),
        remarks: body.action || 'QC release',
      });
    } else if (issue.status === 'failed_fix') {
      await updateDoc(doc(db, 'molds', issue.mold_id), {
        status: 'failed_fix',
        current_department: 'QCD',
        issue_unresolved: true,
        updated_at: now(),
        remarks: body.action || 'Failed fix',
      });
    }
  }

  return issue;
};

/* =========================================================
   QC Pass Logic
========================================================= */
const passMold = async (body) => {
  const mold = await getDocData('molds', body.mold_id);
  if (!mold) throw new Error('Mold not found');

  const updated = {
    ...mold,
    status: 'waiting_qad',
    current_department: 'QAD',
    has_issue: false,
    issue_unresolved: false,
    updated_at: now(),
    remarks: 'QC Pass',
  };

  await setDoc(doc(db, 'molds', body.mold_id), updated);
  return updated;
};

/* =========================================================
   API Router
   ---------------------------------------------------------
   ทำหน้าที่เลียนแบบ REST API แต่เรียก Firestore โดยตรง
========================================================= */
async function api(url, options = {}) {
  if (!useFirebaseClient) {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(err.message || 'Request failed');
    }

    return res.json();
  }

  const { pathname, params } = parseUrl(url);
  const method = (options.method || 'GET').toUpperCase();
  const body = parseBody(options);

  if (pathname === '/api/molds' && method === 'GET') return getMolds(params);
  if (pathname === '/api/molds' && method === 'POST') return createMold(body);
  if (pathname === '/api/molds/kpi/summary') return getDashboardSummary(params);

  if (pathname.startsWith('/api/molds/') && pathname.endsWith('/status') && method === 'PATCH') {
    const id = pathname.split('/')[3];
    return updateMoldStatus(id, body);
  }

  if (pathname === '/api/cleanings' && method === 'GET') return getCleanings(params);
  if (pathname === '/api/cleanings' && method === 'POST') return createCleaning(body);

  if (pathname === '/api/quality/issues' && method === 'GET') return getIssues(params);
  if (pathname === '/api/quality/issues' && method === 'POST') return createIssue(body);

  if (pathname.startsWith('/api/quality/issues/') && method === 'PATCH') {
    const id = pathname.split('/')[4];
    return updateIssue(id, body);
  }

  if (pathname === '/api/quality/pass' && method === 'POST') return passMold(body);

  throw new Error(`Unsupported API route ${method} ${pathname}`);
}

/* =========================================================
   DOM / UI Helpers
========================================================= */
function el(q) {
  return document.querySelector(q);
}

function parseDateInput(dateInput) {
  if (!dateInput) return null;
  if (dateInput instanceof Date) return dateInput;
  if (typeof dateInput === 'string' || typeof dateInput === 'number') {
    return new Date(dateInput);
  }
  if (typeof dateInput.toDate === 'function') {
    return dateInput.toDate();
  }
  if (typeof dateInput.seconds === 'number') {
    return new Date(dateInput.seconds * 1000 + Math.floor((dateInput.nanoseconds || 0) / 1000000));
  }
  if (typeof dateInput._seconds === 'number') {
    return new Date(dateInput._seconds * 1000 + Math.floor((dateInput._nanoseconds || 0) / 1000000));
  }
  return null;
}

function normalizeDateTimeInput(value) {
  const date = parseDateInput(value);
  if (!date || Number.isNaN(date.getTime())) return '';
  return date.toISOString();
}

function formatDateTime(dateInput) {
  const d = parseDateInput(dateInput);
  if (!d || Number.isNaN(d.getTime())) return '-';

  const pad = (value) => String(value).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function formatDueDate(v) {
  if (!v) return '-';
  const d = parseDateInput(v);
  if (!d || Number.isNaN(d.getTime())) return v;
  const pad = (value) => String(value).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function isDueUrgent(v) {
  if (!v) return false;
  const due = parseDateInput(v);
  if (!due || Number.isNaN(due.getTime())) return false;
  const now = new Date();
  const deadline = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  return due.getTime() <= deadline.getTime();
}

function dueDateBadge(v) {
  if (!v) return '-';
  const label = formatDateTime(v);
  return isDueUrgent(v)
    ? `<span class="status-pill status-failed_fix">ด่วน ${label}</span>`
    : label;
}

function statusText(status, remarks = '') {
  // ✅ ใช้ remarks เป็น source เดียว
  if ((status === 'pending' || status === 'failed_fix') && remarks && remarks !== '-') {
    return remarks;
  }

  return (
    {
      waiting_qcd: 'รอ QCD ตรวจ',
      waiting_qcd_debug: 'QCD รายงานปัญหา',
      waiting_qad: 'รอ QAD ซ่อม/ล้าง',
      cleaning: 'กำลังซ่อม/ล้าง',
      done: 'เสร็จสิ้น',
      open: 'เปิดประเด็น',
      resolved: 'ปิดประเด็น',
      failed_fix: 'แก้ไขไม่ได้',
      pending: 'ติดปัญหา'
    }[status] || status
  );
}

function statusPill(status, mold) {
  const text = statusText(status, mold?.remarks);

  const isProblem = ['pending', 'failed_fix', 'waiting_qcd_debug'].includes(status);
  const className = isProblem
    ? 'status-pill status-failed_fix'
    : `status-pill status-${status}`;

  return `<span class="${className}">${text}</span>`;
}

function showMessage(selector, message, type = 'success') {
  const color = type === 'error' ? 'var(--red)' : 'var(--green)';
  const target = el(selector);
  if (!target) return;

  target.innerHTML = `<div class="toast" style="border-left:4px solid ${color}">${message}</div>`;
  setTimeout(() => {
    target.innerHTML = '';
  }, 2600);
}

function showPopup(message, type = 'success', duration = 3200) {
  const existing = document.querySelector('.toast-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'toast-overlay';
  overlay.innerHTML = `
    <div class="toast-popup ${type === 'error' ? 'toast-error' : 'toast-success'}">
      <div class="toast-popup__icon">${type === 'error' ? '✖' : '✔'}</div>
      <div class="toast-popup__message">${message}</div>
    </div>
  `;

  document.body.appendChild(overlay);
  setTimeout(() => {
    overlay.classList.add('toast-overlay--hide');
  }, duration - 300);
  setTimeout(() => {
    overlay.remove();
  }, duration);
}

function calcPercent(v, total) {
  return total ? Math.round((v / total) * 100) : 0;
}

/* =========================================================
   Real-time Subscribe Helpers
   ---------------------------------------------------------
   แนวคิด:
   1) subscribe collection ด้วย onSnapshot() ตั้งแต่หน้าโหลดเสร็จ
   2) snapshot แรก = ข้อมูลเก่าทั้งหมด ณ ตอนเปิดหน้า
   3) snapshot ถัดไป = อัปเดตแบบสดเมื่อมีข้อมูลเปลี่ยน
========================================================= */

/** Subscribe collection molds แบบ Real-time */
function subscribeMoldsRealtime(callback) {
  return onSnapshot(
    collection(db, 'molds'),
    (snapshot) => {
      const rows = snapshot.docs
        .map((docSnap) => docSnap.data())
        .map(normalizeMoldRow)
        .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

      callback(rows);
    },
    (error) => {
      console.error('Realtime subscribe error (molds):', error);
    }
  );
}

/** Subscribe collection issues แบบ Real-time */
function subscribeIssuesRealtime(callback) {
  return onSnapshot(
    collection(db, 'issues'),
    (snapshot) => {
      const rows = snapshot.docs
        .map((docSnap) => docSnap.data())
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      callback(rows);
    },
    (error) => {
      console.error('Realtime subscribe error (issues):', error);
    }
  );
}

/** Subscribe collection cleanings แบบ Real-time */
function subscribeCleaningsRealtime(callback) {
  return onSnapshot(
    collection(db, 'cleanings'),
    (snapshot) => {
      const rows = snapshot.docs
        .map((docSnap) => docSnap.data())
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      callback(rows);
    },
    (error) => {
      console.error('Realtime subscribe error (cleanings):', error);
    }
  );
}

/* =========================================================
   PDD Rendering
========================================================= */
function renderPddPage(rows) {
  const tableBody = document.getElementById('pddTableBody');
  const signalBoard = document.getElementById('pddSignal');

  if (!tableBody && !signalBoard) return;

  if (tableBody) {
    tableBody.innerHTML = rows
      .map(
        (m) => `
          <tr>
            <td>${m.id}</td>
            <td>${m.Problem}</td>
            <td>${m['Job Number'] || m.job_number || '-'}</td>
            <td>${m.mold_no}</td>
            <td>${formatDateTime(m.usage_date)}</td>
            <td>${formatDateTime(m.due_date)}</td>
            <td>${m.operator_name}</td>
            <td>${statusPill(m.status, m)}</td>
            <td>${formatDateTime(m.updated_at)}</td>
          </tr>
        `
      )
      .join('');
  }

  if (signalBoard) {
    signalBoard.innerHTML =
      rows
        .slice(0, 4)
        .map(
          (m) => `
            <div class="live-item">
              <div class="top">
                <div class="mold">${m.mold_no}</div>
                ${statusPill(m.status, m)}
              </div>
              <div class="meta">${m.item} · ${m.operator_name} · ${dueDateBadge(m.due_date)}</div>
            </div>
          `
        )
        .join('') || '<div class="live-item">ยังไม่มีข้อมูล</div>';
  }
}

/* =========================================================
   QCD Rendering
========================================================= */
function renderQcdQueue(rows) {
  const tableBody = document.getElementById('qcdQueueBody');
  const signalBoard = document.getElementById('qcdSignal');
  if (!tableBody && !signalBoard) return;

  const qcdRows = rows.filter((m) => m.current_department === 'QCD');

  if (tableBody) {
    tableBody.innerHTML = qcdRows.length
      ? qcdRows
          .map(
            (m) => `
              <tr>
                <td>${m.id}</td>
                <td>${m.item}</td>
                <td>${m.mold_no}</td>
                <td>${m.operator_name}</td>
                <td>${statusPill(m.status, m)}</td>
                <td>${m.remarks || '-'}</td>
                <td>${formatDateTime(m.updated_at)}</td>
                <td>
                  <div class="table-actions">
                    <button
                      type="button"
                      class="btn-pass"
                      data-id="${m.id}"
                      data-mold="${m.mold_no}"
                      data-item="${m.item}"
                    >QC Pass</button>
                    <button
                      type="button"
                      class="btn-issue"
                      data-id="${m.id}"
                      data-mold="${m.mold_no}"
                      data-item="${m.item}"
                    >แจ้งปัญหา</button>
                  </div>
                </td>
              </tr>
            `
          )
          .join('')
      : '<tr><td colspan="8">ยังไม่มีงานในคิว QCD</td></tr>';
  }

  if (signalBoard) {
    signalBoard.innerHTML =
      qcdRows
        .slice(0, 4)
        .map(
          (m) => `
            <div class="live-item">
              <div class="top">
                <div class="mold">${m.mold_no}</div>
                ${statusPill(m.status, m)}
              </div>
              <div class="meta">${m.item} · ${m.operator_name}</div>
            </div>
          `
        )
        .join('') || '<div class="live-item">ยังไม่มีข้อมูล</div>';
  }
}

function renderQcdIssues(rows) {
  const tableBody = document.getElementById('qcdIssueBody');
  if (!tableBody) return;

  tableBody.innerHTML = rows.length
    ? rows
        .map(
          (i) => `
            <tr>
              <td>${i.id}</td>
              <td>${i.mold_no}</td>
              <td>${i.issue_detail}</td>
              <td>${i.severity || '-'}</td>
              <td>${i.reported_by}</td>
              <td>${statusPill(i.status)}</td>
              <td>${i.action || '-'}</td>
              <td>${formatDateTime(i.created_at)}</td>
              <td>
                <div class="table-actions">
                  <button type="button" class="btn-resolve-issue" data-id="${i.id}">Resolve</button>
                  <button type="button" class="btn-fail-issue" data-id="${i.id}">Failed Fix</button>
                </div>
              </td>
            </tr>
          `
        )
        .join('')
    : '<tr><td colspan="9">ยังไม่มีรายการปัญหา</td></tr>';
}

/* =========================================================
   QAD Rendering
========================================================= */
function sortQadRows(rows) {
  return rows.slice().sort((a, b) => {
    const urgentA = isDueUrgent(a.due_date);
    const urgentB = isDueUrgent(b.due_date);
    if (urgentA !== urgentB) return urgentA ? -1 : 1;

    const timeA = a.due_date ? new Date(a.due_date).getTime() : Infinity;
    const timeB = b.due_date ? new Date(b.due_date).getTime() : Infinity;
    if (timeA !== timeB) return timeA - timeB;

    return new Date(b.updated_at) - new Date(a.updated_at);
  });
}

function renderQadQueue(rows, issues = []) {
  const tableBody = document.getElementById('qadQueueBody');
  const signalBoard = document.getElementById('qadSignal');
  if (!tableBody && !signalBoard) return;

  const qadRows = rows.filter((m) => {
    if (m.current_department !== 'QAD') return false;
    return !['done', 'resolved', 'failed_fix'].includes(m.status);
  });
  const sortedQadRows = sortQadRows(qadRows);

  const buildRemarks = (mold) => {
    const remarks = [];
    const pddText = mold.pdd_remarks || mold.remarks || mold.note || mold.notes;
    if (pddText && pddText !== '-' && pddText !== 'undefined') {
      remarks.push(`<strong>PDD:</strong> ${pddText}`);
    }

    const moldIssues = issues.filter((i) => i.mold_id === mold.id);
    moldIssues.forEach((i) => {
      const qcdText = i.issue_detail || i.qcd_issues || i.remarks || i.issue || i.description;
      if (qcdText && qcdText !== '-' && qcdText !== 'undefined') {
        remarks.push(`<strong>QCD:</strong> ${qcdText}`);
      }
    });

    if (!mold.pdd_remarks && mold.remarks && mold.remarks !== pddText && mold.remarks !== '-' && mold.remarks !== 'undefined') {
      // fallback: mold.remarks may still contain QCD note when pdd_remarks is absent
      remarks.push(`<strong>QCD:</strong> ${mold.remarks}`);
    }

    return remarks.length ? remarks.join('<br>') : '-';
  };

  if (tableBody) {
    tableBody.innerHTML = sortedQadRows.length
      ? sortedQadRows
          .map(
            (m) => `
              <tr class="${isDueUrgent(m.due_date) ? 'qad-row-urgent' : ''}">
                <td>${m.id}</td>
                <td>${m.item}</td>
                <td>${m.mold_no}</td>
                <td>${dueDateBadge(m.due_date)}</td>
                <td>${statusPill(m.status, m)}</td>
                <td class="qad-remarks" data-remarks-html="${encodeURIComponent(buildRemarks(m))}">-</td>
                <td>${formatDateTime(m.updated_at)}</td>
                <td>
                  <button
                    type="button"
                    class="btn-start-cleaning"
                    data-id="${m.id}"
                    data-mold="${m.mold_no}"
                    data-item="${m.item}"
                    data-job-number="${m.job_number || m['Job Number'] || ''}"
                  >บันทึกซ่อม/ล้างแม่พิมพ์</button>
                </td>
              </tr>
            `
          )
          .join('')
      : '<tr><td colspan="8">ยังไม่มีงานในคิว QAD</td></tr>';
    
    // อัปเดต innerHTML ของเซลล์ remarks เพื่อแสดง HTML tags
    document.querySelectorAll('.qad-remarks').forEach((cell) => {
      const encoded = cell.getAttribute('data-remarks-html');
      if (encoded) {
        cell.innerHTML = decodeURIComponent(encoded);
        cell.removeAttribute('data-remarks-html');
      }
    });
  }

  if (signalBoard) {
    signalBoard.innerHTML =
      sortedQadRows
        .slice(0, 4)
        .map(
          (m) => `
            <div class="live-item">
              <div class="top">
                <div class="mold">${m.mold_no}</div>
                ${statusPill(m.status, m)}
              </div>
              <div class="meta">${m.item} · ${dueDateBadge(m.due_date)}</div>
            </div>
          `
        )
        .join('') || '<div class="live-item">ยังไม่มีข้อมูล</div>';
  }
}

function renderQadCleanings(rows) {
  const tableBody = document.getElementById('qadCleaningBody');
  if (!tableBody) return;

  tableBody.innerHTML = rows.length
    ? rows
        .map(
          (c) => `
            <tr>
              <td>${c.id}</td>
              <td>${c.mold_no}</td>
              <td>${c.tank_size}</td>
              <td>${c.cleaner_name}</td>
              <td>${formatDateTime(c.start_time)}</td>
              <td>${formatDateTime(c.end_time)}</td>
              <td>${c.total_minutes || 0}</td>
              <td>${c.remark || '-'}</td>
              <td>${statusPill(c.status)}</td>
            </tr>
          `
        )
        .join('')
    : '<tr><td colspan="9">ยังไม่มีประวัติการซ่อม/ล้าง</td></tr>';
}

/* =========================================================
   Real-time Initialization
   ---------------------------------------------------------
   ฟังก์ชันนี้จะผูก onSnapshot() ทันทีหลัง DOM โหลดเสร็จ
   ไม่ต้องรอให้กดปุ่มใด ๆ
========================================================= */
function initRealtimeBindings() {
  const start = () => {
    // หน้า PDD: subscribe เฉพาะ molds
    if (document.getElementById('pddTableBody') || document.getElementById('pddSignal')) {
      subscribeMoldsRealtime((rows) => {
        renderPddPage(rows);
      });
    }

    // หน้า QCD: subscribe ทั้ง molds และ issues
    if (document.getElementById('qcdQueueBody') || document.getElementById('qcdIssueBody')) {
      subscribeMoldsRealtime((rows) => {
        renderQcdQueue(rows);
      });

      subscribeIssuesRealtime((rows) => {
        renderQcdIssues(rows);
      });
    }

    // หน้า QAD: subscribe ทั้ง molds, issues และ cleanings
    if (document.getElementById('qadQueueBody') || document.getElementById('qadCleaningBody')) {
      let moldsData = [];
      let issuesData = [];

      subscribeMoldsRealtime((rows) => {
        moldsData = rows;
        renderQadQueue(moldsData, issuesData);
      });

      subscribeIssuesRealtime((rows) => {
        issuesData = rows;
        renderQadQueue(moldsData, issuesData);
      });

      subscribeCleaningsRealtime((rows) => {
        renderQadCleanings(rows);
      });
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
}

/* =========================================================
   Expose Globals
   ---------------------------------------------------------
   เพื่อให้หน้า HTML เรียกใช้จาก inline <script> ได้สะดวก
========================================================= */
window.api = api;
window.API = API;
window.el = el;
window.formatDateTime = formatDateTime;
window.parseDateInput = parseDateInput;
window.normalizeDateTimeInput = normalizeDateTimeInput;
window.statusPill = statusPill;
window.showMessage = showMessage;
window.showPopup = showPopup;
window.calcPercent = calcPercent;
window.useFirebaseClient = useFirebaseClient;
window.firebaseApp = firebaseApp;
window.firebaseAnalytics = analytics;
window.subscribeMoldsRealtime = subscribeMoldsRealtime;
window.subscribeIssuesRealtime = subscribeIssuesRealtime;
window.subscribeCleaningsRealtime = subscribeCleaningsRealtime;

/* =========================================================
   Start Real-time Binding Immediately
========================================================= */
initRealtimeBindings();
