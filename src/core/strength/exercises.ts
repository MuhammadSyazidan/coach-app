// Library gerakan dumbbell untuk latihan di rumah.
// legs: gerakan yang membebani kaki secara berat (dihindari sehari sebelum/sesudah long run atau trail).

export type Muscle = 'kaki' | 'gluteus' | 'hamstring' | 'betis' | 'dada' | 'punggung' | 'bahu' | 'lengan' | 'core';

export interface Exercise {
  id: string;
  name: string;
  muscles: Muscle[];
  pattern: 'squat' | 'hinge' | 'lunge' | 'push' | 'pull' | 'carry' | 'core' | 'betis' | 'isolasi';
  legs: boolean;
  needsBench: boolean;
  unilateral: boolean;
  /** true = tidak pakai beban tambahan (berat badan). */
  bodyweight: boolean;
  steps: string[];
}

export const EXERCISES: Exercise[] = [
  { id: 'goblet-squat', name: 'Goblet squat', muscles: ['kaki', 'gluteus', 'core'], pattern: 'squat', legs: true, needsBench: false, unilateral: false, bodyweight: false,
    steps: ['Pegang satu dumbbell tegak di depan dada.', 'Kaki selebar bahu, turunkan pinggul sampai paha sejajar lantai.', 'Dorong lantai dengan seluruh telapak untuk berdiri.'] },
  { id: 'rdl', name: 'Romanian deadlift', muscles: ['hamstring', 'gluteus', 'punggung'], pattern: 'hinge', legs: true, needsBench: false, unilateral: false, bodyweight: false,
    steps: ['Dumbbell di depan paha, lutut sedikit ditekuk.', 'Dorong pinggul ke belakang, punggung lurus, turunkan dumbbell menyusuri kaki.', 'Berhenti saat hamstring terasa tertarik, lalu kembali berdiri.'] },
  { id: 'sl-rdl', name: 'Single-leg RDL', muscles: ['hamstring', 'gluteus', 'core'], pattern: 'hinge', legs: true, needsBench: false, unilateral: true, bodyweight: false,
    steps: ['Berdiri satu kaki, dumbbell di tangan berlawanan.', 'Condongkan badan ke depan sambil kaki belakang terangkat lurus.', 'Jaga pinggul tetap sejajar, kembali berdiri pelan.'] },
  { id: 'split-squat', name: 'Split squat', muscles: ['kaki', 'gluteus'], pattern: 'lunge', legs: true, needsBench: false, unilateral: true, bodyweight: false,
    steps: ['Satu kaki di depan, satu di belakang, dumbbell di sisi badan.', 'Turunkan lutut belakang mendekati lantai.', 'Dorong dengan kaki depan untuk naik.'] },
  { id: 'bulgarian', name: 'Bulgarian split squat', muscles: ['kaki', 'gluteus'], pattern: 'lunge', legs: true, needsBench: true, unilateral: true, bodyweight: false,
    steps: ['Punggung kaki belakang di atas bangku.', 'Turunkan badan lurus ke bawah sampai paha depan sejajar lantai.', 'Dorong lewat tumit kaki depan.'] },
  { id: 'reverse-lunge', name: 'Reverse lunge', muscles: ['kaki', 'gluteus'], pattern: 'lunge', legs: true, needsBench: false, unilateral: true, bodyweight: false,
    steps: ['Langkahkan satu kaki ke belakang.', 'Turunkan kedua lutut hingga sekitar 90 derajat.', 'Kembali ke posisi awal, ganti kaki.'] },
  { id: 'step-up', name: 'Step-up', muscles: ['kaki', 'gluteus'], pattern: 'lunge', legs: true, needsBench: true, unilateral: true, bodyweight: false,
    steps: ['Satu kaki di atas bangku atau tangga yang kokoh.', 'Naik dengan mendorong kaki di atas, jangan menolak dengan kaki bawah.', 'Turun pelan dan terkendali (bagus untuk turunan trail).'] },
  { id: 'lateral-lunge', name: 'Lateral lunge', muscles: ['kaki', 'gluteus'], pattern: 'lunge', legs: true, needsBench: false, unilateral: true, bodyweight: false,
    steps: ['Langkah lebar ke samping, dorong pinggul ke belakang.', 'Kaki yang lain tetap lurus.', 'Dorong kembali ke tengah.'] },
  { id: 'sumo-squat', name: 'Sumo squat', muscles: ['kaki', 'gluteus'], pattern: 'squat', legs: true, needsBench: false, unilateral: false, bodyweight: false,
    steps: ['Kaki lebar, jari kaki menghadap keluar, dumbbell menggantung di tengah.', 'Turunkan pinggul lurus ke bawah.', 'Berdiri sambil mengencangkan gluteus.'] },
  { id: 'hip-thrust', name: 'Hip thrust', muscles: ['gluteus', 'hamstring'], pattern: 'hinge', legs: false, needsBench: true, unilateral: false, bodyweight: false,
    steps: ['Punggung atas bersandar di bangku, dumbbell di pinggul.', 'Angkat pinggul sampai badan lurus dari bahu ke lutut.', 'Tahan 1 detik di atas, turun pelan.'] },
  { id: 'glute-bridge', name: 'Glute bridge', muscles: ['gluteus', 'hamstring'], pattern: 'hinge', legs: false, needsBench: false, unilateral: false, bodyweight: false,
    steps: ['Berbaring, lutut ditekuk, dumbbell di pinggul.', 'Angkat pinggul dengan mendorong tumit.', 'Tahan sebentar, turun pelan.'] },
  { id: 'sl-bridge', name: 'Single-leg glute bridge', muscles: ['gluteus', 'hamstring'], pattern: 'hinge', legs: false, needsBench: false, unilateral: true, bodyweight: true,
    steps: ['Berbaring, satu kaki diluruskan ke atas.', 'Angkat pinggul dengan kaki yang menapak.', 'Jaga pinggul tetap rata.'] },
  { id: 'calf-raise', name: 'Calf raise', muscles: ['betis'], pattern: 'betis', legs: false, needsBench: false, unilateral: false, bodyweight: false,
    steps: ['Berdiri di tepi anak tangga, dumbbell di tangan.', 'Naik setinggi mungkin di ujung kaki.', 'Turun pelan melewati batas datar (3 detik).'] },
  { id: 'sl-calf-raise', name: 'Single-leg calf raise', muscles: ['betis'], pattern: 'betis', legs: false, needsBench: false, unilateral: true, bodyweight: false,
    steps: ['Berdiri satu kaki di tepi anak tangga.', 'Naik penuh, turun pelan 3 detik.', 'Penting untuk tendon Achilles dan tanjakan.'] },
  { id: 'bent-calf-raise', name: 'Bent-knee calf raise', muscles: ['betis'], pattern: 'betis', legs: false, needsBench: false, unilateral: false, bodyweight: false,
    steps: ['Posisi setengah jongkok, dumbbell di paha.', 'Angkat tumit setinggi mungkin.', 'Melatih otot soleus untuk lari jarak jauh.'] },
  { id: 'db-row', name: 'One-arm row', muscles: ['punggung', 'lengan'], pattern: 'pull', legs: false, needsBench: false, unilateral: true, bodyweight: false,
    steps: ['Satu tangan bertumpu di bangku atau lutut, punggung datar.', 'Tarik dumbbell ke arah pinggul.', 'Turunkan sampai lengan lurus.'] },
  { id: 'bent-row', name: 'Bent-over row', muscles: ['punggung', 'lengan'], pattern: 'pull', legs: false, needsBench: false, unilateral: false, bodyweight: false,
    steps: ['Condongkan badan 45 derajat, punggung lurus.', 'Tarik kedua dumbbell ke arah rusuk.', 'Remas tulang belikat di atas.'] },
  { id: 'reverse-fly', name: 'Reverse fly', muscles: ['punggung', 'bahu'], pattern: 'pull', legs: false, needsBench: false, unilateral: false, bodyweight: false,
    steps: ['Badan condong ke depan, dumbbell menggantung.', 'Buka lengan ke samping dengan siku sedikit ditekuk.', 'Turunkan pelan.'] },
  { id: 'pullover', name: 'Dumbbell pullover', muscles: ['punggung', 'dada'], pattern: 'pull', legs: false, needsBench: true, unilateral: false, bodyweight: false,
    steps: ['Berbaring di bangku, satu dumbbell dipegang dua tangan di atas dada.', 'Turunkan ke belakang kepala dengan siku sedikit ditekuk.', 'Tarik kembali ke atas dada.'] },
  { id: 'floor-press', name: 'Floor press', muscles: ['dada', 'lengan'], pattern: 'push', legs: false, needsBench: false, unilateral: false, bodyweight: false,
    steps: ['Berbaring di lantai, dumbbell di atas dada.', 'Turunkan sampai lengan atas menyentuh lantai.', 'Dorong kembali ke atas.'] },
  { id: 'bench-press', name: 'Dumbbell bench press', muscles: ['dada', 'lengan', 'bahu'], pattern: 'push', legs: false, needsBench: true, unilateral: false, bodyweight: false,
    steps: ['Berbaring di bangku, dumbbell sejajar dada.', 'Dorong ke atas hingga lengan lurus.', 'Turunkan pelan ke samping dada.'] },
  { id: 'push-up', name: 'Push-up', muscles: ['dada', 'lengan', 'core'], pattern: 'push', legs: false, needsBench: false, unilateral: false, bodyweight: true,
    steps: ['Tangan selebar bahu, badan lurus.', 'Turunkan dada mendekati lantai.', 'Bisa bertumpu di lutut jika terlalu berat.'] },
  { id: 'ohp', name: 'Overhead press', muscles: ['bahu', 'lengan'], pattern: 'push', legs: false, needsBench: false, unilateral: false, bodyweight: false,
    steps: ['Dumbbell setinggi bahu, perut dikencangkan.', 'Dorong lurus ke atas kepala.', 'Turunkan kembali ke bahu.'] },
  { id: 'arnold', name: 'Arnold press', muscles: ['bahu'], pattern: 'push', legs: false, needsBench: false, unilateral: false, bodyweight: false,
    steps: ['Mulai dengan telapak menghadap badan di depan bahu.', 'Putar telapak keluar sambil mendorong ke atas.', 'Balik gerakannya saat turun.'] },
  { id: 'lateral-raise', name: 'Lateral raise', muscles: ['bahu'], pattern: 'isolasi', legs: false, needsBench: false, unilateral: false, bodyweight: false,
    steps: ['Dumbbell di sisi badan.', 'Angkat ke samping sampai setinggi bahu.', 'Turunkan pelan.'] },
  { id: 'curl', name: 'Biceps curl', muscles: ['lengan'], pattern: 'isolasi', legs: false, needsBench: false, unilateral: false, bodyweight: false,
    steps: ['Siku menempel di sisi badan.', 'Tekuk siku mengangkat dumbbell.', 'Turunkan sampai lengan lurus.'] },
  { id: 'hammer-curl', name: 'Hammer curl', muscles: ['lengan'], pattern: 'isolasi', legs: false, needsBench: false, unilateral: false, bodyweight: false,
    steps: ['Pegang dumbbell dengan telapak saling berhadapan.', 'Tekuk siku tanpa memutar pergelangan.', 'Turunkan pelan.'] },
  { id: 'triceps-ext', name: 'Overhead triceps extension', muscles: ['lengan'], pattern: 'isolasi', legs: false, needsBench: false, unilateral: false, bodyweight: false,
    steps: ['Pegang satu dumbbell dengan dua tangan di atas kepala.', 'Turunkan ke belakang kepala dengan menekuk siku.', 'Luruskan kembali.'] },
  { id: 'farmer-carry', name: "Farmer's carry", muscles: ['core', 'lengan', 'punggung'], pattern: 'carry', legs: false, needsBench: false, unilateral: false, bodyweight: false,
    steps: ['Pegang dumbbell terberat di kedua sisi.', 'Berjalan tegak dengan langkah pendek selama 30-40 detik.', 'Bahu turun, perut kencang.'] },
  { id: 'suitcase-carry', name: 'Suitcase carry', muscles: ['core'], pattern: 'carry', legs: false, needsBench: false, unilateral: true, bodyweight: false,
    steps: ['Pegang satu dumbbell di satu sisi.', 'Berjalan tegak tanpa miring.', 'Ganti sisi.'] },
  { id: 'plank', name: 'Plank', muscles: ['core'], pattern: 'core', legs: false, needsBench: false, unilateral: false, bodyweight: true,
    steps: ['Bertumpu pada siku dan ujung kaki.', 'Badan lurus, perut dan gluteus dikencangkan.', 'Tahan 30-45 detik (repetisi = detik / 5).'] },
  { id: 'side-plank', name: 'Side plank', muscles: ['core'], pattern: 'core', legs: false, needsBench: false, unilateral: true, bodyweight: true,
    steps: ['Bertumpu pada satu siku dan sisi kaki.', 'Angkat pinggul hingga badan lurus.', 'Tahan 20-40 detik per sisi.'] },
  { id: 'dead-bug', name: 'Dead bug', muscles: ['core'], pattern: 'core', legs: false, needsBench: false, unilateral: false, bodyweight: true,
    steps: ['Berbaring, lengan lurus ke atas, lutut 90 derajat.', 'Turunkan lengan dan kaki berlawanan perlahan.', 'Punggung bawah tetap menempel lantai.'] },
  { id: 'bird-dog', name: 'Bird dog', muscles: ['core', 'punggung'], pattern: 'core', legs: false, needsBench: false, unilateral: true, bodyweight: true,
    steps: ['Posisi merangkak.', 'Luruskan lengan dan kaki berlawanan.', 'Tahan 2 detik, ganti sisi.'] },
  { id: 'russian-twist', name: 'Russian twist', muscles: ['core'], pattern: 'core', legs: false, needsBench: false, unilateral: false, bodyweight: false,
    steps: ['Duduk, badan condong ke belakang, pegang satu dumbbell.', 'Putar badan ke kiri dan kanan.', 'Kaki boleh menapak lantai.'] },
  { id: 'hollow-hold', name: 'Hollow hold', muscles: ['core'], pattern: 'core', legs: false, needsBench: false, unilateral: false, bodyweight: true,
    steps: ['Berbaring, angkat bahu dan kaki sedikit dari lantai.', 'Punggung bawah menekan lantai.', 'Tahan 20-30 detik.'] },
  { id: 'copenhagen', name: 'Copenhagen plank (pendek)', muscles: ['core', 'kaki'], pattern: 'core', legs: false, needsBench: true, unilateral: true, bodyweight: true,
    steps: ['Side plank dengan lutut atas bertumpu di bangku.', 'Angkat pinggul, tahan 15-20 detik.', 'Menguatkan paha dalam, mencegah cedera.'] },
  { id: 'tibialis-raise', name: 'Tibialis raise', muscles: ['betis'], pattern: 'betis', legs: false, needsBench: false, unilateral: false, bodyweight: true,
    steps: ['Bersandar di dinding, tumit sekitar 30 cm dari dinding.', 'Angkat ujung kaki setinggi mungkin.', 'Melindungi tulang kering, berguna untuk turunan.'] },
  { id: 'thruster', name: 'Thruster', muscles: ['kaki', 'bahu', 'core'], pattern: 'squat', legs: true, needsBench: false, unilateral: false, bodyweight: false,
    steps: ['Dumbbell setinggi bahu, lakukan squat.', 'Saat berdiri, dorong dumbbell ke atas kepala.', 'Satu gerakan mengalir.'] },
  { id: 'renegade-row', name: 'Renegade row', muscles: ['punggung', 'core'], pattern: 'pull', legs: false, needsBench: false, unilateral: true, bodyweight: false,
    steps: ['Posisi push-up dengan tangan memegang dumbbell.', 'Tarik satu dumbbell ke pinggul tanpa memutar pinggul.', 'Bergantian kiri dan kanan.'] },
];

export const EXERCISE_BY_ID: Record<string, Exercise> = Object.fromEntries(EXERCISES.map((e) => [e.id, e]));
