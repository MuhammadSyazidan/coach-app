import { router } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';

import { EXERCISES, type Muscle } from '@/core/strength/exercises';
import { IconDumbbell } from '@/ui/icons';
import { Chip, ChipRow, MenuGroup, MenuRow, Screen } from '@/ui/kit';
import { useTheme } from '@/ui/theme';

const MUSCLES: Muscle[] = ['kaki', 'gluteus', 'hamstring', 'betis', 'core', 'dada', 'punggung', 'bahu', 'lengan'];

export default function ExerciseLibrary() {
  const t = useTheme();
  const [m, setM] = useState<Muscle | null>(null);
  const list = EXERCISES.filter((e) => !m || e.muscles.includes(m));
  return (
    <Screen inset={false}>
      <ChipRow>
        <Chip label="Semua" selected={!m} onPress={() => setM(null)} />
        {MUSCLES.map((x) => (
          <Chip key={x} label={x} selected={m === x} onPress={() => setM(x)} />
        ))}
      </ChipRow>
      <View style={{ height: 14 }} />
      <MenuGroup>
        {list.map((e) => (
          <MenuRow key={e.id} icon={<IconDumbbell color={t.strength} size={22} />} label={e.name} value={e.needsBench ? 'bangku' : e.bodyweight ? 'tanpa beban' : undefined} onPress={() => router.push(`/gerakan/${e.id}`)} />
        ))}
      </MenuGroup>
    </Screen>
  );
}
