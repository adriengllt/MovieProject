const API_KEY = "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI1MzZhM2ViODY0ZTFiNWJkMmYyZDBmZTZiYTAxMTdhMCIsIm5iZiI6MTc3OTEyMzcxOC4xNTgwMDAyLCJzdWIiOiI2YTBiNDYwNmQ2NzcwNjRlZWIyNDhjNGYiLCJzY29wZXMiOlsiYXBpX3JlYWQiXSwidmVyc2lvbiI6MX0.SVPSvWaz0MV4IigPWikPZk16D_vqfCH0V73aniK2uuM";
const BASE_URL = "https://api.themoviedb.org/3";
const IMG_URL = "https://image.tmdb.org/t/p/w500";
const BACK_URL = "https://image.tmdb.org/t/p/original";
const NO_IMAGE = "images/no-image.jpg";

class Api {
    async get(endpoint, params = {}) {
        const url = new URL(`${BASE_URL}${endpoint}`);
        url.searchParams.set("language", "fr-FR");

        for (const [key, value] of Object.entries(params)) {
            url.searchParams.set(key, value);
        }

        const response = await fetch(url.toString(), {
            headers: {Authorization: `Bearer ${API_KEY}`}
        });

        if (!response.ok) throw new Error("Erreur API");
        return response.json();
    }

    getFilm(id) {
        return this.get(`/movie/${id}`);
    }

    getSerie(id) {
        return this.get(`/tv/${id}`);
    }

    getActeursFilm(id) {
        return this.get(`/movie/${id}/credits`);
    }

    getActeursSerie(id) {
        return this.get(`/tv/${id}/credits`);
    }
}

class PageDetail {
    constructor() {
        this.api = new Api();
        this.conteneur = document.getElementById("contenu-detail");

        const params = new URLSearchParams(window.location.search);
        this.id = params.get("id");
        this.type = params.get("type");

        this.demarrer();
    }

    async demarrer() {
        if (!this.id || !this.type) {
            this.afficherErreur("Aucun film ou série sélectionné.");
            return;
        }

        try {
            const [detail, casting] = await Promise.all([
                this.type === "movie" ? this.api.getFilm(this.id) : this.api.getSerie(this.id),
                this.type === "movie" ? this.api.getActeursFilm(this.id) : this.api.getActeursSerie(this.id)
            ]);

            this.afficher(detail, casting.cast || []);

        } catch (err) {
            this.afficherErreur("Impossible de charger les données.");
        }
    }

    afficher(detail, cast) {
        const titre = detail.title || detail.name || "Titre inconnu";
        const date = detail.release_date || detail.first_air_date || "";
        const annee = date ? new Date(date).getFullYear() : "—";
        const dateFormat = date ? new Date(date).toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "short",
            year: "numeric"
        }) : "—";
        const genres = (detail.genres || []).map(g => g.name).join(", ") || "—";
        const synopsis = detail.overview || "Aucun synopsis disponible.";
        const note = detail.vote_average ? Math.round(detail.vote_average * 10) : "N/A";
        const affiche = detail.poster_path ? `${IMG_URL}${detail.poster_path}` : NO_IMAGE;
        const fond = detail.backdrop_path ? `${BACK_URL}${detail.backdrop_path}` : "";

        const duree = detail.runtime
            ? `${Math.floor(detail.runtime / 60)}h ${detail.runtime % 60}m`
            : detail.episode_run_time?.[0]
                ? `${Math.floor(detail.episode_run_time[0] / 60)}h ${detail.episode_run_time[0] % 60}m`
                : "";

        document.title = titre;

        this.conteneur.innerHTML = `
      <section class="detail-hero" style="background-image: linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url('${fond}')">
        <div class="detail-hero-contenu">
          <img class="detail-affiche" src="${affiche}" alt="${titre}" onerror="this.src='${NO_IMAGE}'">
          <div class="detail-infos">
            <h1>${titre} <span class="detail-annee">(${annee})</span></h1>
            <p class="detail-meta">${dateFormat} · ${genres}${duree ? " · " + duree : ""}</p>
            <div class="detail-note">
              <span>${note}%</span>
            </div>
            <h2>Synopsis</h2>
            <p class="detail-synopsis">${synopsis}</p>
          </div>
        </div>
      </section>

      <section class="detail-casting">
        <div class="contenu">
          <h2>Casting</h2>
          <div class="grille-acteurs" id="grille-acteurs"></div>
        </div>
      </section>
    `;

        const grilleActeurs = document.getElementById("grille-acteurs");
        cast.slice(0, 8).forEach(acteur => {
            const photo = acteur.profile_path ? `${IMG_URL}${acteur.profile_path}` : NO_IMAGE;
            const carte = document.createElement("div");
            carte.className = "carte-acteur";
            carte.innerHTML = `
        <img src="${photo}" alt="${acteur.name}" onerror="this.src='${NO_IMAGE}'">
        <p class="acteur-nom">${acteur.name}</p>
        <p class="acteur-role">${acteur.character || ""}</p>
      `;
            grilleActeurs.appendChild(carte);
        });
    }

    afficherErreur(msg) {
        this.conteneur.innerHTML = `<p class="message-erreur">${msg}</p>`;
    }
}

document.addEventListener("DOMContentLoaded", () => {
    new PageDetail();
});