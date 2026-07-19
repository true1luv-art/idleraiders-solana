// Playlist uses string paths to reference audio files in /public/assets/songs/
// This avoids webpack trying to bundle mp3 files as modules.

interface Song {
  artist: string;
  name: string;
  path: string;
}

const song_list: Song[] = [
  {
    artist: "Romy & Rick",
    name: "Harvesting",
    path: "/assets/songs/harvesting.mp3",
  },
  {
    artist: "Romy",
    name: "Willow Tree",
    path: "/assets/songs/willow_tree.mp3",
  },
];

export const getSong = (index: number): Song => {
  return song_list[index];
};

export const getSongCount = (): number => {
  return song_list.length;
};
