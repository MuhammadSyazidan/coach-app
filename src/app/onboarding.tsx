import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';

import { DAY_SHORT, today } from '@/core/dates';
import type { DayIndex, GoalType, Level, Profile } from '@/core/types';
import { useStore } from '@/data/store';
import { Button, Card, Chip, ChipRow, Field, Row, Screen, Section, Stepper, T } from '@/ui/kit';

// Ringkasan pertanyaan kesiapan aktivitas fisik (diparafrasekan dari PAR-Q+ bagian umum).
const PARQ = [
  'Dokter pernah bilang kamu punya masalah jantung atau tekanan darah tinggi?',
  'Kamu merasa nyeri dada saat istirahat, aktivitas sehari-hari, atau olahraga?',
  'Dalam 12 bulan terakhir pernah pusing sampai hilang keseimbangan atau pingsan?',
  'Pernah didiagnosis penyakit kronis lain (misalnya diabetes, asma, penyakit ginjal)?',
  'Sedang minum obat resep untuk penyakit kronis?',
  'Punya masalah tulang, sendi, atau otot yang bisa memburuk karena olahraga?',
  'Dokter pernah bilang kamu hanya boleh olahraga dengan pengawasan medis?',
];

const GOALS: { v: GoalType; label: string }[] = [
  { v: '5k', label: '5K' }, { v: '10k', label: '10K' }, { v: 'half', label: 'Half marathon' }, { v: 'marathon', label: 'Marathon' },
  { v: 'trail', label: 'Trail run' }, { v: 'kekuatan', label: 'Kekuatan' }, { v: 'umum', label: 'Bugar umum' },
];

const LEVELS: { v: Level; label: string; desc: string }[] = [
  { v: 'pemula', label: 'Pemula', desc: 'Belum rutin lari, atau belum bisa lari 20-30 menit tanpa berhenti.' },
  { v: 'menengah', label: 'Menengah', desc: 'Rutin lari 2-4×/minggu, pernah ikut 5K-10K.' },
  { v: 'lanjut', label: 'Lanjut', desc: 'Rutin 4×+/minggu, terbiasa interval, half marathon atau trail panjang.' },
];

const num = (s: string, fallback = 0) => {
  const n = Number(s.replace(',', '.'));
  return isFinite(n) ? n : fallback;
};

