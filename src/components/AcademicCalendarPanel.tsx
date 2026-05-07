import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, Globe, MapPin, Sparkles, X } from 'lucide-react';
import api from '../services/api';

type SystemSettings = {
  id: number;
  tahun_akademik: string;
  semester: 'Ganjil' | 'Genap';
  tanggal_mulai: string;
  tanggal_selesai: string;
};

type LiburAkademik = {
  id: number;
  nama: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  keterangan?: string;
};

type AcademicCalendarPanelProps = {
  title: string;
  subtitle: string;
  showHolidayList?: boolean;
  onDateClick?: (date: string) => void;
  onHolidayClick?: (holiday: LiburAkademik) => void;
  hideWorldSection?: boolean;
  dataVersion?: number;
};

type WorldHoliday = {
  label: string;
  dateKey: string;
  scope: string;
  description?: string;
};

type CalendarHolidayItem = {
  id: string;
  title: string;
  startKey: string;
  endKey: string;
  description?: string;
  category: 'akademik' | 'nasional';
  editable: boolean;
  sourceHoliday?: LiburAkademik;
};

const INDONESIAN_NATIONAL_HOLIDAYS_BY_YEAR: Record<number, WorldHoliday[]> = {
  2026: [
    { label: 'Tahun Baru Masehi', dateKey: '2026-01-01', scope: 'Indonesia', description: 'Hari libur nasional awal tahun.' },
    { label: 'Isra Mikraj Nabi Muhammad SAW', dateKey: '2026-01-16', scope: 'Indonesia', description: 'Peringatan Isra Mikraj Nabi Muhammad SAW.' },
    { label: 'Tahun Baru Imlek 2577 Kongzili', dateKey: '2026-02-17', scope: 'Indonesia', description: 'Perayaan Tahun Baru Imlek.' },
    { label: 'Hari Suci Nyepi', dateKey: '2026-03-19', scope: 'Indonesia', description: 'Tahun Baru Saka untuk umat Hindu.' },
    { label: 'Wafat Isa Almasih', dateKey: '2026-04-03', scope: 'Indonesia', description: 'Peringatan Jumat Agung.' },
    { label: 'Hari Buruh Internasional', dateKey: '2026-05-01', scope: 'Indonesia', description: 'Peringatan Hari Buruh Sedunia.' },
    { label: 'Kenaikan Isa Almasih', dateKey: '2026-05-14', scope: 'Indonesia', description: 'Peringatan kenaikan Isa Almasih.' },
    { label: 'Idul Adha 1447 H (estimasi)', dateKey: '2026-05-27', scope: 'Indonesia', description: 'Hari raya Idul Adha (estimasi pemerintah).' },
    { label: 'Hari Lahir Pancasila', dateKey: '2026-06-01', scope: 'Indonesia', description: 'Peringatan lahirnya Pancasila.' },
    { label: 'Tahun Baru Islam 1448 H (estimasi)', dateKey: '2026-06-16', scope: 'Indonesia', description: 'Tahun Baru Hijriah (estimasi).' },
    { label: 'Hari Kemerdekaan Republik Indonesia', dateKey: '2026-08-17', scope: 'Indonesia', description: 'Hari kemerdekaan Indonesia.' },
    { label: 'Maulid Nabi Muhammad SAW (estimasi)', dateKey: '2026-08-26', scope: 'Indonesia', description: 'Peringatan Maulid Nabi (estimasi).' },
    { label: 'Hari Raya Natal', dateKey: '2026-12-25', scope: 'Indonesia', description: 'Hari raya Natal.' },
  ],
};

const DEFAULT_WORLD_HOLIDAYS: WorldHoliday[] = [
  { label: 'New Year Day', dateKey: '2026-01-01', scope: 'Global', description: 'Perayaan tahun baru Masehi.' },
  { label: 'International Workers\' Day', dateKey: '2026-05-01', scope: 'Global', description: 'Peringatan Hari Buruh Internasional.' },
  { label: 'World Environment Day', dateKey: '2026-06-05', scope: 'Global', description: 'Hari Lingkungan Hidup Sedunia.' },
  { label: 'Independence Day', dateKey: '2026-08-17', scope: 'Indonesia', description: 'Hari Kemerdekaan Indonesia.' },
  { label: 'World Teachers\' Day', dateKey: '2026-10-05', scope: 'Global', description: 'Hari Guru Sedunia.' },
  { label: 'Christmas Day', dateKey: '2026-12-25', scope: 'Global', description: 'Perayaan Natal.' },
];

const TIMEZONES = [
  { label: 'Jakarta', zone: 'Asia/Jakarta' },
  { label: 'London', zone: 'Europe/London' },
  { label: 'New York', zone: 'America/New_York' },
  { label: 'Tokyo', zone: 'Asia/Tokyo' },
];

