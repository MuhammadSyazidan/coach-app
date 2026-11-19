import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';

import { today, uid } from '@/core/dates';
import type { Checkin, CheckinMoment } from '@/core/types';
import { useStore } from '@/data/store';
import { Button, Card, Chip, ChipRow, Field, Scale, Screen, Section, T } from '@/ui/kit';

const AREAS = ['lutut', 'pergelangan kaki', 'betis', 'tulang kering', 'telapak kaki', 'paha', 'pinggul', 'punggung bawah', 'bahu', 'siku', 'pergelangan tangan'];
const HARD = ['awal', 'tengah', 'akhir', 'tanjakan', 'turunan', 'merata'] as const;
const FEEL = ['Sangat buruk', 'Buruk', 'Biasa', 'Baik', 'Sangat baik'];

export default function CheckinScreen() {
  const params = useLocalSearchParams<{ moment?: CheckinMoment; sessionId?: string; activityId?: string }>();
  const moment: CheckinMoment = params.moment ?? 'setelah';
  const sessionId = params.sessionId ? decodeURIComponent(params.sessionId) : undefined;
  const activityId = params.activityId ? decodeURIComponent(params.activityId) : undefined;
  const store = useStore();
  const session = sessionId ? store.sessionById(sessionId)?.session : undefined;
  const act = activityId ? store.activities.find((a) => a.id === activityId) : undefined;
  const isTrail = session?.runKind === 'trail' || act?.type === 'trail';

  const [rpe, setRpe] = useState<number>();
  const [feeling, setFeeling] = useState<number>();
  const [energy, setEnergy] = useState<number>();
  const [sleep, setSleep] = useState<number>();
  const [soreness, setSoreness] = useState<number>();
  const [pain, setPain] = useState(false);
  const [areas, setAreas] = useState<string[]>([]);
  const [hard, setHard] = useState<Checkin['hardPart']>();
  const [flags, setFlags] = useState<Checkin['flags']>([]);
  const [note, setNote] = useState('');

  const title = moment === 'sebelum' ? 'Sebelum latihan' : moment === 'esok' ? 'Pagi ini' : 'Setelah latihan';
  const subject = session?.title ?? act?.name ?? 'latihan';

  const save = () => {
    const c: Checkin = {
      id: uid('ci-'),
      sessionId: sessionId ?? act?.sessionId,
      activityId,
      date: session?.date ?? act?.date ?? today(),
      moment,
      rpe, feeling, energy, sleep, soreness,
      pain, painAreas: pain ? areas : [],
      hardPart: hard,
      flags,
      note: note.trim(),
    };
    if (moment === 'esok') c.date = today();
    store.addCheckin(c);
    router.back();
  };

  const toggleFlag = (f: Checkin['flags'][number]) => setFlags(flags.includes(f) ? flags.filter((x) => x !== f) : [...flags, f]);

  return (
    <Screen inset={false} title={title} subtitle={subject}>
      <Stack.Screen options={{ title: 'Check-in' }} />
      {moment === 'sebelum' ? (
        <>
          <Section title="Energi">
            <Scale value={energy} onChange={setEnergy} left="Lemas" right="Segar" />
          </Section>
          <Section title="Tidur semalam">
            <Scale value={sleep} onChange={setSleep} left="Buruk" right="Nyenyak" />
          </Section>
          <Section title="Pegal otot">
            <Scale value={soreness} onChange={setSoreness} left="Tidak pegal" right="Sangat pegal" />
          </Section>
        </>
      ) : null}

      {moment === 'setelah' ? (
        <>
          <Section title="Seberapa berat sesi tadi? (RPE)">
            <Scale value={rpe} onChange={setRpe} from={1} to={10} left="Sangat ringan" right="Maksimal" />
          </Section>
          <Section title="Rasa keseluruhan">
            <Scale value={feeling} onChange={setFeeling} labels={['😣', '🙁', '😐', '🙂', '😄']} />
            {feeling ? <T size="small" color="muted" style={{ marginTop: 6 }}>{FEEL[feeling - 1]}</T> : null}
          </Section>
          <Section title="Bagian paling berat">
            <ChipRow>
              {HARD.filter((h) => isTrail || (h !== 'tanjakan' && h !== 'turunan')).map((h) => (
                <Chip key={h} label={h} selected={hard === h} onPress={() => setHard(h)} />
              ))}
            </ChipRow>
          </Section>
        </>
      ) : null}

      {moment === 'esok' ? (
        <Section title="Pegal otot pagi ini">
          <Scale value={soreness} onChange={setSoreness} left="Tidak pegal" right="Sangat pegal" />
        </Section>
      ) : null}

      <Section title={moment === 'esok' ? 'Masih ada nyeri?' : 'Ada nyeri (bukan sekadar pegal)?'}>
        <ChipRow>
          <Chip label="Tidak" selected={!pain} onPress={() => setPain(false)} />
          <Chip label="Ya" selected={pain} onPress={() => setPain(true)} />
        </ChipRow>
        {pain ? (
          <>
            <T size="small" style={{ marginTop: 10, marginBottom: 6 }}>Di mana?</T>
            <ChipRow>
              {AREAS.map((a) => (
                <Chip key={a} label={a} selected={areas.includes(a)} onPress={() => setAreas(areas.includes(a) ? areas.filter((x) => x !== a) : [...areas, a])} />
              ))}
            </ChipRow>
            <Card tone="warn" style={{ marginTop: 12 }}>
              <T size="small">Nyeri tajam, bengkak, atau nyeri yang membuat pincang: hentikan latihan bagian itu dan periksakan ke tenaga kesehatan. Aplikasi akan menurunkan beban terkait.</T>
            </Card>
          </>
        ) : null}
      </Section>

      {moment !== 'esok' ? (
        <Section title="Penanda">
          <ChipRow>
            <Chip label="Sedang sakit" selected={flags.includes('sakit')} onPress={() => toggleFlag('sakit')} />
            <Chip label="Bepergian" selected={flags.includes('bepergian')} onPress={() => toggleFlag('bepergian')} />
            <Chip label="Minum obat/suplemen" selected={flags.includes('obat')} onPress={() => toggleFlag('obat')} />
          </ChipRow>
        </Section>
      ) : null}

      {moment === 'setelah' ? (
        <Section title="Catatan">
          <Field label="Apa yang kamu rasakan? (opsional)" value={note} onChangeText={setNote} multiline placeholder="Misalnya: napas berat di tanjakan km 5, kaki enak di akhir" />
        </Section>
      ) : null}

      <Button title="Simpan" onPress={save} style={{ marginTop: 16 }} />
      <Button title="Nanti saja" kind="ghost" onPress={() => router.back()} style={{ marginTop: 4 }} />
    </Screen>
  );
}
