# Header Calendar Dropdown with Attendance Marking

**Date:** 2026-03-13
**Status:** Approved

---

## Overview

Add a functional calendar dropdown to the Header's calendar icon button. Clicking it opens a mini monthly calendar where the current user (Anima Agrawal) can mark their own attendance for any date. Changes to dates within the reference week (Dec 1–5, 2020) sync back to the AttendancePage via shared state in AppContext. Changes to other dates are stored in context but not displayed anywhere.

---

## 1. State & Data (AppContext)

**Problem:** `AttendancePage` currently uses hardcoded local constants (`attendanceData`) that cannot be updated from outside the component.

**Solution:** Lift attendance state into `AppContext`.

### User type: AppContext is authoritative

`AppContext.tsx` defines its own `User` interface (with `orgId`, `email`, `designation`, `status`, etc.) which is the authoritative user type for this feature. `Header.tsx` currently renders `currentUser.location` (from `mockData`'s `User` type) for the profile subtitle. When switching to AppContext's `currentUser`, change the subtitle to render `currentUser.designation` instead (AppContext's `User` has no `location` field).

### Changes to `AppContext.tsx`

- Add `attendanceRecords: AttendanceRecord[]` to `AppContextType`.
- Add `setAttendanceRecord: (record: Omit<AttendanceRecord, 'id'>) => void` to `AppContextType`.
- Update the `createContext` default value to include `attendanceRecords: []` and `setAttendanceRecord: () => {}`.
- In `AppProvider`, add `attendanceRecords` state seeded from the mock data below.
- `setAttendanceRecord` must be wrapped in `useCallback`. Add it to the `useMemo` deps array. It generates `id` internally as `${record.userId}-${record.date}` and upserts: replace the existing record with matching `(userId, date)` if found, otherwise append.

**Seed data** (mapped to `AttendanceRecord` shape, reference week Mon–Fri):

```ts
const WEEK_DATES = ['2020-12-01', '2020-12-02', '2020-12-03', '2020-12-04', '2020-12-05'];
```

| userId | 2020-12-01 | 2020-12-02 | 2020-12-03 | 2020-12-04 | 2020-12-05 |
|--------|-----------|-----------|-----------|-----------|-----------|
| u1     | present   | present   | present   | present   | present   |
| u2     | present   | present   | absent    | present   | present   |
| u3     | present   | present   | present   | present   | absent    |
| u4     | present   | absent    | present   | present   | present   |
| u5     | present   | present   | present   | absent    | present   |
| u6     | absent    | present   | present   | present   | present   |

### `AttendanceRecord` shape (already defined in AppContext)

```ts
interface AttendanceRecord {
  id: string;        // generated as "${userId}-${date}"
  userId: string;
  date: string;      // ISO date "YYYY-MM-DD"
  status: 'present' | 'absent' | 'half-day' | 'on-leave' | 'holiday' | 'wfh';
}
```

Note: `half-day` and `on-leave` statuses exist in the type but are not writable from the dropdown in this feature. Only `present`, `absent`, and `wfh` are exposed.

---

## 2. CalendarDropdown Component

**File:** `src/components/layout/CalendarDropdown.tsx` (new file)

### Props

```ts
interface CalendarDropdownProps {
  onClose: () => void;
}
```

`currentUser` is read from `useContext(AppContext)`. Assume `currentUser` is always non-null in this feature (no null guard needed).

### Layout (320px wide dropdown)

- **Header row**: Month/year label + left/right chevron buttons to navigate months.
- **Day-of-week row**: Sun Mon Tue Wed Thu Fri Sat labels.
- **Date grid**: 6×7 grid of day cells.
  - Today's date (2026-03-13): subtle ring or background.
  - Selected date: filled with primary color (`#5030E5`) + white text.
  - Days from adjacent months: dimmed (`text-gray-300`), still clickable.
- **Attendance section** (below calendar, separated by a divider):
  - Label: "Mark attendance for [Day, Mon DD]"
  - Three toggle buttons: **Present** (green `#68B266`), **Absent** (red `#D8727D`), **WFH** (blue `#30C5E5`)
  - Active status: filled button. Inactive: outline.
  - Current status for selected date is read from `attendanceRecords` in context (filter by `userId === currentUser.id && date === selectedDate`). If no record exists, no button is active.
  - Clicking a button calls `setAttendanceRecord({ userId: currentUser.id, date: selectedDate, status: ... })`.

### Behavior

- Default selected date on open: today's date (`2026-03-13`).
- Closes on outside click or `Escape` key. Use a `useRef` on a container `div` in `Header.tsx` wrapping both the calendar icon button and the dropdown, and a `mousedown` listener on `document` to detect outside clicks.
- Positioned absolutely below the calendar icon button, right-aligned to the button.

### Integration in Header

- `Header.tsx` must source `currentUser` from `useContext(AppContext)`. Remove the `currentUser` import from `mockData` (keep `memberColors` import from `mockData`).
- Change the profile subtitle from `currentUser.location` to `currentUser.designation ?? ''`.
- Add `useState<boolean>` for `isCalendarOpen`.
- Add a `useRef<HTMLDivElement>` on a container `div` wrapping both the calendar icon button and the dropdown, used for outside-click detection.
- Render `<CalendarDropdown onClose={() => setIsCalendarOpen(false)} />` conditionally when `isCalendarOpen` is true.

---

## 3. AttendancePage Integration

**File:** `src/pages/AttendancePage.tsx`

### Reference week constant

Define at the top of the component (inside the component body):

```ts
const WEEK_DATES = ['2020-12-01', '2020-12-02', '2020-12-03', '2020-12-04', '2020-12-05'];
// Maps to days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
```

This is the authoritative ordered list used for both table columns and record lookup.

### Data derivation (all inside component body)

Remove the local `attendanceData` constant. Read `attendanceRecords` from `useContext(AppContext)`.

For each member, derive a `statusByDate` map:

```ts
// For a given member:
const statusByDate: Record<string, AttendanceRecord['status'] | undefined> = {};
WEEK_DATES.forEach(date => {
  const rec = attendanceRecords.find(r => r.userId === member.id && r.date === date);
  statusByDate[date] = rec?.status;
});
```

### Dot color rules

- `present` or `wfh`: green (`bg-[#68B266]`)
- `absent`: red (`bg-[#D8727D]`)
- anything else or undefined: gray (`bg-gray-300`)

### Rate calculation

Count days where status is `present` or `wfh` as "present days". Rate = `presentCount / 5`.

Expand `rateStyles` to handle all possible rates with the 5-day week:

```ts
const rateStyles: Record<string, { bg: string; text: string }> = {
  '100%': { bg: 'bg-[#83C29D33]', text: 'text-[#68B266]' },
  '80%':  { bg: 'bg-[#DFA87433]', text: 'text-[#D58D49]' },
  '60%':  { bg: 'bg-[#DFA87433]', text: 'text-[#D58D49]' },
  '40%':  { bg: 'bg-[#F8D7DA33]', text: 'text-[#D8727D]' },
  '20%':  { bg: 'bg-[#F8D7DA33]', text: 'text-[#D8727D]' },
  '0%':   { bg: 'bg-[#F8D7DA33]', text: 'text-[#D8727D]' },
};
```

Rate string: `${Math.round((presentCount / 5) * 100)}%`.

### Metrics (all inside component body)

`totalPresent`, `totalAbsent`, `perfectCount`, `avgRate`, `dailyPresent`, and `metrics` array must all be computed inside the component body — not at module scope — so they recompute reactively when context changes.

- `totalPresent`: count of `present` or `wfh` records across all members in the reference week.
- `totalAbsent`: count of `absent` records.
- `perfectCount`: members with all 5 days present/wfh.
- `avgRate`: `Math.round((totalPresent / (teamMembers.length * 5)) * 100)`.
- `dailyPresent`: for each of the 5 dates, count members with present or wfh status.

### Unchanged

- Table layout, visual design, date range label ("Dec 1–5, 2020"), side panels, metric cards — all remain visually unchanged.

---

## Files to Create / Modify

| File | Action |
|------|--------|
| `src/context/AppContext.tsx` | Add `attendanceRecords` state + `setAttendanceRecord` (`useCallback`) + seed data + update `createContext` default |
| `src/components/layout/CalendarDropdown.tsx` | Create new component |
| `src/components/layout/Header.tsx` | Switch `currentUser` to AppContext, change subtitle to `designation`, keep `memberColors` import, wire dropdown |
| `src/pages/AttendancePage.tsx` | Replace local data with context reads; move all derived values inside component; expand `rateStyles`; use `WEEK_DATES` constant |

---

## Out of Scope

- Marking attendance for other team members (admin feature, not in this spec).
- Persisting data beyond page reload (mock/in-memory only).
- Navigation to AttendancePage from the dropdown.
- Exposing `half-day` or `on-leave` statuses from the dropdown.
- Dates outside Dec 1–5 2020 are stored in context but not displayed on AttendancePage.