const pad = (value: number) => String(value).padStart(2, '0');

const toDateKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const parseDateKey = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
};

const formatDisplayDate = (value: string) =>
  parseDateKey(value).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

const isSameOrAfter = (left: string, right: string) => left >= right;

export const AcademicCalendarPanel = ({
  title,
  subtitle,
  showHolidayList = false,
  onDateClick,
  onHolidayClick,
  hideWorldSection = false,
  dataVersion = 0,
}: AcademicCalendarPanelProps) => {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [liburList, setLiburList] = useState<LiburAkademik[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [now, setNow] = useState(() => new Date());
  const [selectedDateDetail, setSelectedDateDetail] = useState<{
    dateKey: string;
    holidays: CalendarHolidayItem[];
  } | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'national' | 'academic'>('all');

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const loadCalendar = async () => {
      setLoading(true);
      try {
        const [settingsResult, holidaysResult] = await Promise.allSettled([
          api.get('/settings/system'),
          api.get('/settings/libur'),
        ]);

        if (settingsResult.status === 'fulfilled') {
          setSettings(settingsResult.value.data);
        }

        if (holidaysResult.status === 'fulfilled') {
          setLiburList(Array.isArray(holidaysResult.value.data) ? holidaysResult.value.data : []);
        }
      } catch (error) {
        console.error('Error loading academic calendar:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCalendar();
  }, [dataVersion]);

  const currentMonthLabel = useMemo(
    () =>
      currentMonth.toLocaleDateString('id-ID', {
        month: 'long',
        year: 'numeric',
      }),
    [currentMonth]
  );

  const monthCells = useMemo(() => {
    const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    const cells: Array<Date | null> = [];

    for (let index = 0; index < firstDay.getDay(); index += 1) {
      cells.push(null);
    }

    for (let day = 1; day <= lastDay.getDate(); day += 1) {
      cells.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day));
    }

    while (cells.length % 7 !== 0) {
      cells.push(null);
    }

    return cells;
  }, [currentMonth]);

  const upcomingWorldHolidays = useMemo(() => {
    const todayKey = toDateKey(now);
    const holidaysOfYear = INDONESIAN_NATIONAL_HOLIDAYS_BY_YEAR[now.getFullYear()] || DEFAULT_WORLD_HOLIDAYS;

    return holidaysOfYear
      .filter((holiday) => isSameOrAfter(holiday.dateKey, todayKey))
      .slice(0, 4);
  }, [now]);

  const activeHolidays = useMemo(() => {
    const academicHolidayItems: CalendarHolidayItem[] = liburList
      .map((holiday) => {
        const startKey = holiday.tanggal_mulai.slice(0, 10);
        const endKey = holiday.tanggal_selesai.slice(0, 10);

        return {
          id: `academic-${holiday.id}`,
          title: holiday.nama,
          startKey,
          endKey,
          description: holiday.keterangan,
          category: 'akademik',
          editable: true,
          sourceHoliday: holiday,
        };
      })
      .sort((left, right) => left.startKey.localeCompare(right.startKey));

    const activeYear = currentMonth.getFullYear();
    const nationalSource = INDONESIAN_NATIONAL_HOLIDAYS_BY_YEAR[activeYear] || DEFAULT_WORLD_HOLIDAYS;
    const nationalHolidayItems: CalendarHolidayItem[] = nationalSource.map((holiday) => ({
      id: `national-${holiday.dateKey}-${holiday.label}`,
      title: holiday.label,
      startKey: holiday.dateKey,
      endKey: holiday.dateKey,
      description: holiday.description,
      category: 'nasional',
      editable: false,
    }));

    return [...academicHolidayItems, ...nationalHolidayItems].sort((left, right) => {
      if (left.startKey !== right.startKey) {
        return left.startKey.localeCompare(right.startKey);
      }
      if (left.category === right.category) {
        return left.title.localeCompare(right.title);
      }
      return left.category === 'nasional' ? -1 : 1;
    });
  }, [liburList, currentMonth]);

  const getHolidaysForDate = (dateKey: string) =>
    activeHolidays.filter((holiday) => dateKey >= holiday.startKey && dateKey <= holiday.endKey);

  const goMonth = (offset: number) => {
    setCurrentMonth((previous) => new Date(previous.getFullYear(), previous.getMonth() + offset, 1));
  };

  const timezoneNow = (zone: string) =>
    now.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone: zone,
    });

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
        Memuat kalender akademik...
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-900 px-6 py-6 text-white">
        <div className="max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-100">
            <CalendarDays className="h-4 w-4" />
            Kalender Akademik
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
          {subtitle && <p className="max-w-2xl text-sm text-slate-200 sm:text-base">{subtitle}</p>}
        </div>
      </div>

      <div className="space-y-6 p-4 sm:p-6">
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/80 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-indigo-600">Tahun Akademik</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{settings?.tahun_akademik ?? '-'}</p>
          </div>
          <div className="rounded-2xl border border-sky-100 bg-sky-50/80 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-sky-600">Semester</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{settings?.semester ?? '-'}</p>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-600">Periode Akademik</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">
              {settings?.tanggal_mulai ? formatDisplayDate(settings.tanggal_mulai) : '-'}
            </p>
            <p className="text-sm text-slate-600">sampai {settings?.tanggal_selesai ? formatDisplayDate(settings.tanggal_selesai) : '-'}</p>
          </div>
        </div>

        <div className={`grid gap-6 ${hideWorldSection ? 'xl:grid-cols-1' : 'xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]'}`}>
          <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4 sm:p-6">
            <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Kalender Dunia</p>
                <h2 className="mt-1 text-xl font-bold text-slate-900">{currentMonthLabel}</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => goMonth(-1)}
                  className="rounded-full border border-slate-200 bg-white p-2 text-slate-600 transition hover:border-indigo-200 hover:text-indigo-600"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentMonth(new Date())}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-indigo-200 hover:text-indigo-600"
                >
                  Hari Ini
                </button>
                <button
                  type="button"
                  onClick={() => goMonth(1)}
                  className="rounded-full border border-slate-200 bg-white p-2 text-slate-600 transition hover:border-indigo-200 hover:text-indigo-600"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
              {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((day) => (
                <div key={day} className="py-2">
                  {day}
                </div>
              ))}
            </div>

            <div className="mt-2 grid grid-cols-7 gap-1.5 sm:gap-2">
              {monthCells.map((date, index) => {
                if (!date) {
                  return <div key={`empty-${index}`} className="min-h-[88px] rounded-2xl bg-white/50" />;
                }

                const dateKey = toDateKey(date);
                const isToday = dateKey === toDateKey(new Date());
                const holidaysOnDate = getHolidaysForDate(dateKey);
                const firstHoliday = holidaysOnDate[0];
                const canClickDate = typeof onDateClick === 'function';
                const canClickHoliday = holidaysOnDate.length > 0;
                const clickable = canClickDate || canClickHoliday;
                const handleDatePress = () => {
                  if (holidaysOnDate.length > 0) {
                    setSelectedDateDetail({ dateKey, holidays: holidaysOnDate });
                    return;
                  }
                  if (canClickDate) {
                    onDateClick?.(dateKey);
                  }
                };

                return (
                  <button
                    key={dateKey}
                    type="button"
                    onClick={handleDatePress}
                    className={`group min-h-[74px] sm:min-h-[88px] rounded-2xl border p-2 sm:p-3 text-left transition ${
                      clickable ? 'hover:-translate-y-0.5 hover:border-indigo-300 hover:bg-white' : 'cursor-default'
                    } ${
                      holidaysOnDate.length > 0 ? 'border-rose-200 bg-rose-50' : 'border-slate-200 bg-white'
                    } ${isToday ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-slate-50' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-semibold text-slate-900">{date.getDate()}</span>
                      {holidaysOnDate.length > 0 ? <Sparkles className="h-4 w-4 text-rose-500" /> : <span className="h-4 w-4" />}
                    </div>

                    <div className="mt-2 space-y-1">
                      {firstHoliday ? (
                        <>
                          <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">
                            {firstHoliday.category === 'nasional' ? 'Libur Nasional' : 'Libur Akademik'}
                          </p>
                          <p className="text-xs font-medium text-rose-800">{firstHoliday.title}</p>
                          {holidaysOnDate.length > 1 && (
                            <p className="text-[11px] font-semibold text-amber-700">+{holidaysOnDate.length - 1} libur lainnya</p>
                          )}
                        </>
                      ) : (
                        <p className="text-xs text-slate-500">{date.toLocaleDateString('id-ID', { weekday: 'short' })}</p>
                      )}
                    </div>

                    {canClickDate && holidaysOnDate.length === 0 && (
                      <p className="mt-3 text-[11px] text-slate-400 group-hover:text-indigo-600">Klik tanggal untuk buat libur</p>
                    )}
                    {canClickHoliday && (
                      <p className="mt-3 text-[11px] text-slate-400 group-hover:text-indigo-600">
                        Klik untuk lihat detail libur
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {!hideWorldSection && <div className="space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-slate-900">
                <Globe className="h-5 w-5 text-indigo-600" />
                <h3 className="text-lg font-bold">Waktu Dunia Real Time</h3>
              </div>
              <div className="mt-4 space-y-3">
                {TIMEZONES.map((item) => (
                  <div key={item.zone} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-indigo-100 p-2 text-indigo-700">
                        <MapPin className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{item.label}</p>
                        <p className="text-xs text-slate-500">{item.zone}</p>
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-slate-700">{timezoneNow(item.zone)}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-slate-900">
                <Sparkles className="h-5 w-5 text-amber-500" />
                <h3 className="text-lg font-bold">Libur Dunia Populer</h3>
              </div>
              <div className="mt-4 space-y-3">
                {upcomingWorldHolidays.map((holiday) => (
                  <div key={`${holiday.label}-${holiday.dateKey}`} className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3">
                    <p className="font-semibold text-slate-900">{holiday.label}</p>
                    <p className="text-sm text-slate-600">{holiday.scope}</p>
                    <p className="text-xs text-slate-500">{formatDisplayDate(holiday.dateKey)}</p>
                  </div>
                ))}
                {upcomingWorldHolidays.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                    Tidak ada libur dunia yang tersisa pada tahun ini.
                  </div>
                )}
              </div>
            </div>
          </div>}
        </div>

        {showHolidayList && (
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Daftar Libur Akademik</h3>
                <p className="text-sm text-slate-500">Data yang sama akan muncul di dosen dan mahasiswa.</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
                {activeHolidays.length} libur
              </span>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {activeHolidays.map((holiday) => (
                <div key={holiday.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <p className="font-semibold text-slate-900">{holiday.nama}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {formatDisplayDate(holiday.startKey)} - {formatDisplayDate(holiday.endKey)}
                  </p>
                  {holiday.keterangan && <p className="mt-2 text-xs italic text-slate-500">{holiday.keterangan}</p>}
                </div>
              ))}
              {activeHolidays.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                  Belum ada libur akademik yang dibuat.
                </div>
              )}
            </div>
          </div>
        )}

        {selectedDateDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">Detail Hari Libur</h3>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDateDetail(null);
                    setFilterType('all');
                  }}
                  className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <p className="mt-2 text-sm text-slate-500">
                Tanggal: {formatDisplayDate(selectedDateDetail.dateKey)}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {(['all', 'national', 'academic'] as const).map((type) => {
                  const labels = {
                    all: 'Semua',
                    national: 'Nasional',
                    academic: 'Akademik',
                  };
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFilterType(type)}
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                        filterType === type
                          ? type === 'national'
                            ? 'bg-amber-600 text-amber-50'
                            : type === 'academic'
                              ? 'bg-indigo-600 text-indigo-50'
                              : 'bg-slate-600 text-white'
                          : type === 'national'
                            ? 'border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                            : type === 'academic'
                              ? 'border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                              : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {labels[type]}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 max-h-[40vh] space-y-3 overflow-y-auto pr-1">
                {selectedDateDetail.holidays
                  .filter((holiday) => {
                    if (filterType === 'all') return true;
                    if (filterType === 'national') return holiday.category === 'nasional';
                    if (filterType === 'academic') return holiday.category === 'akademik';
                    return true;
                  })
                  .map((holiday) => (
                  <div
                    key={holiday.id}
                    className={`rounded-xl border px-3 py-3 ${
                      holiday.category === 'nasional'
                        ? 'border-amber-200 bg-amber-50'
                        : 'border-indigo-200 bg-indigo-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{holiday.title}</p>
                        <span
                          className={`inline-block mt-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                            holiday.category === 'nasional'
                              ? 'bg-amber-600 text-amber-50'
                              : 'bg-indigo-600 text-indigo-50'
                          }`}
                        >
                          {holiday.category === 'nasional' ? 'Libur Nasional' : 'Libur Akademik'}
                        </span>
                      </div>
                      {holiday.sourceHoliday && onHolidayClick && (
                        <button
                          type="button"
                          onClick={() => {
                            onHolidayClick(holiday.sourceHoliday as LiburAkademik);
                            setSelectedDateDetail(null);
                          }}
                          className="rounded-lg border border-indigo-200 bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
                        >
                          Edit
                        </button>
                      )}
                    </div>

                    <p className="mt-1 text-xs text-slate-600">
                      {formatDisplayDate(holiday.startKey)} - {formatDisplayDate(holiday.endKey)}
                    </p>
                    <p className="mt-1 text-sm text-slate-700">
                      {holiday.description?.trim() ? holiday.description : 'Tidak ada deskripsi.'}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex flex-wrap justify-end gap-2">
                {onDateClick && (
                  <button
                    type="button"
                    onClick={() => {
                      onDateClick(selectedDateDetail.dateKey);
                      setSelectedDateDetail(null);
                    }}
                    className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm font-semibold text-green-700 transition hover:bg-green-100"
                  >
                    Tambah Libur Baru
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedDateDetail(null)}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};