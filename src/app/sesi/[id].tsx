import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, Vibration, View } from 'react-native';

import { addDays, DAY_SHORT, formatDate, formatDuration, formatPace, today } from '@/core/dates';
import { EXERCISE_BY_ID } from '@/core/strength/exercises';
import type { PlannedSession, SetLog, StrengthItem } from '@/core/types';
import { useStore } from '@/data/store';
import { ZoneBar } from '@/ui/charts';
import { Badge, Button, Card, Chip, ChipRow, Row, Screen, Section, Stepper, T } from '@/ui/kit';
import { useTheme } from '@/ui/theme';

const ZONE_TEXT = ['Z1 sangat santai', 'Z2 mudah, bisa mengobrol', 'Z3 stabil, kalimat pendek', 'Z4 berat, beberapa kata', 'Z5 sangat berat'];

export default function SessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const store = useStore();
  const found = store.sessionById(decodeURIComponent(id));
  if (!found) {
    return (
      <Screen inset={false} title="Sesi tidak ditemukan">
        <Button title="Kembali" onPress={() => router.back()} />
      </Screen>
    );
  }
  const { session: s, week } = found;
  return (
    <>
      <Stack.Screen options={{ title: s.kind === 'run' ? 'Sesi lari' : 'Sesi kekuatan' }} />
      {s.kind === 'run' ? <RunSession s={s} weekStart={week.weekStart} /> : <StrengthSession s={s} weekStart={week.weekStart} />}
    </>
  );
}

function MoveDay({ s, weekStart }: { s: PlannedSession; weekStart: string }) {
  const { moveSession } = useStore();
  const [open, setOpen] = useState(false);
  if (s.status !== 'planned') return null;
  return (
    <View style={{ marginTop: 8 }}>
      {open ? (
        <ChipRow>
          {DAY_SHORT.map((d, i) => {
            const date = addDays(weekStart, i);
            return <Chip key={d} label={d} selected={date === s.date} onPress={() => { moveSession(s.id, date); setOpen(false); }} />;
          })}
        </ChipRow>
      ) : (
        <Button small kind="ghost" title="Pindah hari" onPress={() => setOpen(true)} style={{ alignSelf: 'flex-start' }} />
      )}
    </View>
  );
}

function RunSession({ s, weekStart }: { s: PlannedSession; weekStart: string }) {
  const store = useStore();
  const t = useTheme();
  const act = s.activityId ? store.activities.find((a) => a.id === s.activityId) : undefined;
  const after = store.checkins.find((c) => c.sessionId === s.id && c.moment === 'setelah');
  return (
    <Screen inset={false} title={s.title} subtitle={`${formatDate(s.date)} · ${s.durationMin} menit`}>
      <Row style={{ marginBottom: 12 }}>
        {s.key ? <Badge label="Sesi kunci" tone="accent" /> : null}
        {s.status === 'done' ? <Badge label="Selesai" tone="good" /> : s.status === 'skipped' ? <Badge label="Dilewati" /> : <Badge label="Direncanakan" tone="run" />}
      </Row>
      {s.why ? (
        <Card tone="accent">
          <T size="small">{s.why}</T>
        </Card>
      ) : null}
      {s.runKind === 'race' ? (
        <Card>
          <T>Buka pacing strategy di tab Lomba. GPX dengan waypoint target sudah bisa dikirim ke jam Coros.</T>
          <Button small title="Buka lomba" onPress={() => router.push('/lomba')} style={{ marginTop: 10, alignSelf: 'flex-start' }} />
        </Card>
      ) : (
        <Section title="Isi sesi">
          {s.steps?.map((st, i) => (
            <Card key={i} style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: t.zones[st.zone - 1], alignItems: 'center', justifyContent: 'center' }}>
                <T size="small" weight="700" style={{ color: '#fff' }}>{`Z${st.zone}`}</T>
              </View>
              <View style={{ flex: 1 }}>
                <T weight="600">{`${st.repeat ? `${st.repeat}× ` : ''}${st.label}`}</T>
                <T size="small" color="muted">{`${st.minutes} menit · ${ZONE_TEXT[st.zone - 1]}`}</T>
              </View>
            </Card>
          ))}
          {s.runKind === 'trail' ? (
            <T size="small" color="muted">Ukur dari waktu dan usaha, bukan pace. Tanjakan curam: jalan cepat dengan tangan di paha. Sehari setelahnya istirahat atau lari mudah.</T>
          ) : null}
          {s.runKind === 'hill' ? (
            <T size="small" color="muted">Drill ala Kilian Jornet: bergantian 30 detik langkah pendek-cepat dan 30 detik langkah panjang di tanjakan.</T>
          ) : null}
        </Section>
      )}

      {act ? (
        <Section title="Data dari jam">
          <Card>
            <T weight="700">{act.name}</T>
            <T size="small" color="muted">{`${act.distanceKm.toFixed(2)} km · ${formatDuration(act.movingSec)} · ${formatPace(act.movingSec / act.distanceKm)}/km · naik ${act.elevGainM} m${act.avgHr ? ` · HR ${Math.round(act.avgHr)}` : ''}`}</T>
            {act.zoneSec ? (
              <View style={{ marginTop: 12 }}>
                <ZoneBar parts={act.zoneSec.map((v, i) => ({ label: `Z${i + 1}`, value: v / act.zoneSec!.reduce((a, b) => a + b, 0), color: t.zones[i] }))} />
              </View>
            ) : null}
          </Card>
        </Section>
      ) : null}

      <Section title="Status">
        {s.status === 'planned' ? (
          <View style={{ gap: 8 }}>
            <Button
              title="Tandai selesai"
              onPress={() => {
                store.updateSession(s.id, { status: 'done', completedAt: new Date().toISOString() });
                router.push(`/checkin?moment=setelah&sessionId=${encodeURIComponent(s.id)}`);
              }}
            />
            <T size="tiny" color="muted">Jika lari direkam di Coros, sesi otomatis selesai saat sinkron Strava.</T>
            <Button kind="secondary" title="Lewati sesi" onPress={() => store.updateSession(s.id, { status: 'skipped' })} />
            <MoveDay s={s} weekStart={weekStart} />
          </View>
        ) : (
          <View style={{ gap: 8 }}>
            {!after ? <Button title="Check-in setelah sesi" onPress={() => router.push(`/checkin?moment=setelah&sessionId=${encodeURIComponent(s.id)}${act ? `&activityId=${encodeURIComponent(act.id)}` : ''}`)} /> : (
              <Card>
                <T size="small">{`Check-in: RPE ${after.rpe ?? '-'} · rasa ${after.feeling ?? '-'}/5${after.pain ? ` · nyeri ${after.painAreas.join(', ')}` : ''}`}</T>
              </Card>
            )}
            <Button kind="secondary" title="Kembalikan ke direncanakan" onPress={() => store.updateSession(s.id, { status: 'planned' })} />
          </View>
        )}
      </Section>
    </Screen>
  );
}

