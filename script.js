const API_KEY = "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI1MzZhM2ViODY0ZTFiNWJkMmYyZDBmZTZiYTAxMTdhMCIsIm5iZiI6MTc3OTEyMzcxOC4xNTgwMDAyLCJzdWIiOiI2YTBiNDYwNmQ2NzcwNjRlZWIyNDhjNGYiLCJzY29wZXMiOlsiYXBpX3JlYWQiXSwidmVyc2lvbiI6MX0.SVPSvWaz0MV4IigPWikPZk16D_vqfCH0V73aniK2uuM";
const BASE_URL = "https://api.themoviedb.org/3";
const IMG_URL = "https://image.tmdb.org/t/p/w500";
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

    getTrending(periode) {
        return this.get(`/trending/all/${periode}`);
    }

    getFilms(params) {
        return this.get("/discover/movie", params);
    }

    getSeries(params) {
        return this.get("/discover/tv", params);
    }

    rechercher(texte) {
        return this.get("/search/multi", {query: texte});
    }

    getGenresFilms() {
        return this.get("/genre/movie/list");
    }

    getGenresSeries() {
        return this.get("/genre/tv/list");
    }
}

class Carte {
    constructor(film, type) {
        this.film = film;
        this.type = type;
    }

    creer() {
        const titre = this.film.title || this.film.name || "Titre inconnu";
        const date = this.film.release_date || this.film.first_air_date || "";
        const annee = date ? new Date(date).getFullYear() : "—";
        const note = this.film.vote_average ? this.film.vote_average.toFixed(1) : "N/A";
        const image = this.film.poster_path ? `${IMG_URL}${this.film.poster_path}` : NO_IMAGE;
        const lien = `focus.html?id=${this.film.id}&type=${this.type}`;

        const article = document.createElement("article");
        article.className = "carte";

        article.innerHTML = `
      <a href="${lien}">
        <div class="carte-image">
          <img src="${image}" alt="${titre}" loading="lazy" onerror="this.src='${NO_IMAGE}'">
          <span class="carte-note">${note}</span>
        </div>
        <div class="carte-info">
          <h3>${titre}</h3>
          <p>${annee}</p>
        </div>
      </a>
    `;

        return article;
    }
}

class ListeFilms {
    constructor(idListe, idFiltres, fetchFn, type) {
        this.liste = document.getElementById(idListe);
        this.filtres = document.getElementById(idFiltres);
        this.fetchFn = fetchFn;
        this.type = type;
    }

    afficherChargement() {
        this.liste.innerHTML = `
      <div class="chargement">
        <span></span><span></span><span></span>
      </div>
    `;
    }

    async charger(params = {}) {
        this.afficherChargement();

        try {
            const data = await this.fetchFn(params);
            const items = data.results || [];

            this.liste.innerHTML = "";

            if (!items.length) {
                this.liste.innerHTML = `<p class="message-vide">Aucun résultat.</p>`;
                return;
            }

            items.slice(0, 20).forEach(item => {
                const carte = new Carte(item, this.type);
                this.liste.appendChild(carte.creer());
            });

        } catch (err) {
            this.liste.innerHTML = `<p class="message-erreur">Impossible de charger les données.</p>`;
        }
    }

    remplirGenres(genres) {
        if (!this.filtres) return;
        const select = this.filtres.querySelector("select[data-filtre='with_genres']");
        if (!select) return;

        genres.forEach(genre => {
            const option = document.createElement("option");
            option.value = genre.id;
            option.textContent = genre.name;
            select.appendChild(option);
        });
    }
}

class PageAccueil {
    constructor() {
        this.api = new Api();

        this.tendances = new ListeFilms(
            "liste-tendances",
            "filtres-tendances",
            (p) => this.api.getTrending(p.periode || "week"),
            "movie"
        );

        this.films = new ListeFilms(
            "liste-films",
            "filtres-films",
            (p) => this.api.getFilms(p),
            "movie"
        );

        this.series = new ListeFilms(
            "liste-series",
            "filtres-series",
            (p) => this.api.getSeries(p),
            "tv"
        );

        this.inputRecherche = document.getElementById("input-recherche");
        this.boutonRecherche = document.getElementById("bouton-recherche");
        this.zoneResultats = document.getElementById("zone-resultats");

        this.demarrer();
    }

    async demarrer() {
        await Promise.all([
            this.tendances.charger(),
            this.films.charger({sort_by: "popularity.desc"}),
            this.series.charger({sort_by: "popularity.desc"}),
            this.chargerGenres()
        ]);

        this.ecouterFiltres();
        this.ecouterRecherche();
    }

    async chargerGenres() {
        try {
            const [genresFilms, genresSeries] = await Promise.all([
                this.api.getGenresFilms(),
                this.api.getGenresSeries()
            ]);
            this.films.remplirGenres(genresFilms.genres);
            this.series.remplirGenres(genresSeries.genres);
        } catch (err) {
        }
    }

    ecouterFiltres() {
        const filtresTendances = document.getElementById("filtres-tendances");
        if (filtresTendances) {
            filtresTendances.querySelectorAll("button").forEach(btn => {
                btn.addEventListener("click", () => {
                    filtresTendances.querySelectorAll("button").forEach(b => b.classList.remove("actif"));
                    btn.classList.add("actif");
                    this.tendances.charger({periode: btn.dataset.periode});
                });
            });
        }

        const filtresFilms = document.getElementById("filtres-films");
        if (filtresFilms) {
            filtresFilms.addEventListener("change", () => {
                this.films.charger(this.lireSelecteurs(filtresFilms));
            });
        }

        const filtresSeries = document.getElementById("filtres-series");
        if (filtresSeries) {
            filtresSeries.addEventListener("change", () => {
                this.series.charger(this.lireSelecteurs(filtresSeries));
            });
        }
    }

    lireSelecteurs(conteneur) {
        const params = {sort_by: "popularity.desc"};
        conteneur.querySelectorAll("select").forEach(select => {
            if (select.value) params[select.dataset.filtre] = select.value;
        });
        return params;
    }

    ecouterRecherche() {
        const lancer = () => this.rechercher(this.inputRecherche?.value.trim());

        this.boutonRecherche?.addEventListener("click", lancer);
        this.inputRecherche?.addEventListener("keydown", e => {
            if (e.key === "Enter") lancer();
        });
    }

    async rechercher(texte) {
        if (!texte || !this.zoneResultats) return;

        this.zoneResultats.hidden = false;
        this.zoneResultats.innerHTML = `<div class="chargement"><span></span><span></span><span></span></div>`;

        try {
            const data = await this.api.rechercher(texte);
            const items = (data.results || []).filter(
                i => i.media_type === "movie" || i.media_type === "tv"
            );

            this.zoneResultats.innerHTML = `<h2>Résultats pour « ${texte} »</h2>`;

            if (!items.length) {
                this.zoneResultats.innerHTML += `<p class="message-vide">Aucun résultat trouvé.</p>`;
                return;
            }

            const grille = document.createElement("div");
            grille.className = "grille";

            items.slice(0, 20).forEach(item => {
                const carte = new Carte(item, item.media_type);
                grille.appendChild(carte.creer());
            });

            this.zoneResultats.appendChild(grille);

        } catch (err) {
            this.zoneResultats.innerHTML = `<p class="message-erreur">Erreur lors de la recherche.</p>`;
        }
    }
}

document.addEventListener("DOMContentLoaded", () => {
    new PageAccueil();
});