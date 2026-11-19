# Pelatih

Aplikasi coaching pribadi untuk lari, trail run, dan latihan dumbbell di rumah. Data lari diambil dari jam Coros (lewat Strava), jadwal ditulis ke Google Calendar, dan setiap lomba punya pacing strategy yang bisa diekspor sebagai GPX ke jam Coros.

Dibangun dari developer brief "Aplikasi Coaching Running & Home Gym". Peluncuran pertama: Android, Bahasa Indonesia, pemakaian pribadi.

## Fitur

| Fitur | Isi |
| --- | --- |
| Onboarding (F1) | Skrining kesiapan (ringkasan PAR-Q+), level, target, dumbbell (adjustable/tetap), bangku, cedera, pola jadwal |
| Jadwal mingguan (F12) | Pertanyaan "minggu depan mau latihan berapa kali?" setiap Minggu 19:00, hari sibuk, trail on/off; tanpa jawaban dipakai pola minggu lalu |
| Mesin coaching (bagian 5) | Siklus 3+1 minggu, kenaikan volume ≤ 10%/minggu, 1 sesi panjang, sesi kualitas jauh dari sesi panjang, trail menggantikan long run, tidak ada kaki berat sehari sebelum/sesudah long run atau trail, taper dan minggu lomba |
| Adaptasi | Sesi terlewat, rasa buruk 2× berturut-turut, pegal/tidur buruk, sakit, nyeri (latihan kaki diganti tubuh atas), trail di luar rencana |
| Dumbbell (F5) | 40 gerakan, template full-body A/B, "kekuatan trail" (pola Kilian Jornet: core + kaki satu sisi), tubuh atas; progresi ganda sesuai berat dumbbell yang dimiliki; pencatat set dan timer istirahat |
| Check-in perasaan (F11) | Sebelum sesi, per gerakan (RPE + nyeri), setelah sesi (RPE, rasa, bagian terberat, nyeri, catatan), pagi berikutnya (pegal) |
| Strava (data Coros) | Impor lari dan trail, zona HR, sampel gradien/pace untuk kurva tanjakan pribadi, sesi otomatis selesai |
| Google Calendar (F13) | Tulis/ubah/hapus acara latihan dan lomba, baca waktu sibuk, sesi ikut pindah jika acara digeser |
| Lomba & pacing (F14) | Import GPX resmi, pos dan cut-off, penilaian target vs kemampuan, pacing per segmen (gradien + kurva pribadi + kelelahan + cuaca), asupan, kartu pace, ekspor GPX berwaypoint ke COROS |
| Hari ini | Cincin progres menit latihan, latihan hari ini, lomba berikutnya, beban latihan mingguan (TRIMP/sRPE) dan status latihan (rasio akut:kronis) |
| Aktivitas & statistik | Daftar per bulan dari jam dan sesi dumbbell, detail aktivitas, rekor pribadi, volume, beban, distribusi intensitas, kurva tanjakan pribadi, estimasi 1RM |
| Tampilan | Gaya gelap ala aplikasi jam olahraga; mode Sistem/Gelap/Terang di Profil › Tampilan |

## Memasang di ponsel

1. Push repo ini ke GitHub. Workflow `.github/workflows/build-apk.yml` menjalankan tes lalu membangun APK.
2. Buka tab **Releases** di repo dari ponsel Android, unduh `pelatih-*.apk`, lalu pasang (izinkan "pasang dari sumber tidak dikenal").
3. Update berikutnya cukup dipasang di atas versi lama; data tetap tersimpan.

Alternatif: `npx eas-cli build -p android --profile preview` (butuh akun Expo gratis).

## Menghubungkan Strava

1. Buka https://www.strava.com/settings/api dan buat aplikasi.
2. **Authorization Callback Domain**: `localhost`.
3. Di aplikasi: Profil › Strava › isi Client ID dan Client Secret › Hubungkan. Kredensial disimpan terenkripsi di ponsel.
4. Pastikan aplikasi COROS sudah tersambung ke Strava (COROS › Profile › Settings › 3rd Party Apps).

## Google Calendar

Buat kalender bernama **Latihan** di Google Calendar (web atau aplikasi), lalu di Pelatih: Profil › Google Calendar › Hubungkan. Kalender "Latihan" dipilih otomatis.

## Struktur kode

```
src/core/       logika murni + unit test (Jest)
  plan/         generator rencana mingguan dan adaptasi
  strength/     library gerakan dan progresi dumbbell
  pacing/       parser/penulis GPX, profil rute, model gradien, pacing, prediksi
src/data/       penyimpanan SQLite (Android) / localStorage (pratinjau web) dan state aplikasi
src/services/   Strava, Google Calendar (Calendar Provider), notifikasi, file
src/app/        layar (Expo Router)
src/ui/         komponen dan tema
```

## Pengembangan

```bash
npm install
npx jest            # unit test logika coaching dan pacing
npx tsc --noEmit    # typecheck
npx eslint src      # lint
npx expo start      # dev server (butuh development build untuk modul native)
```

## Catatan keselamatan

Aturan coaching disusun dari pedoman ACSM dan NSCA, materi pelatih lari (RRCA, UESCA), dan prinsip latihan Kilian Jornet (tanpa praktik ekstremnya). Aplikasi ini bukan pelatih bersertifikat dan bukan nasihat medis. Untuk nyeri tajam atau gejala medis, konsultasikan ke tenaga kesehatan.
