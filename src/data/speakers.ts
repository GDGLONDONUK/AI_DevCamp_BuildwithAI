import type { Speaker } from "@/types";

/** Default roster — seeded into Firestore `speakers/{id}` via Admin import or `npm run sync-firestore-programme`. */
export const SPEAKERS: Speaker[] = [
  {
    id: "sumith-damodaran",
    name: "Sumith Damodaran",
    title: "Solution Consultant, Sitecore",
    photo: "/speakers/sumith-damodaran.jpg",
    sortOrder: 30,
    roles: ["speaker"],
    linkedinUrl: "https://www.linkedin.com/in/sumith-damodaran/",
  },
  {
    id: "salih-guler",
    name: "Salih Guler",
    title: "Senior Developer Advocate, AWS",
    photo: "/speakers/salih-guler.jpg",
    sortOrder: 10,
    roles: ["speaker"],
    linkedinUrl: "https://www.linkedin.com/in/salihgueler/",
  },
  {
    id: "michael-tweed",
    name: "Michael Tweed",
    title: "Principal Software Engineer, Skyscanner",
    photo: "/speakers/michael-tweed.jpg",
    sortOrder: 20,
    roles: ["speaker"],
    linkedinUrl: "https://www.linkedin.com/in/mtweed/",
  },
  {
    id: "renuka-kelkar",
    name: "Renuka Kelkar",
    title: "AI Developer Advocate, Arnagen Solutions",
    photo: "/speakers/renuka-kelkar.png",
    sortOrder: 40,
    roles: ["speaker", "mentor"],
    linkedinUrl: "https://www.linkedin.com/in/renukakelkar/",
  },
  {
    id: "saoussen-chaabnia",
    name: "Saoussen Chaabnia",
    title: "AI/ML Solutions Engineer & Consultant, Freelance",
    photo: "/speakers/saoussen-chaabnia.jpg",
    sortOrder: 50,
    roles: ["speaker"],
    linkedinUrl: "https://www.linkedin.com/in/saoussen-chaabnia/",
  },
  {
    id: "nishi-ajmera",
    name: "Nishi Ajmera",
    title: "Solution Architect, Publicis Sapient",
    photo: "/speakers/nishi-ajmera.jpg",
    sortOrder: 60,
    roles: ["speaker"],
    linkedinUrl: "https://www.linkedin.com/in/ajmeranishi/",
  },
];