// ---------------- Sesi kekuatan dengan pencatat set & timer istirahat ----------------

interface SetState { reps: number; load: number; done: boolean }

function useRestTimer() {
  const [left, setLeft] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const start = (sec: number) => {
    if (timer.current) clearInterval(timer.current);
    setLeft(sec);
    timer.current = setInterval(() => {
      setLeft((l) => {
        if (l <= 1) {
          if (timer.current) clearInterval(timer.current);
          Vibration.vibrate([0, 300, 150, 300]);
          return 0;
        }
        return l - 1;
      });
    }, 1000);
  };
  const stop = () => {
    if (timer.current) clearInterval(timer.current);
    setLeft(0);
  };
  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);
  return { left, start, stop };
}

function StrengthSession({ s, weekStart }: { s: PlannedSession; weekStart: string }) {
  const store = useStore();
  const t = useTheme();
  const items = s.items ?? [];
  const existing = store.setLogs.filter((l) => l.sessionId === s.id);
  const [state, setState] = useState<SetState[][]>(() =>
    items.map((it) =>
      Array.from({ length: it.sets }, (_, k) => {
        const log = existing.find((l) => l.exerciseId === it.exerciseId && l.setIndex === k);
        return { reps: log?.reps ?? it.repMax, load: log?.loadKg ?? it.loadKg, done: !!log };
      }),
    ),
  );
  const [pain, setPain] = useState<boolean[]>(items.map(() => false));
  const [rpe, setRpe] = useState<number[]>(items.map(() => 7));
  const timer = useRestTimer();
  const finished = s.status === 'done';

  const setCell = (i: number, k: number, patch: Partial<SetState>) => setState((st) => st.map((row, a) => (a === i ? row.map((c, b) => (b === k ? { ...c, ...patch } : c)) : row)));
  const doneSets = state.flat().filter((c) => c.done).length;
  const totalSets = state.flat().length;

  const save = () => {
    const logs: SetLog[] = [];
    items.forEach((it, i) =>
      state[i].forEach((c, k) => {
        if (!c.done) return;
        logs.push({ id: `${s.id}:${it.exerciseId}:${k}`, sessionId: s.id, date: s.date <= today() ? s.date : today(), exerciseId: it.exerciseId, setIndex: k, reps: c.reps, loadKg: c.load, rpe: rpe[i], pain: pain[i] });
      }),
    );
    store.addSetLogs(logs);
    store.updateSession(s.id, { status: 'done', completedAt: new Date().toISOString() });
    timer.stop();
    router.replace(`/checkin?moment=setelah&sessionId=${encodeURIComponent(s.id)}`);
  };

  return (
    <View style={{ flex: 1 }}>
      <Screen inset={false} title={s.title} subtitle={`${formatDate(s.date)} · ±${s.durationMin} menit · ${doneSets}/${totalSets} set`}>
        {s.why ? (
          <Card tone="accent">
            <T size="small">{s.why}</T>
          </Card>
        ) : null}
        <T size="small" color="muted" style={{ marginBottom: 8 }}>Pemanasan 5-8 menit: jalan di tempat, squat tanpa beban, rotasi bahu dan pinggul.</T>
        {items.map((it, i) => (
          <ExerciseCard
            key={it.exerciseId + i}
            it={it}
            sets={state[i]}
            onSet={(k, patch) => setCell(i, k, patch)}
            onDone={(k) => {
              setCell(i, k, { done: !state[i][k].done });
              if (!state[i][k].done) timer.start(it.restSec);
            }}
            rpe={rpe[i]}
            onRpe={(v) => setRpe(rpe.map((x, j) => (j === i ? v : x)))}
            pain={pain[i]}
            onPain={() => setPain(pain.map((x, j) => (j === i ? !x : x)))}
          />
        ))}
        {s.status === 'planned' ? <MoveDay s={s} weekStart={weekStart} /> : null}
        <View style={{ height: 12 }} />
        <Button title={finished ? 'Simpan perubahan' : 'Selesai latihan'} onPress={save} disabled={doneSets === 0} />
        {s.status === 'planned' ? <Button kind="secondary" title="Lewati sesi" onPress={() => { store.updateSession(s.id, { status: 'skipped' }); router.back(); }} style={{ marginTop: 8 }} /> : null}
      </Screen>
      {timer.left > 0 ? (
        <Pressable onPress={timer.stop} style={{ position: 'absolute', left: 16, right: 16, bottom: 24, backgroundColor: t.ink, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <T style={{ color: t.bg }} weight="700">Istirahat</T>
          <T size="title" style={{ color: t.bg }}>{formatDuration(timer.left)}</T>
          <T size="small" style={{ color: t.bg }}>Ketuk untuk lewati</T>
        </Pressable>
      ) : null}
    </View>
  );
}

function ExerciseCard({ it, sets, onSet, onDone, rpe, onRpe, pain, onPain }: {
  it: StrengthItem; sets: SetState[]; onSet: (k: number, p: Partial<SetState>) => void; onDone: (k: number) => void;
  rpe: number; onRpe: (v: number) => void; pain: boolean; onPain: () => void;
}) {
  const t = useTheme();
  const ex = EXERCISE_BY_ID[it.exerciseId];
  const unit = it.note?.includes('detik') ? 'detik' : 'rep';
  return (
    <Card>
      <Pressable onPress={() => router.push(`/gerakan/${it.exerciseId}`)}>
        <Row style={{ justifyContent: 'space-between' }}>
          <T size="h" style={{ flex: 1 }}>{ex?.name ?? it.exerciseId}</T>
          <T size="small" color="accent" weight="600">Cara ›</T>
        </Row>
      </Pressable>
      <T size="small" color="muted">{`${it.sets} set × ${it.repMin}-${it.repMax} ${unit}${it.loadKg ? ` · ${it.loadKg} kg` : ''} · istirahat ${it.restSec} dtk`}</T>
      {it.note ? <T size="small" color="strength" style={{ marginTop: 4 }}>{it.note}</T> : null}
      {sets.map((c, k) => (
        <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          <T weight="700" style={{ width: 22 }}>{k + 1}</T>
          <Stepper value={c.reps} onChange={(v) => onSet(k, { reps: v })} min={0} max={120} suffix={unit} />
          {ex && !ex.bodyweight ? <Stepper value={c.load} onChange={(v) => onSet(k, { load: v })} min={0} max={80} step={0.5} suffix="kg" /> : null}
          <Pressable
            onPress={() => onDone(k)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: c.done }}
            style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: c.done ? t.good : t.line, backgroundColor: c.done ? t.good : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
            <T weight="700" style={{ color: c.done ? '#fff' : t.muted }}>✓</T>
          </Pressable>
        </View>
      ))}
      <View style={{ marginTop: 12 }}>
        <T size="small" weight="600">Seberapa berat gerakan ini? (RPE)</T>
        <ChipRow>
          {[6, 7, 8, 9, 10].map((v) => (
            <Chip key={v} label={String(v)} selected={rpe === v} onPress={() => onRpe(v)} tone="strength" />
          ))}
          <Chip label={pain ? 'Ada nyeri' : 'Tidak nyeri'} selected={pain} onPress={onPain} />
        </ChipRow>
      </View>
    </Card>
  );
}
