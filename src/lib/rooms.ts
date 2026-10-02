export type RoomId =
  | "all"
  | "astra"
  | "supervisor"
  | "it"
  | "meeting"
  | "cafe"
  | "lounge"
  | "library"
  | "garden";
export const rooms: {
  id: RoomId;
  name: string;
  description: string;
  point: [number, number, number];
}[] = [
  {
    id: "all",
    name: "Seluruh office",
    description:
      "Satu rumah untuk tim IT Anda. Pilih ruangan atau karakter untuk melihat detail.",
    point: [0, 0, 0],
  },
  {
    id: "astra",
    name: "Astra den",
    description:
      "Ruang koordinasi Astra. Tugas dari Agent dibagi ke Rodeo, Alpha, dan Delta melalui panel eksekusi OpenAI di Tasks.",
    point: [0, -3.2, 2],
  },
  {
    id: "supervisor",
    name: "Kantor Agent",
    description:
      "Kantor Anda sebagai supervisor. Tentukan tujuan, tinjau hasil, dan arahkan tim.",
    point: [-5, 0, -3],
  },
  {
    id: "it",
    name: "IT Team",
    description:
      "Workstation Rodeo (Developer), Alpha (Analyst), dan Delta (QA). Animasi bekerja tidak menunjukkan eksekusi AI.",
    point: [0, 0, 0.5],
  },
  {
    id: "meeting",
    name: "Meeting",
    description:
      "Tempat diskusi kebutuhan, review pekerjaan, dan pembagian tugas. Board tugas dan hasil eksekusi OpenAI ada di tab Tasks.",
    point: [5, 0, -3],
  },
  {
    id: "cafe",
    name: "Cafeteria",
    description:
      "Tempat membuat kopi dan mengobrol bersama barista. Rutinitas di sini bersifat dekoratif.",
    point: [-5, 0, 2],
  },
  {
    id: "lounge",
    name: "Ruang santai",
    description:
      "TV, sofa, meja, PS5, dan beanbag untuk jeda di antara pekerjaan.",
    point: [5, 0, 2],
  },
  {
    id: "library",
    name: "Library",
    description:
      "Rak pengetahuan tim. Belum ada knowledge base tersambung; buku merupakan dekorasi.",
    point: [0, 0, -3],
  },
  {
    id: "garden",
    name: "Garden",
    description: "Teras hijau dengan tanaman, arcade, dan tempat duduk santai.",
    point: [0, 0, 4.7],
  },
];