export default function Onboarding() {
  const { profile, saveProfile } = useStore();
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const p0 = profile;
  const [step, setStep] = useState(edit ? 1 : 0);
  const [parq, setParq] = useState<boolean[]>(PARQ.map(() => false));
  const [name, setName] = useState(p0?.name ?? '');
  const [birthYear, setBirthYear] = useState(p0?.birthYear ? String(p0.birthYear) : '');
  const [weight, setWeight] = useState(p0?.weightKg ? String(p0.weightKg) : '');
  const [maxHr, setMaxHr] = useState(p0?.maxHr ? String(p0.maxHr) : '');
  const [level, setLevel] = useState<Level>(p0?.level ?? 'menengah');
  const [longest, setLongest] = useState(p0?.longestRecentRunMin ?? 45);
  const [weekly, setWeekly] = useState(p0?.weeklyRunMinutes ?? 120);
  const [goal, setGoal] = useState<GoalType>(p0?.goal ?? 'trail');
  const [goalNote, setGoalNote] = useState(p0?.goalNote ?? '');
  const [adjustable, setAdjustable] = useState(p0?.dumbbell.adjustable ?? true);
  const [minKg, setMinKg] = useState(p0?.dumbbell.minKg ?? 2);
  const [maxKg, setMaxKg] = useState(p0?.dumbbell.maxKg ?? 20);
  const [stepKg, setStepKg] = useState(p0?.dumbbell.stepKg ?? 2);
  const [fixed, setFixed] = useState(p0?.dumbbell.weightsKg.join(', ') ?? '5, 7.5, 10');
  const [bench, setBench] = useState(p0?.hasBench ?? false);
  const [injuries, setInjuries] = useState(p0?.injuries ?? '');
  const [runN, setRunN] = useState(p0?.defaultRunSessions ?? 4);
  const [strN, setStrN] = useState(p0?.defaultStrengthSessions ?? 2);
  const [days, setDays] = useState<DayIndex[]>(p0?.preferredDays ?? [0, 1, 2, 3, 4, 5, 6]);
  const [maxMin, setMaxMin] = useState(p0?.maxSessionMinutes ?? 120);
  const [time, setTime] = useState<'pagi' | 'sore'>(p0?.trainingTime ?? 'pagi');
  const [trailEvery, setTrailEvery] = useState(p0?.trailEveryWeeks ?? 3);

  const age = birthYear ? new Date().getFullYear() - num(birthYear) : null;
  const flag = parq.some(Boolean);

  const finish = () => {
    const p: Profile = {
      name: name.trim() || 'Atlet',
      birthYear: birthYear ? num(birthYear) : undefined,
      weightKg: weight ? num(weight) : undefined,
      level,
      goal,
      goalNote,
      longestRecentRunMin: longest,
      weeklyRunMinutes: weekly,
      maxHr: maxHr ? num(maxHr) : age ? Math.round(208 - 0.7 * age) : undefined,
      dumbbell: {
        adjustable,
        weightsKg: fixed.split(/[,;\s]+/).map((x) => num(x, 0)).filter((x) => x > 0),
        minKg,
        maxKg,
        stepKg,
      },
      hasBench: bench,
      injuries,
      parqFlag: p0?.parqFlag ?? flag,
      defaultRunSessions: runN,
      defaultStrengthSessions: strN,
      preferredDays: [...days].sort((a, b) => a - b),
      maxSessionMinutes: maxMin,
      trailEveryWeeks: trailEvery,
      trainingTime: time,
      createdAt: p0?.createdAt ?? today(),
    };
    saveProfile(p);
    if (edit) router.back();
    else router.replace('/minggu-depan?first=1');
  };

  const steps = [
    // 0: skrining
    <View key="0">
      <T color="muted" style={{ marginBottom: 16 }}>
        Sebelum mulai, jawab 7 pertanyaan kesiapan berolahraga. Ini bukan diagnosis, hanya penanda kapan sebaiknya bertanya ke dokter dulu.
      </T>
      {PARQ.map((q, i) => (
        <Card key={i}>
          <T style={{ marginBottom: 10 }}>{q}</T>
          <ChipRow>
            <Chip label="Tidak" selected={!parq[i]} onPress={() => setParq(parq.map((v, j) => (j === i ? false : v)))} />
            <Chip label="Ya" selected={parq[i]} onPress={() => setParq(parq.map((v, j) => (j === i ? true : v)))} />
          </ChipRow>
        </Card>
      ))}
      {flag ? (
        <Card tone="warn">
          <T weight="600">Sebaiknya konsultasi dengan dokter dulu</T>
          <T size="small" style={{ marginTop: 4 }}>
            Ada jawaban “ya”. Kamu tetap bisa memakai aplikasi, tapi mintalah izin dokter sebelum menambah intensitas.
          </T>
        </Card>
      ) : null}
    </View>,
    // 1: tentang kamu
    <View key="1">
      <Field label="Nama panggilan" value={name} onChangeText={setName} placeholder="Misalnya Syazidan" />
      <Field label="Tahun lahir (opsional)" value={birthYear} onChangeText={setBirthYear} keyboardType="number-pad" placeholder="1998" />
      <Field label="Berat badan, kg (opsional)" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" />
      <Field
        label="Detak jantung maksimal (opsional)"
        value={maxHr}
        onChangeText={setMaxHr}
        keyboardType="number-pad"
        hint={`Lihat di aplikasi COROS (Profil > Zona). ${age ? `Jika kosong, dipakai perkiraan ${Math.round(208 - 0.7 * age)} bpm.` : ''} Zona dari Strava dipakai bila tersedia.`}
      />
    </View>,
    // 2: lari
    <View key="2">
      <T size="small" weight="600" style={{ marginBottom: 8 }}>Level lari</T>
      {LEVELS.map((l) => (
        <Card key={l.v} onPress={() => setLevel(l.v)} tone={level === l.v ? 'accent' : undefined}>
          <T weight="700">{l.label}</T>
          <T size="small" color="muted">{l.desc}</T>
        </Card>
      ))}
      <Section title="Lari terpanjang 4 minggu terakhir">
        <Stepper value={longest} onChange={setLongest} min={0} max={600} step={5} suffix="menit" />
      </Section>
      <Section title="Total lari per minggu saat ini">
        <Stepper value={weekly} onChange={setWeekly} min={0} max={1200} step={15} suffix="menit" />
      </Section>
      <Section title="Target utama">
        <ChipRow>
          {GOALS.map((g) => (
            <Chip key={g.v} label={g.label} selected={goal === g.v} onPress={() => setGoal(g.v)} />
          ))}
        </ChipRow>
        <View style={{ height: 12 }} />
        <Field label="Target terdekat (opsional)" value={goalNote} onChangeText={setGoalNote} placeholder="Misalnya trail 21K bulan Maret, atau push-up 30×" hint="Lomba dengan tanggal dan GPX bisa ditambah di tab Lomba." />
      </Section>
    </View>,
    // 3: peralatan
    <View key="3">
      <T size="small" weight="600" style={{ marginBottom: 8 }}>Dumbbell</T>
      <ChipRow>
        <Chip label="Adjustable" selected={adjustable} onPress={() => setAdjustable(true)} />
        <Chip label="Berat tetap" selected={!adjustable} onPress={() => setAdjustable(false)} />
      </ChipRow>
      <View style={{ height: 16 }} />
      {adjustable ? (
        <View style={{ gap: 16 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <T>Berat minimum</T>
            <Stepper value={minKg} onChange={setMinKg} min={0.5} max={maxKg} step={0.5} suffix="kg" />
          </Row>
          <Row style={{ justifyContent: 'space-between' }}>
            <T>Berat maksimum</T>
            <Stepper value={maxKg} onChange={setMaxKg} min={minKg} max={60} step={0.5} suffix="kg" />
          </Row>
          <Row style={{ justifyContent: 'space-between' }}>
            <T>Langkah kenaikan</T>
            <Stepper value={stepKg} onChange={setStepKg} min={0.5} max={5} step={0.5} suffix="kg" />
          </Row>
          <T size="tiny" color="muted">Berat per satu dumbbell.</T>
        </View>
      ) : (
        <Field label="Berat yang kamu punya (kg per dumbbell)" value={fixed} onChangeText={setFixed} placeholder="5, 7.5, 10" hint="Pisahkan dengan koma." />
      )}
      <Section title="Bangku latihan">
        <ChipRow>
          <Chip label="Ada" selected={bench} onPress={() => setBench(true)} />
          <Chip label="Tidak ada" selected={!bench} onPress={() => setBench(false)} />
        </ChipRow>
      </Section>
      <Section title="Riwayat cedera">
        <Field label="Cedera atau keluhan (opsional)" value={injuries} onChangeText={setInjuries} placeholder="Misalnya lutut kanan sering nyeri saat turunan" multiline />
      </Section>
    </View>,
    // 4: jadwal
    <View key="4">
      <T color="muted">Ini pola awal. Setiap Minggu malam aplikasi menanyakan jadwal minggu depan, jadi bisa diubah tiap minggu.</T>
      <Section title="Sesi lari per minggu">
        <Stepper value={runN} onChange={setRunN} min={1} max={7} />
      </Section>
      <Section title="Sesi kekuatan per minggu">
        <Stepper value={strN} onChange={setStrN} min={0} max={4} />
      </Section>
      <Section title="Hari yang biasanya bisa">
        <ChipRow>
          {DAY_SHORT.map((d, i) => (
            <Chip key={d} label={d} selected={days.includes(i as DayIndex)} onPress={() => setDays(days.includes(i as DayIndex) ? days.filter((x) => x !== i) : [...days, i as DayIndex])} />
          ))}
        </ChipRow>
      </Section>
      <Section title="Durasi maksimal per sesi">
        <Stepper value={maxMin} onChange={setMaxMin} min={30} max={360} step={15} suffix="menit" />
      </Section>
      <Section title="Biasanya latihan">
        <ChipRow>
          <Chip label="Pagi" selected={time === 'pagi'} onPress={() => setTime('pagi')} />
          <Chip label="Sore" selected={time === 'sore'} onPress={() => setTime('sore')} />
        </ChipRow>
      </Section>
      <Section title="Trail run">
        <ChipRow>
          {[0, 2, 3, 4].map((n) => (
            <Chip key={n} label={n === 0 ? 'Tidak rutin' : `Tiap ${n} minggu`} selected={trailEvery === n} onPress={() => setTrailEvery(n)} />
          ))}
        </ChipRow>
        <T size="tiny" color="muted" style={{ marginTop: 6 }}>Trail run menggantikan lari panjang minggu itu.</T>
      </Section>
    </View>,
  ];

  const titles = ['Kesiapan berolahraga', 'Tentang kamu', 'Lari', 'Peralatan', 'Jadwal'];
  const last = step === steps.length - 1;
  return (
    <Screen title={titles[step]} subtitle={edit ? 'Ubah profil' : `Langkah ${step + 1} dari ${steps.length}`}>
      {steps[step]}
      <Row style={{ marginTop: 24 }}>
        {step > (edit ? 1 : 0) ? <Button title="Kembali" kind="secondary" onPress={() => setStep(step - 1)} style={{ flex: 1 }} /> : null}
        <Button
          title={last ? (edit ? 'Simpan' : 'Susun rencana pertama') : 'Lanjut'}
          onPress={() => (last ? finish() : setStep(step + 1))}
          disabled={step === 4 && days.length === 0}
          style={{ flex: 2 }}
        />
      </Row>
      <T size="tiny" color="muted" style={{ marginTop: 16 }}>
        Aplikasi ini memakai aturan dari pedoman latihan (ACSM, NSCA, dan materi pelatih lari) dan bukan pengganti nasihat medis.
      </T>
    </Screen>
  );
}
